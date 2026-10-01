import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { activatedFor, cardKind, cardCost, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { specLookup } from '../../data/decks'
import { selfOnBattlefield } from '../../data/cards/backline-heroes'
import { OGN_068_SPEC } from '../../data/cards/backline-heroes'
import { UNL_026, UNL_026_SPEC, UNL_026_CARD_EFFECT, XERATH_DAMAGE } from '../../data/cards/UNL-026'

                                                
                                                    
                                 
  
                                            
                                                                         
                                                               
                                                                         
                                                                             
  
                                
                                                       
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const xerath = (oid = 'xr', ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'UNL-026', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const unit = (oid: string, ctrl = P2, zone = BF0, might = 5): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const gearObj = (oid: string, ctrl = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-098', owner: ctrl, controller: ctrl, zone: asZoneId(`base:${ctrl}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
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
const targets = (s: GameState, who = P1): readonly string[] =>
  (UNL_026_SPEC.legalTargets!(s, who, 'xr' as never) as string[]).slice().sort()
const resolve = (s: GameState, target: string | undefined, selfOid = 'xr') =>
  UNL_026_SPEC.makeResolve({ selfOid, controller: P1, target } as never)(s) as readonly GameEvent[]

describe('🔴🔴🔴★★★★★★586 泽拉斯:前提与接线', () => {
  test('★前提:5费 **0pip** 红、战力 5、不印关键词', () => {
    expect(CARD_COSTS['UNL-026'], '★★★打出费查 CARD_COSTS;卡文那个{红色}是【技能费】')
      .toEqual({ mana: 5, pips: 0, colors: ['red'] })
    expect(cardCost('UNL-026')).toEqual({ mana: 5 })
    expect(cardKind('UNL-026')).toBe('unit')
    expect(specLookup('UNL-026').baseMight).toBe(5)
    expect(cardKeywords('UNL-026')).toEqual([])
    expect(UNL_026.category).toBe('unit')
    expect(UNL_026_CARD_EFFECT).toBe('支付{{红色}}，{{横置}}：对一名单位造成3点伤害。我必须位于战场中才能使用此技能。')
  })

  test('🔴🔴🔴★★★★★★【两本账】技能费是【1 枚红 pip】+ 横置,不是 1 点法力', () => {
    expect(UNL_026_SPEC.cost, '★★★写成 { mana: 1 } 这条会红').toEqual({ pips: [['red']] })
    expect(UNL_026_SPEC.tapSelf, '★{横置} ⇒ tapSelf').toBe(true)
    expect(XERATH_DAMAGE, '★㊶ 卡面数额只有一处定义').toBe(3)
  })

  test('★接线:进了 ACTIVATED 表', () => {
    expect(activatedFor('UNL-026').some((a) => a.key === 'UNL-026:blast')).toBe(true)
  })

  test('🔴🔴★★★★★★【与凯特琳的分野】位置门共用同一处判据,但费用/目标/伤害都不同', () => {
                                    
    expect(UNL_026_SPEC.available, '★两张都有位置门').toBeDefined()
    expect(OGN_068_SPEC.cost, '★凯特琳没有资源费').toEqual({})
    expect(UNL_026_SPEC.cost, '★★★本卡有 1 枚红 pip').toEqual({ pips: [['red']] })
  })
})

describe('🔴🔴🔴★★★★★★586 位置门:「我必须位于战场中」(⑳ 不含基地)', () => {
  const canUse = (s: GameState, oid = 'xr'): boolean =>
    UNL_026_SPEC.available!(s, P1, oid) === true

  test('🔴🔴🔴★★★★★★【会换答案·两个方向】在战场 ⇒ 可用;退回基地 ⇒ **不可用**', () => {
    expect(canUse(scene([xerath('xr', P1, BF0)])), '★在战场上').toBe(true)
    expect(canUse(scene([xerath('xr', P1, `base:${P1}`)])), '★★★⑳「战场中」不含基地').toBe(false)
  })

  test('🔴🔴★★★★★★【共用件】这道门与凯特琳同一处判据(㊼ 不留第二份)', () => {
    const inBase = scene([xerath('xr', P1, `base:${P1}`)])
    expect(selfOnBattlefield(inBase, 'xr'), '★★★通用读口给出同样答案').toBe(false)
    expect(selfOnBattlefield(scene([xerath()]), 'xr')).toBe(true)
  })

  test('🔴★★★★★★物件根本不存在 ⇒ 不可用(别炸)', () => {
    expect(canUse(scene([]), 'nobody')).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★586 目标范围:「一名单位」= 不限位置、不限阵营', () => {
  test('🔴🔴🔴★★★★★★【会换答案·没有阵营词】敌方**和友方**都能选,连我自己也能选(㉖)', () => {
                                           
    const s = scene([xerath(), unit('foe', P2), unit('mine', P1)])
    expect(targets(s), '★★★三个都在:敌方、友方、我自己').toEqual(['foe', 'mine', 'xr'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·没有位置词】**基地里**的单位也能打(⑳)', () => {
                                       
    const s = scene([xerath(), unit('inBase', P2, `base:${P2}`)])
    expect(targets(s), '★★★基地里的也在候选里').toEqual(['inBase', 'xr'])
  })

  test('🔴🔴🔴★★★★★★【只认单位】装备不是合法目标(㉔ 类别判据)', () => {
    const s = scene([xerath(), gearObj('g1', P1)])
    expect(targets(s), '★★★卡文写的是"一名【单位】"').toEqual(['xr'])
  })

  test('🔴🔴★★★★★★【不在场上的不算】手牌/废牌堆里的卡不是「单位」(§103)', () => {
    const s = scene([xerath(), unit('inHand', P1, `hand:${P1}`), unit('inDump', P1, `discard:${P1}`)])
    expect(targets(s)).toEqual(['xr'])
  })
})

describe('🔴🔴🔴★★★★★★586 结算:固定 3 点伤害', () => {
  test('🔴🔴🔴★★★★★★【会换答案】发一条 3 点伤害,来源是我', () => {
    const s = scene([xerath(), unit('foe', P2)])
    const evs = resolve(s, 'foe') as readonly { kind: string; target?: string; amount?: number; source?: string }[]
    expect(evs.length).toBe(1)
    expect(evs[0]!.kind).toBe('damage')
    expect(evs[0]!.target).toBe('foe')
    expect(evs[0]!.amount, '★★★固定 3 点 —— 写成"等同我战力"会是 5').toBe(3)
    expect(evs[0]!.source).toBe('xr')
  })

  test('🔴🔴🔴★★★★★★【端到端】伤害真落到目标身上(③ 不只验发了什么事件)', () => {
    const s = scene([xerath(), unit('foe', P2)])
    const out = applyEvents(s, resolve(s, 'foe'), {}).state
    expect(out.objects[asObjId('foe')]!.damage, '★★★真吃了 3 点').toBe(3)
  })

  test('🔴🔴🔴★★★★★★【承重·结算期复判】目标已离场 ⇒ 一条都不发', () => {
                                                           
    const s = scene([xerath()])
    expect(resolve(s, 'ghost'), '★★★服务端权威:答案不可信').toEqual([])
  })

  test('🔴★★★★★★没给目标 ⇒ 一条都不发', () => {
    expect(resolve(scene([xerath()]), undefined)).toEqual([])
  })
})
