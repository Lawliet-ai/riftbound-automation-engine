                                                            
                                                                       

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import { isClosedState, isSpellDuelState } from './priorityFocus'

export type PromptKind = 'PROMPT' | 'WAITING'

   
                            
                                                              
                                                       
                                         
   
export function promptFor(state: GameState, player: PlayerId): PromptKind {
  if (isSpellDuelState(state)) return state.focus === player ? 'PROMPT' : 'WAITING'
  if (isClosedState(state)) return state.priority === player ? 'PROMPT' : 'WAITING'
  return state.activePlayer === player && state.priority === player ? 'PROMPT' : 'WAITING'
}

                                                            
                                                                                    
                                                      
                                          
                                              
