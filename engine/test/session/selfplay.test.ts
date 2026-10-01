                                           
                                              
import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C, DEMO_DECK_D } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { assertInvariants } from '../../src/test/invariants'
import type { PlayerId } from '../../src/state/ids'

installProviders()

                                                              
const PAIRS = [
  [DEMO_DECK_A, DEMO_DECK_B],
  [DEMO_DECK_A, DEMO_DECK_C],
  [DEMO_DECK_B, DEMO_DECK_C],
                                                                         
                                                              
  [DEMO_DECK_D, DEMO_DECK_A],
  [DEMO_DECK_D, DEMO_DECK_B],
  [DEMO_DECK_D, DEMO_DECK_C],
] as const

function play(seed: number, turnCap = 60): { winner: string | null; stuck: string | null; actions: number } {
  const rng = makeRng(seed)
                                                                           
                                                  
  const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
  const [da, db] = PAIRS[seed % PAIRS.length]!
  const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
  let turns = 0, actions = 0, last = '', same = 0
  for (let step = 0; step < 3000; step++) {
    const p = g.pending()
    if (p.mode === 'gameover') break
    const actor = p.player as PlayerId
    const legal = g.legalActions(actor)
    if (legal.length === 0) return { winner: g.state.winner, stuck: `无合法动作 ${p.mode}/${actor}`, actions }
    const sig = `${p.mode}|${actor}|${g.state.zones[`hand:${actor}`]?.contents.length}|${g.state.chain.length}|${turns}`
    same = sig === last ? same + 1 : 0
    last = sig
    if (same > 60) return { winner: g.state.winner, stuck: `疑似卡死 ${sig}`, actions }
    const weighted: InteractiveAction[] = []
    for (const a of legal) {
      const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
      for (let i = 0; i < w; i++) weighted.push(a)
    }
    const pick = weighted[rng.int(weighted.length)]!
    if (pick.kind === 'END_TURN') turns++
    g.apply(pick)
    actions++
                                       
                                                       
    assertInvariants(g.state)
    if (turns >= turnCap) break
  }
  return { winner: g.state.winner, stuck: null, actions }
}

describe('自我对弈冒烟(D1)', () => {
  test('8 局随机对弈:不崩溃、不卡死、都能打出胜负', () => {
                                                     
                                              
    for (let i = 1; i <= 40; i++) {
      const r = play(i * 7919)
      expect(r.stuck, `seed ${i * 7919}`).toBeNull()
      expect(r.winner, `seed ${i * 7919} 未分胜负`).not.toBeNull()
      expect(r.actions).toBeGreaterThan(20)
    }
  }, 90_000)                                    
                                                                
                                                                      
                                                         
                                            
                                                     
                                               

  test('合法动作必可执行:不存在"列出来却被拒"的动作(付不起的法术不该出现)', () => {
    const seed = 87109                  
    const r = play(seed)
    expect(r.stuck).toBeNull()
  })
})
