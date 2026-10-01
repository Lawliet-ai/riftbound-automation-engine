                                                                     
                 
                                   
                                          
                                   
                                                                    
                      

                                          
                                                                      
                                                                                     
                                    
                                                                     
                                                               
                                                           
                                                              
                                                                                
                                                                         
                                                                          
                                                           
                                        
                                                                          
                                              
                                                                         
                                                                   

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'

                                  
export function isClosedState(state: GameState): boolean {
  return state.chain.length > 0
}

                                     
export function isSpellDuelState(state: GameState): boolean {
  return state.spellDuelActive
}

                          
export function grantPriority(state: GameState, player: PlayerId): GameState {
  return { ...state, priority: player }
}

                             
export function grantFocus(state: GameState, player: PlayerId): GameState {
  return { ...state, focus: player, priority: player }
}

                                        
export function passPriorityKeepFocus(state: GameState): GameState {
  if (state.priority === null) return state
  return { ...state, priority: nextInTurnOrder(state, state.priority) }
}

   
                                                       
                                                     
   
export function passFocusAfterChainClose(
  state: GameState,
  chainOpenedByTriggerOrGain: boolean,
): GameState {
  if (chainOpenedByTriggerOrGain) return state              
  if (state.focus === null) return state
  const next = nextInTurnOrder(state, state.focus)
  return { ...state, focus: next, priority: next }                     
}

   
                                                         
                                
   
export function canTakeDiscretionaryAction(state: GameState, player: PlayerId): boolean {
  if (state.priority !== player) return false             
  if (isSpellDuelState(state) && !isClosedState(state)) {
    return state.focus === player                     
  }
  return true
}

   
                                                         
                                      
   
export function checkPriorityFocusInvariants(state: GameState): void {
  if (!isSpellDuelState(state) && state.focus !== null) {
    throw new Error('不变量违反:普通状态不应有焦点持有者(§313.5)')
  }
}

function nextInTurnOrder(state: GameState, p: PlayerId): PlayerId {
  const i = state.players.indexOf(p)
  const next = state.players[(i + 1) % state.players.length]
  if (next === undefined) throw new Error('无玩家')
  return next
}
