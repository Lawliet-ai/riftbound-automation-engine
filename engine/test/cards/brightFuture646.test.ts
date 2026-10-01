import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { banishPlayable, freeManaCost, makeBanishPlayRelay, SFD_188_SHAPE } from '../../data/cards/play-from-deck'
import { OGN_115_SPEC, OGN_115_SHAPE, futureOrder, makeBrightFutureRelay } from '../../data/cards/OGN-115'

                                                                           
                                        
                                                     
  
           
                                                   
                                                   
                                                         
                                                                 
                                                             
                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const KEY1 = 'future:P1'
const KEY2 = 'future:P2'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
} as GameObject)

                      
const rune = (oid: string, who: PlayerId, color: string): GameObject =>
  ({ ...obj(oid, `rune:${color}`, who, `base:${who}`, ['rune']), baseMight: 0 } as GameObject)

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

                                                             
const decks = (mine: number, foes: number, extra: readonly GameObject[] = []): GameState =>
  scene([
    ...Array.from({ length: mine }, (_, i) => obj(`m${i}`, `U-M${i}`, P1, `mainDeck:${P1}`)),
    ...Array.from({ length: foes }, (_, i) => obj(`f${i}`, `U-F${i}`, P2, `mainDeck:${P2}`)),
    ...extra,
  ])

type Ev = { kind: string, player?: string, target?: string, by?: string, objs?: readonly string[], obj?: string, freeAll?: boolean, freeMana?: boolean, card?: string, unit?: string, play?: { cost?: unknown, to?: string } }
const ask = (s: GameState, chosen: Record<string, string>) =>
  OGN_115_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  OGN_115_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:上游/接线/形状/轮转序', () => {
  test('★★★★★5费 1蓝pip、无印刷关键词、进 PLAY_SPECS、触发区含 OGN-115;shape=半免+各打各的', () => {
    expect(CARD_COSTS['OGN-115']).toEqual({ mana: 5, pips: 1, colors: ['blue'] })
    expect(OGN_115_SPEC.cost).toEqual({ mana: 5, pips: [['blue']] })
    expect(cardKind('OGN-115')).toBe('spell')
    expect(cardKeywords('OGN-115')).toEqual([])
    expect(playSpecFor('OGN-115')!.target).toBe('none')
    expect(TRIGGER_ZONE_DEFIDS).toContain('OGN-115')
    expect(OGN_115_SHAPE).toEqual({ defId: 'OGN-115', reduceMana: 0, accepts: 'permanent', acceptsSpells: true, freeMana: true, playerIsOwner: true })
    expect(SFD_188_SHAPE, '★⑥老七张回归:不带 freeMana/playerIsOwner(一字不变)').toEqual({ defId: 'SFD-188', reduceMana: 2, accepts: 'permanent' })
  })

  test('★★★★★③futureOrder:下家先、施法者殿后(P1 施法 ⇒ [P2,P1];P2 施法 ⇒ [P1,P2])', () => {
    const s = decks(0, 0)
    expect(futureOrder(s, P1)).toEqual([P2, P1])
    expect(futureOrder(s, P2)).toEqual([P1, P2])
  })
})

describe('★★★★★★★ ②必选逐人问', () => {
  test('★★★★★★先问下家 P2(controller=P2、候选=他顶5、无 skip);答过再问 P1;都答完 null', () => {
    const s = decks(6, 6)
    const q2 = ask(s, {})!
    expect(q2.controller).toBe(P2)
    expect(q2.key).toBe(KEY2)
    expect(q2.candidates, '★候选=P2 顶 5 张,**无 skip 档**(QA L56 强制)').toHaveLength(5)
    expect(q2.candidates.every((c) => c.id.startsWith('f'))).toBe(true)
    const q1 = ask(s, { [KEY2]: 'f5' })!
    expect(q1.controller).toBe(P1)
    expect(q1.candidates.every((c) => c.id.startsWith('m'))).toBe(true)
    expect(ask(s, { [KEY2]: 'f5', [KEY1]: 'm5' })).toBeNull()
  })

  test('★★★★★不足 5 ⇒ 有几张问几张;牌堆空的人整个跳过(直接问下一个)', () => {
    const q = ask(decks(2, 3), {})!
    expect(q.controller).toBe(P2)
    expect(q.candidates).toHaveLength(3)
    const q1 = ask(decks(2, 0), {})!
    expect(q1.controller, '★P2 牌堆空 ⇒ 跳过,直接问 P1').toBe(P1)
    expect(q1.candidates).toHaveLength(2)
  })
})

