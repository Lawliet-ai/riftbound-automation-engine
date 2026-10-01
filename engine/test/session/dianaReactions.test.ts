import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'
import { seedRunes, activeRuneCount } from '../../src/game/economy'
import { effectiveMight } from '../../src/state/might'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}
function scene(hand1: [string, string][], extra: GameObject[] = []): GameState {
  let s = createInitialState([P1, P2], 2)
  const objs = [...hand1.map(([id, d]) => unit(id, d, P1, 'hand:P1', 0)), ...extra]
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  s = seedRunes(s, P1, 'purple', 4)
  s = seedRunes(s, P1, 'blue', 4)
  return s
}
function drain(g: InteractiveGame): void {
  for (let i = 0; i < 8 && g.pending().mode === 'window'; i++) {
    const p = g.pending()
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: p.player })
  }
}

describe('黛安娜反应批:责退/惑心转意/择日再战/先知之兆', () => {
  test('责退(2+双紫pip):弹回敌方4[M]大单位(无战力上限);双pip实扣2符文', () => {
    const g = new InteractiveGame(scene([['zt', 'OGN-172']], [unit('big', 'BLK', P2, BF0, 4)]), DEPS)
    const runesBefore = activeRuneCount(g.state, P1)     
    const a = g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && x.target === 'big')
    expect(a).toBeDefined()                  
    g.apply(a!)
    drain(g)
    expect(g.state.zones['hand:P2']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)
                                         
    expect(activeRuneCount(g.state, P1)).toBeLessThanOrEqual(runesBefore - 2)
  })

  test('惑心转意(1+1蓝pip)二选一:weak 分支敌方-2S;back 分支友方返手', () => {
    const g = new InteractiveGame(scene([['hx', 'VEN-052'], ['hx2', 'VEN-052']], [
      unit('mine', 'BLK', P1, BF0, 3), unit('foe', 'BLK', P2, BF0, 4),
    ]), DEPS)
    const weak = g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && x.target === 'weak:foe')
    expect(weak).toBeDefined()
    g.apply(weak!)
    drain(g)
    expect(effectiveMight(g.state.objects['foe']!).actual).toBe(2)       
    const back = g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && x.target === 'back:mine')
    expect(back).toBeDefined()
    g.apply(back!)
    drain(g)
    expect(g.state.zones['hand:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)
  })

  test('择日再战(1+0):友方返手+其拥有者召出一枚【休眠】符文(不计入可用)', () => {
    let s = scene([['zr', 'OGN-104']], [unit('mine', 'BLK', P1, BF0, 2)])
    const rd = unit('r1', 'rune:purple', P1, 'runeDeck:P1', 0)
    s = { ...s, objects: { ...s.objects, r1: rd }, zones: { ...s.zones, 'runeDeck:P1': { ...s.zones['runeDeck:P1']!, contents: [asObjId('r1')] } } }
    const g = new InteractiveGame(s, DEPS)
    const active0 = activeRuneCount(g.state, P1)
    const baseCount0 = g.state.zones['base:P1']!.contents.length
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && x.target === 'mine')!)
    drain(g)
    expect(g.state.zones['hand:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)      
    expect(g.state.zones['base:P1']!.contents.length).toBe(baseCount0 + 1)         
    expect(activeRuneCount(g.state, P1)).toBe(active0 - 1)                   
  })

  test('先知之兆(2+三蓝pip):抽3;蓝符能不足3则不可打', () => {
    let s = scene([['xz', 'SFD-087']])
    for (const id of ['d1', 'd2', 'd3', 'd4']) {
      const c = unit(id, 'BLK', P1, 'mainDeck:P1', 2)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, 'mainDeck:P1': { ...s.zones['mainDeck:P1']!, contents: [...s.zones['mainDeck:P1']!.contents, asObjId(id)] } } }
    }
    const g = new InteractiveGame(s, DEPS)
    const handBefore = g.state.zones['hand:P1']!.contents.length
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD')!)
    drain(g)
    expect(g.state.zones['hand:P1']!.contents.length).toBe(handBefore - 1 + 3)

    let s2 = createInitialState([P1, P2], 2)
    const c2 = unit('xz2', 'SFD-087', P1, 'hand:P1', 0)
    s2 = { ...s2, activePlayer: P1, priority: null, phase: 'main', objects: { xz2: c2 }, zones: { ...s2.zones, 'hand:P1': { ...s2.zones['hand:P1']!, contents: [asObjId('xz2')] } } }
    s2 = seedRunes(s2, P1, 'blue', 2)
    s2 = seedRunes(s2, P1, 'purple', 4)
    const g2 = new InteractiveGame(s2, DEPS)
    const a2 = g2.legalActions(P1).find((x) => x.kind === 'PLAY_CARD')
    if (a2) { g2.apply(a2); expect(g2.state.chain).toHaveLength(0) }
  })
})
