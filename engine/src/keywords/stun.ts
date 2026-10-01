                               
                                                                                             
                                                               
                                                                 

import type { GameState } from '../state/gameState'
import type { ObjId } from '../state/ids'
import type { GameObject } from '../state/object'

   
                                                                  
                                                        
                                                
   
export function isStunned(obj: { readonly status: GameObject['status'] } | undefined): boolean {
  return obj?.status.stunned === true
}

   
                                                                        
   
export function applyStun(obj: GameObject): { obj: GameObject; stunned: boolean } {
  if (isStunned(obj)) return { obj, stunned: false }              
  return { obj: { ...obj, status: { ...obj.status, stunned: true } }, stunned: true }
}

                        
export function applyStunInState(state: GameState, oid: ObjId): { state: GameState; stunned: boolean } {
  const o = state.objects[oid]
  if (!o) return { state, stunned: false }
  const { obj, stunned } = applyStun(o)
  if (!stunned) return { state, stunned: false }
  return { state: { ...state, objects: { ...state.objects, [oid]: obj } }, stunned: true }
}
