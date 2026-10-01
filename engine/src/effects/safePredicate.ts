import type { GameObject } from '../state/object'
import type { GameState } from '../state/gameState'
import type { StaticEffect } from './continuousView'

   
                                           
  
                                                                       
                                                                
  
                                                         
                               
  
                                                 
                                                              
                                                        
                                                     
  
                                                                
                                                                          
                                                        
                           
   
export function safePredicate(e: StaticEffect, o: GameObject, state: GameState): boolean {
  try {
    return e.predicate(o, state)
  } catch {
    return false
  }
}
