                                    
import { CARD_CATEGORIES } from './cardCategories'
import { isTokenDefId } from '../src/state/cardTypes'                                 
                                                        

                                         
export const EQUIPMENT_DEFIDS: ReadonlySet<string> = new Set(['UNL-088', 'OGN-101', 'OGN-181'])

                                 
export const BATTLEFIELD_DEFIDS: ReadonlySet<string> = new Set(['OGN-278', 'OGN-279', 'UNL-209', 'OGN-280', 'OGN-288', 'UNL-214'])

                       
export const LEGEND_DEFIDS: ReadonlySet<string> = new Set(['OGN-263', 'UNL-197'])

   
                   
  
                                                           
                                         
                                                           
                                            
                                        
                                                        
  
                                                                  
                                           
                                         
                                                                           
                                                             
                                                      
                                                                
                                                                  
                                   
                                         
                                                                       
                                                                                        
                                                                              
                                                                           
                                               
   
   
                                                         
  
                                                                   
                                                                        
                                                           
                                                  
                                                  
                     
  
                                                   
                                                                  
                                                                         
                                                        
                                                                    
                                                                         
                                                           
                                                                      
   
export const NON_UNIT_TOKEN_DEFIDS: ReadonlySet<string> = new Set(['token:金币'])

export function isUnitDefId(defId: string | undefined): boolean {
  if (!defId) return false
  if (defId.startsWith('rune:')) return false
  if (isTokenDefId(defId)) return !NON_UNIT_TOKEN_DEFIDS.has(defId)                                       
  const k = CARD_CATEGORIES[defId]
  if (k !== undefined) return k === 'unit'
  return !EQUIPMENT_DEFIDS.has(defId) && !BATTLEFIELD_DEFIDS.has(defId) && !LEGEND_DEFIDS.has(defId)
}
