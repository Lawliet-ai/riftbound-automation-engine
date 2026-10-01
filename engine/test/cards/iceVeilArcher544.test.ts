import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { cardKind, cardKeywords, cardCost, activeTriggers } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { CARD_COSTS } from '../../data/cardCosts'
import { UNL_065, UNL_065_DELTA, UNL_065_PAY, makeIceVeilArcher065Trigger } from '../../data/cards/UNL-065'
import { VEN_094_BONUS } from '../../data/cards/VEN-094'

                                               
                                               
                                
  
                                                         
                                                            
                                                              
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = 'archer'

function obj(
  oid: string, ctrl = P1, zone = BF0, defId = 'BLK', types: readonly string[] = ['unit'],
): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
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
    runePools: { ...base.runePools, [P1]: { mana, runes: { blue: 3, red: 3, colorless: 3 } } },
  } as unknown as GameState
}

const me = (zone = BF0): GameObject => obj(SELF, P1, zone, 'UNL-065')
const trig = (selfOid = SELF, ctrl = P1) => makeIceVeilArcher065Trigger(asObjId(selfOid), ctrl)
const atkEv = (unit = SELF, bf = BF0): GameEvent =>
  ({ kind: 'attack', unit: asObjId(unit), player: P1, battlefield: asZoneId(bf) } as unknown as GameEvent)
const cands = (s: GameState, ev = atkEv()): string[] =>
  (trig().nextChoice!(s, ev, {})?.candidates ?? []).map((c) => c.id).sort()

describe('★ 前提:卡面与接线', () => {
  test('★2费 0pip 蓝 2[S] 单位;一个关键词都不印;触发挂得上', () => {
    expect(CARD_COSTS['UNL-065']).toEqual({ mana: 2, pips: 0, colors: ['blue'] })
    expect(cardKind('UNL-065')).toBe('unit')
    expect(cardCost('UNL-065'), '★进了 UNIT_COST,0pip ⇒ 一枚都不写').toEqual({ mana: 2 })
    expect(specLookup('UNL-065').baseMight).toBe(2)
    expect(cardKeywords('UNL-065')).toEqual([])
    expect(UNL_065.category).toBe('unit')
    const s = scene([me()])
    expect(activeTriggers(s).filter((t) => t.sourceOid === asObjId(SELF)).length).toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★时机:「当【我】进攻时」', () => {
  const s = () => scene([me(), obj('mate', P1), obj('foe', P2)])

  test('🔴★★★★★★听的是 attack 事件', () => {
    expect(trig().event).toBe('attack')
  })

  test('🔴★★★★★★★命门:【队友】进攻点不着我 —— by:you 挡不住这个', () => {
                                                                   
    expect(trig().filter!(atkEv(SELF), s()), '★我自己进攻:算').toBe(true)
    expect(trig().filter!(atkEv('mate'), s()), '★★★队友进攻:不算').toBe(false)
  })

  test('🔴★★★★★对手进攻更不算(by:you 那道)', () => {
    expect(trig().by).toBe('you')
  })
})

describe('🔴🔴★★★★★★门槛费用:「你可以选择支付{{1}}」', () => {
  test('★★「你可以选择」在效果开头 ⇒ §383.3.a 确认阶段决定', () => {
    expect(trig().mayChoose).toBe(true)
  })

  test('🔴★★★★★★付的是【1 点法力】不是 pip', () => {
    expect(UNL_065_PAY).toEqual({ mana: 1 })
                                                     
    expect((UNL_065_PAY as { pips?: unknown }).pips).toBeUndefined()
  })

  test('🔴★★★★★★付得起就扣 1;付不起返回 null 且盘面不动', () => {
    const rich = scene([me()], 5)
    const after = trig().basePerform!(rich, atkEv())
    expect(after).not.toBeNull()
    expect(after!.runePools[P1 as string]!.mana, '★5 - 1').toBe(4)

    const broke = scene([me()], 0)
    expect(trig().basePerform!(broke, atkEv()), '★一点法力都没有').toBeNull()
    expect(broke.runePools[P1 as string]!.mana, '★费用一点没扣').toBe(0)
  })
})

describe('🔴🔴🔴★★★★★★候选:「此处的一名单位」—— 没有任何阵营词', () => {
  test('🔴★★★★★★★敌我都算,连【我自己】也在候选里(卡文没写「其他」)', () => {
    const s = scene([me(), obj('mate', P1), obj('foe', P2)])
    expect(cands(s), '★★★写成"敌方"或"其他"这条就会少人').toEqual(['archer', 'foe', 'mate'])
  })

  test('🔴★★★★★★【此处】那道门:别的战场上的单位不算', () => {
    const s = scene([me(), obj('here', P2), obj('there', P2, BF1)])
    expect(cands(s)).toEqual(['archer', 'here'])
  })

  test('🔴★★★★★★基地里的不算(我在战场上,那儿才是"此处")', () => {
    const s = scene([me(), obj('atBase', P2, `base:${P2}`), obj('here', P2)])
    expect(cands(s)).toEqual(['archer', 'here'])
  })

  test('🔴★★★★★装备不算(「单位」二字是道真门)', () => {
    const s = scene([me(), obj('g', P2, BF0, 'UNL-088', ['equipment'])])
    expect(cands(s)).toEqual(['archer'])
  })
})

describe('🔴🔴🔴★★★★★★产出:本回合 [S]-1', () => {
  const evs = (s: GameState, victim: string): ReadonlyArray<{
    readonly kind: string
    readonly effect: {
      readonly duration: string
      readonly predicate: (x: { oid: unknown }) => boolean
      readonly modification: Record<string, unknown>
    }
  }> => trig().effect(s, atkEv(), { victim }) as never

  test('🔴★★★★★★★减的是 1(delta 为负),而且只【本回合】', () => {
    const s = scene([me(), obj('foe', P2)])
    const out = evs(s, 'foe')
    expect(out).toHaveLength(1)
    expect(out[0]!.kind).toBe('addEffect')
    expect(out[0]!.effect.modification).toEqual({ kind: 'addMight', delta: UNL_065_DELTA })
    expect(UNL_065_DELTA, '★★★卡面写的是 S-1 —— 是【减】').toBe(-1)
    expect(out[0]!.effect.duration).toBe('thisTurn')
    expect(out[0]!.effect.duration).not.toBe('permanent')
  })

  test('🔴★★★★★★只作用于【选中的那个】', () => {
    const s = scene([me(), obj('a', P2), obj('b', P2)])
    const p = evs(s, 'a')[0]!.effect.predicate
    expect(p({ oid: asObjId('a') })).toBe(true)
    expect(p({ oid: asObjId('b') }), '★★★没选中的一分都不减').toBe(false)
  })
})

describe('🔴🔴★★★★★与面具之母 VEN-094:同解那几条 vs 分野那三处', () => {
  test('🔴★★★★★★分野:数额一个【减1】一个【加2】—— 符号都不同', () => {
    expect([UNL_065_DELTA, VEN_094_BONUS]).toEqual([-1, 2])
    expect(UNL_065_DELTA).toBeLessThan(0)
    expect(VEN_094_BONUS).toBeGreaterThan(0)
  })

  test('🔴★★★★★同解:两张的门槛费用都是【1 点法力】,写法一字不差', () => {
                                                        
    expect(UNL_065_PAY).toEqual({ mana: 1 })
  })
})
