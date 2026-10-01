                                                                           
            
                                                    
                                        
                                                     
                                                  
                   
                                                  
  
                                                     
                                                    
                                                                       
                                                     
  
                                                    
                                                                            
                                                    
  
                                                   
                                                           
import type { GameState } from './gameState'
import type { PlayerId } from './ids'

                                                                         
export function grantExtraTurn(state: GameState, player: PlayerId): GameState {
  return { ...state, extraTurns: [player, ...(state.extraTurns ?? [])] }
}

   
                                                     
                                     
                                                    
   
export function advanceTurnQueue(
  state: GameState, justFinished: PlayerId,
): { readonly state: GameState; readonly next: PlayerId } {
  const anchor = state.turnAnchor ?? justFinished            
  const queue = state.extraTurns ?? []
  if (queue.length > 0) {
                                              
    const [next, ...rest] = queue as readonly PlayerId[]
    return { state: { ...state, extraTurns: rest, turnAnchor: anchor }, next: next! }
  }
  if (state.players.length === 0) return { state, next: justFinished }
  const i = state.players.indexOf(anchor)
  const next = state.players[(i + 1) % state.players.length]!
  return { state: { ...state, turnAnchor: next }, next }
}
