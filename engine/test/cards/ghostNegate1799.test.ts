                                                                      
                                                              
  
                                                                              
                                                                    
                                                                      
                                                
  
                                                                    
                                                
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { setupGame, type Deck } from '../../src/game/setup'
import { specLookup } from '../../data/decks'
import { makeRng } from '../../src/util/rng'
import { moveObjectInState } from '../../src/state/mutations'
import { asObjId, asZoneId, asPlayerId, type PlayerId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'

installProviders()

type Any = Record<string, any>
const SEED = 0x1799
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const MAX_STEPS = 120
const A_DEF = 'OGN-024'                          
const B_DEF = 'OGN-045'                      
const X_CARDS = ['OGN-064', 'UNL-131', 'OGN-080', 'VEN-152'] as const
type XCard = typeof X_CARDS[number]
const P1_UNITS = ['OGN-001', 'OGN-125']
const FILLER = 'OGN-001'
const FULL_POOL = { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } }

const pad40 = (arr: readonly string[]): string[] => {
  const out = [...arr]
  while (out.length < 40) out.push(FILLER)
  return out
}
const RUNES = (color: string, n: number): string[] => Array.from({ length: n }, () => `rune:${color}`)
const BF = ['OGN-280', 'OGN-288', 'UNL-214']

const objs = (s: GameState): Record<string, Any> => s.objects as Record<string, Any>
const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const findObj = (s: GameState, defId: string, prefix: string): Any | undefined =>
  Object.values(objs(s)).find((o) => o.defId === defId && String(o.zone).startsWith(prefix))
const ensureInHand = (s: GameState, defId: string, p: PlayerId): GameState => {
  if (findObj(s, defId, `hand:${p}`) !== undefined) return s
  const src = findObj(s, defId, `mainDeck:${p}`)
  if (src === undefined) throw new Error(`ensureInHand: ${defId} 不在 ${p} 的牌堆`)
  return moveObjectInState(s, asObjId(String(src.oid)), asZoneId(`hand:${p}`))
}
const chainOf = (g: InteractiveGame): Any[] => (curState(g).chain ?? []) as unknown as Any[]
const itemDefId = (s: GameState, it: Any): string | undefined =>
  it.cardOid !== undefined ? objs(s)[String(it.cardOid)]?.defId : (it.sourceDefId === undefined ? undefined : String(it.sourceDefId))
const findItem = (g: InteractiveGame, defId: string, owner: PlayerId): string | undefined =>
  chainOf(g).find((it) => itemDefId(curState(g), it) === defId && String(it.controller) === String(owner))?.id
const playsOf = (g: InteractiveGame, p: PlayerId, defId: string): InteractiveAction[] => {
  const s = curState(g)
  return (g.legalActions(p) as unknown as Any[])
    .filter((a) => a.kind === 'PLAY_CARD' && objs(s)[String(a.cardOid)]?.defId === defId) as unknown as InteractiveAction[]
}
const playTargeting = (g: InteractiveGame, p: PlayerId, defId: string, target: string): InteractiveAction | undefined =>
  playsOf(g, p, defId).find((a) => (a as Any).target === target)
const runeTotal = (s: GameState, p: PlayerId): number =>
  Object.values((s.runePools as Any)[p]?.runes ?? {}).reduce((a: number, b: unknown) => a + Number(b), 0)

interface Base { readonly g: InteractiveGame; readonly snap: ReturnType<InteractiveGame['snapshot']> }

                                                          
function buildBase(): Base {
  const P1_DECK: Deck = { name: 'ghost1799:p1', mainDeck: pad40([...X_CARDS, ...P1_UNITS]), runeDeck: RUNES('red', 12), battlefields: BF, legend: 'UNL-197' }
  const P2_DECK: Deck = { name: 'ghost1799:p2', mainDeck: pad40([A_DEF, B_DEF]), runeDeck: RUNES('red', 12), battlefields: BF, legend: 'UNL-197' }
  const g = new InteractiveGame(setupGame(P1_DECK, P2_DECK, specLookup, makeRng(1), P2).state as never, makeGameDeps(SEED) as never)
  for (let i = 0; i < 4 && (g.pending() as Any).mode === 'mulligan'; i++) {
    g.apply({ kind: 'MULLIGAN', player: (g.pending() as Any).player, put: [] } as never)
  }
  if ((g.pending() as Any).mode !== 'action') throw new Error(`建局后 pending=${(g.pending() as Any).mode}`)
  let s = curState(g)
  for (const d of X_CARDS) s = ensureInHand(s, d, P1)
  for (const d of [A_DEF, B_DEF]) s = ensureInHand(s, d, P2)
  for (const d of P1_UNITS) {
    const u = findObj(s, d, 'mainDeck:P1') ?? findObj(s, d, 'hand:P1')
    if (u === undefined) throw new Error(`单位 ${d} 不在 P1 牌堆`)
    s = moveObjectInState(s, asObjId(String(u.oid)), asZoneId('battlefield:shared:1'))
  }
  s = { ...s, runePools: { ...s.runePools, P1: { ...FULL_POOL }, P2: { ...FULL_POOL } } } as GameState
  g.restore({ ...g.snapshot(), state: s } as never)
  if ((g.pending() as Any).mode !== 'action') throw new Error(`补盘面后 pending=${(g.pending() as Any).mode}`)
  return { g, snap: g.snapshot() }
}

interface Reading {
  readonly askedKeys: string[]
  readonly aOnChainAtXLeave: boolean | null
  readonly error: string | null
  readonly hitCap: boolean
  readonly runeP1AtXPlay: number | null
  readonly runeP1Final: number
  readonly journal: JournalCounts
}

   
                                                                     
                                                           
   
