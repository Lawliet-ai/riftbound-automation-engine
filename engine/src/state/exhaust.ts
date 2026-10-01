                                                                        
                                                
                                                                   
                                                
                                                                             
                                                                 
                                                                       
                        
import type { GameObject } from './object'
import { isUnit } from './cardTypes'

export type ExhaustKey = 'dormant' | 'tapped'

                                    
export function typesDeclared(o: GameObject): boolean {
  return Array.isArray(o.baseTypes) && o.baseTypes.length > 0
}

                                                        
export function exhaustKey(o: GameObject): ExhaustKey {
                                                                      
  if (o.defId.startsWith('rune:') || String(o.zone).startsWith('legend:')) return 'tapped'
  return typesDeclared(o) && isUnit(o) ? 'dormant' : 'tapped'
}

                                                                              
export function isExhausted(o: GameObject): boolean {
  return o.status.dormant === true || o.status.tapped === true
}

                        
export function exhaustPatch(o: GameObject): Readonly<Partial<Record<ExhaustKey, true>>> {
  return { [exhaustKey(o)]: true } as Readonly<Partial<Record<ExhaustKey, true>>>
}
