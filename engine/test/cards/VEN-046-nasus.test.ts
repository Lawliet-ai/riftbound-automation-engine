import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, activatedFor, cardKeywords } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { deflectValue } from '../../src/keywords/deflect'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'

                                        
                                                     
                                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function nasus(oid = 'n', zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-046')
  return {
    oid: asObjId(oid), defId: 'VEN-046', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                              
function conquerAt(st: GameState, battlefield: string, player = P1): GameState {
  let s = landAndEnqueueTriggers(st, [{ kind: 'conquer', player, battlefield }], activeTriggers, player, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}

describe('前提:三段技能各自到位', () => {
  test('印刷关键词是 [法盾2] 与 [强化8]', () => {
    expect(cardKeywords('VEN-046')).toEqual(expect.arrayContaining(['法盾2', '强化8']))
  })

  test('[法盾2] 真的算出 2(§809.1.b.3 带数值)', () => {
    expect(deflectValue(nasus())).toBe(2)
  })

  test('通用工厂出得来 [强化8] 规格,费用 8', () => {
    const spec = activatedFor('VEN-046').find((s) => s.key.startsWith('empower'))
    expect(spec?.cost).toEqual({ mana: 8 })
  })
})

describe('★[已强化>] 当我征服一处战场时,你获得1分', () => {
                             
                                                            
                                                    
                                                  
                                                          
  test('★入链后被【解除强化】→ 仍然得分(依赖性关键词条件失效不影响已入链效果)', () => {
    const st = scene([nasus('n', BF0, { counters: { empower: 1 } })])
    let s = landAndEnqueueTriggers(st, [{ kind: 'conquer', player: P1, battlefield: BF0 }], activeTriggers, P1, {})
    expect(s.chain).toHaveLength(1)            
                                              
    s = { ...s, objects: { ...s.objects, n: { ...s.objects['n']!, counters: {} } } }
    const it = s.chain[0]!
    s = applyEvents(s, it.resolve(s, {}, it), {}).state
    expect(s.scores[P1] ?? 0).toBe(1)
  })

  test('★入链后内瑟斯【离场】→ 仍然得分(来源离场不影响已入链效果)', () => {
    const st = scene([nasus('n', BF0, { counters: { empower: 1 } })])
    let s = landAndEnqueueTriggers(st, [{ kind: 'conquer', player: P1, battlefield: BF0 }], activeTriggers, P1, {})
    expect(s.chain).toHaveLength(1)
                               
    const objs = { ...s.objects }
    delete objs['n']
    s = { ...s, objects: objs }
    const it = s.chain[0]!
    s = applyEvents(s, it.resolve(s, {}, it), {}).state
    expect(s.scores[P1] ?? 0).toBe(1)
  })

  test('★未强化 → 征服不得分(这条技能此刻【根本不存在】)', () => {
    const s = conquerAt(scene([nasus()]), BF0)
    expect(s.scores[P1] ?? 0).toBe(0)
  })

  test('★已强化 + 征服我所在的战场 → 得 1 分', () => {
    const s = conquerAt(scene([nasus('n', BF0, { counters: { empower: 1 } })]), BF0)
    expect(s.scores[P1] ?? 0).toBe(1)
  })

  test('★征服的是【别处】战场 → 不得分(§471.2.a 在被征服的战场上触发)', () => {
    const s = conquerAt(scene([nasus('n', BF0, { counters: { empower: 1 } })]), BF1)
    expect(s.scores[P1] ?? 0).toBe(0)
  })

  test('★征服者是对手 → 不得分', () => {
    const st = scene([nasus('n', BF0, { counters: { empower: 1 } })])
    const s = conquerAt(st, BF0, P2)
    expect(s.scores[P1] ?? 0).toBe(0)
  })

  test('真 registry 收得到这条触发', () => {
    expect(activeTriggers(scene([nasus()])).some((t) => t.sourceOid === asObjId('n'))).toBe(true)
  })
})
