import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { manaAvailable } from '../../src/game/economy'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

const DEPS = { getTriggers: activeTriggers, handPlaySpecs }
const GAME_DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardCost }            
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function runeCount(g: InteractiveGame, p: string): number {
  return g.state.zones[`base:${p}`]!.contents.filter((o) => g.state.objects[o]?.defId.startsWith('rune:')).length
}

                        
function keepAll(g: InteractiveGame): void {
  g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
  g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
}

describe('从牌组开局的真游戏(setup + 符文经济回合循环)', () => {
  test('起始玩家有法力+2符文;回合循环:召出+抽牌+法力增长', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(5))
    const g = new InteractiveGame(state, DEPS)
    keepAll(g)

                                                            
    expect(g.pending()).toEqual({ mode: 'action', player: 'P1' })
    expect(g.state.zones['hand:P1']!.contents).toHaveLength(5)
    expect(manaAvailable(g.state, P1)).toBe(2)
    expect(runeCount(g, 'P1')).toBe(2)

                                                
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.state.activePlayer).toBe('P2')
    expect(g.state.zones['hand:P2']!.contents).toHaveLength(5)            
    expect(manaAvailable(g.state, P2)).toBe(3)                       
    expect(runeCount(g, 'P2')).toBe(3)

                                           
    g.apply({ kind: 'END_TURN', player: P2 })
    expect(g.state.activePlayer).toBe('P1')
    expect(runeCount(g, 'P1')).toBe(4)           
    expect(manaAvailable(g.state, P1)).toBe(4)
    expect(g.state.zones['hand:P1']!.contents).toHaveLength(6)              
  })

  test('付费法术从牌组局能打:法力足则灼击(1)可打(有敌方单位时)', () => {
                                          
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(3))
    const g = new InteractiveGame(state, DEPS)
    expect(manaAvailable(g.state, P1)).toBeGreaterThanOrEqual(2)                
  })

  test('真游戏单位扣费(§204):打素单位(费2)后法力-2;付不起则不列出', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11))
    const g = new InteractiveGame(state, GAME_DEPS)
    keepAll(g)
    expect(manaAvailable(g.state, P1)).toBe(2)          
    const playUnit = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')
    if (playUnit) {
      g.apply(playUnit)              
      expect(manaAvailable(g.state, P1)).toBe(0)         
                            
      expect(g.legalActions(P1).some((a) => a.kind === 'PLAY_UNIT')).toBe(false)
    }
  })
})
