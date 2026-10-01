                                                            
                                                                           
                                                                   
                                                                     
                         

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import { attemptConquer, type ScoreResult, type ScoringHooks } from './score'
import { runCombat, type CombatResult } from '../combat/battle'
import type { ReduceDeps } from '../loop/reduce'

                                               
export function resolveConquer(
  state: GameState,
  conquer: CombatResult['conquer'],
  deps: ReduceDeps = {},
  hooks: ScoringHooks = {},
): { state: GameState; result: ScoreResult | 'none'; signal: boolean } {
  if (!conquer) return { state, result: 'none', signal: false }
  const r = attemptConquer(state, conquer.player, conquer.battlefield, deps, hooks)
  return { state: r.state, result: r.result, signal: r.signal }
}

                                                           
export function runCombatAndScore(
  state: GameState,
  battlefield: string,
  attacker: PlayerId,
  deps: ReduceDeps = {},
  hooks: ScoringHooks = {},
): { state: GameState; combat: CombatResult; scored: ScoreResult | 'none' } {
  const combat = runCombat(state, battlefield, attacker, deps)
  const { state: scoredState, result } = resolveConquer(combat.state, combat.conquer, deps, hooks)
  return { state: scoredState, combat, scored: result }
}
