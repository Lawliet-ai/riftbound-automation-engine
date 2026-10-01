import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, activatedFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { isEmpowered } from '../../src/keywords/empower'
import {
  VEN_191, VEN_191_SPEC, VEN_191_CARD_EFFECT, VEN_143_CARD_EFFECT,
  VEN_191_DISCARD_KEY, banishedCardIsMine, handOf191, makeZed191Trigger,
} from '../../data/cards/VEN-191'

                                                    
                                                               
  
                                                 
                                                                
  
                                                                           
                                                      
  
                                              
                                                                
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const SELF = asObjId('zed')

const zed = (extra: Partial<GameObject> = {}): GameObject => ({
  oid: SELF, defId: 'VEN-191', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {}, status: {}, ...extra,
} as unknown as GameObject)

const inHand = (oid: string, who = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(`hand:${who}`),
  baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {},
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

const trig = () => makeZed191Trigger(SELF, P1) as unknown as {
  by?: string
  effect: (s: GameState, ev: GameEvent, chosen?: Record<string, string>) => readonly GameEvent[]
}
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  VEN_191_SPEC.makeNextChoice!({ selfOid: SELF as string, controller: P1 } as never)(s, chosen as never)
const fire = (s: GameState, chosen: Record<string, string> = {}) =>
  VEN_191_SPEC.makeResolve({ selfOid: SELF as string, controller: P1 } as never)(s, chosen as never) as readonly GameEvent[]
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const discarded = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'zoneChange') as
  { obj: string; to: string } | undefined
const drew = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'draw') as
  { player: string; count: number } | undefined
                                                 
const banished = (owner: typeof P1): GameEvent =>
  ({ kind: 'banished', player: owner, card: asObjId('x'), defId: 'OGN-012' } as unknown as GameEvent)

