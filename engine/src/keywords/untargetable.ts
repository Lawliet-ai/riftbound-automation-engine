                                    
  
                              
                                                         
                               
  
                            
                                                              
                                       
                                         
                                                                 
                                                            
                                                                
                                                                      
                                                             
                                                              
                                                                        
                                                                           
                                             
  
                                                                            
                                                                                    
                                                                            
  
                                         
                                        
                                                            
                                           

import type { GameObject } from '../state/object'
import { decodeTargetOids } from '../loop/chainTargets'

   
                                    
                                                   
   
export const NO_ENEMY_TARGET = 'enemyTarget'

                       
export function blocksEnemyTargeting(o: GameObject): boolean {
  return (o.derived?.restrictions ?? []).includes(NO_ENEMY_TARGET)
}

   
                           
                                     
  
                                                                        
                                                                           
                                                      
                                                            
                                                     
                                                               
                           
                                                                  
   
export function filterTargetable(
  objects: Readonly<Record<string, GameObject | undefined>>,
  chooser: string,
  ids: readonly string[],
): string[] {
  return ids.filter((id) => {
                                                                                 
                                                             
    const oids = decodeTargetOids(id)
    const members = oids.map((oid) => objects[oid]).filter((o): o is GameObject => o !== undefined)
    if (members.length === 0) return true                                       
    return !members.some((o) => blocksEnemyTargeting(o) && (o.controller as string) !== chooser)
  })
}
