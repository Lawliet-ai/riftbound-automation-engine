                               
  
                                         
                                                      
                        
  
                                                  
                                              
                                                            
                                          
                                      
                                                                
                                                   
                                                         
                                   
                                                           
                                                    
                                                        
                                   

import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import { isFieldedExceptStandby } from '../../src/state/zones'

                                           
export function canDormantSelf(state: GameState, selfOid: ObjId): boolean {
  const me = state.objects[selfOid]
  if (!me) return false
  const kind = state.zones[me.zone]?.kind
  return isFieldedExceptStandby(kind) && me.status.tapped !== true                
}
