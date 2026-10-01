import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  UNL_218, UNL_218_CARD_EFFECT, UNL_218_COST_MANA, EXTRA_BF_DEFIDS, makeIdolValleyTrigger,
} from '../../data/cards/battlefields-extra'

                                                 
                                                
                                                 
                                         
  
                                             
                                          
                                                     
                                                                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const unit = (oid: string, ctrl: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                     
const rune = (oid: string, ctrl: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: 'rune:red', owner: ctrl, controller: ctrl, zone: asZoneId(`base:${ctrl}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
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
   
                      
                                                                             
                                                                  
                                              
                                                
   
const playUnit = (who: PlayerId, oid: string, at: string): GameEvent =>
  ({ kind: 'playUnit', unit: asObjId(oid), player: who, at } as unknown as GameEvent)
                             
const trig = (who: PlayerId, bf = BF0) => makeIdolValleyTrigger(bf, who)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)

describe('🔴🔴🔴★★★★★★616 偶像谷:前提与接线', () => {
  test('★前提:**战场卡** colorless 0费、**单印次**、卡文一字不差', () => {
    expect(cardKind('UNL-218')).toBe('battlefield')
    expect(CARD_COSTS['UNL-218']).toEqual({ mana: 0, pips: 0, colors: ['colorless'] })
    expect(CARD_COSTS['UNL-218a'], '★单印次:没有 a 号').toBeUndefined()
    expect(UNL_218.category).toBe('battlefield')
    expect(UNL_218_CARD_EFFECT).toBe(
      '当一名玩家在此处打出一名单位时，该玩家可以选择支付{{1}}，以此给予该单位{{增益}}。（未拥有增益的单位获得一个{{S}}+1增益。）')
  })

  test('🔴🔴🔴★★★★★★接线:进了战场卡工厂表(`EXTRA_BF_DEFIDS` 是从表算出来的,漏登就查不到)', () => {
    expect(EXTRA_BF_DEFIDS, '★★★登记漏了 ⇒ 这张战场卡是死的').toContain('UNL-218')
    expect(trig(P1).event).toBe('playUnit')
    expect(trig(P1).by, '★「**一名**玩家」——不分敌我').toBe('any')
    expect(trig(P1).mayChoose, '★「可以选择」').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★616 判据:「一名玩家在此处打出一名单位」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「在此处」比的是 **`ev.at`**(★1154 缺陷 120 前写的是 `ev.to`);别处战场不触发', () => {
                                                                                         
    const s = scene([unit('u', P1)])
    expect(trig(P1).filter?.(playUnit(P1, 'u', BF0), s) ?? true, '★落在此处 ⇒ 触发').toBe(true)
    expect(trig(P1).filter?.(playUnit(P1, 'u', BF1), s) ?? true, '★★★落在别处战场 ⇒ 不触发').toBe(false)
    expect(trig(P1).filter?.(playUnit(P1, 'u', `base:${P1}`), s) ?? true, '★打到基地也不算').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**一名**玩家」——**对手**在此处打单位,**对手那一份**照样触发', () => {
                                                
    const s = scene([unit('u', P2)])
    expect(trig(P2).filter?.(playUnit(P2, 'u', BF0), s) ?? true, '★★★对手那份中').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**该**玩家」——**我**那一份对【对手打出】不响', () => {
    const s = scene([unit('u', P2)])
    expect(trig(P1).filter?.(playUnit(P2, 'u', BF0), s) ?? true,
      '★★★漏掉 eventPlayerIs 会让【我】替对手付钱/作答').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★616 效果:「可以选择支付{1},以此给予该单位增益」', () => {
  test('🔴🔴🔴★★★★★★【真结算】付费在前、给增益在后;增益打在**被打出的那名单位**上', () => {
    expect(UNL_218_COST_MANA).toBe(1)
    const s = scene([unit('u', P1), rune('r1', P1)])
    const evs = trig(P1).effect(s, playUnit(P1, 'u', BF0), {}) as readonly GameEvent[]
    expect(kinds(evs), '★★★费用在前、收益在后').toEqual(['spend', 'grantBuff'])
    expect(evs[0], '★★★{1}是**法力**不是符能(与 ★613 的{红色}正相反)')
      .toMatchObject({ cost: { mana: 1 } })
    expect(evs[1], '★★★打在 eventSubject 上,不是战场卡自己').toMatchObject({ target: 'u' })
  })

  test('🔴🔴🔴★★★★★★【会换答案】付不出{1} ⇒ **整条不执行**,不能白给增益(㊹)', () => {
                                                  
    const broke = scene([unit('u', P1)])
    expect(trig(P1).effect(broke, playUnit(P1, 'u', BF0), {}) as readonly GameEvent[],
      '★★★一条都不发').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】增益给的是**对手打出的那名**(费用也归对手那一份)', () => {
    const s = scene([unit('foe', P2), rune('fr', P2)])
    const evs = trig(P2).effect(s, playUnit(P2, 'foe', BF0), {}) as readonly GameEvent[]
    expect(kinds(evs)).toEqual(['spend', 'grantBuff'])
    expect(evs[0], '★★★付钱的是**对手**,不是战场卡控制者').toMatchObject({ player: P2 })
    expect(evs[1]).toMatchObject({ target: 'foe' })
  })
})
