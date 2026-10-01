import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { effectiveMight } from '../../src/state/might'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}
function scene(objs: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  s = seedRunes(s, P1, 'purple', 5)
  s = seedRunes(s, P1, 'blue', 3)
  return s
}
function walk(g: InteractiveGame, answers: Record<string, string> = {}): void {
  for (let i = 0; i < 12; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      const ans = answers[p.request.key] ?? p.request.candidates[0]!.id
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: ans })
      continue
    }
    break
  }
}

describe('待命技巧批:控潮者/换换乐/游击战/卡牌骗术/月神恩赐', () => {
  test('控潮者:打到基地(§355.2.a),与另一处位置(BF1)己方单位互换', () => {
    const g = new InteractiveGame(scene([
      unit('tt', 'OGN-199', P1, 'hand:P1', 2),
      unit('ally', 'BLK', P1, BF1, 2),
    ]), DEPS)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === 'tt')!)
    walk(g, { swap: 'ally' })
                                              
    expect(g.state.zones[BF1]!.contents.map((o) => g.state.objects[o]?.defId)).toContain('OGN-199')
    expect(g.state.zones['base:P1']!.contents.map((o) => g.state.objects[o]?.defId)).toContain('BLK')
  })

  test('换换乐(2+双紫):同战场两单位本回合战力互换(1⇄4)', () => {
    const g = new InteractiveGame(scene([
      unit('hh', 'SFD-145', P1, 'hand:P1', 0),
      unit('wk', 'BLK', P1, BF0, 1),
      unit('st', 'BLK', P2, BF0, 4),
    ]), DEPS)
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && String(x.target).includes('wk') && String(x.target).includes('st'))
    expect(a).toBeDefined()
    g.apply(a!)
    walk(g)
    expect(effectiveMight(g.state.objects['wk']!).actual).toBe(4)
    expect(effectiveMight(g.state.objects['st']!).actual).toBe(1)
  })

  test('游击战:废堆两张待命卡返手 + 本回合免费布置(不扣资源)', () => {
    let s = scene([
      unit('yj', 'OGN-264', P1, 'hand:P1', 0),
      unit('d1', 'OGN-197', P1, 'discard:P1', 1), // 待命卡在废堆
      unit('d2', 'OGN-083', P1, 'discard:P1', 0),
      unit('hold', 'BLK', P1, BF0, 2), // 控 BF0(布置前提)
    ])
    const g = new InteractiveGame(s, DEPS)
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && g.state.objects[(x as { cardOid: string }).cardOid]?.defId === 'OGN-264')!)
    walk(g, { r1: 'd1', r2: 'd2' })
    const handDefs = g.state.zones['hand:P1']!.contents.map((o) => g.state.objects[o]?.defId)
    expect(handDefs).toContain('OGN-197')
    expect(handDefs).toContain('OGN-083')
                  
    const runesBefore = g.state.zones['base:P1']!.contents.length
    const place = g.legalActions(P1).find((x) => x.kind === 'PLACE_STANDBY')
    expect(place).toBeDefined()
    g.apply(place!)
    expect(g.state.zones['base:P1']!.contents.length).toBe(runesBefore)                
    const sb = Object.values(g.state.zones).find((z) => z.kind === 'standby' && z.contents.length > 0)
    expect(sb).toBeDefined()
                                                   
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.state.freeStandbyThisTurn ?? []).toHaveLength(0)
  })

  test('卡牌骗术:顶3选1进手,其余回收(堆总量守恒-1)', () => {
    let s = scene([unit('pt', 'OGN-183', P1, 'hand:P1', 0)])
    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const g = new InteractiveGame(s, DEPS)
    const deckBefore = g.state.zones['mainDeck:P1']!.contents.length
    const handBefore = g.state.zones['hand:P1']!.contents.length
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && g.state.objects[(x as { cardOid: string }).cardOid]?.defId === 'OGN-183')!)
    walk(g)               
    expect(g.state.zones['hand:P1']!.contents.length).toBe(handBefore - 1 + 1)             
    expect(g.state.zones['mainDeck:P1']!.contents.length).toBe(deckBefore - 1)            
  })

  test('月神恩赐:弃1然后抽2', () => {
    let s = scene([unit('ys', 'UNL-125', P1, 'hand:P1', 0), unit('fodder', 'BLK', P1, 'hand:P1', 2)])
    for (const id of ['m1', 'm2', 'm3']) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const g = new InteractiveGame(s, DEPS)
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && g.state.objects[(x as { cardOid: string }).cardOid]?.defId === 'UNL-125')!)
    walk(g)               
                                            
    expect(g.state.zones['hand:P1']!.contents.length).toBe(2)
    expect(g.state.zones['discard:P1']!.contents.map((o) => g.state.objects[o]?.defId)).toContain('BLK')             
  })
})
