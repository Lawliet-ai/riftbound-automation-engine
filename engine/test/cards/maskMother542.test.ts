import { describe, expect, test } from 'vitest'
import { EXPECTED_TRIGGER_ZONE_DEFIDS } from '../support/triggerZoneDefIds'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind, cardKeywords } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  VEN_094, VEN_094_BONUS, VEN_094_PAY, makeMaskMother094Trigger,
} from '../../data/cards/VEN-094'

                                              
                                                
                                
  
                                    
                                                        
                                                             
                                                                      
                                          
  
                                                                      
                                             
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'mom'

function obj(
  oid: string, defId: string, ctrl = P1, zone = BF0,
  types: readonly string[] = ['unit'], owner = ctrl,
): GameObject {
  return {
    oid: asObjId(oid), defId, owner, controller: ctrl, zone: asZoneId(zone),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [],
    baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}

function scene(objs: readonly GameObject[], mana = 9): GameState {
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
    runePools: {
      ...base.runePools,
      [P1]: { mana, runes: { purple: 3, red: 3, blue: 3, colorless: 3 } },
    },
  } as unknown as GameState
}

const trig = (selfOid = SELF, ctrl = P1) => makeMaskMother094Trigger(asObjId(selfOid), ctrl)
                                                    
const discardEv = (oid = SELF, to = `discard:${P1}`): GameEvent =>
  ({ kind: 'zoneChange', obj: asObjId(oid), to: asZoneId(to), from: asZoneId(`hand:${P1}`), defId: 'VEN-094' } as unknown as GameEvent)

