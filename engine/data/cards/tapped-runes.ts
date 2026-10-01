                                                                 
  
                                                          
                                                    
                                                              
                                                                     
                                                                   
                                                                    
  
                                                              
                                                             
  
                                                               
import { isRune } from '../../src/state/cardTypes'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'

   
                                                 
  
                                                                
                                                                         
                                                     
   
export function isTappedRune(o: GameObject): boolean {
  return isRune(o) && o.status.tapped === true
}

   
                                             
  
                                                                       
                                                                                         
                                                            
                                                 
                                          
   
export function isMyTappedRune(o: GameObject, controller: PlayerId): boolean {
  return (o.defId as string).startsWith('rune:')
    && o.controller === controller
    && o.status.tapped === true
}

                        
export function tappedRuneOids(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => isMyTappedRune(o, controller))
    .map((o) => o.oid as string)
}