function run(snap: Base['snap'], xDef: XCard, withB: boolean): Reading {
  const g = new InteractiveGame(snap.state as never, makeGameDeps(SEED) as never)
  g.restore(snap as never)
  const askedKeys: string[] = []
  let xItemId: string | undefined
  let aItemId: string | undefined
  let phase: 'findX' | 'findB' | 'run' = 'findX'
  let aOnChainAtXLeave: boolean | null = null
  let runeP1AtXPlay: number | null = null
  let error: string | null = null
  let hitCap = false
  let i = 0
  const snapChain = (): string[] => chainOf(g).map((it) => String(it.id))
                                                  
  const states: string[][] = []
  const apply = (a: Any): void => { g.apply(a as never); states.push(snapChain()) }
  try {
                          
    {
      const acts = playsOf(g, P2, A_DEF)
      const s0 = curState(g)
      const isP1BfUnit = (t: unknown): boolean => {
        const o = objs(s0)[String(t)]
        return o !== undefined && String(o.controller) === P1 && String(o.zone).startsWith('battlefield')
      }
      const a = acts.find((x) => (x as Any).target !== undefined && isP1BfUnit((x as Any).target)) ?? acts[0]
      if (a === undefined) throw new Error('找不到 A 的打出动作')
      apply(a)
      aItemId = findItem(g, A_DEF, P2)
    }
    for (; i < MAX_STEPS; i++) {
      const p = g.pending() as Any
      if (p.mode === 'choice') {
        const req = p.request as Any
        askedKeys.push(String(req.key))
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: cands[0] ?? '' })
        continue
      }
      if (p.mode !== 'window') break
      const player = p.player as PlayerId
      if (phase === 'findX' && String(player) === 'P1') {
        const acts = playsOf(g, P1, xDef)
        if (acts.length > 0 && aItemId !== undefined) {
          const a = playTargeting(g, P1, xDef, aItemId) ?? acts[0]
          if (a === undefined) throw new Error(`找不到 X(${xDef}) 的打出动作`)
          apply(a)
          xItemId = findItem(g, xDef, P1) ?? xItemId
          runeP1AtXPlay = runeTotal(curState(g), P1)
          phase = 'findB'
          continue
        }
      }
      if (phase === 'findB' && String(player) === 'P2') {
        phase = 'run'
        if (withB && xItemId !== undefined && aItemId !== undefined) {
          const b = playTargeting(g, P2, B_DEF, aItemId)
          if (b === undefined) throw new Error('找不到 B 的打出动作')
          apply(b)
          continue
        }
      }
      apply({ kind: 'PASS', player })
    }
    hitCap = i >= MAX_STEPS
                                          
    if (xItemId !== undefined && aItemId !== undefined) {
      for (let k = 0; k + 1 < states.length; k++) {
        if (states[k]!.includes(xItemId) && !states[k + 1]!.includes(xItemId)) {
          aOnChainAtXLeave = states[k]!.includes(aItemId)
          break
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return {
    askedKeys, aOnChainAtXLeave, error, hitCap,
    runeP1AtXPlay, runeP1Final: runeTotal(curState(g), P1),
    journal: journalCounts(g),
  }
}

interface JournalCounts { negateSeize: { kind: string; targetOid?: string; defId?: string }[]; insight: number }
function journalCounts(g: InteractiveGame): JournalCounts {
  const entries = g.journal.projectFor(P1) as readonly Any[]
  return {
    negateSeize: entries.filter((e) => e.kind === 'negate' || e.kind === 'seize')
      .map((e) => ({ kind: String(e.kind), ...(e.targetOid !== undefined ? { targetOid: String(e.targetOid) } : {}), ...(e.defId !== undefined ? { defId: String(e.defId) } : {}) })),
    insight: entries.filter((e) => e.kind === 'insight').length,
  }
}

const BASE = buildBase()

describe('★1799 缺陷 256 幽灵 negate/seize:目标已离链时不再发事件', () => {
  for (const xDef of X_CARDS) {
    test(`${xDef}: resolveA(A 已离链)⇒ 战报里 negate/seize 只剩 B 的那一条;baseline 里 X 的条目在`, () => {
                                        
      const rb = run(BASE.snap, xDef, false)
      expect(rb.error, 'baseline 无异常').toBeNull()
      expect(rb.journal.negateSeize.length, '★正对照:baseline 下 X 对 A 的条目在').toBeGreaterThanOrEqual(1)
      expect(rb.journal.negateSeize.some((e) => e.defId === A_DEF), '★带 defId(能指认被作用的是 A)').toBe(true)

                                            
      const r = run(BASE.snap, xDef, true)
      expect(r.error, 'resolveA 无异常').toBeNull()
      expect(r.aOnChainAtXLeave, '前提:A 确实在 X 结算前离链了').toBe(false)
      const j = r.journal
      expect(j.negateSeize.length, '★修前:X 的幽灵条目也在;修后:只剩 B 一条').toBe(1)
      expect(j.negateSeize.every((e) => e.defId !== undefined), '★没有只带内部 id、无 defId 的幽灵条目').toBe(true)
      expect(j.negateSeize[0]!.defId, '★那一条属于 B 无效化 A').toBe(A_DEF)

      if (xDef === 'UNL-131') {
        expect(j.insight, '★UNL-131「洞察」与目标无关(§359.3.e.5)⇒ 照常发生').toBeGreaterThanOrEqual(1)
      }
      if (xDef === 'VEN-152') {
        expect(r.askedKeys.some((k) => k === 'payA'), '★目标已离链 ⇒ 不问 payA').toBe(false)
        expect(r.runeP1Final, '★P1 符能不变(未 spend)').toBe(r.runeP1AtXPlay)
      }
    })
  }
})
