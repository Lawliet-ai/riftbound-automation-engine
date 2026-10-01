import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKind, cardKeywords, playSpecFor } from '../../data/registry'
import { VEN_090, VEN_090_SPEC, VEN_090_PREFIX, allUnitsOnField } from '../../data/cards/VEN-090'

                                                                    
                              
  
                            
                                                       
                                         
  
                                             
                                                  
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, who: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const gear = (oid: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: 'SFD-150', owner: who, controller: who, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

const spec = VEN_090_SPEC as unknown as {
  makeNextChoice: (c: { movedCardOid: string; controller: PlayerId }) =>
    (s: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
  makeResolve: (c: Record<string, unknown>) =>
    (s: GameState, chosen?: Readonly<Record<string, string>>) => readonly GameEvent[]
}
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  spec.makeNextChoice({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const cast = (s: GameState, chosen: Record<string, string> = {}) =>
  spec.makeResolve({})(s, chosen).map((e) => (e as unknown as { target: string }).target).sort()
const K = (p: PlayerId) => `${VEN_090_PREFIX}:${p as string}`

describe('★ 前提:卡面与接线', () => {
  test('★8费 + 3枚橙pip,法术、无印刷关键词', () => {
    expect(CARD_COSTS['VEN-090']).toEqual({ mana: 8, pips: 3, colors: ['orange'] })
    expect(cardKind('VEN-090')).toBe('spell')
    expect(VEN_090.energy).toBe(8)
    expect(cardKeywords('VEN-090')).toEqual([])
    expect(playSpecFor('VEN-090'), '★进了 PLAY_SPECS').toBeDefined()
    expect(VEN_090_SPEC.cost, '★★★三枚橙 pip,不是一枚')
      .toEqual({ mana: 8, pips: [['orange'], ['orange'], ['orange']] })
  })
})

describe('🔴🔴🔴★★★★★★问链:【每名】玩家各答一次,由【他自己】答', () => {
  test('🔴★★★★★★第一问归 P1、答完第二问归 P2(controller 指定作答人)', () => {
    const s = scene([unit('a', P1), unit('b', P2)])
    const q1 = ask(s)
    expect([q1?.controller, q1?.key], '★★★先问 P1').toEqual([P1, K(P1)])
    const q2 = ask(s, { [K(P1)]: 'a' })
    expect([q2?.controller, q2?.key], '★★★★★★再问 P2 —— 这一问【不是】施法者答').toEqual([P2, K(P2)])
    expect(ask(s, { [K(P1)]: 'a', [K(P2)]: 'b' }), '★都答完就收口(⑰)').toBeNull()
  })

  test('🔴★★★★★★各人的候选只有【自己控制的】单位', () => {
    const s = scene([unit('a', P1), unit('a2', P1), unit('b', P2)])
    expect(ask(s)?.candidates.map((c) => c.id).sort(), '★P1 只看得到自己那两个').toEqual(['a', 'a2'])
    expect(ask(s, { [K(P1)]: 'a' })?.candidates.map((c) => c.id), '★P2 只看得到自己那个').toEqual(['b'])
  })

  test('🔴★★★★★★某方一个单位都没有 ⇒ 跳过他、【别卡住】后面的人', () => {
    const s = scene([unit('b', P2)])         
    const q = ask(s)
    expect([q?.controller, q?.key], '★★★直接问到 P2').toEqual([P2, K(P2)])
    expect(ask(s, { [K(P2)]: 'b' })).toBeNull()
  })

  test('🔴★★★★★两个人都没单位 ⇒ 一问都不弹', () => {
    expect(ask(scene([]))).toBeNull()
  })

  test('🔴★★★★★★两人各占一个 key —— 不共用(否则后一个人会顶掉前一个的答案)', () => {
    expect(K(P1)).not.toBe(K(P2))
  })
})

describe('🔴🔴🔴★★★★★★结算:摧毁【其余的】单位', () => {
  test('🔴★★★★★★双方各留一个,其余全死(敌我都摧毁)', () => {
    const s = scene([unit('a', P1), unit('a2', P1), unit('b', P2), unit('b2', P2)])
    expect(cast(s, { [K(P1)]: 'a', [K(P2)]: 'b' }), '★★★留 a 与 b,杀 a2 与 b2').toEqual(['a2', 'b2'])
  })

  test('🔴★★★★★★卡文【没有位置词】⇒ 基地里的也要摧毁(⑳)', () => {
    const s = scene([unit('a', P1), unit('home', P1, `base:${P1}`), unit('b', P2, `base:${P2}`)])
    expect(allUnitsOnField(s), '★前提:三个都算在场上').toEqual(['a', 'b', 'home'])
    expect(cast(s, { [K(P1)]: 'a', [K(P2)]: 'b' }), '★★★基地里那个照杀').toEqual(['home'])
  })

  test('🔴★★★★★★只摧毁【单位】—— 装备不吃这条(⑩① 异类样本)', () => {
    const s = scene([unit('a', P1), gear('g', P1), unit('b', P2)])
    expect(allUnitsOnField(s), '★装备不在名单里').toEqual(['a', 'b'])
    expect(cast(s, { [K(P1)]: 'a', [K(P2)]: 'b' })).toEqual([])
  })

  test('🔴★★★★★★没人选(问链被跳过)⇒ 全场单位一个不留', () => {
    const s = scene([unit('a', P1), unit('b', P2)])
    expect(cast(s, {}), '★★★"其余"= 全部').toEqual(['a', 'b'])
  })

  test('🔴★★★★★★只有一方答了 ⇒ 只有他那个留下来', () => {
    const s = scene([unit('a', P1), unit('b', P2)])
    expect(cast(s, { [K(P1)]: 'a' })).toEqual(['b'])
  })

  test('🔴★★★★★答案指向一个【已离场】的 oid ⇒ 不当作保下来了', () => {
    const s = scene([unit('a', P1), unit('b', P2)])
    expect(cast(s, { [K(P1)]: 'gone', [K(P2)]: 'b' }), '★★★脏答案不能救下任何人').toEqual(['a'])
  })

  test('🔴★★★★★发的是 destroy 事件(㊾)', () => {
    const s = scene([unit('a', P1), unit('b', P2)])
    const evs = VEN_090_SPEC.makeResolve!({} as never)(s, { [K(P1)]: 'a' }) as readonly GameEvent[]
    expect(evs.map((e) => e.kind)).toEqual(['destroy'])
  })
})
