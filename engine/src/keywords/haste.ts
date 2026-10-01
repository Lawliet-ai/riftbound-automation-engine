                                                     
  
                                      
                            
                                                   
                             
                                                      
                            
                                                         
                                               
                                                     
                         
                                                         
                                       
                                                                              
                                                                   
                                                                                             
                                                                              
                                                                     
                                               
                                                    
                                                         
  
                                             
                                                         
                                      
  
                                          
                                                                  

import type { Cost } from '../state/runePool'

                                                
export type UnitDomains = readonly string[] | undefined

   
                              
                                
                                                   
                                                  
   
export function hasteExtraCost(domains: UnitDomains): Cost {
  const pip = domains && domains.length > 0 ? [...domains] : []
  return { mana: 1, pips: [pip] }
}

   
                                                         
                     
                                                                     
   
export function entryStatusPatch(hasteDeclared: boolean): { dormant?: true } {
  return hasteDeclared ? {} : { dormant: true }
}

                                              
export const HASTE = '急速'
export function hasHaste(keywords: readonly string[] | undefined): boolean {
  return (keywords ?? []).includes(HASTE)
}
