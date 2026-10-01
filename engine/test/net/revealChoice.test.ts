                                               
                                            
import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, startStepHook, holdRepeats } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardCost, cardKeywords, standbyAltCost, playSpecFor, activatedFor, cardKind, startStepHook, holdRepeats, rng: makeRng(1) }

function trickGame(): InteractiveGame {
                                   
  for (let seed = 1; seed < 60; seed++) {
    const g = new InteractiveGame(setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(seed)).state, { ...DEPS, rng: makeRng(seed) })
    g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
    g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
    const trick = (g.state.zones['hand:P1']!.contents).find((o) => g.state.objects[o]?.defId === 'OGN-183')
    if (trick) return g
  }
  throw new Error('没抽到卡牌骗术,换种子范围')
}

describe('抉择候选牌堆顶揭示', () => {
  test('打出卡牌骗术后,决策者看得到3张候选卡面,对手看不到', () => {
    const g = trickGame()
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid: string }).cardOid ===
      (g.state.zones['hand:P1']!.contents).find((o) => g.state.objects[o]?.defId === 'OGN-183'))
    expect(play).toBeDefined()
    g.apply(play!)
                       
    for (let i = 0; i < 6; i++) { const w = g.pending(); if (w.mode !== 'window') break; g.apply({ kind: 'PASS', player: w.player }) }
    const p = g.pending()
    expect(p.mode).toBe('choice')
    if (p.mode !== 'choice') return
    const cands = p.request.candidates.map((c) => c.id)
    const decider = p.request.controller
    const other = decider === P1 ? P2 : P1
    const vDec = g.view(decider)
    const vOther = g.view(other)
                                   
    for (const id of cands) {
      expect(vDec.objects[id]?.defId).toBeTruthy()
                                       
      expect(vOther.objects[id]).toBeUndefined()
    }
  })

  test('抉择做完后,牌堆序重新密封(揭示不持久)', () => {
    const g = trickGame()
    const trickOid = (g.state.zones['hand:P1']!.contents).find((o) => g.state.objects[o]?.defId === 'OGN-183')!
    g.apply({ kind: 'PLAY_CARD', player: P1, cardOid: trickOid })
    for (let i = 0; i < 6; i++) { const w = g.pending(); if (w.mode !== 'window') break; g.apply({ kind: 'PASS', player: w.player }) }
    const p = g.pending()
    if (p.mode !== 'choice') throw new Error('未进入抉择')
    const decider = p.request.controller
    const take = p.request.candidates[0]!.id
    g.apply({ kind: 'CHOOSE', player: decider, key: p.request.key, answer: take })
                                           
    const v = g.view(decider)
    const deck = v.zones[`mainDeck:${decider}`]!
    expect(deck.contents.every((c) => c === 'hidden')).toBe(true)
  })
})
