                                           
  
                                      
                                              
                                                       
                                    
                                                          
                                                           
                                              
                                                           
                                                     
                                 
  
                                                        
                                                       
                                                         
  
                                               
                                             

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'

                                              
export type ActivationSite = 'action' | 'window'

   
                       
  
                                                       
                           
                                                      
                                                  
                                          
  
                                                 
                                      
   
export function canActivateNow(
  state: GameState,
  controller: PlayerId,
  keywords: readonly string[] | undefined,
  site: ActivationSite,
): boolean {
  const kws = keywords ?? []
  if (kws.includes('反应')) return true                                      

                                                                       
  if (kws.includes('迅捷') && state.spellDuelActive && state.chain.length === 0) return true

                       
  return (
    site === 'action' &&
    state.activePlayer === controller &&
    state.phase === 'main' &&
    state.chain.length === 0 &&
    !state.spellDuelActive
  )
}
