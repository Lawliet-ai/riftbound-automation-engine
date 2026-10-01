import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { playSpecFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  UNL_101, UNL_101_SPEC, UNL_101_CARD_EFFECT,
  UNL_101_DEST_KEY, UNL_101_FOE_KEY, UNL_101_FOE_UNIT_KEY,
  rallyMovers, rallyDestinations, rallyFoeUnits,
} from '../../data/cards/UNL-101'

                                                                
                                                           
  
                                       
                                                                 
                                            
  
                       
                                                   
                                                      
                                                         

const P1 = asPlayerId('P1')       
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const unit = (oid: string, ctrl: ReturnType<typeof asPlayerId>, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(units: readonly GameObject[], control: Record<string, string | null> = { [BF0]: P1 }): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of units) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
                                                      
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, battlefieldControl: control } as GameState
}

                                
                                                                                
                                                                        
                                      
const askConfirm = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  UNL_101_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never)
const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  UNL_101_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  UNL_101_SPEC.makeResolve!({ controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]
                       
const moves = (evs: readonly GameEvent[]): string[] => evs
  .filter((e) => (e as { kind: string }).kind === 'unitMoved')
  .map((e) => `${(e as unknown as { unit: string }).unit}→${(e as unknown as { to: string }).to}`)

describe('🔴🔴🔴★★★★★★594 战斗号令:前提与接线', () => {
  test('★前提:法术 3费 **0pip** 橙、单印次、卡文一字不差', () => {
                                                     
    expect(CARD_COSTS['UNL-101'], '★★★0 pip —— 有颜色不等于有 pip').toEqual({ mana: 3, pips: 0, colors: ['orange'] })
    expect(UNL_101_SPEC.cost, '★★★别凭"橙色卡"给它安一枚橙 pip').toEqual({ mana: 3 })
    expect(cardKind('UNL-101')).toBe('spell')
    expect(UNL_101.domains).toEqual(['orange'])
    expect(UNL_101_CARD_EFFECT).toBe(
      '将你控制的一名单位移动至你控制的一处战场。然后，选择一名对手。该对手将自己控制的一名单位移动至该战场。')
  })

  test('★★接线:PLAY_SPECS 查得到(登记漏了 ⇒ 这张牌在真对局里打不出来)', () => {
    expect(playSpecFor('UNL-101')).toBeDefined()
    expect(playSpecFor('UNL-101')!.defId).toBe('UNL-101')
  })
})

describe('🔴🔴🔴★★★★★★594 战斗号令:三段的范围,一个定语都不能漏', () => {
  test('🔴🔴🔴★★★★★★【会换答案】①「你控制的一名单位」:敌方的、不在场上的都不算', () => {
    const s = scene([
      unit('mine', P1, BF0), unit('myBase', P1, `base:${P1}`),
      unit('foe', P2, BF0), unit('inHand', P1, `hand:${P1}`),
    ])
    expect(rallyMovers(s, P1), '★★★漏 controller 会算上 foe;漏"场上"会算上手牌里那张')
      .toEqual(['mine', 'myBase'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·核心】②落点只认【我控制的战场】——不含基地、不含对手控制的', () => {
                                                        
    const s = scene([unit('mine', P1, `base:${P1}`)], { [BF0]: P1, [BF1]: P2 })
    expect(rallyDestinations(s, P1, 'mine'), '★★★卡文写的是「你控制的一处战场」').toEqual([BF0])
  })

  test('🔴🔴★★★★★★②【另一个方向】一处战场都不控 ⇒ 候选空、连问都不问', () => {
    const s = scene([unit('mine', P1, `base:${P1}`)], { [BF0]: null, [BF1]: P2 })
    expect(rallyDestinations(s, P1, 'mine')).toEqual([])
    expect(askConfirm(s, 'mine'), '★§355.17 没得选就不弹问').toBeNull()
  })

  test('🔴🔴★★★★★★②「原地」不算落点(单位已经在我控制的那处)', () => {
    const s = scene([unit('mine', P1, BF0)], { [BF0]: P1 })
    expect(rallyDestinations(s, P1, 'mine'), '★moveDestinations 已把原地过掉').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】③候选只认【那名对手自己控制的】,且要真能移到该战场', () => {
    const s = scene([
      unit('foeA', P2, `base:${P2}`), unit('foeB', P2, BF1),
      unit('foeHere', P2, BF0), // 已经在该战场 ⇒ 移不动,不该列
      unit('mine', P1, `base:${P1}`), // 我的单位不该出现在他的候选里
    ])
    expect(rallyFoeUnits(s, P2, BF0), '★★★漏"自己控制的"会算上 mine;漏"能移过去"会算上 foeHere')
      .toEqual(['foeA', 'foeB'])
  })

  test('🔴🔴★★★★★★③【另一个方向】他一个也送不过来 ⇒ 不问,前半句照样生效', () => {
    const s = scene([unit('mine', P1, `base:${P1}`), unit('foeHere', P2, BF0)])
    const c = { [UNL_101_DEST_KEY]: BF0, [UNL_101_FOE_KEY]: P2 as string }
    expect(rallyFoeUnits(s, P2, BF0)).toEqual([])
    expect(ask(s, 'mine', c), '★§355.17 没候选不弹问').toBeNull()
    expect(moves(resolve(s, 'mine', c)), '★★★前半句不受影响').toEqual([`mine→${BF0}`])
  })
})

describe('🔴🔴🔴★★★★★★594 战斗号令:三问的顺序与【作答者】', () => {
  const s = () => scene([unit('mine', P1, `base:${P1}`), unit('foeA', P2, `base:${P2}`)])

  test('🔴🔴★★★★★★第一问是落点,作答者是我', () => {
                                                                          
    const q = askConfirm(s(), 'mine')
    expect(q!.key).toBe(UNL_101_DEST_KEY)
    expect(q!.controller).toBe(P1)
    expect(q!.candidates.map((c) => c.id)).toEqual([BF0])
  })

  test('🔴🔴★★★★★★第二问是「选择一名对手」,作答者也是我', () => {
                                                                         
    const q = askConfirm(s(), 'mine', { [UNL_101_DEST_KEY]: BF0 })
    expect(q!.key).toBe(UNL_101_FOE_KEY)
    expect(q!.controller, '★「你选择一名对手」——这一问还是我答').toBe(P1)
    expect(q!.candidates.map((c) => c.id)).toEqual([P2 as string])
  })

  test('🔴🔴🔴★★★★★★【会换答案·本卡的魂】第三问的作答者是【那名对手】,不是我', () => {
                                                        
    const q = ask(s(), 'mine', { [UNL_101_DEST_KEY]: BF0, [UNL_101_FOE_KEY]: P2 as string })
    expect(q!.key).toBe(UNL_101_FOE_UNIT_KEY)
    expect(q!.controller, '★★★「**该对手**将自己控制的一名单位…」').toBe(P2)
    expect(q!.candidates.map((c) => c.id), '★候选也是【他的】单位').toEqual(['foeA'])
  })

  test('🔴🔴★★★★★★三问都答完 ⇒ 不再问(⑰ 答过就别再问)', () => {
    expect(ask(s(), 'mine', {
      [UNL_101_DEST_KEY]: BF0, [UNL_101_FOE_KEY]: P2 as string, [UNL_101_FOE_UNIT_KEY]: 'foeA',
    })).toBeNull()
  })

  test('🔴🔴🔴★★★★★★【会换答案】答的"对手"其实是我自己(客户端乱发) ⇒ 不问、也不执行后半句', () => {
                                                        
                                                     
                                                       
    const half = { [UNL_101_DEST_KEY]: BF0, [UNL_101_FOE_KEY]: P1 as string }
    expect(ask(s(), 'mine', half), '★★★不验的话会拿【我自己的】单位当候选问出来').toBeNull()
    expect(moves(resolve(s(), 'mine', { ...half, [UNL_101_FOE_UNIT_KEY]: 'foeA' })), '★只做前半句')
      .toEqual([`mine→${BF0}`])
  })
})

describe('🔴🔴🔴★★★★★★594 战斗号令:结算(两段都动,以及「被无视」vs「没发生」)', () => {
  const full = { [UNL_101_DEST_KEY]: BF0, [UNL_101_FOE_KEY]: P2 as string, [UNL_101_FOE_UNIT_KEY]: 'foeA' }

  test('🔴🔴🔴★★★★★★【真结算】两名单位都被移到同一处战场', () => {
    const s = scene([unit('mine', P1, `base:${P1}`), unit('foeA', P2, `base:${P2}`)])
    expect(moves(resolve(s, 'mine', full))).toEqual([`mine→${BF0}`, `foeA→${BF0}`])
  })

  test('🔴🔴🔴★★★★★★【会换答案】①目标不合法 ⇒ §359.3.e.14.a **整条连后半句一并被无视**', () => {
                                        
    const s = scene([unit('mine', P2, `base:${P2}`), unit('foeA', P2, `base:${P2}`)])
    expect(resolve(s, 'mine', full), '★★★后半句也不许做').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案·反向】①目标还在、只是这一步移动【没发生】⇒ 后半句**照做**', () => {
                                                           
                                       
                                                     
    const s = scene([unit('mine', P1, BF0), unit('foeA', P2, `base:${P2}`)])
    expect(moves(resolve(s, 'mine', full)), '★★★只剩后半句那一条').toEqual([`foeA→${BF0}`])
  })

  test('🔴🔴🔴★★★★★★【会换答案】③他答完到结算之间那名单位**易主给了我** ⇒ 只做前半句', () => {
                                                     
                                                
                          
    const s = scene([unit('mine', P1, `base:${P1}`), unit('foeA', P1, `base:${P1}`)])
    expect(moves(resolve(s, 'mine', full)), '★★★后半句该落空').toEqual([`mine→${BF0}`])
  })

  test('🔴🔴★★★★★★③结算时那名单位根本不存在 ⇒ 只做前半句', () => {
    const s = scene([unit('mine', P1, `base:${P1}`)])
    expect(moves(resolve(s, 'mine', full))).toEqual([`mine→${BF0}`])
  })

  test('🔴🔴★★★★★★没答落点 ⇒ 前半句不动,但后半句也没地方去(整条落空)', () => {
    const s = scene([unit('mine', P1, `base:${P1}`), unit('foeA', P2, `base:${P2}`)])
    expect(resolve(s, 'mine', { [UNL_101_FOE_KEY]: P2 as string, [UNL_101_FOE_UNIT_KEY]: 'foeA' })).toEqual([])
  })

  test('🔴🔴★★★★★★没目标(客户端没给)⇒ 一条事件都不发', () => {
    const s = scene([unit('mine', P1, `base:${P1}`), unit('foeA', P2, `base:${P2}`)])
    expect(resolve(s, undefined, full)).toEqual([])
    expect(ask(s, undefined)).toBeNull()
  })

  test('🔴🔴★★★★★★legalTargets 只列我方场上单位(枚举侧与判据同源)', () => {
    const s = scene([unit('mine', P1, BF1), unit('foe', P2, BF0)])
    expect(UNL_101_SPEC.legalTargets(s, P1)).toEqual(['mine'])
  })
})
