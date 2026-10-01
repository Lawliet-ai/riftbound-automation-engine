                                                           
                                                    
                             
                                          
                                                                  
                                                   
                                                                  
                                                            
  
                                                                
                                                   
                                                              
                                                          
  
                                                    
                                                   
                                                                  
                                 
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import { isToken, isUnit } from '../../src/state/cardTypes'

                                                                            
export function eventSubjectIsToken(ev: GameEvent, state: GameState): boolean {
  const unit = (ev as { readonly unit?: ObjId }).unit
  return unit !== undefined && isToken(state.objects[unit])
}

   
                                
                                                  
                                                      
                                                          
   
export const SUBJECT_IS_NOT_TOKEN = {
  kind: 'custom' as const,
  test: (ev: GameEvent, state: GameState): boolean => !eventSubjectIsToken(ev, state),
}

   
                                     
  
                                                             
                                                    
                                                                              
                                                                      
                                             
   
export function eventSubjectIsUnit(ev: GameEvent, state: GameState): boolean {
  const unit = (ev as { readonly unit?: ObjId }).unit
  if (unit === undefined) return false
                                                                           
                                                                      
                                                                
                                                  
  return isUnit(state.objects[unit])
}

                                                
export const SUBJECT_IS_UNIT = {
  kind: 'custom' as const,
  test: (ev: GameEvent, state: GameState): boolean => eventSubjectIsUnit(ev, state),
}
