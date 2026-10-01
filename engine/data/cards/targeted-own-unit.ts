                                                              
  
                                         
                                                              
                                                                 
                                                       
                             
  
                                   
                                                                        
                                      
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'

                                      
export function targetedOwnUnit(ev: GameEvent, state: GameState, controller: PlayerId): boolean {
  if (ev.kind !== 'targeted') return false
  const e = ev as unknown as { chooser: PlayerId; target: ObjId }
  if (e.chooser !== controller) return false               
  const t = state.objects[e.target]
  return !!t && isUnit(t) && t.controller === controller                
}
