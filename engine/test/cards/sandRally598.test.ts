import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { playSpecFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { SAND_SOLDIER_TOKEN } from '../../data/cards/token-spells'
import {
  SFD_198, SFD_198_SPEC, SFD_198_CARD_EFFECT, SFD_198_UPSTREAM_STALE_EFFECT,
  SFD_198_MAX_READY, SFD_198_SKIP, sandTagOf, armamentCount198, sandSoldiersFrom198, makeSandRallyItem,
} from '../../data/cards/SFD-198'

                                                     
  
                                                                   
                                                         
  
                                     
                                                              
                                                            
                                          
  
                                              
                                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const CARD = 'sp'
const TAG = sandTagOf(CARD)

                             
const arm = (oid: string, ctrl = P1, zone = `base:${P1}`): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-158', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: ['武装'],
  damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                            
const plainGear = (oid: string, ctrl = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-021', owner: ctrl, controller: ctrl, zone: asZoneId(`base:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: [],
  damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                         
const sand = (oid: string, opts: { tagged?: boolean; dormant?: boolean; zone?: string; ctrl?: typeof P1 } = {}): GameObject => ({
  oid: asObjId(oid), defId: SAND_SOLDIER_TOKEN.defId,
  owner: opts.ctrl ?? P1, controller: opts.ctrl ?? P1, zone: asZoneId(opts.zone ?? BF0),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: opts.tagged === false ? {} : { [TAG]: 1 },
  status: { dormant: opts.dormant !== false },
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

   
                                                                   
                                              
   
const resolve = (s: GameState, target: string | null = `base:${P1}`): readonly GameEvent[] =>
  SFD_198_SPEC.makeResolve(
    { movedCardOid: CARD, controller: P1, target: target === null ? undefined : target } as never,
  )(s) as readonly GameEvent[]
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const spawns = (evs: readonly GameEvent[]) => evs.filter((e) => (e as { kind: string }).kind === 'spawnToken') as
  readonly { spec: { defId: string }; zone: string; owner: string; tag?: string }[]
const enqueued = (evs: readonly GameEvent[]) => evs.find((e) => (e as { kind: string }).kind === 'enqueueItem') as
  { item: { id: string; controller: string; kind: string; status: string } } | undefined

const item = () => makeSandRallyItem(CARD, P1)
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  (item() as unknown as { nextChoice: (st: GameState, c: Record<string, string>) => { key: string; candidates: readonly { id: string }[] } | null })
    .nextChoice(s, chosen)
const rallyResolve = (s: GameState, chosen: Record<string, string> = {}) =>
  (item() as unknown as { resolve: (st: GameState, c: Record<string, string>) => readonly GameEvent[] }).resolve(s, chosen)
const readied = (evs: readonly GameEvent[]): string[] => evs
  .filter((e) => (e as { kind: string }).kind === 'statusChange')
  .map((e) => (e as unknown as { target: string }).target)

describe('🔴🔴🔴★★★★★★598 沙兵现身:前提(以 errata 为准)', () => {
  test('🔴🔴🔴★★★★★★【会换答案】采用的是 **errata** 那份,不是上游 `cardEffect`', () => {
    expect(SFD_198_CARD_EFFECT).toContain('进行一次')
    expect(SFD_198_CARD_EFFECT).toContain('其中最多两名')
    expect(SFD_198_UPSTREAM_STALE_EFFECT, '★前提自证:上游那份既没有「进行一次」也没有「其中最多」')
      .toBe('你每控制一件武装，便打出一名2{{S}}的“黄沙士兵”。然后让两名“黄沙士兵”变为活跃状态。')
  })

  test('★前提:法术 6费 **1枚双色pip**(绿|黄二选一)', () => {
    expect(CARD_COSTS['SFD-198']).toEqual({ mana: 6, pips: 1, colors: ['green', 'yellow'] })
    expect(SFD_198_SPEC.cost, '★★★1 枚双色,不是两枚单色(★592 栽过)')
      .toEqual({ mana: 6, pips: [['green', 'yellow']] })
    expect(cardKind('SFD-198')).toBe('spell')
    expect(SFD_198.domains).toEqual(['green', 'yellow'])
    expect(playSpecFor('SFD-198'), '★接线:登记漏了这张牌就打不出来').toBeDefined()
  })
})

describe('🔴🔴🔴★★★★★★598 沙兵现身:第一段「每控制一件武装,便打出一名」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】数的是**[武装]标签**,不是"装备"泛指', () => {
                                             
    const s = scene([arm('a1'), arm('a2'), plainGear('pg')])
    expect(armamentCount198(s, P1), '★★★普通装备不算').toBe(2)
    expect(spawns(resolve(s)).length, '★两件 ⇒ 两名沙兵').toBe(2)
  })

  test('🔴🔴🔴★★★★★★【会换答案】只数**我控制的**;敌方的武装不算', () => {
    const s = scene([arm('mine'), arm('foe', P2, `base:${P2}`)])
    expect(armamentCount198(s, P1)).toBe(1)
  })

  test('🔴🔴🔴★★★★★★【会换答案】打出的沙兵带 **tag**(第二段靠它认「其中」)', () => {
    const evs = resolve(scene([arm('a1')]))
    const sp = spawns(evs)
    expect(sp.length).toBe(1)
    expect(sp[0]!.spec.defId, '★㊼ 全项目一份的黄沙士兵规格').toBe(SAND_SOLDIER_TOKEN.defId)
    expect(sp[0]!.spec).toBe(SAND_SOLDIER_TOKEN)
    expect(sp[0]!.tag, '★★★没有 tag 的话第二段认不出「其中」').toBe(TAG)
    expect(sp[0]!.zone, '★落点走 target').toBe(`base:${P1}`)
    expect(sp[0]!.owner).toBe(P1)
  })

  test('🔴🔴★★★★★★战力 2 由 TokenSpec 定(㊶ 不在这张卡里重写)', () => {
    expect(SAND_SOLDIER_TOKEN.baseMight).toBe(2)
  })

  test('🔴🔴🔴★★★★★★【会换答案】**一件武装都没有** ⇒ 一名都不打出,而且**不入链**', () => {
                                    
    const evs = resolve(scene([plainGear('pg')]))
    expect(evs, '★★★去掉那道 n > 0 的门会多出一条 enqueueItem').toEqual([])
  })

  test('🔴🔴★★★★★★没给落点(客户端没发)⇒ 一条事件都不发', () => {
    expect(resolve(scene([arm('a1')]), null)).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★598 沙兵现身:第二段是【真的内嵌式触发】(QA裁定①)', () => {
  test('🔴🔴🔴★★★★★★【会换答案·本轮核心】发的是 `enqueueItem`,另起一个链项目', () => {
                                            
                                           
    const evs = resolve(scene([arm('a1')]))
    expect(kinds(evs), '★先打出沙兵,再入链那条内嵌触发').toEqual(['spawnToken', 'enqueueItem'])
    const it = enqueued(evs)!
    expect(it.item.kind).toBe('triggered')
    expect(it.item.status, '★§388.1 以待处理状态入链').toBe('pending')
    expect(it.item.controller).toBe(P1)
    expect(it.item.id).toContain('SFD-198-rally')
  })

  test('🔴🔴★★★★★★三件武装 ⇒ 三名沙兵 + **一条**内嵌触发(不是三条)', () => {
    const evs = resolve(scene([arm('a1'), arm('a2'), arm('a3')]))
    expect(spawns(evs).length).toBe(3)
    expect(evs.filter((e) => (e as { kind: string }).kind === 'enqueueItem').length).toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★598 沙兵现身:「其中最多两名」的候选与结算', () => {
  test('🔴🔴🔴★★★★★★【会换答案·QA裁定②】只认**本法术打出的**,场上原有的沙兵不算', () => {
                                                  
    const s = scene([sand('mine1'), sand('older', { tagged: false }), sand('foe', { tagged: false, ctrl: P2 })])
    expect(sandSoldiersFrom198(s, TAG), '★★★判据是 counters[tag],不是 defId').toEqual(['mine1'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】**已经活跃**的不在候选里(再"变为活跃"是空转)', () => {
    const s = scene([sand('sleepy'), sand('awake', { dormant: false })])
    expect(sandSoldiersFrom198(s, TAG)).toEqual(['sleepy'])
  })

  test('🔴🔴★★★★★★离场的不在候选里(㊺)', () => {
    const s = scene([sand('inHand', { zone: `hand:${P1}` }), sand('onField')])
    expect(sandSoldiersFrom198(s, TAG)).toEqual(['onField'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·QA裁定③】**只打出一名也可以**让其变活跃', () => {
                          
    const s = scene([sand('only')])
    const q = ask(s)!
    expect(q.key).toBe('ready1')
    expect(q.candidates.map((c) => c.id), '★一名 + 不选哨兵').toEqual(['only', SFD_198_SKIP])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**最多**」⇒ 每一问都带「不选」哨兵', () => {
    const q = ask(scene([sand('s1'), sand('s2')]))!
    expect(q.candidates.map((c) => c.id)).toContain(SFD_198_SKIP)
  })

  test('🔴🔴🔴★★★★★★【会换答案】第二问**排除第一问选过的那名**', () => {
    const s = scene([sand('s1'), sand('s2')])
    const q = ask(s, { ready1: 's1' })!
    expect(q.key).toBe('ready2')
    expect(q.candidates.map((c) => c.id), '★★★不排除的话同一名会被选两次').toEqual(['s2', SFD_198_SKIP])
  })

  test('🔴🔴🔴★★★★★★【会换答案】第一问答「不选」⇒ **不再问第二问**', () => {
    expect(ask(scene([sand('s1'), sand('s2')]), { ready1: SFD_198_SKIP }),
      '★★★玩家已经表示不要了').toBeNull()
  })

  test('🔴🔴★★★★★★只有一名时第二问没候选 ⇒ 不问(§355.17)', () => {
    expect(ask(scene([sand('only')]), { ready1: 'only' })).toBeNull()
  })

  test('🔴🔴★★★★★★两问都答完 ⇒ 不再问(⑰)', () => {
    expect(ask(scene([sand('s1'), sand('s2')]), { ready1: 's1', ready2: 's2' })).toBeNull()
  })

  test('🔴🔴🔴★★★★★★【真结算】选中的变为**活跃**(解除休眠)', () => {
    const s = scene([sand('s1'), sand('s2')])
    const evs = rallyResolve(s, { ready1: 's1', ready2: 's2' })
    expect(readied(evs).sort()).toEqual(['s1', 's2'])
    expect((evs[0] as unknown as { key: string; value: unknown }).key, '★★★「变为活跃」= 解除休眠').toBe('dormant')
    expect((evs[0] as unknown as { key: string; value: unknown }).value).toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】答了「不选」⇒ 那一名不变活跃', () => {
    const s = scene([sand('s1'), sand('s2')])
    expect(readied(rallyResolve(s, { ready1: 's1', ready2: SFD_198_SKIP })),
      '★★★把哨兵当 oid 用会去改一个不存在的物件').toEqual(['s1'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】结算时那名已不合法(易主/离场/已活跃)⇒ 复筛掉', () => {
    const s = scene([sand('s1'), sand('gone', { zone: `hand:${P1}` })])
    expect(readied(rallyResolve(s, { ready1: 's1', ready2: 'gone' })), '★㊺ 结算复筛').toEqual(['s1'])
  })

  test('🔴🔴★★★★★★上界就是 2(㊶ 卡面数额只写一处)', () => {
    expect(SFD_198_MAX_READY).toBe(2)
    const s = scene([sand('s1'), sand('s2'), sand('s3')])
    expect(readied(rallyResolve(s, { ready1: 's1', ready2: 's2', ready3: 's3' })).length,
      '★★★客户端多发一个 key 也只认两名').toBe(2)
  })

  test('🔴🔴★★★★★★一名都没选 ⇒ 一条事件都不发', () => {
    expect(rallyResolve(scene([sand('s1')]), {})).toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】两张沙兵现身的 tag **互不串味**', () => {
                                                  
    expect(sandTagOf('cardA')).not.toBe(sandTagOf('cardB'))
    const s = scene([sand('mine')])                              
    expect(sandSoldiersFrom198(s, sandTagOf('otherCard')), '★别人那张的「其中」是空的').toEqual([])
  })
})
