                                                     
import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost, cardKeywords, playSpecFor, cardKind } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardCost, cardKeywords, playSpecFor, cardKind }

function game(): InteractiveGame {
  const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(4))
  const g = new InteractiveGame(state, DEPS)
  g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
  g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
  return g
}

describe('打不出的牌要给原因', () => {
  test('首回合只有 2 法力,打不起的牌报 cost 并给出费用与现有法力', () => {
    const g = game()
    const blocked = g.blockedFor(P1)
    const costly = blocked.filter((b) => b.reason === 'cost')
    expect(costly.length).toBeGreaterThan(0)
    for (const b of costly) {
      expect(b.detail).toBeTruthy()
      expect(b.haveMana).toBe(2)             
      expect((b.costMana ?? 0) + (b.costPips ?? []).length).toBeGreaterThan(0)
    }
  })

  test('不是你的回合时,手上每张牌都报 timing', () => {
    const g = game()
    const blocked = g.blockedFor(P2)          
    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.every((b) => b.reason === 'timing')).toBe(true)
    expect(blocked[0]!.detail).toContain('对手的回合')
  })

  test('能打出的牌不会出现在 blocked 里(不自相矛盾)', () => {
    const g = game()
    const playable = new Set(g.legalActions(P1).map((a) => (a as { cardOid?: string; oid?: string }).cardOid ?? (a as { oid?: string }).oid).filter(Boolean))
    expect(g.blockedFor(P1).some((b) => playable.has(b.oid))).toBe(false)
  })
})
