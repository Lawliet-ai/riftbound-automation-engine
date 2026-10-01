import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind, cardPassives, cardCost, entryReadyFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_FACTS } from '../../data/cardFacts'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import {
  OGN_079, OGN_079_CARD_EFFECT, OGN_079_SCORE_GAP, OGN_079_MIGHT_DELTA, OGN_079_MIGHT_FLOOR,
  leonaEnterReady, leonaStunnedScope,
} from '../../data/cards/OGN-079'

                                                        
                                            
                                                    
                                                            
                                                                    
                                   
  
             
                                                                  
                                                                         

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (
  oid: string, ctrl = P2, zone = BF0, might = 6, stunned = false, defId = 'OGN-012',
): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: stunned ? { stunned: true } : {},
} as unknown as GameObject)
                      
const leona = (oid = 'leo', ctrl = P1, zone = BF0): GameObject => obj(oid, ctrl, zone, 6, false, 'OGN-079')

function scene(objs: readonly GameObject[], scores: Record<string, number> = {}, winTarget = 8): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...base, activePlayer: P1, phase: 'main', objects, zones, winTarget,
    scores: { ...base.scores, ...scores },
  } as GameState)
}
const might = (s: GameState, oid: string): number => effectiveMight(s.objects[asObjId(oid)]!).reference

