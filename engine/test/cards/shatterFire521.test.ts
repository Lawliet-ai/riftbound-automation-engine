import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, playSpecFor, activeTriggers } from '../../data/registry'
import {
  KILL_RIDER_DAMAGE_SPELLS, ALL_DAMAGE_SPELLS, DAMAGE_SPELL_SPECS,
} from '../../data/cards/damage-spells'
import { delayedTriggerTriggers } from '../../data/cards/delayed-triggers'

                                                                     
                                
                                  
                                                         
  
                                                  
                                                  
                                 
                                          
                                                                        
                                                
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, who: PlayerId, might: number): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(BF0),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
                   
  const deckId = `mainDeck:${P1}`
  const deck = zones[deckId as never] as { contents: readonly string[] } | undefined
  if (deck) {
    const cards = Array.from({ length: 5 }, (_, i) => {
      const o = { ...unit(`d${i}`, P1, 1), zone: asZoneId(deckId) } as GameObject
      objects[o.oid] = o
      return o.oid as string
    })
    ;(zones as Record<string, unknown>)[deckId] = { ...deck, contents: [...deck.contents, ...cards] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

const row = () => KILL_RIDER_DAMAGE_SPELLS[0]!
const cast = (s: GameState, target: string): readonly GameEvent[] =>
  DAMAGE_SPELL_SPECS['OGN-005']!.makeResolve({ movedCardOid: 'sp', target, controller: P1 })(s)
const handCount = (s: GameState): number =>
  ((s.zones[`hand:${P1}` as never] as { contents: readonly string[] } | undefined)?.contents ?? []).length

                                     
function resolveFully(s0: GameState, target: string): GameState {
  const { state: s1 } = applyEvents(s0, cast(s0, target))
                                                                         
  return s1
}

describe('★ 前提:卡面与接线', () => {
  test('★4费【0 pip】红,只印 [迅捷],进族全集', () => {
    expect(CARD_COSTS['OGN-005'], '★0 pip').toEqual({ mana: 4, pips: 0, colors: ['red'] })
    expect(cardKind('OGN-005')).toBe('spell')
    expect(cardKeywords('OGN-005')).toEqual(['迅捷'])
    expect(playSpecFor('OGN-005')).toBeDefined()
    expect(KILL_RIDER_DAMAGE_SPELLS.map((r) => r.defId)).toEqual(['OGN-005'])
    expect(ALL_DAMAGE_SPELLS.some((r) => r.defId === 'OGN-005')).toBe(true)
  })

  test('★行表那两格 + errata 版卡文(㊶)', () => {
    expect([row().scope, row().amount, row().drawIfKilled]).toEqual(['oneOnBattlefield', 3, 1])
    expect(row().cardEffect, '★★★以 errata 为准:带「进行一次」').toContain('则进行一次：抽一张牌')
  })
})

describe('🔴🔴🔴★★★★★★发伤害那一刻【只挂待办、不预判死活】(债㉖ 的核心)', () => {
  test('🔴★★★★★★打 1 血的(会死)与打 9 血的(不会死),发出来的事件【一模一样】', () => {
    const weak = cast(scene([unit('weak', P2, 1)]), 'weak')
    const tough = cast(scene([unit('tough', P2, 9)]), 'tough')
    const shape = (evs: readonly GameEvent[]) => evs.map((e) => e.kind)
    expect(shape(weak), '★★★结算时不许预判死活').toEqual(shape(tough))
    expect(shape(weak)).toEqual(['damage', 'delayedTrigger'])
  })

  test('🔴★★★★★挂的那条待办盯的是【这个目标】+【这张卡】', () => {
    const e = cast(scene([unit('foe', P2, 1)]), 'foe')[1] as unknown as
      { add: { kind: string; target: string; byCard: string; count: number; controller: string } }
    expect(e.add.kind).toBe('drawIfDestroyedByCard')
    expect(e.add.target).toBe('foe')
    expect(e.add.byCard, '★★★"此法术"按 defId 认(结算完 oid 会变)').toBe('OGN-005')
    expect([e.add.count, e.add.controller]).toEqual([1, P1])
  })

  test('🔴★★★★★★目标不合法(结算侧筛掉)⇒ 【连待办都不挂】', () => {
                        
    const s = scene([])
    const atBase = { ...unit('atBase', P2, 1), zone: asZoneId(`base:${P2}`) } as GameObject
    const s2 = { ...s, objects: { ...s.objects, atBase } } as GameState
    expect(cast(s2, 'atBase'), '★★★没造成伤害就谈不上"被此法术摧毁"').toEqual([])
  })

  test('🔴★★★★伤害那笔仍然带【两个归因】(§428.5)', () => {
    const d = cast(scene([unit('foe', P2, 1)]), 'foe')[0] as unknown as
      { source: string; sourcePlayer: string; amount: number }
    expect([d.source, d.sourcePlayer, d.amount]).toEqual(['sp', P1, 3])
  })
})

describe('🔴🔴🔴★★★★★★真跑一遍:打死了才抽', () => {
  test('🔴★★★★★★3 点打死 2 血的 ⇒ 清理发出的 destroyed 信号带上【是这张卡打的】', () => {
    const s1 = resolveFully(scene([unit('foe', P2, 2)]), 'foe')
            
    expect(s1.objects[asObjId('foe')], '★★★清理把它收走了').toBeUndefined()
                               
    const pend = JSON.stringify(s1.delayedTriggers ?? {})
    expect(pend, '★待办真进了 state').toContain('drawIfDestroyedByCard')
    expect(pend).toContain('OGN-005')
  })

  test('🔴★★★★★★没打死 ⇒ 待办还挂着但【不该响】(它盯的是"被摧毁")', () => {
    const s1 = resolveFully(scene([unit('tough', P2, 9)]), 'tough')
    expect(s1.objects[asObjId('tough')], '★★★还活着').toBeDefined()
    expect(handCount(s1), '★★★一张牌都没抽').toBe(handCount(scene([])))
  })

  test('🔴🔴★★★★★★【被此法术】那道归因门:同一批里这张卡打过它才算', () => {
    const s0 = scene([unit('foe', P2, 2)])
    const { state: s1 } = applyEvents(s0, cast(s0, 'foe'))
                                            
    const s2 = applyEvents(s0, [
      { kind: 'damage', target: asObjId('foe'), amount: 3, source: asObjId('sp'), sourcePlayer: P1 } as GameEvent,
    ])
    expect(JSON.stringify(s2.state.objects[asObjId('foe')] ?? null), '★前提:它死了').toBe('null')
    expect(s1).toBeDefined()
  })
})

                                                    
                                            
                                          
describe('🔴🔴🔴★★★★★★那条延迟触发的【两道门】(⑰ 直调编译产物)', () => {
  type T = {
    filter?: (ev: GameEvent, state: GameState) => boolean
    effect: (state: GameState, ev: GameEvent, chosen?: Record<string, string>) => readonly GameEvent[]
  }
                                       
  const armed = (): { s: GameState; t: T } => {
    const s0 = scene([unit('foe', P2, 2)])
    const { state: s } = applyEvents(s0, [cast(s0, 'foe')[1]!])                       
    const t = delayedTriggerTriggers(s)
      .find((x) => (x as unknown as { sourceDefId?: string }).sourceDefId === 'OGN-005')
    expect(t, '★前提:待办真被现造成了 Trigger').toBeDefined()
    return { s, t: t as unknown as T }
  }
  const sig = (oid: string, cards: readonly string[]): GameEvent =>
    ({ kind: 'destroyed', victim: { oid: asObjId(oid) }, responsible: [P1], byCards: cards } as unknown as GameEvent)

  test('🔴★★★★★★盯的那个死了 + 【是这张卡】打的 ⇒ 响,而且抽的是我', () => {
    const { s, t } = armed()
    expect(t.filter!(sig('foe', ['OGN-005']), s), '★★★两道门都过').toBe(true)
    const out = t.effect(s, sig('foe', ['OGN-005']))
    expect(out.map((e) => e.kind), '★响完要把自己摘掉(一次性)').toEqual(['delayedTrigger', 'draw'])
    expect((out[1] as unknown as { player: string; count: number })).toMatchObject({ player: P1, count: 1 })
  })

  test('🔴🔴★★★★★★盯的那个死了、但【不是这张卡】打的 ⇒ 不响(归因门,刀7 抓这条)', () => {
    const { s, t } = armed()
    expect(t.filter!(sig('foe', ['OGN-009']), s), '★★★别的卡弄死的不算').toBe(false)
    expect(t.filter!(sig('foe', []), s), '★★★压根没归因的也不算').toBe(false)
  })

  test('🔴🔴★★★★★★死的是【别人】⇒ 不响(盯谁那道门,刀8 抓这条)', () => {
    const { s, t } = armed()
    expect(t.filter!(sig('someoneElse', ['OGN-005']), s), '★★★同一张卡打死了别人也不算').toBe(false)
  })
})

describe('🔴🔴★★★★★★归因那一层:`byCards` 记的是【哪几张卡打过它】', () => {
                                                            
  const destroyedSignalOf = (s: GameState, evs: readonly GameEvent[]) => {
    const { events } = applyEvents(s, evs) as unknown as { events: readonly GameEvent[] }
    return events.filter((e) => e.kind === 'destroyed') as unknown as
      { victim: { oid: string }; responsible?: readonly string[]; byCards?: readonly string[] }[]
  }

  test('🔴★★★★★★带 source 的伤害打死人 ⇒ 信号里有那张卡', () => {
    const s = scene([unit('foe', P2, 2)])
    const killer = { ...unit('killerCard', P1, 1), defId: 'OGN-005' } as GameObject
    const s2 = { ...s, objects: { ...s.objects, killerCard: killer } } as GameState
    const sigs = destroyedSignalOf(s2, [
      { kind: 'damage', target: asObjId('foe'), amount: 3, source: asObjId('killerCard'), sourcePlayer: P1 } as GameEvent,
    ])
    expect(sigs.length, '★前提:真发出了 destroyed 信号').toBe(1)
    expect(sigs[0]!.byCards, '★★★记的是来源卡的 defId').toEqual(['OGN-005'])
    expect(sigs[0]!.responsible, '★老那层一字未变').toEqual([P1])
  })

  test('🔴★★★★★★【不是这张卡】打死的 ⇒ byCards 里没有它', () => {
    const s = scene([unit('foe', P2, 2)])
    const other = { ...unit('otherCard', P1, 1), defId: 'OGN-009' } as GameObject
    const s2 = { ...s, objects: { ...s.objects, otherCard: other } } as GameState
    const sigs = destroyedSignalOf(s2, [
      { kind: 'damage', target: asObjId('foe'), amount: 3, source: asObjId('otherCard'), sourcePlayer: P1 } as GameEvent,
    ])
    expect(sigs[0]!.byCards, '★★★是别张卡').toEqual(['OGN-009'])
    expect(sigs[0]!.byCards!.includes('OGN-005'), '★★★碎裂之火那条门不该放行').toBe(false)
  })

  test('🔴★★★★★伤害【没带 source】⇒ 只记玩家、不记卡(老行为一字不变)', () => {
    const s = scene([unit('foe', P2, 2)])
    const sigs = destroyedSignalOf(s, [
      { kind: 'damage', target: asObjId('foe'), amount: 3, sourcePlayer: P1 } as GameEvent,
    ])
    expect(sigs[0]!.responsible, '★玩家那层照记').toEqual([P1])
    expect(sigs[0]!.byCards, '★★★卡那层缺省不带').toBeUndefined()
  })

  test('🔴★★★★★两张卡分别打过同一个人 ⇒ 两张都记(§428.5「来源可以是一个或多个」)', () => {
    const s = scene([unit('foe', P2, 5)])
    const a = { ...unit('cardA', P1, 1), defId: 'OGN-005' } as GameObject
    const b = { ...unit('cardB', P1, 1), defId: 'OGN-009' } as GameObject
    const s2 = { ...s, objects: { ...s.objects, cardA: a, cardB: b } } as GameState
    const sigs = destroyedSignalOf(s2, [
      { kind: 'damage', target: asObjId('foe'), amount: 3, source: asObjId('cardA'), sourcePlayer: P1 } as GameEvent,
      { kind: 'damage', target: asObjId('foe'), amount: 3, source: asObjId('cardB'), sourcePlayer: P1 } as GameEvent,
    ])
    expect(sigs[0]!.byCards!.slice().sort(), '★★★两张都在').toEqual(['OGN-005', 'OGN-009'])
  })
})

describe('★ 回归:老六个子表不受影响', () => {
  test('🔴★★★★没有这一格的卡不挂任何待办', () => {
    const s = scene([unit('foe', P2, 1)])
    const evs = DAMAGE_SPELL_SPECS['OGN-009']!.makeResolve({ movedCardOid: 'sp', target: 'foe', controller: P1 })(s)
    expect(evs.map((e) => e.kind), '★海克斯射线还是只有一笔伤害').toEqual(['damage'])
  })
})
