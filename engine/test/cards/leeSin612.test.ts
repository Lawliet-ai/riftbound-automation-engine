import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind, cardCost, cardKeywords, cardPassives } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_FACTS } from '../../data/cardFacts'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { BUFF_COUNTER } from '../../src/keywords/buff'
import {
  OGN_151, OGN_151_CARD_EFFECT, OGN_151_KEYWORDS, OGN_151_BONUS, leeSinScope,
} from '../../data/cards/OGN-151'

                                                                    
                                         
                                                    
                                                          
                                                        
  
                                            
                                                                        
                                                      
                                                            

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = 'lee'

const unit = (
  oid: string, ctrl = P1, zone = BF0, buffed = false, might = 3,
): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: buffed ? { [BUFF_COUNTER]: 1 } : {}, status: {},
} as unknown as GameObject)
                                                     
const leeSin = (zone = BF0, buffed = false): GameObject =>
  ({ ...unit(SELF, P1, zone, buffed, 6), defId: 'OGN-151' } as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState)
}
const might = (s: GameState, oid: string): number => effectiveMight(s.objects[asObjId(oid)]!).reference
const scoped = (s: GameState, oid: string): boolean =>
  leeSinScope(s.objects[asObjId(oid)]!, s.objects[asObjId(SELF)]!, s)

describe('🔴🔴🔴★★★★★★612 李青:前提与接线', () => {
  test('★前提:英雄单位 6费 **0pip** 橙 6[S]、印[急速]、**两印次**、卡文一字不差', () => {
    expect(CARD_COSTS['OGN-151']).toEqual({ mana: 6, pips: 0, colors: ['orange'] })
    expect(CARD_COSTS['OGN-151a']).toEqual({ mana: 6, pips: 0, colors: ['orange'] })
    expect(cardKind('OGN-151')).toBe('unit')
    expect(CARD_FACTS['OGN-151']?.heroUnit).toBe(true)
    expect(OGN_151.energy).toBe(6)
    expect(OGN_151.power).toBe(6)
    expect(OGN_151.domains).toEqual(['orange'])
    expect(OGN_151_CARD_EFFECT).toBe(
      '{{急速}}(你可以选择额外支付{{1}}和{{橙色}},让我以活跃状态进场。）\n我所在战场上其他拥有增益的友方单位获得{{S}}+2。')
  })

  test('🔴🔴🔴★★★★★★【会换答案】接线:[急速] **必须登** `CARD_KEYWORDS`(与 ★608 的[强化]正相反)', () => {
    expect(OGN_151_KEYWORDS).toEqual(['急速'])
    for (const id of ['OGN-151', 'OGN-151a']) {
      expect(cardKeywords(id), `★★★${id} 漏登 ⇒ §805 的额外费用与活跃进场整条不生效`).toContain('急速')
    }
    expect(cardCost('OGN-151'), '★★★登了被动就得登费用;0pip 别写成有 pip').toEqual({ mana: 6 })
  })

  test('🔴🔴★★★★★★接线:群体被动表里有本卡(第二句是死的就在这儿露馅)', () => {
    const s = scene([leeSin(), unit('ally', P1, BF0, true)])
    expect(cardPassives(s.objects[asObjId(SELF)]!, s).some((e) => e.id.includes('OGN-151'))).toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★612 第二句:四道判据逐条推', () => {
  test('🔴🔴🔴★★★★★★【真结算】同处 + 有增益 + 友方 + 不是我 ⇒ **+2**', () => {
    expect(OGN_151_BONUS).toBe(2)
                                               
    const s = scene([leeSin(), unit('ally', P1, BF0, true)])
    expect(scoped(s, 'ally')).toBe(true)
    expect(might(s, 'ally'), '★★★3 印刷 + 1 增益 + 2 李青 = 6').toBe(6)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**其他**」——**我自己**不吃这条(哪怕我也有增益)', () => {
                                                         
    const s = scene([leeSin(BF0, true), unit('ally', P1, BF0, true)])
    expect(scoped(s, SELF), '★★★漏掉「其他」这条当场红').toBe(false)
    expect(might(s, SELF), '★6 印刷 + 1 增益 = 7,**没有** +2').toBe(7)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「拥有**增益**」——没增益的友方不吃', () => {
    const s = scene([leeSin(), unit('plain', P1, BF0, false)])
    expect(scoped(s, 'plain'), '★★★漏 hasBuff 会给全场友军 +2').toBe(false)
    expect(might(s, 'plain')).toBe(3)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**友方**」——对手带增益的单位不吃', () => {
    const s = scene([leeSin(), unit('foe', P2, BF0, true)])
    expect(scoped(s, 'foe'), '★★★漏 controller 会加强敌方').toBe(false)
    expect(might(s, 'foe'), '★只有增益自带的 +1').toBe(4)
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「**我所在战场上**」——别处战场的不吃', () => {
                                             
    const s = scene([leeSin(BF0), unit('far', P1, BF1, true)])
    expect(scoped(s, 'far'), '★★★「我所在战场」只管我脚下这一处').toBe(false)
    expect(might(s, 'far')).toBe(4)
                    
    const s2 = scene([leeSin(BF1), unit('far', P1, BF1, true)])
    expect(might(s2, 'far')).toBe(6)
  })

  test('🔴🔴🔴★★★★★★【会换答案】李青**在基地**时整条不生效(`selfBattlefield` 只认战场)', () => {
                                                      
    const s = scene([leeSin(`base:${P1}`), unit('atBase', P1, `base:${P1}`, true)])
    expect(scoped(s, 'atBase'), '★★★㊼ selfBattlefield 在基地时返回 undefined').toBe(false)
    expect(might(s, 'atBase')).toBe(4)
  })

  test('🔴🔴★★★★★★加成**不带 floor**、也不外溢(卡文没写下限;★607 那张才有)', () => {
    const s = scene([leeSin(), unit('a', P1, BF0, true), unit('b', P1, BF0, true, 1)])
    expect(might(s, 'a')).toBe(6)
    expect(might(s, 'b'), '★1 印刷 + 1 增益 + 2 = 4(纯加法,没有下限夹取)').toBe(4)
  })
})
