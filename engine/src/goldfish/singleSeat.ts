                                                       
                                                           

import { zonesByKind, type GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import { moveObjectInState } from '../state/mutations'
import {
  runAwakenPhase,
  runExpirationStep,
  runMainPhaseEntry,
} from '../loop/turnStructure'
import { expireThisTurnEffects } from '../effects/continuousView'
import { attemptHold, resetTurnLedgers } from '../scoring/score'
import { advanceTurnQueue } from '../state/turnQueue'
import { burnOut } from '../scoring/burnout'
import { isUnit } from '../state/cardTypes'
import type { ReduceDeps } from '../loop/reduce'
import { controlledBattlefields } from '../state/battlefieldControl'

function topOfMainDeck(state: GameState, player: PlayerId): ObjId | null {
  const deck = state.zones[`mainDeck:${player}` as ZoneId]
  return deck && deck.contents.length > 0 ? (deck.contents[deck.contents.length - 1] ?? null) : null       
}

                                                                
export function drawCard(state: GameState, player: PlayerId, deps: ReduceDeps = {}): GameState {
  const top = topOfMainDeck(state, player)
  if (top === null) {
    const afterBurn = burnOut(state, player, deps)                 
    const t2 = topOfMainDeck(afterBurn, player)
    return t2 !== null ? moveObjectInState(afterBurn, t2, `hand:${player}` as ZoneId) : afterBurn              
  }
  return moveObjectInState(state, top, `hand:${player}` as ZoneId)
}

function handoff(state: GameState): GameState {
                                                              
  const { state: handed, next } = advanceTurnQueue(state, state.activePlayer)
  return { ...handed, activePlayer: next, phase: 'awaken' }
}

   
                                               
                                                              
   
export function runTurn(
  state: GameState,
  deps: ReduceDeps = {},
  onStartStep?: (state: GameState) => GameState,
): GameState {
  let s = state
  const p = s.activePlayer

                       
  s = { ...runAwakenPhase(s), phase: 'awaken' }

                                              
  s = { ...s, phase: 'start' }
  if (onStartStep) s = onStartStep(s)
  if (s.winner) return s                                              

                                 
  for (const bf of controlledBattlefields(s, p)) {
    s = attemptHold(s, p, bf, deps).state
  }

                                               
  s = { ...s, phase: 'summon' }

                
  s = { ...s, phase: 'draw' }
  s = drawCard(s, p, deps)

                               
  s = runMainPhaseEntry(s).state

                                                      
  s = { ...s, phase: 'ending' }
  s = runExpirationStep(s, expireThisTurnEffects)

                            
  return resetTurnLedgers(handoff(s))
}
