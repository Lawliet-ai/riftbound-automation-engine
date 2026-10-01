import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  VEN_113, VEN_113A, VEN_113_CARD_EFFECT, VEN_113_BURN,
  makeKennenBurnTrigger, makeKennenRecursionTrigger, mySpellsInDiscard,
} from '../../data/cards/VEN-113'
                                                        
import { printedCost } from '../../data/cards/play-from-deck'

                                                          
                                                          
                                                    
                                                                              
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('kennen')

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 4, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as GameObject
}
function scene(objs: GameObject[], mana = 9): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana, runes: {} } },
  } as GameState
}
const run = (s: GameState, evs: readonly GameEvent[]): GameState => applyEvents(s, evs, {}).state

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('双号 3费1紫pip 4S;费用换算两档', () => {
    expect(CARD_COSTS['VEN-113']).toEqual({ mana: 3, pips: 1, colors: ['purple'] })
    expect(CARD_COSTS['VEN-113a']).toEqual(CARD_COSTS['VEN-113'])
    expect(VEN_113.power, '上游实测 4S').toBe(4)
    expect(VEN_113A.id).toBe('VEN-113a')
    expect(VEN_113_BURN).toBe(2)
                                                                 
                                                                           
    expect(printedCost('VEN-113'), 'pips>0 档').toEqual({ mana: 3, pips: [['purple']] })
    expect(printedCost('BLK'), '0pip 档').toEqual({ mana: CARD_COSTS['BLK']?.mana ?? 0 })
    expect(VEN_113_CARD_EFFECT).toContain('流转')
  })
})

                                                                      
                                                                
                                                
                                                         
                                                          
                                                                 
                                                     
                                       
                                                                              
describe('🔴★★★★句①:打出燃烧2(§440;数量不足的三段式在原语里)', () => {
  const trig = makeKennenBurnTrigger(SELF, P1)
  const played = { kind: 'playUnit', unit: SELF, player: P1 } as GameEvent
  const deckOf = (s: GameState, p: PlayerId): readonly string[] =>
    (s.zones[asZoneId(`mainDeck:${p}`)]?.contents ?? []) as readonly string[]
  const discOf = (s: GameState, p: PlayerId): readonly string[] =>
    (s.zones[asZoneId(`discard:${p}`)]?.contents ?? []) as readonly string[]
  const deckCards = (n: number): GameObject[] =>
    Array.from({ length: n }, (_, i) => obj(`d${i}`, 'BLK', P1, `mainDeck:${P1}`))

  test('🔴★★★牌堆两张 ⇒ 两张【各不同】进【自己】废牌堆(端到端落地,不是只看事件形状)', () => {
                                                            
    const s2 = scene([obj('kennen', 'VEN-113'), ...deckCards(2)])
    const after = run(s2, trig.effect!(s2, played, {}))
    expect(discOf(after, P1), '烧了两张').toHaveLength(2)
    expect(new Set(discOf(after, P1)).size, '两张各不同(不是同一张烧两次)').toBe(2)
    expect(deckOf(after, P1), '从牌堆里出去的').toHaveLength(0)
    expect(discOf(after, P2), '进的是【自己】废牌堆,不是对手的').toHaveLength(0)
    expect(after.scores[P2] ?? 0, '没触发燃尽 ⇒ 对手不得分(§431.2.c)').toBe(0)
  })

  test('🔴★★牌堆有余量(5 张)⇒ 恰好烧 2、剩 3(数量钉死,不多不少)', () => {
    const s5 = scene([obj('kennen', 'VEN-113'), ...deckCards(5)])
    const after = run(s5, trig.effect!(s5, played, {}))
    expect(discOf(after, P1)).toHaveLength(VEN_113_BURN)
    expect(deckOf(after, P1)).toHaveLength(5 - VEN_113_BURN)
    expect(after.scores[P2] ?? 0).toBe(0)
  })

  test('🔴★★★★★卡侧只发【一条 burn 事件】,张数照卡面写死、不按牌堆自己裁剪', () => {
                                                          
    for (const n of [0, 1, 2, 5]) {
      const s = scene([obj('kennen', 'VEN-113'), ...deckCards(n)])
      expect(trig.effect!(s, played, {}), `牌堆 ${n} 张时仍是同一条燃烧指令`).toEqual([
        { kind: 'burn', player: P1, count: VEN_113_BURN },
      ])
    }
  })
})

describe('🔴★★★★句②:征服给废牌堆法术临时[流转]', () => {
  const trig = makeKennenRecursionTrigger(SELF, P1)
  const conquer = { kind: 'conquer', player: P1, battlefield: BF0 } as GameEvent
  const board = (): GameState => scene([
    obj('kennen', 'VEN-113', P1, BF0),
    obj('sp', 'OGN-046', P1, `discard:${P1}`, ['spell']),
    obj('u', 'BLK', P1, `discard:${P1}`),
    obj('fsp', 'OGN-046', P2, `discard:${P2}`, ['spell']),
  ])

  test('🔴★★候选只有【自己】废牌堆里的【法术】(单位/对手的都不进)', () => {
    expect(CARD_COSTS['OGN-046'], '样本自证:OGN-046 在费用表(类别表判它是法术)').toBeTruthy()
    const cands = mySpellsInDiscard(board(), P1)
    expect(cands).toEqual(['sp'])
    const req = trig.nextChoice!(board(), conquer, {})
    expect(req!.candidates.map((c) => c.id)).toEqual(['sp'])
  })

  test('🔴★★★effect = grantRecursion{card, cost=印刷费};reducer 写第二十一本账', () => {
    const evs = trig.effect!(board(), conquer, { spell: 'sp' })
    expect(evs).toHaveLength(1)
    expect((evs[0] as { kind: string }).kind).toBe('grantRecursion')
    const s2 = run(board(), evs)
                                                                                                 
                                                  
                                                                                                                     
                                                        
                                                                                              
                                                                    
                                                                         
                                                                                     
    expect(s2.grantedRecursionThisTurn?.['sp'], '账上有这张卡的授予(⚠️写死,别调共用件:那样期望与实现同源就没判别力了)')
      .toEqual({ mana: 1 })
  })
})