describe('★★★★★★★ ①③句① resolve:banish+recycle、无 revealed、事件序', () => {
  test('★★★★★★双方各选一张 ⇒ [P2banish, P2recycle×4, P1banish, P1recycle×4];**无 revealed**', () => {
    const s = decks(6, 6)
    const evs = resolveWith(s, { [KEY2]: 'f5', [KEY1]: 'm3' })
    expect(evs.map((e) => e.kind), '★①查看≠展示 ⇒ 一条 revealed 都没有;③P2 的 banish 在 P1 前').toEqual(['banish', 'recycle', 'banish', 'recycle'])
    expect(evs[0]).toMatchObject({ kind: 'banish', target: 'f5', by: 'sp' })
    expect(evs[1]!.player).toBe(P2)
    expect(evs[1]!.objs, '★回收其余 4 张(不含被放逐那张)').toHaveLength(4)
    expect(evs[1]!.objs).not.toContain('f5')
    expect(evs[2]).toMatchObject({ kind: 'banish', target: 'm3', by: 'sp' })
    expect(evs[3]!.player).toBe(P1)
  })

  test('★★★★★牌堆空/没答到的人跳过(不 banish 不 recycle)', () => {
    const evs = resolveWith(decks(6, 0), { [KEY1]: 'm3' })
    expect(evs.map((e) => e.kind)).toEqual(['banish', 'recycle'])
    expect(evs[1]!.player).toBe(P1)
    expect(resolveWith(decks(6, 6), {}), '★谁都没答 ⇒ 空').toEqual([])
  })
})

describe('★★★★★★★ ④⑤句② relay:freeMana 半免 + playerIsOwner', () => {
  const relay = makeBrightFutureRelay(asObjId('sp'), P1)
  const banishedEv = (card: string): GameEvent => ({ kind: 'banished', card: asObjId(card) } as unknown as GameEvent)
                                                                        
  const exiled = (defId: string, extra: readonly GameObject[]): GameState =>
    scene([obj('ex', defId, P2, `exile:${P2}`), ...extra])

  test('★★★★★★④freeManaCost=法力归0 pip 原样;零法力+1蓝符文 ⇒ 半免付得起、付全款付不起', () => {
    expect(freeManaCost('OGN-106')).toEqual({ mana: 0, pips: [['blue']] })
    const s = exiled('OGN-106', [rune('r0', P2, 'blue')])
    expect(banishPlayable(s, P2, 'OGN-106', OGN_115_SHAPE), '★法力那 4 点真的免了').toBe(true)
    expect(banishPlayable(s, P2, 'OGN-106', SFD_188_SHAPE), '★付全款档(减2)4-2=2 法力付不起 ⇒ 对照').toBe(false)
  })

  test('★★★★★★④pip 照付:零符文 ⇒ 半免也打不出(§419.3.c 牌留放逐区)', () => {
    const s = exiled('OGN-106', [])
    expect(banishPlayable(s, P2, 'OGN-106', OGN_115_SHAPE), '★「仍需支付所有符能费用」不是空话').toBe(false)
    expect(relay.effect(s, banishedEv('ex'), {})).toEqual([])
  })

  test('★★★★★★⑤常驻牌:playUnit **player=牌主人 P2**、cost=半免、落 P2 基地(不是施法者 P1)', () => {
    const s = exiled('OGN-106', [rune('r0', P2, 'blue')])
    const evs = relay.effect(s, banishedEv('ex'), {}) as unknown as readonly Ev[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playUnit', player: P2 })
    expect(evs[0]!.play).toMatchObject({ cost: { mana: 0, pips: [['blue']] }, to: `base:${P2}` })
  })

  test('★★★★★★⑤法术:playSpellFromZone **player=P2**、带 freeMana **不带 freeAll**', () => {
                                                                   
    const s = exiled('OGN-115', [rune('r0', P2, 'blue')])
    const evs = relay.effect(s, banishedEv('ex'), {}) as unknown as readonly Ev[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playSpellFromZone', player: P2, card: 'ex', freeMana: true })
    expect(evs[0]!.freeAll, '★㊶ 半免不是全免').toBeUndefined()
  })

  test('★★★★★不是我放逐的不接力(when 判 banishedBy 账本;空账本 ⇒ false)', () => {
    const s = exiled('OGN-106', [rune('r0', P2, 'blue')])
    expect(relay.filter!(banishedEv('ex'), s)).toBe(false)
  })
})
