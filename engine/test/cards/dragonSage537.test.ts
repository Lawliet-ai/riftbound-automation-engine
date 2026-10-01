import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, activatedFor } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { UNL_093, UNL_093_SPEC, OGN_253_SPEC } from '../../data/cards/activated-batch2'

                                                                       
                                                         
  
                            
                                                       
                                       
                                            
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const sage = (oid: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: 'UNL-093', owner: who, controller: who,
  zone: asZoneId(`base:${who}`), baseMight: 1, baseKeywords: [], baseTypes: ['unit'],
  damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}
const fire = (s: GameState, who: PlayerId) =>
  UNL_093_SPEC.makeResolve({ selfOid: 'sg', controller: who })(s) as readonly GameEvent[]

describe('★ 前提:卡面与接线', () => {
  test('★2费 0pip 橙、1 战力,技能进了主动技能表', () => {
    expect(CARD_COSTS['UNL-093']).toEqual({ mana: 2, pips: 0, colors: ['orange'] })
    expect([UNL_093.power, UNL_093.energy]).toEqual([1, 2])
    expect(cardKind('UNL-093')).toBe('unit')
    expect(specLookup('UNL-093').baseMight, '★规格不是兜底值').toBe(1)
    expect(activatedFor('UNL-093').map((x) => x.key)).toContain('UNL-093:mana')
  })

  test('🔴🔴★★★★★★[反应] 是【技能的时机权限】,不是印刷关键词(⑪/★534)', () => {
                                                        
    expect(cardKeywords('UNL-093'), '★★★卡面印刷关键词为空').toEqual([])
    expect(UNL_093.keywords).toEqual([])
    expect(UNL_093_SPEC.keywords, '★★★权限挂在技能上').toEqual(['反应'])
  })
})

describe('🔴🔴🔴★★★★★★效果:横置自己 → 获得 {1}', () => {
  test('🔴★★★★★★发一条 gainResource,收益归【发动者】', () => {
    const s = scene([sage('sg', P1)])
    expect(fire(s, P1)).toEqual([{ kind: 'gainResource', player: P1, mana: 1 }])
  })

  test('🔴★★★★★★换个人发动 ⇒ 收益跟着换(不是写死某一方)', () => {
    const s = scene([sage('sg', P2)])
    expect((fire(s, P2)[0] as unknown as { player: string }).player).toBe(P2)
  })

  test('🔴★★★★★★费用是【横置自己】,资源费为空', () => {
    expect(UNL_093_SPEC.tapSelf, '★「{横置}」那一截').toBe(true)
    expect(UNL_093_SPEC.cost, '★★★没有额外的法力/符能费').toEqual({})
  })

  test('🔴★★★★★★获得资源 ⇒ 必须立即结算(§337.2/§429.2)', () => {
    expect(UNL_093_SPEC.fastResolve, '★★★不入链、不开反应窗口').toBe(true)
  })

  test('★不需要选目标', () => {
    expect(UNL_093_SPEC.target).toBe('none')
    expect(UNL_093_SPEC.legalTargets!(scene([sage('sg', P1)]), P1, 'sg')).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★与诺克萨斯之手的分野:唯一差别是那道【可用性闸】', () => {
  test('🔴★★★★★★两张的【效果/费用/权限/结算方式】逐条同解', () => {
    expect(UNL_093_SPEC.cost).toEqual(OGN_253_SPEC.cost)
    expect(UNL_093_SPEC.tapSelf).toBe(OGN_253_SPEC.tapSelf)
    expect(UNL_093_SPEC.keywords).toEqual(OGN_253_SPEC.keywords)
    expect(UNL_093_SPEC.fastResolve).toBe(OGN_253_SPEC.fastResolve)
    const s = scene([sage('sg', P1)])
    expect(fire(s, P1), '★★★连产出的事件都一样')
      .toEqual(OGN_253_SPEC.makeResolve({ selfOid: 'sg', controller: P1 })(s))
  })

  test('🔴🔴★★★★★★分野就一处:那张有 available 闸、【这张没有】', () => {
                                      
                                                           
    expect(OGN_253_SPEC.available, '★对照:诺克萨斯之手确实有这道闸').toBeTypeOf('function')
    expect(UNL_093_SPEC.available, '★★★本张一道都没有').toBeUndefined()
  })

  test('🔴★★★★★★对照那张的闸【真的会挡】:空盘面下它点不亮、本张照常', () => {
                                    
    const s = scene([sage('sg', P1)])
    expect(OGN_253_SPEC.available!(s, P1, 'sg'), '★★★那张:点不亮').toBe(false)
    expect(UNL_093_SPEC.available, '★★★这张:根本没有这道判据').toBeUndefined()
  })
})
