import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { playSpecFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  OGN_258, OGN_258_SPEC, OGN_258_CARD_EFFECT, dragonTailFoesAt, ENEMY_MOVE_DEFIDS, UNL_038_SPEC,
  makeDragonTailItem,
} from '../../data/cards/enemy-move'

                                                         
                                                                
                                            
                                                            
                       
  
                                    
                                                                  
                                                                     
                                                                
  
                                                        
                                                                              
                                            
                                                                   
                                                                    
                                                                  
                                             

const P1 = asPlayerId('P1')       
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const unit = (oid: string, ctrl: ReturnType<typeof asPlayerId>, zone = BF0, might = 3): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(units: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of units) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const DEST = 'dragonTailDest'
const FOE2 = 'dragonTailFoe2'
const ask = (s: GameState, target: string, chosen: Record<string, string> = {}) =>
  OGN_258_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  OGN_258_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]
                                                            
const tailItem = (moved: string) => makeDragonTailItem('sp', moved, P1) as unknown as {
  id: string; kind: string; status: string; sourceDefId?: string
  nextChoice: (s: GameState, chosen: Record<string, string>) => { key: string; candidates: readonly { id: string }[] } | null
  resolve: (s: GameState, chosen?: Record<string, string>) => readonly GameEvent[]
}
const tailAsk = (s: GameState, moved: string, chosen: Record<string, string> = {}) =>
  tailItem(moved).nextChoice(s, chosen)
const tailResolve = (s: GameState, moved: string, chosen: Record<string, string> = {}) =>
  tailItem(moved).resolve(s, chosen)

describe('🔴🔴🔴★★★★★★592 猛龙摆尾:前提与接线', () => {
  test('★前提:法术 4费 **1枚双色pip**;以 errata 为准;单印次', () => {
                                                                   
                                                          
    expect(CARD_COSTS['OGN-258'], '★★★1 枚 pip').toEqual({ mana: 4, pips: 1, colors: ['green', 'orange'] })
    expect(OGN_258_SPEC.cost, '★★★双色单 pip 写法').toEqual({ mana: 4, pips: [['green', 'orange']] })
    expect(cardKind('OGN-258')).toBe('spell')
    expect(OGN_258.domains).toEqual(['green', 'orange'])
    expect(OGN_258_CARD_EFFECT, '★★★采用的是 errata 那句(「然后进行一次」「终点位置」)')
      .toBe('移动一名敌方单位。然后进行一次：在该单位终点位置处选择另一名敌方单位。让这两名单位相互以自身战力给对方造成伤害。')
    expect(playSpecFor('OGN-258')).toBeDefined()
  })

  test('🔴🔴★★★★★★接线:进了敌方移动族名单(共用 askMoveDestination)', () => {
    expect([...ENEMY_MOVE_DEFIDS], '★★★那道闸 3 → 4').toContain('OGN-258')
  })
})

describe('🔴🔴🔴★★★★★★592 第一段:移动一名敌方单位', () => {
  test('🔴🔴🔴★★★★★★【会换答案】先问落点(与同族共用同一段逻辑)', () => {
    const s = scene([unit('foe', P2), unit('mine', P1)])
    const q = ask(s, 'foe') as { key: string; candidates: readonly { id: string }[] } | null
    expect(q, '★问得出来').not.toBeNull()
    expect(q!.key, '★★★第一问是落点').toBe(DEST)
    expect(q!.candidates.length).toBeGreaterThan(0)
  })

  test('🔴🔴★★★★★★合法目标 = 敌方单位(我的不在候选里)', () => {
    const s = scene([unit('foe', P2), unit('mine', P1)])
    const cands = OGN_258_SPEC.legalTargets!(s, P1, 'sp' as never) as string[]
    expect(cands, '★★★只有敌方').toEqual(['foe'])
  })
})

