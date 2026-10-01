import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { playSpecFor, cardKind, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { canPlayInTiming } from '../../src/loop/timing'
import {
  UNL_204, UNL_204_SPEC, UNL_204_CARD_EFFECT, UNL_204_WHERE_KEY,
  wardenTargets, wardenOwner, wardenTargetLive,
} from '../../data/cards/UNL-204'

                                                                 
                              
                                                         
                                                                   
  
               
                                               
                             
                                                         
                                                                
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const CARD = 'sp'

                                                  
const unit = (
  oid: string, ctrl = P2, zone = BF0, owner: string | null = null, extra: Partial<GameObject> = {},
): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: asPlayerId((owner ?? ctrl) as string), controller: ctrl,
  zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: {}, status: {}, ...extra,
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

                                                 
const std = () => scene([unit('foe')])

const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  UNL_204_SPEC.makeNextChoice!({ movedCardOid: CARD, controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  UNL_204_SPEC.makeResolve({ movedCardOid: CARD, controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]
const zc = (evs: readonly GameEvent[]) => evs
  .filter((e) => (e as { kind: string }).kind === 'zoneChange')
  .map((e) => e as unknown as { obj: string; to: string; placement?: string })

describe('🔴🔴🔴★★★★★★605 持卫的裁决:前提与接线', () => {
  test('★前提:法术 2费 **两枚单色pip**(橙+黄)、单印次、卡文一字不差', () => {
    expect(CARD_COSTS['UNL-204']).toEqual({ mana: 2, pips: 2, colors: ['orange', 'yellow'] })
    expect(UNL_204_SPEC.cost, '★★★pips=2 且两色 ⇒ **两枚单色**;1 枚双色是 pips:1(★592 的分野)')
      .toEqual({ mana: 2, pips: [['orange'], ['yellow']] })
    expect(cardKind('UNL-204')).toBe('spell')
    expect(UNL_204.domains).toEqual(['orange', 'yellow'])
    expect(UNL_204_CARD_EFFECT).toBe(
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n选择战场上的一名敌方单位。其拥有者将该单位放到其主牌堆的顶部或底部。')
  })

  test('★★接线:PLAY_SPECS 查得到(登记漏了 ⇒ 这张牌在真对局里打不出来)', () => {
    expect(playSpecFor('UNL-204')).toBeDefined()
    expect(playSpecFor('UNL-204')!.defId).toBe('UNL-204')
  })

  test('🔴🔴🔴★★★★★★【会换答案】[迅捷] 要登**两处**:spec 那份管时机门、印刷表那份管"半张脸"', () => {
                                                                                 
    expect(UNL_204_SPEC.keywords).toEqual(['迅捷'])
    expect(cardKeywords('UNL-204'), '★★★印刷表漏了照样打得出,漏的是 UI/检索那半').toContain('迅捷')
    expect(UNL_204.keywords).toEqual(['迅捷'])
  })

  test('🔴🔴🔴★★★★★★【真时机·会换答案】法术对决态下带 [迅捷] 才打得出(§308.1.a)', () => {
    const duel = { ...std(), spellDuelActive: true } as GameState
    expect(canPlayInTiming(duel, UNL_204_SPEC.keywords, false), '★★★keywords 漏了迅捷这条当场红').toBe(true)
    expect(canPlayInTiming(duel, [], false), '★反方向:不带权限关键词的法术在对决里打不出').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★605「选择**战场上的**一名敌方单位」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】限**战场**(与 ★604「你基地中的」正相反)', () => {
                                          
    const s = scene([unit('onBf', P2, BF0), unit('atFoeBase', P2, `base:${P2}`)])
    expect(wardenTargets(s, P1), '★★★对手**基地**里那名不是合法目标').toEqual(['onBf'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】只认**敌方**(按 controller 判);我自己的单位不算', () => {
    const s = scene([unit('foe', P2, BF0), unit('mine', P1, BF0)])
    expect(wardenTargets(s, P1), '★★★漏 controller 会把我自己的单位也列出来').toEqual(['foe'])
  })

  test('🔴🔴★★★★★★候选取**每一处战场**的并集(不是只看第一处)', () => {
    const s = scene([unit('a', P2, BF0), unit('b', P2, BF1)])
    expect(wardenTargets(s, P1)).toEqual(['a', 'b'])
  })

  test('🔴🔴★★★★★★legalTargets 与判据同源', () => {
    const s = scene([unit('foe', P2, BF0), unit('atFoeBase', P2, `base:${P2}`)])
    expect(UNL_204_SPEC.legalTargets(s, P1)).toEqual(['foe'])
    expect(wardenTargetLive(s, P1, 'foe')).toBe(true)
    expect(wardenTargetLive(s, P1, 'atFoeBase'), '★基地那名不是合法目标').toBe(false)
    expect(wardenTargetLive(s, P1, undefined)).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★605「**其拥有者**」= owner,不是 controller', () => {
  test('🔴🔴🔴★★★★★★【会换答案·被夺控才分叉】我的单位被对手夺控 ⇒ 它是敌方目标,但 owner 还是我', () => {
                                                                   
    const s = scene([unit('stolen', P2, BF0, P1 as string)])                                   
    expect(wardenTargets(s, P1), '★受 P2 控制 ⇒ 对我而言是敌方单位').toEqual(['stolen'])
    expect(wardenOwner(s, 'stolen'), '★★★但拥有者仍是我(§124.2 拥有者不变)').toBe(P1)
  })

  test('🔴🔴🔴★★★★★★【会换答案】反过来:对手的单位被**我**夺控 ⇒ 根本不是合法目标', () => {
    const s = scene([unit('grabbed', P1, BF0, P2 as string)])                               
    expect(wardenTargets(s, P1), '★★★「敌方」按 controller 判 ⇒ 我控制的不算').toEqual([])
    expect(wardenTargetLive(s, P1, 'grabbed')).toBe(false)
  })

  test('🔴🔴★★★★★★普通局面 owner === controller(两条轴同值,所以只有夺控才验得出差别)', () => {
    expect(wardenOwner(std(), 'foe')).toBe(P2)
    expect(wardenOwner(std(), undefined)).toBeUndefined()
    expect(wardenOwner(std(), 'ghost'), '★物件不存在 ⇒ 没有拥有者').toBeUndefined()
  })
})

describe('🔴🔴🔴★★★★★★605 问链:「顶部或底部」由拥有者作答', () => {
  test('🔴🔴🔴★★★★★★【会换答案】问的是**顶/底**两个候选,itemId 挂在这次打出上', () => {
    const q = ask(std(), 'foe')
    expect(q).not.toBeNull()
    expect(q!.key).toBe(UNL_204_WHERE_KEY)
    expect(q!.itemId).toBe(`play:${CARD}`)
    expect(q!.candidates.map((c) => c.id)).toEqual(['top', 'bottom'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·本卡核心】作答者是**拥有者**:普通局面=对手', () => {
    expect(ask(std(), 'foe')!.controller, '★★★写成 controller(我)就是我替他决定').toBe(P2)
  })

  test('🔴🔴🔴★★★★★★【会换答案·本卡核心】被夺控时作答者是**我**(owner),不是控制者', () => {
    const s = scene([unit('stolen', P2, BF0, P1 as string)])
    expect(ask(s, 'stolen')!.controller, '★★★写成 o.controller 这条当场红').toBe(P1)
  })

  test('🔴🔴🔴★★★★★★【会换答案】目标已不在战场(易主/离场)⇒ **连问都不问**', () => {
    const s = scene([unit('gone', P2, `base:${P2}`)])                       
    expect(ask(s, 'gone')).toBeNull()
    expect(ask(std(), undefined), '★没目标也不问').toBeNull()
  })

  test('🔴🔴★★★★★★答过就别再问(⑰)', () => {
    expect(ask(std(), 'foe', { [UNL_204_WHERE_KEY]: 'bottom' })).toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★605 结算:放到**其**主牌堆的顶或底', () => {
  test('🔴🔴🔴★★★★★★【真结算】发一条 zoneChange 到**拥有者的**主牌堆', () => {
    const evs = resolve(std(), 'foe', { [UNL_204_WHERE_KEY]: 'top' })
    expect(evs.length, '★只发这一条').toBe(1)
    expect(zc(evs)[0]).toMatchObject({ obj: 'foe', to: `mainDeck:${P2}`, placement: 'top' })
  })

  test('🔴🔴🔴★★★★★★【会换答案·本卡核心】被夺控时放回**我的**主牌堆(owner),不是控制者的', () => {
    const s = scene([unit('stolen', P2, BF0, P1 as string)])
    const evs = resolve(s, 'stolen', { [UNL_204_WHERE_KEY]: 'top' })
    expect(zc(evs)[0]!.to, '★★★写成 mainDeck:${controller} 或 o.controller 都会红').toBe(`mainDeck:${P1}`)
  })

  test('🔴🔴🔴★★★★★★【会换答案】答**底部** ⇒ placement=bottom(默认追加=顶,底必须显式)', () => {
    expect(zc(resolve(std(), 'foe', { [UNL_204_WHERE_KEY]: 'bottom' }))[0]!.placement).toBe('bottom')
    expect(zc(resolve(std(), 'foe', { [UNL_204_WHERE_KEY]: 'top' }))[0]!.placement).toBe('top')
  })

  test('🔴🔴★★★★★★没答/答了怪值 ⇒ 按顶部(㊼ 与 SFD-169 同口径)', () => {
    expect(zc(resolve(std(), 'foe'))[0]!.placement).toBe('top')
    expect(zc(resolve(std(), 'foe', { [UNL_204_WHERE_KEY]: 'middle' }))[0]!.placement).toBe('top')
  })

  test('🔴🔴🔴★★★★★★【会换答案】结算时目标已不合法 ⇒ §359.3.e.12 一条都不发', () => {
    expect(resolve(scene([unit('gone', P2, `base:${P2}`)]), 'gone'), '★已不在战场上').toEqual([])
    expect(resolve(scene([unit('grabbed', P1, BF0, P2 as string)]), 'grabbed'), '★已被我夺控 ⇒ 不是敌方').toEqual([])
    expect(resolve(std(), undefined), '★没目标').toEqual([])
    expect(resolve(std(), 'ghost'), '★目标不存在').toEqual([])
  })
})