describe('🔴★★★★★消费:授予后废牌堆那张法术真的列得出流转打出(枚举侧)', () => {
  const SPEC = {
    defId: 'PLAIN-S', cardNo: 'X', name: '普通法术', kind: 'spell' as const,
    cost: { mana: 5 }, keywords: [], target: 'none' as const,
    legalTargets: () => [],
    makeResolve: () => () => [],
  } as unknown as PlaySpec
  const deps = {
    getTriggers: () => [],
    handPlaySpecs: () => [SPEC],
    cardKeywords: () => [], // 没有印刷[流转] —— 只有临时授予这一条路
    playSpecFor: (d: string) => (d === 'PLAIN-S' ? SPEC : undefined),
  }
  const spellInDiscard = (): GameObject =>
    ({ ...obj('c', 'PLAIN-S', P1, `discard:${P1}`, ['spell']), baseMight: 0 } as GameObject)
  const recPlays = (g: InteractiveGame) =>
    g.legalActions(P1).filter((a) => a.kind === 'PLAY_CARD' && (a as unknown as { recursionIndex?: number }).recursionIndex !== undefined)

  test('🔴★★★对照:无授予列不出;授予后列得出(index=印刷 0 条 ⇒ 0);付不起不列;回合末清', () => {
    const bare = new InteractiveGame(scene([spellInDiscard()]), deps as never)
    expect(recPlays(bare), '★对照组:没授予这条路不存在').toEqual([])

    const granted = { ...scene([spellInDiscard()]), grantedRecursionThisTurn: { c: { mana: 3 } } } as GameState
    const g = new InteractiveGame(granted, deps as never)
    const acts = recPlays(g)
    expect(acts.length, '授予后列得出').toBeGreaterThan(0)
    expect((acts[0] as unknown as { recursionIndex: number }).recursionIndex, '授予项排在印刷项(0条)之后 ⇒ 0').toBe(0)

    const poor = { ...scene([spellInDiscard()], 1), grantedRecursionThisTurn: { c: { mana: 3 } } } as GameState
    expect(recPlays(new InteractiveGame(poor, deps as never)), '1 法力付不起 3 ⇒ 不列').toEqual([])
  })

  test('🔴★★回合末账清(END_TURN 后授予失效)', () => {
    const granted = { ...scene([spellInDiscard()]), grantedRecursionThisTurn: { c: { mana: 3 } } } as GameState
    const g = new InteractiveGame(granted, deps as never)
    g.apply({ kind: 'END_TURN', player: P1 })
    let guard = 0
    while ((g as unknown as { window: unknown }).window !== null && guard < 10) {
      const w = (g as unknown as { window: { player: PlayerId } }).window
      g.apply({ kind: 'PASS', player: w.player } as never)
      guard += 1
    }
    expect(Object.keys(g.state.grantedRecursionThisTurn ?? {}), '回合末清').toEqual([])
  })
})

describe('★★口径落测(第464轮清 445 债⑮的搭档账):授予流转跟【oid】走', () => {
  const SPEC2 = { defId: 'PLAIN-S', cardNo: 'X', name: 'X', kind: 'spell', cost: { mana: 3 }, target: 'none',
    makeResolve: () => (): readonly GameEvent[] => [] } as unknown as PlaySpec
  const deps2 = {
    getTriggers: () => [],
    handPlaySpecs: () => [SPEC2],
    cardKeywords: () => [],
    playSpecFor: () => SPEC2,
    cardCost: () => ({ mana: 3 }),
    cardKind: () => 'spell',
  }
  const recPlays2 = (g: InteractiveGame) =>
    g.legalActions(P1).filter((a) => a.kind === 'PLAY_CARD' && (a as unknown as { recursionIndex?: number }).recursionIndex !== undefined)

  test('账挂 oid=c 但牌已被放逐(不在废牌堆)⇒ 枚举不列;换了新 oid(c2)的同名牌也不享有', () => {
                                                    
                                                              
                                                                                    
    const exiled = { ...scene([{ ...obj('c', 'PLAIN-S', P1, `exile:${P1}`, ['spell']), baseMight: 0 } as GameObject]),
      grantedRecursionThisTurn: { c: { mana: 3 } } } as GameState
    expect(recPlays2(new InteractiveGame(exiled, deps2 as never)), '牌在放逐区 ⇒ 不列').toEqual([])

    const newOid = { ...scene([{ ...obj('c2', 'PLAIN-S', P1, `discard:${P1}`, ['spell']), baseMight: 0 } as GameObject]),
      grantedRecursionThisTurn: { c: { mana: 3 } } } as GameState
    expect(recPlays2(new InteractiveGame(newOid, deps2 as never)), '账上是 c、堆里是 c2 ⇒ 不列(授予跟 oid 走)').toEqual([])

                                                  
    const ok = { ...scene([{ ...obj('c', 'PLAIN-S', P1, `discard:${P1}`, ['spell']), baseMight: 0 } as GameObject]),
      grantedRecursionThisTurn: { c: { mana: 3 } } } as GameState
    expect(recPlays2(new InteractiveGame(ok, deps2 as never)).length).toBeGreaterThan(0)
  })
})
