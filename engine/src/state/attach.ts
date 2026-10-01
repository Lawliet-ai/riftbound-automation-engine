                             
  
                                      
                                                      
                                                 
                                           
                                               
                                                  
                                                  
                                                 
                                            
  
                                               
                                                             
                                                   
                                                         
  
                                           
                                  

import type { GameState } from '../state/gameState'
import type { ObjId, ZoneId } from '../state/ids'
import type { GameObject } from '../state/object'
import { isFieldedExceptStandby, zoneCategory } from './zones'

   
                                    
                                                             
                                                                        
                                                                                   
   
function isFielded(state: GameState, o: GameObject | undefined): boolean {
  if (!o) return false
  const kind = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(kind)
}

                                           
export function attachedTo(o: GameObject | undefined): ObjId | undefined {
  return (o?.status as { attachedTo?: ObjId } | undefined)?.attachedTo
}

                                   
export function attachmentsOf(state: GameState, topOid: ObjId): readonly GameObject[] {
  return Object.values(state.objects).filter((o) => attachedTo(o) === topOid)
}

                                         
export function canAttach(state: GameState, oid: ObjId, topOid: ObjId): boolean {
  if (oid === topOid) return false
  return isFielded(state, state.objects[oid]) && isFielded(state, state.objects[topOid])
}

                                        
function removeFromZone(zones: GameState['zones'], zoneId: ZoneId, oid: ObjId): GameState['zones'] {
  const z = zones[zoneId]
  if (!z || !z.contents.includes(oid)) return zones
  return { ...zones, [zoneId]: { ...z, contents: z.contents.filter((x) => x !== oid) } }
}

                          
function addToZone(zones: GameState['zones'], zoneId: ZoneId, oid: ObjId): GameState['zones'] {
  const z = zones[zoneId]
  if (!z || z.contents.includes(oid)) return zones
  return { ...zones, [zoneId]: { ...z, contents: [...z.contents, oid] } }
}

   
                                                       
                       
             
                              
                                                    
   
export function attachCard(state: GameState, oid: ObjId, topOid: ObjId): GameState {
  if (!canAttach(state, oid, topOid)) return state
  const o = state.objects[oid]!
  const top = state.objects[topOid]!
  if (attachedTo(o) === topOid) return state                

                                                            
                                                           
  let zones = state.zones
  if (o.zone !== top.zone) {
    zones = removeFromZone(zones, o.zone, oid)
    zones = addToZone(zones, top.zone, oid)
  }
                              
  const next: GameObject = { ...o, zone: top.zone, status: { ...o.status, attachedTo: topOid } }
  return { ...state, objects: { ...state.objects, [oid]: next }, zones }
}

   
                                              
                                               
                 
   
export function detachCard(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o || attachedTo(o) === undefined) return state
  const status = { ...o.status }
  delete (status as { attachedTo?: ObjId }).attachedTo
  return { ...state, objects: { ...state.objects, [oid]: { ...o, status } } }
}
