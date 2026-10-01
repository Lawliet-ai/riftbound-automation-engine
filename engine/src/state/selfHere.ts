                                                       
                                             
  
                             
                                          
                                              
                                                        
                                                 
                                               
                                   
  
                                                     
                                             
                                                   
                         
                                                      
                                                      
import type { GameState } from './gameState'
import type { ObjId, ZoneId } from './ids'

                                          
export function selfBattlefield(state: GameState, selfOid: ObjId | null | undefined): string | undefined {
                                                                  
                                                                     
                                                                       
                                          
  if (selfOid == null) return undefined                  
  const z = state.objects[selfOid]?.zone as string | undefined
                                                      
                                                      
                                                
                                                    
                                                
                                                    
  return z !== undefined && state.zones[z as ZoneId]?.kind === 'battlefield' ? z : undefined
}

   
                                                                  
                                                                              
                                                                                            
                                                                                          
                                                                        
                                                               
                                                                                                                 
   
export function selfLocation(state: GameState, selfOid: ObjId | null | undefined): string | undefined {
  if (selfOid == null) return undefined
  const z = state.objects[selfOid]?.zone as string | undefined
  const kind = z === undefined ? undefined : state.zones[z as ZoneId]?.kind
  return kind === 'battlefield' || kind === 'base' ? z : undefined
}

   
                                                                   
  
                                      
                                                          
                                                
                                                                       
                               
                                                     
                                        
  
                                                                    
                                             
                                                                   
   
export function eventBattlefield(ev: { readonly battlefield?: unknown } | undefined): string | undefined {
  const bf = ev?.battlefield
  return typeof bf === 'string' ? bf : undefined
}
