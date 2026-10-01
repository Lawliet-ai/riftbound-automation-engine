                        
  
                                      
                                                   
                                                     
                                                 
  
                                                       
                                                         
  
                                                        
                                                  

import type { GameObject } from './object'

export type CardType = 'unit' | 'equipment' | 'rune' | 'spell' | 'legend' | 'battlefield'

   
                                                              
                                                               
                                                                      
   
export type TypeSource = { readonly defId: string; readonly baseTypes?: readonly CardType[] }

                                                      
export function typesOf(o: TypeSource | undefined): readonly CardType[] {
  if (!o) return []
  const declared = o.baseTypes
  if (declared && declared.length > 0) return declared
  return o.defId.startsWith('rune:') ? ['rune'] : ['unit']      
}

export function isUnit(o: TypeSource | undefined): boolean {
  return typesOf(o).includes('unit')
}

export function isEquipment(o: TypeSource | undefined): boolean {
  return typesOf(o).includes('equipment')
}

   
                                                           
                                                                   
                                                        
                                                       
                                               
   
   
                                  
                                                   
                                                       
                                                               
                                                                     
                                                        
   
export function isTokenDefId(defId: string | undefined): boolean {
  return defId?.startsWith('token:') === true
}

export function isToken(o: GameObject | undefined): boolean {
  return isTokenDefId(o?.defId)
}

export function isRune(o: TypeSource | undefined): boolean {
  return typesOf(o).includes('rune')
}
