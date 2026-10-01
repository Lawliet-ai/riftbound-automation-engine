                                                          
  
                                                                   
                                        
                                                            
                                        
                                
  
                                                               
                              
  
                                       
                                  
                                                   
import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { playerTurnIndex } from '../../src/scoring/score'
import { makeRng } from '../../src/util/rng'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

describe('★762 起始玩家可以是任一方', () => {
  test('默认(不传)仍是 P1 先手 —— 老行为不变', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11))
    expect(state.activePlayer).toBe(P1)
    expect(playerTurnIndex(state, P1)).toBe(1)
    expect(playerTurnIndex(state, P2)).toBe(0)
  })

  test('传 P2 先手:activePlayer 与 turnsTaken 必须一致地跟着走', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11), P2)
    expect(state.activePlayer).toBe(P2)
                                              
    expect(playerTurnIndex(state, P2)).toBe(1)
    expect(playerTurnIndex(state, P1)).toBe(0)
  })

  test('§485.7 后手补符文跟着换边:P2 先手时,补的是 P1', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11), P2)
    expect(state.extraRunesFirstSummon?.[P1 as string]).toBe(1)
    expect(state.extraRunesFirstSummon?.[P2 as string]).toBeUndefined()
  })

  test('§117 调度顺序跟着起始玩家走(起始玩家先调度)', () => {
    const a = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11), P1).state
    const b = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11), P2).state
    expect(a.mulliganQueue?.[0]).toBe(P1)
    expect(b.mulliganQueue?.[0]).toBe(P2)
  })

  test('§116 两边都各摸四张 —— 先后手不影响起手张数', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(11), P2)
    expect(state.zones[`hand:${P1}`]?.contents.length).toBe(4)
    expect(state.zones[`hand:${P2}`]?.contents.length).toBe(4)
  })
})
