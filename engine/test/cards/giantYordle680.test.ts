import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { attemptHold, resetTurnLedgers } from '../../src/scoring/score'
import { computeCost } from '../../src/game/costPipeline'
import { giantYordleCostMods, SFD_055_DISCOUNT_MANA, SFD_055_DISCOUNT_PIPS } from '../../data/cards/cost-modifiers'
import { cardCost, cardKeywords, cardKind, costModsFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { SFD_055 } from '../../data/cards/SFD-055'

                                                               
                                                    
  
           
                                                            
                                                        
                                                                               
                                            
                                                                  
                                     
                                                       
                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const fresh = (): GameState => ({ ...createInitialState([P1, P2], 2), activePlayer: P1, phase: 'main' } as GameState)
const holdsOf = (s: GameState, p = P1 as string): number => s.holdsThisTurn?.[p] ?? 0
const withHolds = (n: number): GameState => ({ ...fresh(), holdsThisTurn: { [P1 as string]: n } } as GameState)

describe('★ 前提:①登记', () => {
  test('★★★★★单位 10费 3绿pip 5[S]、[坚守5][壁垒] 登了、两表一致(㊶)', () => {
    expect(CARD_COSTS['SFD-055']).toEqual({ mana: 10, pips: 3, colors: ['green'] })
    expect(cardKind('SFD-055')).toBe('unit')
    expect(SFD_055.power).toBe(5)
    expect(cardKeywords('SFD-055')).toEqual(['坚守5', '壁垒'])
    expect(cardCost('SFD-055')).toEqual({ mana: 10, pips: [['green'], ['green'], ['green']] })
  })
})

describe('★★★★★★★ ②据守动作账 holdsThisTurn', () => {
  test('★★★★★★scored 出口 +1;连续两战场各一次 ⇒ 2;敌方据守记敌方的键', () => {
    let s = fresh()
    s = attemptHold(s, P1, BF0).state
    expect(holdsOf(s)).toBe(1)
    s = attemptHold(s, P1, BF1).state
    expect(holdsOf(s), '★写=累加').toBe(2)
    s = attemptHold(s, P2, BF0).state
    expect(holdsOf(s, P2 as string), '★键=玩家').toBe(1)
    expect(holdsOf(s), '★敌方据守不进我的账').toBe(2)
  })

  test('★★★★★★QA L212 ⚡:据守被挡无得分(blocked)/改为抽牌(drawInstead)也 +1(据守本身发生了)', () => {
    const blocked = attemptHold(fresh(), P1, BF0, {}, { pointsBlockedAt: () => true })
    expect(blocked.result).toBe('blocked')
    expect(holdsOf(blocked.state), '★缇亚娜场景:无得分仍记账').toBe(1)
    const drawn = attemptHold(fresh(), P1, BF0, {}, { drawInsteadAt: () => true, drawCard: (s) => s })
    expect(drawn.result).toBe('drawInstead')
    expect(holdsOf(drawn.state), '★改为抽牌也是据守发生').toBe(1)
  })

  test('★★★★★alreadyScored 被 §470 拒 ⇒ 不记(动作没发生);resetTurnLedgers 清账', () => {
    let s = attemptHold(fresh(), P1, BF0).state
    const again = attemptHold(s, P1, BF0)
    expect(again.result).toBe('alreadyScored')
    expect(holdsOf(again.state), '★被拒那次不算').toBe(1)
    expect((resetTurnLedgers(again.state).holdsThisTurn ?? {})[P1 as string] ?? 0, '★清=回合末').toBe(0)
  })
})

describe('★★★★★★★ ③④减费件与端到端', () => {
  test('★★★★★★③0次=[];N次=两条(mana 2N + pips 1N,part 分开非 total);只封 SFD-055', () => {
    expect(giantYordleCostMods(withHolds(0), P1, 'SFD-055')).toEqual([])
    const one = giantYordleCostMods(withHolds(1), P1, 'SFD-055')
    expect(one).toHaveLength(2)
    expect(one[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana: SFD_055_DISCOUNT_MANA, floor: 0 })
    expect(one[1]).toMatchObject({ kind: 'reduce', part: 'pips', pips: SFD_055_DISCOUNT_PIPS, floor: 0 })
    const two = giantYordleCostMods(withHolds(2), P1, 'SFD-055')
    expect(two[0]!.mana, '★数额=次数×卡面额').toBe(4)
    expect(two[1]!.pips).toBe(2)
    expect(giantYordleCostMods(withHolds(3), P1, 'OGN-012'), '★「我的费用」只封自己').toEqual([])
    expect(giantYordleCostMods(withHolds(3), P2, 'SFD-055'), '★读的是打出者自己的账').toEqual([])
  })

  test('★★★★★★④端到端 computeCost:1次=8费2绿、2次=6费1绿、4次=2费0pip、6次=0费(floor 0)', () => {
    const at = (n: number) => computeCost(cardCost('SFD-055')!, giantYordleCostMods(withHolds(n), P1, 'SFD-055'))
    expect(at(1)).toEqual({ mana: 8, pips: [['green'], ['green']] })
    expect(at(2)).toEqual({ mana: 6, pips: [['green']] })
    expect(at(4)).toEqual({ mana: 2 })
    expect(at(6), '★floor 0 减到底').toEqual({ mana: 0 })
  })

  test('★★★★★⑤聚合接线:costModsFor 真吐两条(allCostMods 挂了才算数)', () => {
    const mods = costModsFor(withHolds(2), P1, 'SFD-055')
    const mine = mods.filter((m) => m.source?.includes('SFD-055'))
    expect(mine.map((m) => m.part)).toEqual(['mana', 'pips'])
  })
})
