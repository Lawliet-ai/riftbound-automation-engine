                                       
  
                                      
                                              
                                           
                                                  
                                                  
                                                 
                                             
                                                   
                                              
  
                                          
                                                         
                                                    
  
                                               
                                                    
  
                                             
                                   

import type { GameState } from '../state/gameState'
import type { ObjId, ZoneId } from '../state/ids'
import { moveObjectInState } from '../state/mutations'

                 
function isExileZone(state: GameState, zoneId: string | undefined): boolean {
  return zoneId !== undefined && state.zones[zoneId]?.kind === 'exile'
}

   
                                                  
  
                                               
                                               
  
                                                     
   
export function banishInState(state: GameState, oid: ObjId, by?: ObjId): GameState {
  const obj = state.objects[oid]
  if (!obj) return state                               
  const exileId = `exile:${obj.owner}` as ZoneId
  const before = state.zones[exileId]?.contents ?? []
  const next = moveObjectInState(state, oid, exileId)
  if (by === undefined) return next

                                                     
  const after = next.zones[exileId]?.contents ?? []
  const landed = after.filter((id) => !before.includes(id))
  if (landed.length === 0) return next
  const prev = next.banishLedger[by] ?? []
  return { ...next, banishLedger: { ...next.banishLedger, [by]: [...prev, ...landed] } }
}

   
                                   
  
                                                   
                                                       
                                              
   
export function banishedBy(state: GameState, by: ObjId): readonly ObjId[] {
  return (state.banishLedger[by] ?? []).filter((oid) => {
    const o = state.objects[oid]
    return o !== undefined && isExileZone(state, o.zone)
  })
}
