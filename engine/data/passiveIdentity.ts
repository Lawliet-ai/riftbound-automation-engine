                                                                  
  
                                                         
                                  
                                                             
                                                    
                                                              
  
                                                                               
                                                          
  
                                                   
                                                
                                
import type { GameObject } from '../src/state/object'

                                            
export function passiveDefId(obj: GameObject): string {
  return obj.derived?.copiedDefId ?? obj.defId
}
