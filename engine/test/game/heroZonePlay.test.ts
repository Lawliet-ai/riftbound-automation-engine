import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function obj(id: string, defId: string, ctrl: typeof P1, zone: string): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {} }
}

                                                    
describe('§419.1.a 从英雄区打出选定英雄', () => {
  function scene(): GameState {
    const base = createInitialState([P1, P2], 2)
    const hero = obj('hero', 'BLK', P1, 'heroZone:P1')
    return {
      ...base, activePlayer: P1, priority: null, phase: 'main',
      objects: { hero },
      zones: { ...base.zones, ['heroZone:P1']: { ...base.zones['heroZone:P1']!, contents: [asObjId('hero')] } },
    }
  }

  test('英雄区的英雄出现在合法动作里,可打到基地', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const plays = g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT' && a.oid === 'hero')
    expect(plays.length).toBeGreaterThan(0)
    expect(plays.some((a) => a.kind === 'PLAY_UNIT' && a.to === 'base:P1')).toBe(true)
  })

  test('打出后离开英雄区、落进基地(§124 跨界换新 oid、§359.2.c 休眠进场)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'hero', to: 'base:P1' })
                             
    for (let i = 0; i < 10; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      break
    }
    expect(g.state.zones['heroZone:P1']?.contents.length).toBe(0)
    const baseUnits = (g.state.zones['base:P1']?.contents ?? []).map((o) => g.state.objects[o]?.defId)
    expect(baseUnits).toContain('BLK')
  })

  test('对手的英雄区不受影响:P1 拿不到 P2 英雄的打出动作', () => {
    const s = scene()
    const withFoeHero: GameState = {
      ...s,
      objects: { ...s.objects, foeHero: obj('foeHero', 'BLK', P2, 'heroZone:P2') },
      zones: { ...s.zones, ['heroZone:P2']: { ...s.zones['heroZone:P2']!, contents: [asObjId('foeHero')] } },
    }
    const g = new InteractiveGame(withFoeHero, DEPS)
    expect(g.legalActions(P1).some((a) => a.kind === 'PLAY_UNIT' && a.oid === 'foeHero')).toBe(false)
  })
})
