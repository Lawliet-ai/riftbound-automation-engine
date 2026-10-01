import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, holdRepeats } from '../../data/registry'
import { experienceOf } from '../../src/keywords/level'

                                                              
                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, holdRepeats }

function obj(id: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra }
}
function scene(extra: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  let i = 0
  for (const p of [P1, P2]) {
    for (let k = 0; k < 6; k++) {
      const id = `deck${i++}`
      const c = obj(id, p, `mainDeck:${p}`)
      s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
    }
  }
  return s
}
function drainAll(g: InteractiveGame, max = 20): void {
  for (let i = 0; i < max; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id }); continue }
    break
  }
}

test('回合开始据守 → hold 信号 → 狩猎触发入链结算 → 控制者获得经验(全真实管线)', () => {
                                                          
                                            
  const g = new InteractiveGame(scene([obj('hunter', P1, BF0, { baseKeywords: ['狩猎2'] })]), DEPS)
  expect(experienceOf(g.state, P1)).toBe(0)
  g.apply({ kind: 'END_TURN', player: P1 })
  drainAll(g)
  expect(g.state.activePlayer).toBe(P2)
  g.apply({ kind: 'END_TURN', player: P2 })
  drainAll(g)
  expect(g.state.activePlayer).toBe(P1)
  expect(g.state.scores[P1]).toBe(1)         
  expect(experienceOf(g.state, P1)).toBe(2)               
  expect(experienceOf(g.state, P2)).toBe(0)
})

test('★裁定:魔像"据守效果额外触发一次"管狩猎——狩猎2 据守触发两次共 4 经验', () => {
                                       
                                                                 
  const g = new InteractiveGame(scene([
    obj('hunter', P1, BF0, { baseKeywords: ['狩猎2'] }),
    obj('golem', P1, BF0, { defId: 'UNL-087' }),
  ]), DEPS)
  g.apply({ kind: 'END_TURN', player: P1 })
  drainAll(g)
  g.apply({ kind: 'END_TURN', player: P2 })
  drainAll(g)
  expect(g.state.activePlayer).toBe(P1)
  expect(g.state.scores[P1]).toBe(1)                             
  expect(experienceOf(g.state, P1)).toBe(4)              
})
