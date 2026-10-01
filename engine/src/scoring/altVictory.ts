                                     
                                                            
                                                          
                                                     
                                                     
                                                          
                                                    
                                                
  
                                    
                                                    
                                                                          
                                                  
                                                           
                                        
                                                 
  
                                            
                                                                   
                                                                              
                                                   
                                                 
                                                                       
  
                                                            
                                           
                                  
                                                                  
  
                             

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'

export interface VictoryCondition {
  readonly id: string
  readonly player: PlayerId
  readonly kind: 'win' | 'lose'
                                
  readonly predicate: (state: GameState) => boolean
}

   
                                                             
                                                   
                                                 
                                              
            
   
export function checkAltVictory(state: GameState): GameState {
  if (state.winner) return state
  for (const vc of state.victoryConditions) {
    if (vc.kind === 'win' && vc.predicate(state)) {
      return { ...state, winner: vc.player }
    }
  }
  for (const vc of state.victoryConditions) {
    if (vc.kind === 'lose' && vc.predicate(state)) {
      const opponents = state.players.filter((p) => p !== vc.player)
      if (opponents.length === 1) return { ...state, winner: opponents[0]! }
    }
  }
  return state
}
