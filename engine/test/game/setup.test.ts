import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { manaAvailable } from '../../src/game/economy'
import { makeRng } from '../../src/util/rng'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

describe('游戏设置(从牌组开局 §116/§485.5)', () => {
  test('各摸4张、主牌堆余量、传奇入区、起始玩家主阶段', () => {
    const { state, chosenBattlefields } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(42))
                
    expect(state.zones['hand:P1']!.contents).toHaveLength(4)
    expect(state.zones['hand:P2']!.contents).toHaveLength(4)
                                                             
    const less = (d: typeof DEMO_DECK_A): number => d.mainDeck.length - (d.hero && d.mainDeck.includes(d.hero) ? 1 : 0) - 4
    expect(state.zones['mainDeck:P1']!.contents).toHaveLength(less(DEMO_DECK_A))
    expect(state.zones['mainDeck:P2']!.contents).toHaveLength(less(DEMO_DECK_B))
                  
    expect(state.zones['heroZone:P1']!.contents).toHaveLength(1)
    expect(state.zones['heroZone:P2']!.contents).toHaveLength(1)
                                                                   
    expect(state.zones['runeDeck:P1']!.contents).toHaveLength(10)
    expect(state.zones['base:P1']!.contents.filter((o) => state.objects[o]?.defId.startsWith('rune:'))).toHaveLength(2)
    expect(manaAvailable(state, 'P1' as never)).toBe(2)                      
    expect(state.zones['runeDeck:P2']!.contents).toHaveLength(12)
                                
    const legendZ = state.zones['legend:P2']!
    expect(legendZ.contents.map((o) => state.objects[o]?.defId)).toContain('OGN-263')
                           
    expect(DEMO_DECK_A.battlefields).toContain(chosenBattlefields['P1'])
    expect(DEMO_DECK_B.battlefields).toContain(chosenBattlefields['P2'])
                      
    expect(state.activePlayer).toBe('P1')
    expect(state.phase).toBe('main')
  })

  test('同种子可复现(replay);不同种子多半不同序', () => {
    const a = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
    const b = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
    const handDefs = (s: typeof a.state, p: string) => s.zones[`hand:${p}`]!.contents.map((o) => s.objects[o]?.defId)
    expect(handDefs(a.state, 'P1')).toEqual(handDefs(b.state, 'P1'))          
    const c = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(99))
                                     
    const lessA = DEMO_DECK_A.mainDeck.length - (DEMO_DECK_A.hero && DEMO_DECK_A.mainDeck.includes(DEMO_DECK_A.hero) ? 1 : 0) - 4
    expect(c.state.zones['mainDeck:P1']!.contents).toHaveLength(lessA)
  })

  test('手牌 oid 唯一、全部归属正确', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(1))
    const p1hand = state.zones['hand:P1']!.contents
    expect(new Set(p1hand).size).toBe(p1hand.length)          
    for (const oid of p1hand) expect(state.objects[oid]!.owner).toBe('P1')
  })
})
