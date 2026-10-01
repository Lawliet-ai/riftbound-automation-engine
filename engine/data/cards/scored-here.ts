                                                          
  
                             
                                                   
                                                                          
                                                         
  
                                                                
                                            
                                              
                            
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'

                               
export type ScoreEvent = 'conquer' | 'hold'

   
                                        
                                 
   
export function scoredHere(
  state: GameState, selfOid: ObjId, ev: GameEvent, kinds: readonly ScoreEvent[] = ['conquer', 'hold'],
): boolean {
  if (!kinds.includes(ev.kind as ScoreEvent)) return false
  const me = state.objects[selfOid]
  const e = ev as unknown as { battlefield?: string; player?: string }
  return !!me && (me.zone as string) === e.battlefield && (me.controller as string) === e.player
}
