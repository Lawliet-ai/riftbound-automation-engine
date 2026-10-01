                                                  
                                                         
                                                      
                                                

import type { GameObject } from './object'

export interface MightReading {
                                       
  readonly actual: number
                                               
  readonly reference: number
}

                  
export function readMight(actualMight: number): MightReading {
  return { actual: actualMight, reference: Math.max(0, actualMight) }
}

   
                                                                  
                                                            
              
   
export function actualMightOf(obj: GameObject, effectDelta = 0): number {
  return obj.baseMight + effectDelta
}

   
                 
  
                                                            
                                                                
                                                   
                                                         
                                                          
                                                             
                                                                          
   
export function mightOf(obj: GameObject, effectDelta = 0): MightReading {
  return readMight(actualMightOf(obj, effectDelta))
}

   
                                                       
                                   
   
export function effectiveMight(obj: GameObject): MightReading {
  const actual = obj.derived ? obj.derived.might : obj.baseMight
  return readMight(actual)
}
