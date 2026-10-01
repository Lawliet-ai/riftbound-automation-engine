import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor } from '../../data/registry'
import { seedRunes, activeRuneCount } from '../../src/game/economy'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}
function scene(objs: GameObject[], bf0Def: string, bf0Owner: typeof P1): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, battlefieldCards: { [BF0]: { defId: bf0Def, owner: bf0Owner } } }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  s = seedRunes(s, P1, 'purple', 3)
  s = seedRunes(s, P2, 'blue', 2)
                                
  for (const p of [P1, P2]) for (const k of [0, 1, 2]) {
    const id = `rk${p}${k}`; const c = unit(id, 'rune:purple', p, `runeDeck:${p}`, 0)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`runeDeck:${p}`]: { ...s.zones[`runeDeck:${p}`]!, contents: [...s.zones[`runeDeck:${p}`]!.contents, asObjId(id)] } } }
  }
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

describe('黛安娜战场卡:帝柳之林/星尖峰/鬼影湾(据守触发+zoneChange触发)', () => {
  test('帝柳之林:P2 据守此处→回合开始得1分+抽1(据守触发链)', () => {
    const g = new InteractiveGame(scene([unit('h', 'BLK', P2, BF0, 2)], 'OGN-280', P2), DEPS)
    const handBefore = g.state.zones['hand:P2']!.contents.length
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g)
    expect(g.state.scores['P2']).toBe(1)        
    expect(g.state.zones['hand:P2']!.contents.length).toBe(handBefore + 2)             
  })

  test('星尖峰:据守→选召出→基地多一枚休眠符文(不计可用)', () => {
    const g = new InteractiveGame(scene([unit('h', 'BLK', P2, BF0, 2)], 'OGN-288', P2), DEPS)
    const baseBefore = g.state.zones['base:P2']!.contents.length
    const activeBefore = activeRuneCount(g.state, P2)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g, { sum: 'yes' })
                                               
    expect(g.state.zones['base:P2']!.contents.length).toBe(baseBefore + 3)
    expect(activeRuneCount(g.state, P2)).toBe(activeBefore + 2)
  })

  test('鬼影湾:此处单位被弹回手牌→拥有者可付{1}召休眠符文', () => {
                                           
    const g = new InteractiveGame(scene([
      unit('gale', 'OGN-169', P1, 'hand:P1', 0),
      unit('mine', 'BLK', P1, BF0, 2),
    ], 'UNL-214', P1), DEPS)
    const baseBefore = g.state.zones['base:P1']!.contents.length
    g.apply(g.legalActions(P1).find((x) => x.kind === 'PLAY_CARD' && x.target === 'mine')!)
    walk(g, { pay: 'yes' })
    expect(g.state.zones['hand:P1']!.contents.some((o) => g.state.objects[o]?.defId === 'BLK')).toBe(true)       
                                                   
    expect(g.state.zones['base:P1']!.contents.length).toBe(baseBefore + 1)
  })
})
