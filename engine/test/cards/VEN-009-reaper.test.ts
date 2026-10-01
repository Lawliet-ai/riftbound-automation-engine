import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { couldPayReaperCost } from '../../data/cards/VEN-009'

                                                      
  
                                             
                                                 
                                                                                 
                                                                                      
                                                                              
                                                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function reaper(oid = 'r', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-009')
  return {
    oid: asObjId(oid), defId: 'VEN-009', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: { attacking: true }, ...extra,
  }
}
                                                     
function scene(objs: GameObject[], redPips = 1): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 0, runes: { red: redPips } } },
  })
}
                                         
function attackAndResolve(st: GameState, take = true, unit = 'r'): GameState {
  let s = landAndEnqueueTriggers(
    st, [{ kind: 'attack', unit: asObjId(unit), player: P1, battlefield: BF0 }], activeTriggers, P1, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      if (!take) continue
                                                          
      const paid = it.basePerform ? it.basePerform(s, {}) : s
      if (paid === null) continue
      s = applyEvents(paid, it.resolve(paid, {}, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return recomputeContinuous(s)
}
const might = (s: GameState, oid: string): number => effectiveMight(s.objects[oid]!).actual

describe('前提', () => {
  test('这张卡在真 registry 里是单位,印刷 4[M]', () => {
    expect(cardKind('VEN-009')).toBe('unit')
    expect(specLookup('VEN-009').baseMight).toBe(4)
  })

  test('真 registry 收得到它的触发', () => {
    expect(activeTriggers(scene([reaper()])).some((t) => t.sourceOid === asObjId('r'))).toBe(true)
  })

  test('没用技能时就是 4[M](印刷没有强攻)', () => {
    expect(might(scene([reaper()]), 'r')).toBe(4)
  })
})

describe('★进攻时付{红色}换本回合[强攻2]', () => {
  test('★接受触发 → 红符能扣掉、进攻方身份下 4+2=6[M]', () => {
    const s = attackAndResolve(scene([reaper()]))
    expect(s.runePools[P1]!.runes['red'] ?? 0).toBe(0)            
    expect(might(s, 'r')).toBe(6)                 
  })

  test('★不接受(可选)→ 符能没动、战力也没变', () => {
    const s = attackAndResolve(scene([reaper()]), false)
    expect(s.runePools[P1]!.runes['red'] ?? 0).toBe(1)
    expect(might(s, 'r')).toBe(4)
  })

  test('★§807.1.d.1 身份一失,加成同一瞬间消失(不是"本回合固定+2战力")', () => {
    const s = attackAndResolve(scene([reaper()]))
    expect(might(s, 'r')).toBe(6)
    const off = recomputeContinuous({
      ...s, objects: { ...s.objects, r: { ...s.objects['r']!, status: {} } },
    })
    expect(might(off, 'r')).toBe(4)                            
  })

  test('★§807.2 与印刷的强攻【相加】不去重', () => {
                                       
    const s = attackAndResolve(scene([reaper('r', { baseKeywords: ['强攻1'] })]))
    expect(might(s, 'r')).toBe(7)
  })
})

describe('★付不起 / 不该触发的情形', () => {
  test('★没有红符能 → 整条不执行(不能白拿强攻)', () => {
    const st = scene([reaper()], 0)
                                                         
                                                         
    expect(couldPayReaperCost(st, P1)).toBe(false)
    const s = attackAndResolve(st)
    expect(might(s, 'r')).toBe(4)                                   
  })

  test('★进攻的是【别的】单位 → 不触发(卡文写的是"当我进攻时")', () => {
    const other: GameObject = {
      oid: asObjId('mate'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
      baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: { attacking: true },
    }
    const s = attackAndResolve(scene([reaper(), other]), true, 'mate')
    expect(s.runePools[P1]!.runes['red'] ?? 0).toBe(1)
    expect(might(s, 'r')).toBe(4)
  })

  test('★对手用【他自己那张】收割者进攻 → 我的这张不触发(by:you)', () => {
                                                    
                               
    const foe = { ...reaper('foe'), owner: P2, controller: P2 }
    const st = scene([reaper(), foe])
    const s = landAndEnqueueTriggers(
      st, [{ kind: 'attack', unit: asObjId('foe'), player: P2, battlefield: BF0 }], activeTriggers, P2, {})
    expect(s.chain.some((it) => it.id.includes('VEN-009-assault:r'))).toBe(false)
  })
})
