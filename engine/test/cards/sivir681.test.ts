import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { payFromState, seedRunes } from '../../src/game/economy'
import { resetTurnLedgers } from '../../src/scoring/score'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardCost, cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { conditionHolds, SIVIR_PIPS_MIN } from '../../data/cards/conditional-self-passives'

                                                                  
                                                
                                                     
  
           
                                              
                                                              
                                               
                  
                                            
                                                          
                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

setCardPassiveProvider(cardPassives)

const sivir = (ctrl: PlayerId = P1): GameObject => ({
  oid: asObjId('sv'), defId: 'SFD-143', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 4, baseKeywords: ['急速'], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], pips: Record<string, number> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(Object.keys(pips).length > 0 ? { pipsPaidThisTurn: pips } : {}) } as GameState
}

const kwOf = (s: GameState): string[] => {
  const o = recomputeContinuous(s).objects[asObjId('sv')]!
  return [...(o.derived?.keywords ?? o.baseKeywords ?? [])].sort()
}
const mightOf = (s: GameState): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId('sv')]!).actual
const paidOf = (s: GameState, p: PlayerId = P1): number => s.pipsPaidThisTurn?.[p as string] ?? 0

describe('★ 前提:①登记/双印次', () => {
  test('★★★★★英雄单位 4费 1紫pip 4[S]、[急速] 两号都登、variant 两号一组、UNIT_COST 带 pip', () => {
    expect(CARD_COSTS['SFD-143']).toEqual({ mana: 4, pips: 1, colors: ['purple'] })
    expect(cardKind('SFD-143')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-143']).toEqual(['SFD-143', 'SFD-143a'])
    expect(cardKeywords('SFD-143')).toEqual(['急速'])
    expect(cardKeywords('SFD-143a'), '★异画号同登(§805 登了才真生效)').toEqual(['急速'])
    expect(cardCost('SFD-143')).toEqual({ mana: 4, pips: [['purple']] })
    expect(SIVIR_PIPS_MIN, '★「{A}{A}」= 两枚(㊶ 数额一处)').toBe(2)
  })
})

describe('★★★★★★★ ②第二十二本账:payFromState 写账', () => {
  test('★★★★★★回收符文付 pip 入账;纯法力不入账({A} 是符能记号);账累加', () => {
    let s = seedRunes(createInitialState([P1, P2], 2), P1, 'purple', 8)
    const r1 = payFromState(s, P1, { mana: 1, pips: [['purple'], ['purple']] })
    expect(r1.ok).toBe(true)
    expect(paidOf(r1.state), '★回收 2 枚符文 = 支付 2 枚符能').toBe(2)
    const r2 = payFromState(r1.state, P1, { mana: 2 })
    expect(paidOf(r2.state), '★纯法力(横置)不入符能账').toBe(2)
    const r3 = payFromState(r2.state, P1, { pips: [['purple']] })
    expect(paidOf(r3.state), '★写=累加').toBe(3)
  })

  test('★★★★★★符能池扣减也入账({获得} 存池那路);付不起 ok:false 不入账;敌我键分开', () => {
    const base = createInitialState([P1, P2], 2)
    const pooled = { ...base, runePools: { ...base.runePools, [P1]: { mana: 0, runes: { purple: 2 } } } } as GameState
    const r = payFromState(pooled, P1, { pips: [['purple'], ['purple']] })
    expect(r.ok).toBe(true)
    expect(paidOf(r.state), '★池里的符能支付同样是「支付了{A}」').toBe(2)
    const broke = payFromState(base, P1, { pips: [['purple']] })
    expect(broke.ok).toBe(false)
    expect(paidOf(broke.state), '★付不起 ⇒ 没支付 ⇒ 不入账').toBe(0)
    const s2 = seedRunes(base, P2, 'red', 4)
    const rp2 = payFromState(s2, P2, { pips: [['red']] })
    expect(paidOf(rp2.state, P2), '★键=玩家').toBe(1)
    expect(paidOf(rp2.state), '★对手的支付不进我的账').toBe(0)
  })

  test('★★★★★resetTurnLedgers 清账(第二十二本与其余同批)', () => {
    const s = { ...createInitialState([P1, P2], 2), pipsPaidThisTurn: { [P1 as string]: 5 } } as GameState
    expect(paidOf(resetTurnLedgers(s)), '★清=回合末').toBe(0)
  })
})

describe('★★★★★★★ ③④条件档与 derived 端到端', () => {
  test('★★★★★★③「至少{A}{A}」= ≥2:0/1 不成立、2/3 成立(㉙ 边界);「你」=控制者的账', () => {
    const o = sivir()
    for (const [n, want] of [[0, false], [1, false], [2, true], [3, true]] as const) {
      expect(conditionHolds('paidTwoPipsThisTurn', o, scene([o], { [P1 as string]: n })), `账=${n}`).toBe(want)
    }
    expect(conditionHolds('paidTwoPipsThisTurn', o, scene([o], { [P2 as string]: 5 })), '★对手付得再多也不是「你」').toBe(false)
  })

  test('★★★★★★④derived:账 2 ⇒ [游走]+[急速] 且战力 6;账 1 ⇒ 无游走战力 4(predicate 现判)', () => {
    const rich = scene([sivir()], { [P1 as string]: 2 })
    expect(kwOf(rich)).toEqual(['急速', '游走'])
    expect(mightOf(rich), '★4+2(「我获得{S}+2」同条件双效果)').toBe(6)
    const poor = scene([sivir()], { [P1 as string]: 1 })
    expect(kwOf(poor), '★条件一不满足关键词就没有(常驻被动,不是一次性)').toEqual(['急速'])
    expect(mightOf(poor)).toBe(4)
  })
})
