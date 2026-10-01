import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { specLookup } from '../../data/decks'
import { EXPECTED_TRIGGER_ZONE_DEFIDS } from '../support/triggerZoneDefIds'
import { OGN_006, OGN_006_PAY, OGN_006_CARD_EFFECT, discardedSelf006, makeGrenade006Trigger } from '../../data/cards/OGN-006'

                                                    
                                       
  
                         
                                                            
                                           
                                                                               
                                                                
  
                                                            
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'nade'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [],
    baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}
function scene(objs: readonly GameObject[], runes: Record<string, number> = { red: 3, blue: 3 }): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana: 9, runes } },
  } as unknown as GameState
}
const trig = (selfOid = SELF, ctrl = P1) => makeGrenade006Trigger(asObjId(selfOid), ctrl)
                                                    
const discardEv = (oid = SELF, to = `discard:${P1}`): GameEvent =>
  ({ kind: 'zoneChange', obj: asObjId(oid), to: asZoneId(to), from: asZoneId(`hand:${P1}`), defId: 'OGN-006' } as unknown as GameEvent)

describe('🔴🔴🔴★★★★★★579 嚼火者手雷:前提与接线', () => {
  test('★前提:3费 **0pip** 红 3[S] 单位,不印关键词', () => {
    expect(CARD_COSTS['OGN-006'], '★★★卡数据是 0 pip').toEqual({ mana: 3, pips: 0, colors: ['red'] })
    expect(cardCost('OGN-006'), '★★★UNIT_COST 也不该带 pips').toEqual({ mana: 3 })
    expect(cardKind('OGN-006')).toBe('unit')
    expect(specLookup('OGN-006').baseMight).toBe(3)
    expect(cardKeywords('OGN-006')).toEqual([])
    expect(OGN_006_CARD_EFFECT).toBe('当你弃置我时，你可以选择支付{{红色}}，改为将我打出到场上。')
  })

  test('🔴🔴🔴★★★★★★【两本账】门槛费是 1 枚【红 pip】,不是 1 点法力', () => {
                                                      
    expect(OGN_006_PAY, '★★★写成 { mana: 1 } 这条会红').toEqual({ pips: [['red']] })
  })

  test('🔴🔴🔴★★★★★★活跃区必须加宽到 hand+discard —— 少这一行整条触发就是死的', () => {
    expect([...EXPECTED_TRIGGER_ZONE_DEFIDS], '★进了那份唯一的清单').toContain('OGN-006')
    const inHand = scene([obj(SELF, 'OGN-006', P1, `hand:${P1}`)])
    expect(activeTriggers(inHand).filter((t) => t.sourceOid === asObjId(SELF)).length, '★手牌里就得活着').toBe(1)
                                              
    const inDiscard = scene([obj(SELF, 'OGN-006', P1, `discard:${P1}`)])
    expect(activeTriggers(inDiscard).filter((t) => t.sourceOid === asObjId(SELF)).length, '★★★落地后在这儿').toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★579 时机:「当你弃置我时」= 手牌→废牌堆', () => {
  const ok = (ev: GameEvent, st: GameState): boolean => trig().filter!(ev, st)
  const st = () => scene([obj(SELF, 'OGN-006', P1, `discard:${P1}`)])

  test('🔴🔴🔴★★★★★★正例:手牌→废牌堆,且是刚落进来的那张', () => {
    expect(ok(discardEv(), st())).toBe(true)
  })

  test('🔴🔴🔴★★★★★★【来源门】从战场进废牌堆(= 被摧毁)不算弃置', () => {
    const ev = { ...(discardEv() as object), from: asZoneId(BF0) } as unknown as GameEvent
    expect(ok(ev, st()), '★★★不判 from 的话被摧毁也会白捡一次复活').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【去向门】手牌→别处(如放逐区)不算弃置', () => {
    const ev = { ...(discardEv() as object), to: asZoneId(`banish:${P1}`) } as unknown as GameEvent
    expect(ok(ev, st())).toBe(false)
  })

  test('🔴🔴🔴★★★★★★【去重门·会换答案】废牌堆里已躺着同名卡 ⇒ 只有【刚落进来的】那张响', () => {
                                                 
                                                    
    const s = scene([obj('old', 'OGN-006', P1, `discard:${P1}`), obj(SELF, 'OGN-006', P1, `discard:${P1}`)])
    expect(discardedSelf006(discardEv(SELF), s, asObjId(SELF)), '★★★刚落进来的这张:响').toBe(true)
    expect(discardedSelf006(discardEv(SELF), s, asObjId('old')), '★★★躺着的那张:不响').toBe(false)
  })

  test('🔴🔴★★★★★★【身份门】别人的同族弃牌不算(defId 不是我)', () => {
    const ev = { ...(discardEv() as object), defId: 'VEN-094' } as unknown as GameEvent
    expect(ok(ev, st())).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★579 门槛费:§383.3.b 付不起 ⇒ 整条不确认', () => {
  const basePerform = trig().basePerform!

  test('🔴🔴🔴★★★★★★【会换答案】有红符能 ⇒ 付得起(返回新 state,不是 null)', () => {
    const s = scene([obj(SELF, 'OGN-006', P1, `discard:${P1}`)], { red: 3 })
    const out = basePerform(s, discardEv())
    expect(out, '★★★付得起就该给出扣完的 state').not.toBeNull()
    expect((out as GameState).runePools[P1]!.runes['red'], '★★★真扣了一枚').toBe(2)
  })

  test('🔴🔴🔴★★★★★★【另一个方向】只有蓝符能 ⇒ 付不起 ⇒ null(费用也不扣)', () => {
                                                 
                                                       
    const s = scene([obj(SELF, 'OGN-006', P1, `discard:${P1}`)], { blue: 3 })
    expect(basePerform(s, discardEv()), '★★★付不起 ⇒ §383.3.b.1 不确认 = 视为未触发').toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★579 效果:「改为将我打出到场上」', () => {
  const effect = trig().effect!

  test('🔴🔴🔴★★★★★★【会换答案】在废牌堆里 ⇒ 发一条把【我自己】打出的 playUnit', () => {
    const s = scene([obj(SELF, 'OGN-006', P1, `discard:${P1}`)])
    const evs = effect(s, discardEv(), {}) as readonly { kind: string; unit?: string; play?: { card?: string; to?: string; cost?: unknown } }[]
    expect(evs.length, '★★★不发事件的话这张牌就烂在废牌堆里了').toBe(1)
    expect(evs[0]!.kind).toBe('playUnit')
    expect(evs[0]!.play?.card, '★★★打出的是【我自己】').toBe(SELF)
    expect(evs[0]!.play?.to, '★缺省落点是基地(§359.2.c)').toBe(`base:${P1}`)
    expect(evs[0]!.play?.cost, '★★★打出费不再付:门槛费{红色}就是全部代价').toEqual({})
  })

  test('🔴🔴🔴★★★★★★【承重·结算期复判】牌已被别的效果从废牌堆动走 ⇒ 一条都不发', () => {
                                                 
    const s = scene([obj(SELF, 'OGN-006', P1, `banish:${P1}`)])
    expect(effect(s, discardEv(), {}).length, '★★★不复判的话会从放逐区把它捞回场上').toBe(0)
  })

  test('🔴🔴★★★★★★【落点·非法值兜底】玩家答了个我控制不了的战场 ⇒ 回落到基地', () => {
    const s = scene([obj(SELF, 'OGN-006', P1, `discard:${P1}`)])
    const evs = effect(s, discardEv(), { to: 'battlefield:shared:9' }) as readonly { play?: { to?: string } }[]
    expect(evs[0]!.play?.to, '★★★服务端权威:答案不在合法集里就不认').toBe(`base:${P1}`)
  })
})
