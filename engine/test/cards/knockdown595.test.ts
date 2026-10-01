import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { playSpecFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { isGeared } from '../../src/keywords/equip'
import {
  SFD_107, SFD_107_SPEC, SFD_107_CARD_EFFECT, SFD_107_FOE_KEY, SFD_107_GEAR_KEY,
  knockdownMovers, knockdownGears, knockdownTargetLive,
} from '../../data/cards/SFD-107'

                                                      
                                                            
  
                                      
                                                   
                                                            
                                              
                                                    
  
                              
                          
                                                       
                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, ctrl: ReturnType<typeof asPlayerId>, zone = BF0, might = 4): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                                      
const arm = (oid: string, ctrl: ReturnType<typeof asPlayerId>, host: string, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-158', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: ['武装'],
  damage: 0, counters: {}, status: { attachedTo: asObjId(host) },
} as unknown as GameObject)

                                                 
const plainGear = (oid: string, ctrl: ReturnType<typeof asPlayerId>, host: string): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-021', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: [],
  damage: 0, counters: {}, status: { attachedTo: asObjId(host) },
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

const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  SFD_107_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never)
const resolve = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  SFD_107_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1, target } as never)(s, chosen as never) as readonly GameEvent[]
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const dmg = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'damage') as
  { target: string; amount: number; source: string; sourcePlayer: string } | undefined
const detached = (evs: readonly GameEvent[]): string[] => evs
  .filter((e) => (e as { kind: string }).kind === 'detach')
  .map((e) => (e as unknown as { obj: string }).obj)

                                       
const std = () => scene([unit('me', P1), arm('g1', P1, 'me'), unit('foe', P2)])
const FULL = { [SFD_107_FOE_KEY]: 'foe', [SFD_107_GEAR_KEY]: 'g1' }

describe('🔴🔴🔴★★★★★★595 击倒:前提与接线', () => {
  test('★前提:法术 3费 **1橙pip**、单印次、卡文一字不差', () => {
    expect(CARD_COSTS['SFD-107'], '★pips 现查').toEqual({ mana: 3, pips: 1, colors: ['orange'] })
    expect(SFD_107_SPEC.cost, '★★★1 枚橙 pip,不是 0(★594 那张才是 0pip)').toEqual({ mana: 3, pips: [['orange']] })
    expect(cardKind('SFD-107')).toBe('spell')
    expect(SFD_107.domains).toEqual(['orange'])
    expect(SFD_107_CARD_EFFECT).toBe(
      '选择一名配装的友方单位，并对一名敌方单位造成等同于该友方单位战力的伤害。然后，卸除该友方单位的一件武装。')
  })

  test('★★接线:PLAY_SPECS 查得到(登记漏了 ⇒ 这张牌在真对局里打不出来)', () => {
    expect(playSpecFor('SFD-107')).toBeDefined()
    expect(playSpecFor('SFD-107')!.defId).toBe('SFD-107')
  })
})

describe('🔴🔴🔴★★★★★★595 击倒:「配装的友方单位」的判据', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】「配装」看的是[武装]标签,不是"身上有装备"', () => {
                                                       
    const s = scene([
      unit('geared', P1), arm('g1', P1, 'geared'),
      unit('plain', P1), plainGear('pg', P1, 'plain'),
      unit('bare', P1),
    ])
    expect(isGeared(s, asObjId('plain')), '★前提:普通装备不算配装').toBe(false)
    expect(knockdownMovers(s, P1)).toEqual(['geared'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】只认【我控制的】,敌方的配装单位不算', () => {
    const s = scene([unit('mine', P1), arm('g1', P1, 'mine'), unit('foe', P2), arm('g2', P2, 'foe')])
    expect(knockdownMovers(s, P1), '★★★漏 controller 会把 foe 也列出来').toEqual(['mine'])
  })

  test('🔴🔴★★★★★★卡文没写位置 ⇒ **基地里**的配装单位同样合法(㉖ 看没写的词)', () => {
    const s = scene([unit('atBase', P1, `base:${P1}`), arm('g1', P1, 'atBase', `base:${P1}`)])
    expect(knockdownMovers(s, P1), '★★★加一道"必须在战场上"会红').toEqual(['atBase'])
  })

  test('🔴🔴★★★★★★legalTargets 与判据同源(枚举侧和结算侧不许分家)', () => {
    expect(SFD_107_SPEC.legalTargets(std(), P1)).toEqual(['me'])
    expect(knockdownTargetLive(std(), P1, 'me')).toBe(true)
    expect(knockdownTargetLive(std(), P1, 'foe')).toBe(false)
  })

  test('🔴🔴★★★★★★「该友方单位的一件武装」只列它自己身上的、且只列[武装]', () => {
    const s = scene([
      unit('me', P1), arm('g1', P1, 'me'), arm('g2', P1, 'me'), plainGear('pg', P1, 'me'),
      unit('other', P1), arm('g3', P1, 'other'),
    ])
    expect(knockdownGears(s, 'me'), '★★★别把普通装备或别人的武装算进来').toEqual(['g1', 'g2'])
  })
})