describe('🔴🔴🔴★★★★★★607 蕾欧娜:前提与接线', () => {
  test('★前提:英雄单位 6费 **1枚绿pip** 6[S]、**两印次**、卡文一字不差', () => {
    expect(CARD_COSTS['OGN-079'], '★★★pips: 1 —— 别按「绿卡多是0pip」想当然')
      .toEqual({ mana: 6, pips: 1, colors: ['green'] })
    expect(CARD_COSTS['OGN-079a']).toEqual({ mana: 6, pips: 1, colors: ['green'] })
    expect(cardKind('OGN-079')).toBe('unit')
    expect(CARD_FACTS['OGN-079']?.heroUnit).toBe(true)
    expect(OGN_079.energy).toBe(6)
    expect(OGN_079.power).toBe(6)
    expect(OGN_079.domains).toEqual(['green'])
    expect(OGN_079_CARD_EFFECT).toBe(
      '如果对手的得分距离胜利得分不超过3分，则我以活跃状态进场。\n此处被眩晕的敌方单位{{S}}-8,不得低于1{{S}}。')
  })

  test('🔴🔴🔴★★★★★★【会换答案】接线:`UNIT_COST` 登了 6费 **1枚绿pip**(★597/606 两次栽过)', () => {
                                                                       
    expect(cardCost('OGN-079')).toEqual({ mana: 6, pips: [['green']] })
  })

  test('🔴🔴🔴★★★★★★接线:进场活跃表**两个卡号都查得到**(再版走 variantAliases 折叠)', () => {
                                                 
                                                                           
                                                                
    const s = scene([], { [P2]: 5 })
    for (const id of ['OGN-079', 'OGN-079a']) {
      expect(entryReadyFor(s, P1, id), `★★★${id} 登记漏了 ⇒ 第一句是死的`).toBe(true)
    }
  })

  test('🔴🔴★★★★★★接线:群体被动表里有本卡(第二句是死的就在这儿露馅)', () => {
    const s = scene([leona(), obj('foe', P2, BF0, 6, true)])
    const mine = cardPassives(s.objects[asObjId('leo')]!, s)
    expect(mine.some((e) => e.id.includes('OGN-079'))).toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★607 第①句:「对手的得分距离胜利得分不超过3分」', () => {
  test('🔴🔴🔴★★★★★★【真判据·两个方向都推】差 3 成立、差 4 不成立(㉙ 边界两头压)', () => {
    expect(OGN_079_SCORE_GAP).toBe(3)
    expect(leonaEnterReady(scene([], { [P2]: 5 }), P1), '★8-5=3 ⇒ 不超过3').toBe(true)
    expect(leonaEnterReady(scene([], { [P2]: 4 }), P1), '★★★8-4=4 ⇒ 超过3,不给活跃').toBe(false)
    expect(leonaEnterReady(scene([], { [P2]: 8 }), P1), '★对手已经满分 ⇒ 更成立').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「胜利得分」**现读 `winTarget`**,不是写死 8', () => {
                                                                
    expect(leonaEnterReady(scene([], { [P2]: 5 }, 10), P1), '★★★winTarget=10 时 5 分还差 5').toBe(false)
    expect(leonaEnterReady(scene([], { [P2]: 7 }, 10), P1), '★同一局面到 7 分才成立').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】判的是**对手**的分,**我自己**逼近胜利不算', () => {
    expect(leonaEnterReady(scene([], { [P1]: 8, [P2]: 0 }), P1), '★★★漏掉「对手」这半会自己给自己开').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】多人局:**任一**对手满足即可(卡文没写「所有」)', () => {
    const P3 = asPlayerId('P3')
    const base = createInitialState([P1, P2, P3], 2)
    const s = { ...base, winTarget: 8, scores: { ...base.scores, [P2]: 0, [P3]: 6 } } as GameState
    expect(leonaEnterReady(s, P1), '★★★写成 every 这条当场红(P2 才 0 分)').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【真接线·端到端】条件成立=不休眠进场;不成立=照常休眠', () => {
    expect(entryReadyFor(scene([], { [P2]: 5 }), P1, 'OGN-079'), '★成立 ⇒ 活跃进场').toBe(true)
    expect(entryReadyFor(scene([], { [P2]: 4 }), P1, 'OGN-079'),
      '★★★不成立 ⇒ 走 §359.2.c 默认的休眠进场').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★607 第②句:「此处被眩晕的敌方单位{S}-8,不得低于1」', () => {
  test('🔴🔴🔴★★★★★★【真结算·floor 承重】6[S] 被眩晕的敌方 ⇒ **1**,不是 -2', () => {
    expect(OGN_079_MIGHT_DELTA).toBe(-8)
    expect(OGN_079_MIGHT_FLOOR).toBe(1)
    const s = scene([leona(), obj('foe', P2, BF0, 6, true)])
    expect(might(s, 'foe'), '★★★没 floor 会算成 6-8=-2').toBe(1)
  })

  test('🔴🔴🔴★★★★★★【会换答案·floor 别误伤】20[S] 的被眩晕敌方 ⇒ **12**(减法照常生效)', () => {
    const s = scene([leona(), obj('big', P2, BF0, 20, true)])
    expect(might(s, 'big'), '★★★floor 只兜底、不该把所有人钉在 1').toBe(12)
  })

  test('🔴🔴🔴★★★★★★【会换答案】**没被眩晕**的敌方不减', () => {
    const s = scene([leona(), obj('awake', P2, BF0, 6, false)])
    expect(might(s, 'awake'), '★★★漏 isStunned 会把全场敌方打残').toBe(6)
  })

  test('🔴🔴🔴★★★★★★【会换答案】被眩晕的**友方**不减(敌方按 controller 判)', () => {
    const s = scene([leona(), obj('ally', P1, BF0, 6, true)])
    expect(might(s, 'ally'), '★★★漏 controller 判据会打自己人').toBe(6)
  })

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「**此处**」——别处战场的被眩晕敌方不减', () => {
                                             
    const s = scene([leona('leo', P1, BF0), obj('far', P2, BF1, 6, true)])
    expect(might(s, 'far'), '★★★「此处」只管我脚下这一处').toBe(6)
                 
    const s2 = scene([leona('leo', P1, BF1), obj('far', P2, BF1, 6, true)])
    expect(might(s2, 'far'), '★蕾欧娜挪过去就减得到').toBe(1)
  })

  test('🔴🔴🔴★★★★★★【会换答案·场景要造到位】蕾欧娜**在基地**时整条不生效——连**我基地里的敌方单位**也不减', () => {
                                                
                                                            
                                       
                                                       
                                                            
    const s = scene([leona('leo', P1, `base:${P1}`), obj('stolen', P2, `base:${P1}`, 6, true)])
    expect(might(s, 'stolen'), '★★★「此处」只认战场(化神FAQ §359.3.f 结算档)').toBe(6)
    expect(leonaStunnedScope(s.objects[asObjId('stolen')]!, s.objects[asObjId('leo')]!, s)).toBe(false)
                                          
    const s2 = scene([leona('leo', P1, `base:${P1}`), obj('foe', P2, BF0, 6, true)])
    expect(might(s2, 'foe')).toBe(6)
  })

  test('🔴🔴★★★★★★scope 判据与派生结果同源(四道判据逐条推)', () => {
    const s = scene([leona(), obj('foe', P2, BF0, 6, true), obj('ally', P1, BF0, 6, true),
      obj('awake', P2, BF0, 6, false)])
    const self = s.objects[asObjId('leo')]!
    expect(leonaStunnedScope(s.objects[asObjId('foe')]!, self, s), '★命中').toBe(true)
    expect(leonaStunnedScope(s.objects[asObjId('ally')]!, self, s), '★友方').toBe(false)
    expect(leonaStunnedScope(s.objects[asObjId('awake')]!, self, s), '★没眩晕').toBe(false)
    expect(leonaStunnedScope(self, self, s), '★我自己(友方,也没眩晕)').toBe(false)
  })
})
