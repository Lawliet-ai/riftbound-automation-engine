import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import { isUnit } from '../state/cardTypes'

   
                                                     
  
                                             
  
                                                               
                                                             
                                                                                         
                                         
                                                                  
                                                                   
  
                                                     
                                   
   
export function isAlone(state: GameState, o: GameObject): boolean {
  return !Object.values(state.objects).some((x) =>
    (x.oid as string) !== (o.oid as string)
    && (x.zone as string) === (o.zone as string)
    && isUnit(x)
    && x.controller === o.controller)
}
