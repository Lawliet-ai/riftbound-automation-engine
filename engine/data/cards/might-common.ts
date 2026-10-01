                                  
  
                                                       
                                    
  
                                                   
                                                                
                                                           
                                                           
                                                       
                                        
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import { effectiveMight } from '../../src/state/might'

   
                                             
                       
   
export function referencedMight(state: GameState, oid: string): number {
  const o = state.objects[oid as ObjId]
  return o === undefined ? 0 : effectiveMight(o).reference
}

                   
export function totalReferencedMight(state: GameState, oids: readonly string[]): number {
  return oids.reduce((n, oid) => n + referencedMight(state, oid), 0)
}
