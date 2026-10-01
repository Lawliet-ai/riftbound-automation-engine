                                                                
  
                                        
                                                        
                                                    
                                               
                              
  
                                                                          
                                                            
                                                                     
                         
import type { GameObject } from '../state/object'

   
                                               
                                       
   
export const NO_READY = 'ready'

   
                          
                                  
   
export function canBecomeReady(o: GameObject): boolean {
  return !(o.derived?.restrictions ?? []).includes(NO_READY)
}
