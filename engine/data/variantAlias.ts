                                                 
  
                                                                   
                                            
  
                      
                                                
                              
                                    
                               
  
                                            
                                   

import { VARIANT_GROUPS } from './variantAliases'

   
                                           
                                               
   
export function resolveImplDefId(defId: string, has: (id: string) => boolean): string {
  if (has(defId)) return defId
  for (const sib of VARIANT_GROUPS[defId] ?? []) {
    if (sib !== defId && has(sib)) return sib
  }
  return defId
}

                              
export function variantSiblings(defId: string): readonly string[] {
  return VARIANT_GROUPS[defId] ?? [defId]
}
