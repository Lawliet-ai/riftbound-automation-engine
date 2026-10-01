                                                              
                                                         
                                         
  
                                            
                            
                                                  
                                             
                                                              
                                                        
                                                    
  
                                                   
                            
import { CARD_DOMAINS } from '../cardDomains'

                                      
export const DOMAIN_OF_EPITHET: Readonly<Record<string, string>> = {
  炽烈: 'red',
  翠意: 'green',
  摧破: 'orange',
  序理: 'yellow',
  混沌: 'purple',
}

                                        
export function hasDomain(defId: string, color: string): boolean {
  return (CARD_DOMAINS[defId] ?? []).includes(color)
}

   
                                            
  
                                                            
                                                        
                                                      
                                                         
                                                      
                                                          
  
                                               
                                                                   
                                    
   
export function domainIdOf(o: { readonly defId: string; readonly derived?: { readonly copiedDefId?: string } } | undefined): string {
  return o === undefined ? '' : (o.derived?.copiedDefId ?? o.defId)
}
