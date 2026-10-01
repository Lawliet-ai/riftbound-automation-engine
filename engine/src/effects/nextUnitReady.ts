                                                    
  
                                 
                                                                   
                                       
                                                                   
                                
                                            
  
                                                                                     
                                                                             
  
                                                                     
                                                                  
                
                                                      
                                              
import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'

                              
export function nextUnitReadyOf(state: GameState, player: PlayerId): boolean {
  return state.nextUnitReady?.[player as string] === true
}

                                                               
export function grantNextUnitReadyInState(state: GameState, player: PlayerId): GameState {
  return { ...state, nextUnitReady: { ...state.nextUnitReady, [player as string]: true } }
}

                                    
export function consumeNextUnitReadyInState(state: GameState, player: PlayerId): GameState {
  if (!nextUnitReadyOf(state, player)) return state
  const next = { ...state.nextUnitReady }
  delete next[player as string]
  return { ...state, nextUnitReady: next }
}

                                                     
  
                                           
                                     
                                                     
                                            
                                                
                                                  
                                                 
                                                  
                                  

                                          
export function allUnitsEnterReadyOf(state: GameState, player: PlayerId): boolean {
  return state.unitsEnterReadyThisTurn?.[player as string] === true
}

                                                                       
export function grantAllUnitsEnterReadyInState(state: GameState, player: PlayerId): GameState {
  if (allUnitsEnterReadyOf(state, player)) return state
  return { ...state, unitsEnterReadyThisTurn: { ...state.unitsEnterReadyThisTurn, [player as string]: true } }
}
