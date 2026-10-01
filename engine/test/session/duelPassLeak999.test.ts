import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { assertInvariants } from '../../src/test/invariants'
import type { PlayerId } from '../../src/state/ids'

installProviders()

                                                                    
  
                                                    
                                                     
                                      
  
                                                          
                                                               
                                                                        
                                                                
                                  
  
                             
                                                                            
                                                                                   
  
                                              
                                        

const PAIRS = [
  [DEMO_DECK_A, DEMO_DECK_B],
  [DEMO_DECK_A, DEMO_DECK_C],
  [DEMO_DECK_B, DEMO_DECK_C],
] as const

                                           
function play(seed: number, turnCap = 60): { invariantError: string | null; chainDropped: number; steps: number } {
  const rng = makeRng(seed)
  const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
  const [da, db] = PAIRS[seed % 3]!
  const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
  let turns = 0, chainDropped = 0, steps = 0
  let firstError: string | null = null
  for (let step = 0; step < 3000; step++) {
    const p = g.pending()
    if (p.mode === 'gameover') break
    const actor = p.player as PlayerId
    const legal = g.legalActions(actor)
    if (legal.length === 0) break
    const weighted: InteractiveAction[] = []
    for (const a of legal) {
      const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
      for (let i = 0; i < w; i++) weighted.push(a)
    }
    const pick = weighted[rng.int(weighted.length)]!
    if (pick.kind === 'END_TURN') turns++
    g.apply(pick)
    steps++
                                 
    if (g.pending().mode === 'action' && g.state.chain.length > 0) chainDropped++
                                                             
                                                              
                                    
    try { assertInvariants(g.state) } catch (e) {
      firstError ??= `step ${step} ${pick.kind}: ${String(e)}`
    }
    if (turns >= turnCap) break
  }
  return { invariantError: firstError, chainDropped, steps }
}

                                         
const SEEDS = [1002284, 1527905, 1612263] as const

describe('★★★★★★★ ★999b duelPasses 泄漏出对决 ⇒ 链被丢下不结算', () => {
  for (const seed of SEEDS) {
    test(`🔴seed=${seed}:不违反 §313.5,且【回到行动阶段时链是空的】`, () => {
      const r = play(seed)
      expect(r.steps, '前提自证:这局真的跑起来了(不是 0 步空转)').toBeGreaterThan(50)
                                                       
                                     
      expect.soft(r.invariantError, '§313.5:普通状态不应有焦点持有者').toBe(null)
      expect.soft(r.chainDropped, '★回到行动阶段却链非空 = 链上的项目被丢下不结算').toBe(0)
    })
  }
})
