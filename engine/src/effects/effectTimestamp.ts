                                                               
  
                                                                          
                                                          
                                              
                                   
                                                 
                                               
                   
  
                                   
                                 
                                          
                                          
                                                                        
                                    
  
                                                                   
                                                                        
                                                                    
                                                    
                                                     
  
                                                          
                                                                       
                                                      
                                               
                         
  
                                             
                                                                         
                                                                
                                        
                                                      
                                                           
                                                                      
                                                           
                                       
                                      
                                                         
                                                
                                              
                                                      
                                                                              
                                                       
  
                                                 
                                                
                                                         
                                                        
import type { StaticEffect } from './continuousView'

                                          
export function nextEffectTimestamp(effects: readonly StaticEffect[]): number {
  let max = 0
  for (const e of effects) if (e.timestamp > max) max = e.timestamp
  return max + 1
}
