                                                     
  
                                      
                                                              
                                                  
                             
                                                  
                                                   
                                                            
                                                        
                                               
                                                 
  
               
                                                        
                                            
                                          
                                                     
                                                      
                                 
  
                                            
                                                         
                                        

import type { GameState } from '../state/gameState'
import type { PlayerId, ObjId } from '../state/ids'
import type { GameObject } from '../state/object'
import { isTokenDefId } from '../state/cardTypes'

export const RALLY = '鼓舞'

                                                       
                                                      
                                                 
                                                       

                                 
export function confirmedCountThisTurn(state: GameState, player: PlayerId): number {
  return state.confirmedThisTurn[player] ?? 0
}

                                                      
export function noteConfirmed(state: GameState, player: PlayerId): GameState {
  return {
    ...state,
    confirmedThisTurn: { ...state.confirmedThisTurn, [player]: confirmedCountThisTurn(state, player) + 1 },
  }
}

   
                               
                                                                 
                                                                           
                                                            
                                         
                                                
                                                           
                                
   
export function resetRallyForNewTurn(state: GameState): GameState {
  let objects: Record<string, GameObject> | undefined
  for (const [oid, o] of Object.entries(state.objects)) {
    if ((o.status as { confirmedThisTurn?: true }).confirmedThisTurn !== true) continue
    const { confirmedThisTurn: _drop, ...rest } = o.status as { confirmedThisTurn?: true }
    objects ??= { ...state.objects }
    objects[oid] = { ...o, status: rest as GameObject['status'] }
  }
  return { ...state, confirmedThisTurn: {}, ...(objects ? { objects } : {}) }
}

   
                               
                                      
  
                                             
                            
   
export function isRallyActive(state: GameState, o: GameObject | undefined): boolean {
  if (!o) return false
  const total = confirmedCountThisTurn(state, o.controller)
                                                
  const own = (o.status as { confirmedThisTurn?: true }).confirmedThisTurn === true ? 1 : 0
  return total - own >= 1
}

                                                     
export function markSelfConfirmed(o: GameObject): GameObject {
  return { ...o, status: { ...o.status, confirmedThisTurn: true } }
}

   
                                                               
                                                                  
                                                    
                                                
                                                               
  
                                                            
                              
                                                         
                     
                                                    
                                                      
                                                           
                                                   
                                      
                                                                            
                                                                              
                                                                                       
                                                                
                                                                     
                                                
                                              
   
export function noteCardConfirmed(
  state: GameState, player: PlayerId, oid: ObjId | undefined,
): GameState {
  const before = oid === undefined ? undefined : state.objects[oid]
  if (isTokenDefId(before?.defId)) return state                        
  const s = noteConfirmed(state, player)
  const landed = oid === undefined ? undefined : s.objects[oid]
  if (!landed) return s
  return { ...s, objects: { ...s.objects, [oid as string]: markSelfConfirmed(landed) } }
}
