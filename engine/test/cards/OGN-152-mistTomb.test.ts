import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { canDormantSelf } from '../../data/cards/dormant-self-cost'
import { buffCount } from '../../src/keywords/buff'

                                                      
                   
                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function tomb(oid = 't', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('OGN-152')
  return {
    oid: asObjId(oid), defId: 'OGN-152', owner: P1, controller: P1, zone: asZoneId(`base:${P1}`),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function unit(oid: string, controller = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: controller, controller, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
    status: { dormant: true }, ...extra,
  }
}
function scene(objs: GameObject[], pips: Record<string, number> = { orange: 3 }): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana: 5, runes: pips } },
  }
}
                                     
function buffAndResolve(st: GameState, target: string, take = true, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [{ kind: 'grantBuff', target: asObjId(target) }], activeTriggers, actor, {})
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
  return s
}

describe('前提', () => {
  test('这张卡在真 registry 里是装备', () => {
    expect(cardKind('OGN-152')).toBe('equipment')
    expect(specLookup('OGN-152').baseTypes).toEqual(['equipment'])
  })

  test('真 registry 收得到它的触发', () => {
    expect(activeTriggers(scene([tomb(), unit('u')])).some((t) => t.sourceOid === asObjId('t'))).toBe(true)
  })
})

describe('★付得出费用时:单位变活跃、剑冢横置、符能扣掉', () => {
  test('★接受触发 → 三件事都发生了(方向没写反)', () => {
    const s = buffAndResolve(scene([tomb(), unit('u')]), 'u')
    expect(s.objects['u']!.status.dormant).toBe(false)         
    expect(s.objects['t']!.status.tapped).toBe(true)          
    expect(s.runePools[P1]!.runes['orange']).toBe(2)            
    expect(buffCount(s.objects['u']!)).toBe(1)           
  })

  test('★不接受(可选)→ 单位仍休眠、剑冢没横置、符能没动', () => {
    const s = buffAndResolve(scene([tomb(), unit('u')]), 'u', false)
    expect(s.objects['u']!.status.dormant).toBe(true)
    expect(s.objects['t']!.status.tapped).not.toBe(true)
    expect(s.runePools[P1]!.runes['orange']).toBe(3)
  })
})

describe('★付不出费用/不该触发的情形', () => {
  test('★没有橙符能 → 整条不执行(第110轮补:spend 付不起是静默 no-op,不把关就是白拿)', () => {
    const st = { ...scene([tomb(), unit('u')], {}), runePools: { P1: { mana: 0, runes: {} }, P2: { mana: 0, runes: {} } } } as GameState
    const s = buffAndResolve(st, 'u')
    expect(s.objects['u']!.status.dormant).toBe(true)           
    expect(s.objects['t']!.status.tapped).not.toBe(true)
  })

  test('★剑冢已横置 → 付不出"让此牌休眠",不触发', () => {
    const st = scene([tomb('t', { status: { tapped: true } }), unit('u')])
    expect(canDormantSelf(st, asObjId('t'))).toBe(false)
    const s = buffAndResolve(st, 'u')
    expect(s.objects['u']!.status.dormant).toBe(true)           
  })

  test('★给【对手的】单位上增益 → 不触发(卡文写的是"友方单位")', () => {
    const s = buffAndResolve(scene([tomb(), unit('e', P2)]), 'e')
    expect(s.objects['e']!.status.dormant).toBe(true)
    expect(s.objects['t']!.status.tapped).not.toBe(true)
  })

  test('★§383.2.c 剑冢在手牌里 → 不生效', () => {
    const inHand = { ...tomb(), zone: asZoneId(`hand:${P1}`) }
    const st = scene([inHand, unit('u')])
    expect(canDormantSelf(st, asObjId('t'))).toBe(false)
    const s = buffAndResolve(st, 'u')
    expect(s.objects['u']!.status.dormant).toBe(true)
  })
})
