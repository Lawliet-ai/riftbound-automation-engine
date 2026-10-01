                                                     
  
                                      
                                                         
                                              
                                        
                                                      
                                                           
                                                   
                                                 
                                   
                                                    
                                       
                                          
                                           
                                                  
  
                                         
                                                        
                                    
  
                                                     
                                               
                    
  
                                                  
                                   

import type { Cost } from '../state/runePool'
import { parseCostSuffix } from './costSuffix'

export const RECURSION = '流转'

   
                                   
                           
                                              
                                                    
   
export function parseRecursionCost(kw: string): Cost | null {
  if (!kw.startsWith(RECURSION)) return null
  return parseCostSuffix(kw.slice(RECURSION.length))
}

                          
                                                                                    
                                                         
                                                                
                                                 
                                                                                       
                                                 
                                                                                     

   
                                              
                                      
                                     
   
export function recursionCostOptions(keywords: readonly string[] | undefined): readonly Cost[] {
  const out: Cost[] = []
  for (const k of keywords ?? []) {
    const c = parseRecursionCost(k)
    if (c) out.push(c)
  }
  return out
}

   
                                
                                         
   
export function isRecursionSource(zoneId: string, player: string): boolean {
  return zoneId === `discard:${player}`
}

                                                                        
                                                 
                                                    
                                                                     
                                                
                                            
                                         
                                             
                                                  
                                                                                  
                                                                                   

   
                                    
                                       
   
export function recursionChangesTiming(): false {
  return false
}
