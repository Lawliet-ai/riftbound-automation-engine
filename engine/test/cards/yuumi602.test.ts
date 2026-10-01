import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { BARRIER_KEYWORD } from '../../data/cards/group-passives'
import {
  UNL_056, UNL_056_CARD_EFFECT, UNL_056_PUMP, UNL_056_PICK_KEY,
  yuumiAllies, makeYuumi056Triggers,
} from '../../data/cards/UNL-056'

                                                       
                                                 
                                                  
  
                                       
                                                                
                                               
  
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('yuumi')

const yuumi = (zone = BF0): GameObject => ({
  oid: SELF, defId: 'UNL-056', owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 1, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

const unit = (oid: string, ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

type T = {
  event: string
  by?: string
  abilityKey?: string
  nextChoice?: (s: GameState, ev: unknown, chosen: Record<string, string>) => { key: string; candidates: readonly { id: string }[] } | null
  effect: (s: GameState, ev: unknown, chosen?: Record<string, string>) => readonly GameEvent[]
}
const trigs = () => makeYuumi056Triggers(SELF, P1) as unknown as readonly T[]
                                         
const attackT = () => trigs().find((t) => t.event === 'attack')!
const ask = (s: GameState, chosen: Record<string, string> = {}) => attackT().nextChoice!(s, {}, chosen)
const fire = (s: GameState, chosen: Record<string, string> = {}) => attackT().effect(s, {}, chosen)
                                                 
const mods = (evs: readonly GameEvent[]) => evs.map((e) => {
  const eff = (e as unknown as { effect: { id: string; duration: string; modification: Record<string, unknown> } }).effect
  return { id: eff.id, duration: eff.duration, mod: eff.modification }
})

describe('🔴🔴🔴★★★★★★602 悠米:前提与接线', () => {
  test('★前提:英雄单位(dsl 口径 unit)、3费 **1绿pip**、1战力、卡文一字不差', () => {
    expect(CARD_COSTS['UNL-056'], '★pips 现查:是 1 不是 0').toEqual({ mana: 3, pips: 1, colors: ['green'] })
    expect(cardKind('UNL-056')).toBe('unit')
    expect(UNL_056.category, '★★★上游写 hero_unit,dsl 口径就是 unit(★575)').toBe('unit')
    expect(UNL_056.power).toBe(1)
    expect(UNL_056_CARD_EFFECT).toBe(
      '当我进攻或防守时，让你在此处的另一名单位在本回合内获得{{S}}+3和{{壁垒}}。（其在战斗中首先承担伤害。）')
    expect(cardCost('UNL-056'), '★★★registryCoverage 闸:登了触发就得登费用,且 pip 别漏')
      .toEqual({ mana: 3, pips: [['green']] })
  })

  test('🔴🔴🔴★★★★★★【会换答案】「进攻**或防守**」⇒ **两条**触发,少一条就是半张卡', () => {
    const ts = trigs()
    expect(ts.length).toBe(2)
    expect(ts.map((t) => t.event).sort(), '★★★只做 attack 这条会红').toEqual(['attack', 'defend'])
    expect(ts.every((t) => t.by === 'you'), '★「当**我**…」').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】两条触发**共用一个 abilityKey**(同一条技能的两个时机)', () => {
                                                 
    const keys = new Set(trigs().map((t) => t.abilityKey))
    expect(keys.size, '★★★两个不同的 key 这条会红').toBe(1)
  })

  test('🔴🔴★★★★★★接线:registry 真的登了**两条**触发', () => {
    const live = activeTriggers(scene([yuumi(), unit('a')]))
      .filter((t) => (t as unknown as { sourceDefId?: string }).sourceDefId === 'UNL-056')
    expect(live.length, '★登记漏了 ⇒ 这张牌的技能是死的').toBe(2)
  })

  test('🔴🔴★★★★★★【会换答案】「让…获得」是**强制** ⇒ 不带 mayChoose', () => {
    expect(trigs().every((t) => (t as unknown as { mayChoose?: boolean }).mayChoose !== true),
      '★★★写成可选 ⇒ §383.3.a 位置闸会多一处,且玩家可以不给').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★602 悠米:「你在此处的另一名单位」三道判据', () => {
  test('🔴🔴🔴★★★★★★【会换答案】「**另一名**」⇒ 排除我自己', () => {
                               
    const s = scene([yuumi(), unit('ally')])
    expect(yuumiAllies(s, SELF, P1), '★★★候选里出现 yuumi 这条会红').toEqual(['ally'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**你的**」⇒ 敌方单位不算', () => {
    const s = scene([yuumi(), unit('mine'), unit('foe', P2)])
    expect(yuumiAllies(s, SELF, P1), '★★★漏 controller 会把敌方也上 buff').toEqual(['mine'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**此处**」⇒ 别处战场/基地的友方都不算', () => {
    const s = scene([yuumi(BF0), unit('here', P1, BF0), unit('far', P1, BF1), unit('atBase', P1, `base:${P1}`)])
    expect(yuumiAllies(s, SELF, P1), '★★★不判位置会把全场友方都算进来').toEqual(['here'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「此处」**结算时现读** —— 我挪到别处就跟着变', () => {
                                                         
    const s = scene([yuumi(BF1), unit('atBf0', P1, BF0), unit('atBf1', P1, BF1)])
    expect(yuumiAllies(s, SELF, P1), '★★★写死某一格这条会红').toEqual(['atBf1'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】我**已不在战场上** ⇒ 没有「此处」,候选空、一条都不发', () => {
    const s = scene([yuumi(`base:${P1}`), unit('ally', P1, BF0)])
    expect(yuumiAllies(s, SELF, P1), '★§359.3.f.2.a 引用返回「无」').toEqual([])
    expect(ask(s), '★不弹问').toBeNull()
    expect(fire(s, { [UNL_056_PICK_KEY]: 'ally' }), '★★★也不该硬发').toEqual([])
  })

  test('🔴🔴★★★★★★此处只有我一个 ⇒ §355.17 不问、不发', () => {
    const s = scene([yuumi()])
    expect(ask(s)).toBeNull()
    expect(fire(s)).toEqual([])
  })

  test('🔴🔴★★★★★★答过就别再问(⑰)', () => {
    const s = scene([yuumi(), unit('ally')])
    expect(ask(s)!.key).toBe(UNL_056_PICK_KEY)
    expect(ask(s, { [UNL_056_PICK_KEY]: 'ally' })).toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★602 悠米:效果是【两条】addEffect', () => {
  test('🔴🔴🔴★★★★★★【真结算】{S}+3 **和** [壁垒],都是**本回合内**', () => {
    const s = scene([yuumi(), unit('ally')])
    const m = mods(fire(s, { [UNL_056_PICK_KEY]: 'ally' }))
    expect(m.length, '★★★只发一条这条会红 ——「+3 **和** 壁垒」是两笔').toBe(2)
    expect(m[0]!.mod, '★先 +3').toEqual({ kind: 'addMight', delta: UNL_056_PUMP })
    expect(m[1]!.mod, '★后壁垒').toEqual({ kind: 'grantKeyword', keyword: BARRIER_KEYWORD })
    expect(m.every((x) => x.duration === 'thisTurn'), '★★★卡文写了「本回合内」').toBe(true)
    expect(m.every((x) => x.id.endsWith(':ally')), '★两条都打在选中那名身上').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】数额是 **+3**(㊶ 卡面数额只写一处)', () => {
    expect(UNL_056_PUMP).toBe(3)
    const s = scene([yuumi(), unit('ally')])
    expect((mods(fire(s, { [UNL_056_PICK_KEY]: 'ally' }))[0]!.mod as { delta: number }).delta).toBe(3)
  })

  test('🔴🔴🔴★★★★★★【会换答案】答完到结算之间它**挪走了** ⇒ 一条都不发(㊺ 复筛)', () => {
    const s = scene([yuumi(BF0), unit('ally', P1, BF1)])                    
    expect(fire(s, { [UNL_056_PICK_KEY]: 'ally' }), '★★★不复筛会给别处的单位上 buff').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】答的是**敌方**单位(客户端乱发)⇒ 一条都不发', () => {
    const s = scene([yuumi(), unit('foe', P2)])
    expect(fire(s, { [UNL_056_PICK_KEY]: 'foe' })).toEqual([])
  })

  test('🔴🔴★★★★★★没答(客户端没给)⇒ 一条都不发', () => {
    expect(fire(scene([yuumi(), unit('ally')]), {})).toEqual([])
  })

  test('🔴🔴★★★★★★两条触发的效果**一模一样**(防守那条不是半成品)', () => {
    const s = scene([yuumi(), unit('ally')])
    const byEvent = trigs().map((t) => mods(t.effect(s, {}, { [UNL_056_PICK_KEY]: 'ally' })))
    expect(byEvent[0]).toEqual(byEvent[1])
    expect(byEvent[0]!.length, '★两条都真的发了两笔').toBe(2)
  })
})
