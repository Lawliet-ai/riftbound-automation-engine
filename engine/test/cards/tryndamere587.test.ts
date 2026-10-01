import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { attemptConquer, attemptHold, resetTurnLedgers } from '../../src/scoring/score'
import { scoringBonus, cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { specLookup } from '../../data/decks'
import {
  tryndamereScoringBonus, TAHM_EXCESS_THRESHOLD, OGN_034, OGN_034_CARD_EFFECT, ahriScoringBonus,
} from '../../data/cards/battlefield-timing'

                                                      
                                                      
                                 
  
                                                           
                                                      
                                                                 
                                                        
  
                                                            
                                                  
                                                                                         
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const tryn = (oid = 'tr', ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-034', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 8, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const unit = (oid: string, ctrl = P2, might = 3, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[], excess?: Record<string, number>): GameState {
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
    ...(excess ? { maxExcessDamageThisTurn: excess } : {}),
  } as GameState
}
const bonus = (s: GameState, kind: 'conquer' | 'hold' = 'conquer', bf = BF0, who = P1): number =>
  tryndamereScoringBonus(s, who, bf, kind)
                       
const hit = (s: GameState, target: string, amount: number, by = P1): GameState =>
  applyEvents(s, [{ kind: 'damage', target: asObjId(target), amount, sourcePlayer: by } as unknown as GameEvent], {}).state

describe('🔴🔴🔴★★★★★★587 泰达米尔:前提与接线', () => {
  test('★前提:7费 **2红pip**、战力 8、英雄单位', () => {
    expect(CARD_COSTS['OGN-034'], '★★★2 枚红 pip').toEqual({ mana: 7, pips: 2, colors: ['red'] })
    expect(cardCost('OGN-034')).toEqual({ mana: 7, pips: [['red'], ['red']] })
    expect(cardKind('OGN-034')).toBe('unit')
    expect(specLookup('OGN-034').baseMight).toBe(8)
    expect(OGN_034.category).toBe('unit')
    expect(OGN_034_CARD_EFFECT).toBe('当我通过进攻征服一处战场时，如果你给敌方单位造成过不低于5点的过量伤害，则你获得的分数+1。')
    expect(TAHM_EXCESS_THRESHOLD, '★㊶ 阈值只写一处').toBe(5)
  })

  test('🔴🔴★★★★★★接线:进了 `scoringBonus` 汇总口(与阿狸并列)', () => {
    const s = scene([tryn(), unit('foe')], { [P1]: 5 })
    expect(scoringBonus(s, P1, BF0, 'conquer'), '★★★从对外汇总口也拿得到 +1').toBe(1)
    expect(ahriScoringBonus(s, P1, BF0, 'conquer'), '★★★别把阿狸那条也算上(它只管据守)').toBe(0)
  })
})

describe('🔴🔴🔴★★★★★★587 判据:进攻征服 + 本回合 ≥5 过量伤害', () => {
  test('🔴🔴🔴★★★★★★【会换答案】进攻征服 + 账上 5 ⇒ +1', () => {
    expect(bonus(scene([tryn()], { [P1]: 5 })), '★★★不写这条的话是 0').toBe(1)
  })

  test('🔴🔴🔴★★★★★★【阈值·两个方向】账上 4 ⇒ 0;账上 5 ⇒ 1(「不低于」含等于)', () => {
    expect(bonus(scene([tryn()], { [P1]: 4 })), '★★★4 不够').toBe(0)
    expect(bonus(scene([tryn()], { [P1]: 5 })), '★★★5 正好够').toBe(1)
    expect(bonus(scene([tryn()], { [P1]: 9 }))).toBe(1)
  })

  test('🔴🔴🔴★★★★★★【时机·承重】**据守**一分都不加(与阿狸正相反,别抄反)', () => {
    expect(bonus(scene([tryn()], { [P1]: 9 }), 'hold'), '★★★卡文写的是"通过进攻征服"').toBe(0)
  })

  test('🔴🔴🔴★★★★★★【「你」= 得分那名玩家的账】对手打出的过量伤害不算', () => {
                     
    expect(bonus(scene([tryn()], { [P2]: 9 })), '★★★账记在对手名下').toBe(0)
  })

  test('🔴🔴🔴★★★★★★【我得在那处战场】泰达米尔在别处 ⇒ 不加', () => {
    const s = scene([tryn('tr', P1, BF1)], { [P1]: 9 })
    expect(bonus(s, 'conquer', BF0), '★★★征服的是 BF0,我在 BF1').toBe(0)
    expect(bonus(s, 'conquer', BF1), '★★★征服 BF1 才算').toBe(1)
  })

  test('🔴🔴★★★★★★场上没有泰达米尔 ⇒ 不加(对照组)', () => {
    expect(bonus(scene([], { [P1]: 9 }))).toBe(0)
  })
})

