import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { UNL_216, UNL_216_CARD_EFFECT, makeAcademyTrigger } from '../../data/cards/battlefields-extra'

                                             
                                                                
                                           
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[]): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    battlefieldCards: { [BF0]: { defId: 'UNL-216', owner: P1 } } }
  s = seedRunes(s, P1, 'green', 2)
  s = seedRunes(s, P2, 'blue', 2)
  return s
}
function walk(g: InteractiveGame): void {
  for (let i = 0; i < 12; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id }); continue }
    break
  }
}

describe('★ 前提:卡面事实与接线', () => {
  test('战场卡;卡文;触发形状(hold 专属、无选择)', () => {
    expect(UNL_216.category).toBe('battlefield')
    expect(UNL_216_CARD_EFFECT).toContain('回响')
    const trig = makeAcademyTrigger(BF0, P1)
    expect(trig.event).toBe('hold')
    expect(trig.nextChoice, '无选择').toBeUndefined()
    expect(trig.effect!(scene([]), { kind: 'hold', player: P1, battlefield: BF0 } as GameEvent, {}))
      .toEqual([{ kind: 'grantNextSpellEcho', player: P1 }])
  })
})

describe('🔴★★★★端到端:据守皮城学院 → 回响授予落账(nextSpellEchoThisTurn)', () => {
  test('🔴★★★P2 据守 ⇒ P2 账 +1(P1 不沾);「你」对称', () => {
    const g = new InteractiveGame(scene([unit('h', 'BLK', P2, BF0)]), DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    walk(g)
    expect(g.state.nextSpellEchoThisTurn?.[P2], '据守者 P2 拿到授予').toBe(1)
    expect(g.state.nextSpellEchoThisTurn?.[P1], 'P1 没份').toBeUndefined()
  })

  test('★别的战场据守不响(eventAtBattlefield 门)', () => {
    const trig = makeAcademyTrigger(BF0, P1)
    const s = scene([])
    expect(trig.filter!({ kind: 'hold', player: P1, battlefield: 'battlefield:shared:1' } as GameEvent, s),
      '据守的不是学院那处').toBe(false)
    expect(trig.filter!({ kind: 'hold', player: P1, battlefield: BF0 } as GameEvent, s)).toBe(true)
  })

  test('★conquer 不响(hold 专属)', () => {
    const trig = makeAcademyTrigger(BF0, P1)
    expect(trig.event).not.toBe('conquer')
  })
})
