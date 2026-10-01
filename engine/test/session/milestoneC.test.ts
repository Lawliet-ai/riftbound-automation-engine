                                                              
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, holdRepeats } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { insight } from '../../src/keywords/insight'
import { makeRng } from '../../src/util/rng'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, holdRepeats }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number, kws: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: kws, damage: 0, counters: {}, status: {} }
}
function scene(objs: GameObject[], bfCards?: Record<string, { defId: string; owner: typeof P1 }>): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, ...(bfCards ? { battlefieldCards: bfCards } : {}) }
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 5; k++) {
      const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
    for (let k = 0; k < 4; k++) {
      const id = `rk${p}${k}`; const c = unit(id, 'rune:blue', p, `runeDeck:${p}`, 0)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`runeDeck:${p}`]: { ...s.zones[`runeDeck:${p}`]!, contents: [...s.zones[`runeDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  s = seedRunes(s, P1, 'purple', 3)
  s = seedRunes(s, P2, 'blue', 3)
  return s
}
function walk(g: InteractiveGame, answers: Record<string, string> = {}): number {
  let n = 0
  for (let i = 0; i < 16; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') { n++; g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: answers[p.request.key] ?? p.request.candidates[0]!.id }); continue }
    break
  }
  return n
}

describe('里程碑C backlog', () => {
  test('C1 魔像"据守效果额外触发一次":同战场据守触发跑两遍(得2点[A])', () => {
                                                          
    const g = new InteractiveGame(scene([unit('golem', 'UNL-087', P2, BF0, 4, ['坚守2'])]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g)
    expect(g.state.scores['P2']).toBe(1)                           
    expect(g.state.runePools['P2']!.runes['*']).toBe(2)                
  })

  test('C1 反例:魔像不在该战场则只触发一次', () => {
    const g = new InteractiveGame(scene([
      unit('hold', 'BLK', P2, BF0, 2),
      unit('golem', 'UNL-087', P2, 'battlefield:shared:1', 4, ['坚守2']),
    ]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g)
                                                  
    expect(g.state.scores['P2']).toBe(2)           
  })

  test('C3 §416.5 洞察多张回收:随 rng 产生不同底序(集合不变)', () => {
    let s = scene([])
    for (const id of ['x1', 'x2', 'x3']) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const orders = new Set<string>()
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const after = insight(s, P1, 3, (top) => top, makeRng(seed))         
      orders.add(after.zones['mainDeck:P1']!.contents.slice(0, 3).map(String).join('|'))
    }
    expect(orders.size).toBeGreaterThan(1)            
  })

  test('C4 §464.2.f.1 空战斗链:仍保持开环,双方各让过后才进伤害步', () => {
    const g = new InteractiveGame(scene([
      unit('atk', 'BLK', P2, BF0, 3),
      unit('def', 'BLK', P1, BF0, 1),
    ]), DEPS)
    g.state = { ...g.state, activePlayer: P2 }
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
                                                    
    let p = g.pending()
    expect(p.mode).toBe('window')
    if (p.mode !== 'window') return
    expect(p.player).toBe(P2)
    expect(g.state.objects['def']!.damage).toBe(0)         
    g.apply({ kind: 'PASS', player: P2 })
    p = g.pending()
    expect(p.mode).toBe('window')        
    if (p.mode !== 'window') return
    expect(p.player).toBe(P1)
    g.apply({ kind: 'PASS', player: P1 })
                                        
    expect(g.state.zones[BF0]!.contents.includes('def' as never)).toBe(false)
  })
})