describe('🔴🔴🔴★★★★★★595 击倒:两问的顺序', () => {
  test('🔴🔴★★★★★★第一问是敌方单位', () => {
    const q = ask(std(), 'me')
    expect(q!.key).toBe(SFD_107_FOE_KEY)
    expect(q!.controller).toBe(P1)
    expect(q!.candidates.map((c) => c.id)).toEqual(['foe'])
  })

  test('🔴🔴★★★★★★第二问是卸除哪件武装(多件时才有得挑)', () => {
    const s = scene([unit('me', P1), arm('g1', P1, 'me'), arm('g2', P1, 'me'), unit('foe', P2)])
    const q = ask(s, 'me', { [SFD_107_FOE_KEY]: 'foe' })
    expect(q!.key).toBe(SFD_107_GEAR_KEY)
    expect(q!.candidates.map((c) => c.id)).toEqual(['g1', 'g2'])
  })

  test('🔴🔴★★★★★★两问都答完 ⇒ 不再问(⑰ 答过就别再问)', () => {
    expect(ask(std(), 'me', FULL)).toBeNull()
  })

  test('🔴🔴🔴★★★★★★【会换答案】①目标不合法 ⇒ 连问都不问(§359.3.e.12)', () => {
                                 
    const s = scene([unit('me', P1), unit('foe', P2)])
    expect(ask(s, 'me'), '★★★不复验的话会照样弹问').toBeNull()
  })

  test('🔴🔴★★★★★★场上一名敌方单位都没有 ⇒ ★1815 必选空候选约定:返回伤害那一问、candidates 为空', () => {
                                                                 
                                                                   
    const s = scene([unit('me', P1), arm('g1', P1, 'me')])
    const q = ask(s, 'me')
    expect(q!.key, '★§355.8 必选问候选空 ⇒ 返回本问(不是跳过)').toBe(SFD_107_FOE_KEY)
    expect(q!.candidates, '★空候选(§355.8 问不出)').toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★595 击倒:结算(伤害量现读 + 两种失败落点相反)', () => {
  test('🔴🔴🔴★★★★★★【真结算】伤害 = 该友方单位战力,然后卸除那件武装', () => {
    const evs = resolve(std(), 'me', FULL)
    expect(kinds(evs), '★先伤害后卸除(卡文的先后就是结算顺序)').toEqual(['damage', 'detach'])
    expect(dmg(evs)!.target).toBe('foe')
    expect(dmg(evs)!.amount, '★★★4 战力 ⇒ 4 点').toBe(4)
    expect(dmg(evs)!.source, '★两个归属都要:哪张卡').toBe('sp')
    expect(dmg(evs)!.sourcePlayer, '★两个归属都要:谁打的').toBe(P1)
    expect(detached(evs)).toEqual(['g1'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】伤害量按**派生战力**算,不是卡面 baseMight', () => {
                                                               
                                                                  
    const s = scene([
      { ...unit('big', P1, BF0, 4), derived: { might: 9, keywords: [] } } as unknown as GameObject,
      arm('g1', P1, 'big'), unit('foe', P2),
    ])
    expect(dmg(resolve(s, 'big', FULL))!.amount, '★★★卡面 4,场上 9 ⇒ 打 9 点').toBe(9)
  })

  test('🔴🔴🔴★★★★★★【会换答案·§359.3.e.12 的裁定】友方目标不合法 ⇒ **伤害与卸除一并被无视**', () => {
                                                         
                                     
    const s = scene([unit('me', P1), unit('foe', P2)])          
    expect(resolve(s, 'me', FULL), '★★★简中QA:不再造成伤害').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】友方目标**易主**也算不合法 ⇒ 整条被无视', () => {
    const s = scene([unit('me', P2), arm('g1', P2, 'me'), unit('foe', P2)])
    expect(resolve(s, 'me', FULL)).toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案·反向】**敌方**目标不合法 ⇒ 只有伤害落空,**卸除照做**', () => {
                                                 
                                              
                            
    const s = scene([unit('me', P1), arm('g1', P1, 'me')])              
    expect(kinds(resolve(s, 'me', FULL)), '★★★卸除那一条照做').toEqual(['detach'])
  })

  test('🔴🔴★★★★★★答的"敌方"其实是我自己的单位 ⇒ 伤害不发,卸除照做', () => {
    const s = scene([unit('me', P1), arm('g1', P1, 'me'), unit('mate', P1)])
    expect(kinds(resolve(s, 'me', { [SFD_107_FOE_KEY]: 'mate', [SFD_107_GEAR_KEY]: 'g1' }))).toEqual(['detach'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】答的那件武装不在这名单位身上 ⇒ 不卸(㊺ 结算复筛)', () => {
    const s = scene([unit('me', P1), arm('g1', P1, 'me'), unit('other', P1), arm('g3', P1, 'other'), unit('foe', P2)])
    const evs = resolve(s, 'me', { [SFD_107_FOE_KEY]: 'foe', [SFD_107_GEAR_KEY]: 'g3' })
    expect(kinds(evs), '★★★别去卸别人身上的武装').toEqual(['damage'])
  })

  test('🔴🔴★★★★★★「一件」= 只卸一件,别把身上的武装全卸了', () => {
    const s = scene([unit('me', P1), arm('g1', P1, 'me'), arm('g2', P1, 'me'), unit('foe', P2)])
    expect(detached(resolve(s, 'me', FULL)), '★★★卡文写的是「一件」').toEqual(['g1'])
  })

  test('🔴🔴★★★★★★没目标(客户端没给)⇒ 一条事件都不发', () => {
    expect(resolve(std(), undefined, FULL)).toEqual([])
    expect(ask(std(), undefined)).toBeNull()
  })
})