describe('🔴🔴🔴★★★★★★601 影流之主:前提与接线', () => {
  test('★前提:传奇、红+紫、0费0pip、卡文照 VEN-191 那份', () => {
    expect(CARD_COSTS['VEN-191']).toEqual({ mana: 0, pips: 0, colors: ['red', 'purple'] })
    expect(cardKind('VEN-191')).toBe('legend')
    expect(VEN_191.domains).toEqual(['red', 'purple'])
    expect(VEN_191_CARD_EFFECT).toBe(
      '当你放逐一张属于你的卡牌时，强化我。\n{{迅捷>}}解除我的强化，{{横置}}：弃置一张手牌，然后抽一张牌。')
  })

  test('🔴🔴★★★★★★两个印次差一句**括号提醒**;采用的是 VEN-191 那份', () => {
    expect(VEN_143_CARD_EFFECT, '★前提自证:另一份确实多那句').toContain('如果我未被强化')
    expect(VEN_191_CARD_EFFECT, '★★★别把提醒文本抄进来').not.toContain('如果我未被强化')
  })

  test('🔴🔴🔴★★★★★★接线:**两个卡号**都查得到那条主动技能(variantAliases 折叠)', () => {
    for (const id of ['VEN-191', 'VEN-143']) {
      expect(activatedFor(id).map((a) => a.key), `★${id} 查不到 = 那个卡号的这张牌是死的`)
        .toContain(VEN_191_SPEC.key)
    }
  })

  test('🔴🔴★★★★★★接线:registry 真的登了句①那条触发', () => {
    const live = activeTriggers(scene([zed()]))
    expect(live.filter((t) => (t as unknown as { sourceDefId?: string }).sourceDefId === 'VEN-191').length,
      '★登记漏了 ⇒ 句①是死的').toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★601 影流之主:句①「你放逐属于你的卡牌」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】「**属于你的**」= 被放逐牌的**所属者**是我', () => {
                                      
    expect(banishedCardIsMine(banished(P1), P1), '★我的牌').toBe(true)
    expect(banishedCardIsMine(banished(P2), P1), '★★★对手的牌 ⇒ 不该触发').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「当**你**放逐」= `by: you`(对手放逐他自己的牌不触发)', () => {
    expect(trig().by, '★★★写成 any 会让对手放逐自己的牌也强化我').toBe('you')
  })

  test('🔴🔴🔴★★★★★★【真结算】句①发的是「强化**我**」', () => {
    const evs = trig().effect(scene([zed()]), banished(P1))
    expect(kinds(evs)).toEqual(['empower'])
    expect((evs[0] as unknown as { target: string }).target, '★★★强化的是我,不是被放逐那张').toBe(SELF)
  })

  test('🔴🔴★★★★★★前提自证:强化后 `isEmpowered` 为真(§441 计数器)', () => {
    const empowered = zed({ counters: { empower: 1 } as never })
    expect(isEmpowered(empowered), '★这道判据正是 unempowerSelf 那格的闸').toBe(true)
    expect(isEmpowered(zed())).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★601 影流之主:句②的费用(冒号前)', () => {
  test('🔴🔴🔴★★★★★★【会换答案】冒号前**只有**解除强化 + 横置,资源费为空', () => {
    expect(VEN_191_SPEC.cost, '★★★别想当然补法力').toEqual({})
    expect(VEN_191_SPEC.tapSelf, '★{{横置}}').toBe(true)
    expect(VEN_191_SPEC.unempowerSelf, '★★★§442 解除我的强化;它同时是可用性闸').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】`{{迅捷>}}` 是**权限关键词**,要写进 spec.keywords', () => {
                                                 
    expect(VEN_191_SPEC.keywords ?? [], '★★★§806 权限轴').toContain('迅捷')
  })

  test('🔴🔴🔴★★★★★★【会换答案·本轮核心】弃牌**不是费用格**(手牌为空时换答案)', () => {
                                                   
                                            
    expect((VEN_191_SPEC as unknown as { discard?: number }).discard,
      '★★★用了费用格这条会红').toBeUndefined()
    const empty = scene([zed()])
    expect(ask(empty), '★手牌为空 ⇒ 不问').toBeNull()
    expect(kinds(fire(empty)), '★★★但抽牌照做').toEqual(['draw'])
  })
})

describe('🔴🔴🔴★★★★★★601 影流之主:句②的效果(先弃后抽)', () => {
  test('🔴🔴🔴★★★★★★【真结算】先弃后抽,顺序承重', () => {
    const s = scene([zed(), inHand('a'), inHand('b')])
    const evs = fire(s, { [VEN_191_DISCARD_KEY]: 'a' })
    expect(kinds(evs), '★★★卡文「弃置一张手牌,**然后**抽一张牌」——反过来的话刚抽的那张就能当场弃')
      .toEqual(['zoneChange', 'draw'])
    expect(discarded(evs)!.obj).toBe('a')
    expect(discarded(evs)!.to, '★㊾ 没有 discard 事件:弃置 = 手牌→废牌堆').toBe(`discard:${P1}`)
    expect(drew(evs)!.player).toBe(P1)
    expect(drew(evs)!.count, '★一张').toBe(1)
  })

  test('🔴🔴🔴★★★★★★【会换答案】候选只列**我的**手牌,对手手上那张不算', () => {
    const s = scene([zed(), inHand('mine'), inHand('foe', P2)])
    expect(handOf191(s, P1), '★★★读错手牌 = 从对手手里弃').toEqual(['mine'])
    expect(ask(s)!.candidates.map((c) => c.id)).toEqual(['mine'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】答完到结算之间那张牌**已不在手上** ⇒ 不弃,但**抽照做**', () => {
    const s = scene([zed(), inHand('other')])
    expect(kinds(fire(s, { [VEN_191_DISCARD_KEY]: 'gone' })), '★㊺ 结算复筛').toEqual(['draw'])
  })

  test('🔴🔴★★★★★★答过就别再问(⑰)', () => {
    const s = scene([zed(), inHand('a')])
    expect(ask(s)!.key).toBe(VEN_191_DISCARD_KEY)
    expect(ask(s, { [VEN_191_DISCARD_KEY]: 'a' })).toBeNull()
  })

  test('🔴🔴★★★★★★没答(客户端没给)⇒ 只抽不弃', () => {
    expect(kinds(fire(scene([zed(), inHand('a')]), {}))).toEqual(['draw'])
  })
})
