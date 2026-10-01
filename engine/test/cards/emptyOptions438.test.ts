import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { InteractiveAction, InteractiveDeps } from '../../src/session/interactiveGame'
import { InteractiveGame } from '../../src/session/interactiveGame'
import {
  activeTriggers, cardCost, cardDomains, cardKeywords, cardKind, costModsFor, handPlaySpecs, playSpecFor, playBonusFor,
} from '../../data/registry'

                                                   
                                                            
                                         
                                                     
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(oid: string, defId: string, ctrl = P1, zone = `hand:${P1}`, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  }
}
const rune = (oid: string): GameObject =>
  ({ ...obj(oid, 'rune:yellow', P1, `base:${P1}`, ['rune']) } as GameObject)
function scene(objs: GameObject[]): GameState {
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
const deps: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost, cardDomains, costModsFor, playSpecFor,
  playBonusFor,
}
const playsOf = (g: InteractiveGame, oid: string): InteractiveAction[] =>
  g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT' && (a as { oid: string }).oid === oid)

describe('🔴★★★★【债·415 剩余】候选为空时的额外费变体(436 的 available 已接,这里钉死行为)', () => {
  test('🔴★★★可选型(SFD-160)+ 无友方装备:只有「不付」变体,牌照打', () => {
    const g = new InteractiveGame(scene([
      obj('thug', 'SFD-160'), rune('r1'), rune('r2'), rune('r3'), rune('r4'),
    ]), deps)
    const acts = playsOf(g, 'thug')
    expect(acts.length, '打得出(不付那条在)').toBeGreaterThan(0)
    expect(acts.every((a) => (a as { bonus?: boolean }).bonus !== true), '「付」变体一条都不产').toBe(true)
  })

  test('🔴★★★可选型 + 有友方装备:付/不付两型都在,付的带 bonusChoice', () => {
    const g = new InteractiveGame(scene([
      obj('thug', 'SFD-160'), obj('g1', 'SFD-150', P1, `base:${P1}`, ['equipment']),
      rune('r1'), rune('r2'), rune('r3'), rune('r4'),
    ]), deps)
    const acts = playsOf(g, 'thug')
    expect(acts.some((a) => (a as { bonus?: boolean }).bonus === true
      && (a as { bonusChoice?: string }).bonusChoice === 'g1'), '付的变体带候选').toBe(true)
    expect(acts.some((a) => (a as { bonus?: boolean }).bonus !== true), '不付的也在').toBe(true)
  })

  test('🔴★★★强制型(OGN-208 冷血贵族)+ 无友方单位可摧毁:整张打不出(§204)', () => {
    expect(playBonusFor('OGN-208')?.required, '样本自证:强制').toBe(true)
    const g = new InteractiveGame(scene([
      obj('noble', 'OGN-208'), rune('r1'), rune('r2'), rune('r3'), rune('r4'), rune('r5'),
    ]), deps)
    expect(playsOf(g, 'noble'), '费用付不出 ⇒ 一条变体都不产').toHaveLength(0)
  })

  test('★强制型 + 有友方单位:只有「付」型变体(强制不给不付档)', () => {
    const g = new InteractiveGame(scene([
      obj('noble', 'OGN-208'), obj('mate', 'BLK', P1, `base:${P1}`),
      rune('r1'), rune('r2'), rune('r3'), rune('r4'), rune('r5'),
    ]), deps)
    const acts = playsOf(g, 'noble')
    expect(acts.length).toBeGreaterThan(0)
    expect(acts.every((a) => (a as { bonus?: boolean }).bonus === true), '强制型不推「不付」').toBe(true)
  })
})
