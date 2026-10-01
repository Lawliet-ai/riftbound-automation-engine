   
                                                                           
                       
  
                                                      
                                                                        
                                                      
  
                                                                     
   
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 120
type Any = Record<string, any>

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const mutationsDeps = makeGameDeps(0x1808) as never

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `deck${i++}`
    const c = obj(id, 'BLK', p, `mainDeck:${p}`)
    objects[id] = c
    zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState
}

const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid && String(a.target) === target) ?? null) as InteractiveAction | null
}

function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

const moveTo = (s: GameState, oid: string, to: string): GameState => {
  const st = applyEvents(s, [{ kind: 'zoneChange', obj: asObjId(oid), to: asZoneId(to) }] as never, mutationsDeps).state
  return recomputeContinuous(st)
}

interface RunOut { error: string | null; hitCap: boolean; might: Record<string, number> }

function runSfd145(mutate?: (s: GameState) => GameState): RunOut {
  const objs = (): GameObject[] => [obj('a', 'BLK', P1, BF0, { baseMight: 3 }), obj('b', 'BLK', P2, BF0, { baseMight: 5 }), inHand('sw', 'SFD-145', P1)]
  const g = new InteractiveGame(scene(objs()), makeGameDeps(0x1808) as never)
  const initial = findCardPlay(g, P1, 'sw', 'swap:a:b')
  if (!initial) return { error: '找不到打出动作', hitCap: false, might: {} }
  let mutated = false
  let error: string | null = null
  let steps = 0
  try {
    g.apply(initial); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: cands[0] ?? '' } as never)
        steps++
        continue
      }
      if (raw.mode === 'window') {
        if (!mutated && mutate) { mutateInWindow(g, mutate); mutated = true }
        g.apply({ kind: 'PASS', player: raw.player } as never)
        steps++
        continue
      }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  const st = curState(g) as Any
  const might: Record<string, number> = {}
  for (const oid of ['a', 'b']) {
    const o = st.objects[oid]
    if (o) might[oid] = (o.derived?.might ?? o.baseMight ?? 0) as number
  }
  return { error, hitCap: steps >= STEP_CAP, might }
}

describe('★1808 SFD-145 换换乐 swap: 串成员顺序规范化', () => {
  test('① 对照:BF0 一对(a=3,b=5)⇒ 互换(a→5,b→3)', () => {
    const r = runSfd145()
    expect(r.error).toBeNull()
    expect(r.hitCap).toBe(false)
    expect(r.might).toEqual({ a: 5, b: 3 })
  })

  test('② 确认后一名挪到 BF1 ⇒ 不互换(维持现状钉死)', () => {
    const r = runSfd145((s) => moveTo(s, 'b', BF1))
    expect(r.error).toBeNull()
    expect(r.might).toEqual({ a: 3, b: 5 })
  })

  test('③ 两名一起挪到 BF1,先 a 后 b ⇒ 互换', () => {
    const r = runSfd145((s) => { const x = moveTo(s, 'a', BF1); return moveTo(x, 'b', BF1) })
    expect(r.error).toBeNull()
    expect(r.might).toEqual({ a: 5, b: 3 })
  })

  test('④ 两名一起挪到 BF1,先 b 后 a(D2r 顺序敏感场景)⇒ 互换', () => {
    const r = runSfd145((s) => { const x = moveTo(s, 'b', BF1); return moveTo(x, 'a', BF1) })
    expect(r.error).toBeNull()
    expect(r.might).toEqual({ a: 5, b: 3 })
  })
})