describe('★ 前提:卡面与接线', () => {
  test('★3费 0pip 紫 3[S] 单位,不印任何关键词', () => {
    expect(CARD_COSTS['VEN-094']).toEqual({ mana: 3, pips: 0, colors: ['purple'] })
    expect(cardKind('VEN-094')).toBe('unit')
    expect(cardCost('VEN-094'), '★进了 UNIT_COST').toEqual({ mana: 3 })
    expect(specLookup('VEN-094').baseMight).toBe(3)
    expect(cardKeywords('VEN-094'), '★卡面一个关键词都没印').toEqual([])
    expect(VEN_094.category).toBe('unit')
  })

  test('🔴★★★★★★活跃区域必须加宽到 hand+discard —— 少这一行整条触发就是死的', () => {
    expect([...EXPECTED_TRIGGER_ZONE_DEFIDS], '★进了那份唯一的清单').toContain('VEN-094')
                                                   
    const inHand = scene([obj(SELF, 'VEN-094', P1, `hand:${P1}`)])
    expect(activeTriggers(inHand).filter((t) => t.sourceOid === asObjId(SELF)).length).toBe(1)
                                                  
    const inDiscard = scene([obj(SELF, 'VEN-094', P1, `discard:${P1}`)])
    expect(activeTriggers(inDiscard).filter((t) => t.sourceOid === asObjId(SELF)).length).toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★时机:「当你弃置我时」= 手牌→废牌堆', () => {
  const ok = (ev: GameEvent, st: GameState): boolean => trig().filter!(ev, st)
  const st = () => scene([obj(SELF, 'VEN-094', P1, `discard:${P1}`)])

  test('🔴★★★★★★正例:手牌→废牌堆,而且是刚落进来的那张', () => {
    expect(ok(discardEv(), st())).toBe(true)
  })

  test('🔴★★★★★★【来源门】从战场进废牌堆(= 被摧毁)不算弃置', () => {
    const ev = { ...(discardEv() as object), from: asZoneId(BF0) } as unknown as GameEvent
    expect(ok(ev, st()), '★被摧毁 ≠ 被弃置').toBe(false)
  })

  test('🔴★★★★★★【去向门】手牌→放逐区不算弃置', () => {
    const s = scene([obj(SELF, 'VEN-094', P1, `exile:${P1}`)])
    expect(ok(discardEv(SELF, `exile:${P1}`), s)).toBe(false)
  })

  test('🔴★★★★★★【身份门】比的是 defId 不是 oid(跨区会换发新 oid)', () => {
    const ev = { ...(discardEv() as object), defId: 'OGN-182' } as unknown as GameEvent
    expect(ok(ev, st()), '★别人被弃置不该点着我').toBe(false)
  })

  test('🔴★★★★★★【去重门】废牌堆里已躺着同名卡时,只有刚落进来的那张算', () => {
                                                        
                                                   
    const s = scene([
      obj('old', 'VEN-094', P1, `discard:${P1}`),
      obj(SELF, 'VEN-094', P1, `discard:${P1}`),
    ])
    expect(trig(SELF).filter!(discardEv(), s), '★刚进来的那张:算').toBe(true)
    expect(trig('old').filter!(discardEv(), s), '★★★坟里那张老的:不算').toBe(false)
  })
})

describe('🔴🔴★★★★★★门槛费用:「你可以选择支付{{1}}」', () => {
  test('★★「你可以选择」在效果开头 ⇒ §383.3.a 确认阶段决定', () => {
    expect(trig().mayChoose, '★没有它就变成强制触发了').toBe(true)
  })

  test('🔴★★★★★★付的是【1 点法力】,不是 pip(卡文写的是数字不是颜色)', () => {
    expect(VEN_094_PAY).toEqual({ mana: 1 })
                                                               
    expect((VEN_094_PAY as { pips?: unknown }).pips).toBeUndefined()
  })

  test('🔴★★★★★★付得起:扣掉 1 点法力,盘面往前走', () => {
    const before = scene([obj(SELF, 'VEN-094', P1, `discard:${P1}`)], 5)
    const after = trig().basePerform!(before, discardEv())
    expect(after, '★付得起 ⇒ 不是 null').not.toBeNull()
    expect(after!.runePools[P1 as string]!.mana, '★5 - 1').toBe(4)
  })

  test('🔴★★★★★★付不起:返回 null(§383.3.b.1 整条不确认)且【费用一点没扣】', () => {
    const before = scene([obj(SELF, 'VEN-094', P1, `discard:${P1}`)], 0)
    expect(trig().basePerform!(before, discardEv()), '★一点法力都没有').toBeNull()
    expect(before.runePools[P1 as string]!.mana, '★盘面没被动过').toBe(0)
  })
})

describe('🔴🔴🔴★★★★★★收益:给【一名友方单位】本回合 [S]+2', () => {
  const cands = (st: GameState): string[] => {
    const q = trig().nextChoice!(st, discardEv(), {})
    return (q?.candidates ?? []).map((c) => c.id).sort()
  }

  test('🔴★★★★★★「友方」按【控制者】不按拥有者 —— 两个方向各造一份错位样本', () => {
    const s = scene([
      obj(SELF, 'VEN-094', P1, `discard:${P1}`),
      obj('mine', 'BLK', P1),                       // 正常友方
      obj('stolenByMe', 'BLK', P1, BF0, ['unit'], P2), // 敌方拥有、我控制 ⇒ 【算】友方
      obj('lostToFoe', 'BLK', P2, BF0, ['unit'], P1),  // 我拥有、敌方控制 ⇒ 【不算】友方
    ])
    expect(cands(s), '★★★写成 owner 判据这条就会反过来').toEqual(['mine', 'stolenByMe'])
  })

  test('🔴★★★★★★卡文【没有位置词】⇒ 基地里的友方单位也能选(⑳)', () => {
    const s = scene([
      obj(SELF, 'VEN-094', P1, `discard:${P1}`),
      obj('onBf', 'BLK', P1),
      obj('atBase', 'BLK', P1, `base:${P1}`),
    ])
    expect(cands(s)).toEqual(['atBase', 'onBf'])
  })

  test('🔴★★★★★「单位」二字挡住装备', () => {
    const s = scene([
      obj(SELF, 'VEN-094', P1, `discard:${P1}`),
      obj('u', 'BLK', P1),
      obj('g', 'UNL-088', P1, BF0, ['equipment']),
    ])
    expect(cands(s)).toEqual(['u'])
  })

  test('🔴★★★★★★加的是 2、只加【本回合】、只加给【选中的那个】', () => {
    const s = scene([
      obj(SELF, 'VEN-094', P1, `discard:${P1}`),
      obj('a', 'BLK', P1), obj('b', 'BLK', P1),
    ])
                                                                    
                                                                                             
    const evs = trig().effect(s, discardEv(), { ally: 'a' }) as unknown as ReadonlyArray<{
      readonly kind: string
      readonly effect: {
        readonly duration: string
        readonly predicate: (x: { oid: unknown }) => boolean
        readonly modification: Record<string, unknown>
      }
    }>
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('addEffect')
    expect(evs[0]!.effect.modification).toEqual({ kind: 'addMight', delta: VEN_094_BONUS })
    expect(VEN_094_BONUS, '★卡面就是 2').toBe(2)
                             
    expect(evs[0]!.effect.predicate({ oid: asObjId('a') })).toBe(true)
    expect(evs[0]!.effect.predicate({ oid: asObjId('b') }), '★★★没选中的那个一分都不加').toBe(false)
                                      
    expect(evs[0]!.effect.duration).toBe('thisTurn')
    expect(evs[0]!.effect.duration).not.toBe('permanent')
  })
})