describe('🔴🔴🔴★★★★★★592 第二段:终点位置的【另一名】敌方单位', () => {
  test('🔴🔴🔴★★★★★★【会换答案·限终点位置】只列终点那处的,别处的不列', () => {
                                                     
                                                                     
    const s = scene([unit('foe', P2, BF1), unit('atDest', P2, BF1), unit('elsewhere', P2, BF0)])
    const q = tailAsk(s, 'foe')!
    expect(q.key).toBe(FOE2)
    expect(q.candidates.map((c) => c.id), '★★★只有终点 BF1 那个').toEqual(['atDest'])
  })

  test('🔴🔴🔴★★★★★★【承重·「另一名」】被移动的那个不能选自己', () => {
                                          
    const s = scene([unit('foe', P2, BF0), unit('other', P2, BF1)])
    const cands = dragonTailFoesAt(s, BF1, 'foe', P1)
    expect(cands, '★★★只有 other').toEqual(['other'])
                                       
    expect(dragonTailFoesAt(s, BF0, 'foe', P1), '★★★同区也排除自己').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【敌我】终点处的**友方**单位不是候选', () => {
    const s = scene([unit('foe', P2, BF0), unit('mineAtDest', P1, BF1)])
    expect(dragonTailFoesAt(s, BF1, 'foe', P1), '★★★卡文写的是「另一名【敌方】单位」').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【无条件问】与 UNL-038 的等级门正相反', () => {
                                                
    const s = scene([unit('foe', P2, BF1), unit('other', P2, BF1)])
    expect(tailAsk(s, 'foe'), '★★★没有等级门,直接问').not.toBeNull()
  })

  test('🔴🔴🔴★★★★★★【★622·会换答案】**只问一次**:答过之后不再问', () => {
                                                           
    const s = scene([unit('foe', P2, BF1), unit('other', P2, BF1)])
    expect(tailAsk(s, 'foe'), '★前提自证:第一次问得出来').not.toBeNull()
    expect(tailAsk(s, 'foe', { [FOE2]: 'other' }), '★★★答过了还问 = 死循环').toBeNull()
  })

  test('🔴🔴★★★★★★【终点没别人】⇒ 不问(互殴那半落空,§355.17)', () => {
    const s = scene([unit('foe', P2, BF1)])
    expect(tailAsk(s, 'foe'), '★★★别卡死').toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★592 结算:移动 + 互殴', () => {
  test('🔴🔴🔴★★★★★★【会换答案】两条伤害,各以【自身】战力打对方', () => {
                                                      
    const s = scene([unit('foe', P2, BF1, 5), unit('other', P2, BF1, 2)])
    const evs = tailResolve(s, 'foe', { [FOE2]: 'other' }) as readonly { kind: string; target?: string; amount?: number; source?: string }[]
    const dmgs = evs.filter((e) => e.kind === 'damage')
    expect(dmgs.length, '★★★两条').toBe(2)
    const toOther = dmgs.find((d) => d.target === 'other')
    const toFoe = dmgs.find((d) => d.target === 'foe')
    expect(toOther?.amount, '★★★other 吃 foe 的 5').toBe(5)
    expect(toOther?.source, '★★★来源是 foe').toBe('foe')
    expect(toFoe?.amount, '★★★foe 吃 other 的 2').toBe(2)
    expect(toFoe?.source).toBe('other')
  })

  test('🔴🔴🔴★★★★★★【★622】第一段 = 移动 + **入链**(互殴不再同批发出)', () => {
    const s = scene([unit('foe', P2, BF0, 5), unit('other', P2, BF1, 2)])
    const kinds = resolve(s, 'foe', { [DEST]: BF1 }).map((e) => e.kind)
    expect(kinds.some((k) => k === 'zoneChange' || k === 'unitMoved'), '★★★移动事件在').toBe(true)
                                                       
    expect(kinds, '★★★移动在前、入链在后').toEqual(['zoneChange', 'unitMoved', 'enqueueItem'])
    expect(kinds.includes('damage'), '★★★伤害不该在这一批里').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【★1801f·缺陷 263】落点 = 当前位置(移动被撤回)但目标仍合法 ⇒ **仍入链**', () => {
                                                              
                                                                   
                                       
                                                                        
                                                                
    const s = scene([unit('foe', P2, BF0, 5), unit('other', P2, BF0, 2)])
    expect(resolve(s, 'foe', { [DEST]: BF0 }).map((e) => e.kind), '★★★空转 ≠ 目标失法:仍入链').toEqual(['enqueueItem'])
  })

  test('🔴🔴🔴★★★★★★【★1801f·缺陷 263】目标失法(target 不在 objects)⇒ 前置指示被无视 ⇒ 不入链', () => {
                                                            
                                              
    const s = scene([unit('other', P2, BF0, 2)])
    expect(resolve(s, 'gone', { [DEST]: BF0 }), '★★★目标查不到 ⇒ 一条都不发').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【★622】那条内嵌项目的形状 = §388.1 独立链项目', () => {
    const it = tailItem('foe')
    expect(it.kind).toBe('triggered')
    expect(it.status).toBe('pending')
    expect(it.sourceDefId).toBe('OGN-258')
  })

  test('🔴🔴🔴★★★★★★【端到端】战力低的被打死、战力高的带伤活在终点', () => {
                                         
                                                 
                                                              
                                                                         
                                     
                                      
                                                    
                                   
    const s = scene([unit('foe', P2, BF0, 5), unit('other', P2, BF1, 2)])
    const moved = applyEvents(s, resolve(s, 'foe', { [DEST]: BF1 }), {}).state
    const out = applyEvents(moved, tailResolve(moved, 'foe', { [FOE2]: 'other' }), {}).state
                                    
    expect(out.objects[asObjId('foe')]!.zone, '★★★真移到了终点').toBe(asZoneId(BF1))
    expect(out.objects[asObjId('foe')]!.damage, '★★★它吃 other 的 2').toBe(2)
                                      
    expect(out.objects[asObjId('other')], '★★★死了 ⇒ 原 oid 查不到(§124 换 oid)').toBeUndefined()
    expect((out.zones[asZoneId(`discard:${P2}`)]?.contents ?? []).length, '★★★进了它拥有者的废牌堆').toBe(1)
    expect((out.zones[asZoneId(BF1)]?.contents ?? []).map((o) => o as string), '★★★终点只剩被移过来那个')
      .toEqual(['foe'])
  })

  test('🔴🔴★★★★★★【同归于尽】战力相等 ⇒ 两个都死', () => {
                                          
    const s = scene([unit('foe', P2, BF0, 3), unit('other', P2, BF1, 3)])
    const moved = applyEvents(s, resolve(s, 'foe', { [DEST]: BF1 }), {}).state
    const out = applyEvents(moved, tailResolve(moved, 'foe', { [FOE2]: 'other' }), {}).state
    expect((out.zones[asZoneId(BF1)]?.contents ?? []).length, '★★★终点空了').toBe(0)
    expect((out.zones[asZoneId(`discard:${P2}`)]?.contents ?? []).length, '★★★两个都进废牌堆').toBe(2)
  })

  test('🔴🔴★★★★★★【只移动没选第二个】⇒ 内嵌项目一条伤害都不发', () => {
    const s = scene([unit('foe', P2, BF1)])
    expect(tailResolve(s, 'foe', {}), '★★★互殴那半落空,但不该报错').toEqual([])
  })

  test('🔴🔴★★★★★★【结算期复判】答的那个已离场 ⇒ 不发伤害(★585/589 同款)', () => {
    const s = scene([unit('foe', P2, BF1)])
    expect(tailResolve(s, 'foe', { [FOE2]: 'gone' }), '★★★答完到结算之间它没了').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【★622·会换答案】被移动那个自己没了 ⇒ 也不发(两边都要复判)', () => {
    const s = scene([unit('other', P2, BF1, 2)])
    expect(tailResolve(s, 'foe', { [FOE2]: 'other' }), '★★★只判一边会对着空气发伤害').toEqual([])
  })
})
