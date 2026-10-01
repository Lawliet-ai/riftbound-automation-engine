                                                                              
                                                
                                                          
                                                      

import type { GameState } from '../state/gameState'

export const REACTION = '反应'
export const HASTE = '迅捷'

export function isClosed(state: GameState): boolean {
  return state.chain.length > 0                   
}

                                                              
export function canPlayInTiming(
  state: GameState,
  keywords: readonly string[],
  isChainStarter: boolean,
): boolean {
  const hasReaction = keywords.includes(REACTION)
  const hasHaste = keywords.includes(HASTE)
  if (isClosed(state)) {
                                                            
    return isChainStarter ? hasReaction || hasHaste : hasReaction
  }
  if (state.spellDuelActive) {
    return hasReaction || hasHaste                               
  }
  return true                                  
}

                                                                         
                                                                             
                                                               
                                      
                                                      