describe('🔴🔴🔴★★★★★★587 过量伤害账:写账点(§465 超出战力那一截)', () => {
  test('🔴🔴🔴★★★★★★【会换答案】打 3 战力单位 8 点 ⇒ 过量 5 记账', () => {
    const s = hit(scene([tryn(), unit('foe', P2, 3)]), 'foe', 8)
    expect(s.maxExcessDamageThisTurn?.[P1], '★★★8 - 3 = 5').toBe(5)
  })

  test('🔴🔴🔴★★★★★★【没打穿就不记】打 3 战力单位 3 点 ⇒ 过量 0,一笔都不记', () => {
                                        
    const s = hit(scene([tryn(), unit('foe', P2, 3)]), 'foe', 3)
    expect(s.maxExcessDamageThisTurn?.[P1], '★★★3 - 3 = 0 ⇒ 不建键').toBeUndefined()
  })

  test('🔴🔴🔴★★★★★★【累计伤害也算进去】先打 2 再打 6 ⇒ 第二击的过量是 5(2+6-3)', () => {
                                                      
    let s = scene([tryn(), unit('foe', P2, 3)])
    s = hit(s, 'foe', 2)
    expect(s.maxExcessDamageThisTurn?.[P1], '★第一击没打穿').toBeUndefined()
    s = hit(s, 'foe', 6)
    expect(s.maxExcessDamageThisTurn?.[P1], '★★★(2+6)-3 = 5').toBe(5)
  })

  test('🔴🔴🔴★★★★★★【打自家单位不算】卡文写的是「给**敌方**单位造成」', () => {
    const s = hit(scene([tryn(), unit('mine', P1, 3)]), 'mine', 9, P1)
    expect(s.maxExcessDamageThisTurn?.[P1], '★★★自伤不记账').toBeUndefined()
  })

  test('🔴🔴🔴★★★★★★【取 max 不是求和】两次各过量 3 ⇒ 账上是 3,不是 6', () => {
                                              
    let s = scene([tryn(), unit('a', P2, 3), unit('b', P2, 3)])
    s = hit(s, 'a', 6)        
    s = hit(s, 'b', 6)        
    expect(s.maxExcessDamageThisTurn?.[P1], '★★★求和写法会给 6').toBe(3)
    expect(bonus(s), '★★★所以还不够 5,不加分').toBe(0)
  })

  test('🔴🔴🔴★★★★★★【端到端】真打一刀 ⇒ 征服时真的多拿 1 分', () => {
                                             
    const hooks = { bonusPoints: scoringBonus }
    let s = scene([tryn(), unit('foe', P2, 3)])
    const before = attemptConquer(s, P1, BF0, {}, hooks)
    expect((before.state.scores as Record<string, number>)[P1 as string], '★前提:没打过量时是 1 分').toBe(1)
    s = hit(s, 'foe', 9)        
    const after = attemptConquer(s, P1, BF0, {}, hooks)
    expect((after.state.scores as Record<string, number>)[P1 as string], '★★★1 + 1 = 2').toBe(2)
  })

  test('🔴🔴★★★★★★【据守端到端】同样盘面据守只拿 1 分(时机门在真流程里也生效)', () => {
    const hooks = { bonusPoints: scoringBonus }
    const s = hit(scene([tryn(), unit('foe', P2, 3)]), 'foe', 9)
    const r = attemptHold(s, P1, BF0, {}, hooks)
    expect((r.state.scores as Record<string, number>)[P1 as string], '★★★据守不吃这条').toBe(1)
  })

  test('🔴🔴★★★★★★【回合末清账】过了回合就不算了', () => {
    const s = hit(scene([tryn(), unit('foe', P2, 3)]), 'foe', 9)
    expect(bonus(s), '★前提:本回合加').toBe(1)
    expect(bonus(resetTurnLedgers(s)), '★★★清账后不加').toBe(0)
  })
})
