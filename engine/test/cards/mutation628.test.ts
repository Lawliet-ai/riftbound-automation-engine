import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { cardKind, cardCost, cardKeywords, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { TWO_TARGET_SPELLS, TWO_TARGET_SPECS, TWO_TARGET_KEY } from '../../data/cards/two-target-spells'

                                                       
                                                             
                                                      
                                                  
                                                
  
             
                                                                          
                                                           
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, might: number, ctrl: PlayerId = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const row = () => TWO_TARGET_SPELLS.find((r) => r.defId === 'OGN-108')!
const resolve = (s: GameState, first?: string, second?: string): readonly GameEvent[] =>
  TWO_TARGET_SPECS['OGN-108']!.makeResolve({
    movedCardOid: 'sp', ...(first !== undefined ? { target: first } : {}), controller: P1,
  })(s, second === undefined ? {} : { [TWO_TARGET_KEY]: second }) as readonly GameEvent[]
const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId(oid)]!).actual

describe('🔴🔴🔴★★★★★★628 聚合变异:前提与接线', () => {
  test('★前提:法术 2费 **1蓝pip**、单印次;⚠️用的是 **errata** 不是印刷卡文', () => {
    expect(cardKind('OGN-108')).toBe('spell')
                                                 
    expect(CARD_COSTS['OGN-108']).toEqual({ mana: 2, pips: 1, colors: ['blue'] })
    expect(CARD_COSTS['OGN-108a'], '★单印次').toBeUndefined()
    expect(playSpecFor('OGN-108'), '★★★汇总口漏了 ⇒ 打不出来').toBeDefined()
    expect(cardKeywords('OGN-108'), '★[反应]在白名单里,必须登').toEqual(['反应'])
    expect(cardCost('OGN-108'), '★法术不进 UNIT_COST').toEqual({ mana: 0 })
                                       
    expect(row().cardEffect, '★★★用了 errata').toContain('本回合内，将其战力提升至与另一名友方单位战力相同')
    expect(row().cardEffect, '★★★印刷版那道条件已被勘误去掉').not.toContain('如果其战力低于')
    expect(row().second, '★「**另一名**友方单位」⇒ 排掉第一个').toBe('anotherFriendly')
  })
})

describe('🔴🔴🔴★★★★★★628 「提升至」= `raiseTo`,不是「变为」', () => {
  test('🔴🔴🔴★★★★★★【真结算】发一条 `raiseTo`,值 = **另一名**的战力、时限 `thisTurn`', () => {
    const s = scene([unit('weak', 2), unit('strong', 7)])
    const evs = resolve(s, 'weak', 'strong')
    expect(evs.length).toBe(1)
    const eff = (evs[0] as unknown as {
      effect: { duration: string; modification: { kind: string; value?: number } }
    }).effect
    expect(eff.modification.kind, '★★★写成 setMight 这条当场红').toBe('raiseTo')
    expect(eff.modification.value, '★★★取的是【另一名】的战力').toBe(7)
    expect(eff.duration, '★★★errata 把「本回合内」提到了句首').toBe('thisTurn')
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】**更强的那个不该被拉下来**(§477.3 `raiseTo` 仅当低于时)', () => {
                                                                 
                                                      
    const s = scene([unit('strong', 7), unit('weak', 2)])
    const out = applyEvents(s, resolve(s, 'strong', 'weak'), {}).state
    expect(mightOf(out, 'strong'), '★★★7 提升至 2 ⇒ 还是 7,不能掉到 2').toBe(7)
  })

  test('🔴🔴🔴★★★★★★【真结算·端到端】低的那个真被抬上去了;⚠️**旁观者一点不动**', () => {
                                                                   
                                                  
    const s = scene([unit('weak', 2), unit('strong', 7), unit('bystander', 3)])
    const out = applyEvents(s, resolve(s, 'weak', 'strong'), {}).state
    expect(mightOf(out, 'weak'), '★★★2 → 7').toBe(7)
    expect(mightOf(out, 'strong'), '★另一名不受影响').toBe(7)
    expect(mightOf(out, 'bystander'), '★★★predicate 写宽这条当场红(旁观者会被抬到 7)').toBe(3)
  })

  test('🔴🔴🔴★★★★★★【会换答案】**没有「低于才生效」那道条件** —— 持平也照发', () => {
                                                        
    const s = scene([unit('a', 4), unit('b', 4)])
    expect(resolve(s, 'a', 'b').length, '★★★errata 去掉了那道条件').toBe(1)
  })

  test('🔴🔴★★★★★★目标缺一半 / 第二个已离场 ⇒ 一条都不发(`onBoth` 的既定口径)', () => {
    const s = scene([unit('a', 2), unit('b', 5)])
    expect(resolve(s, 'a', undefined)).toEqual([])
    expect(resolve(s, undefined, 'b')).toEqual([])
    expect(resolve(s, 'a', 'ghost'), '★答完到结算之间它没了').toEqual([])
  })
})
