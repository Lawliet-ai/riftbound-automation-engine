                                                             
  
                                                
                                                                 
                                                    
                                                       
                                     
                                                               
                                                         
                                         
                                                            
                                                                              

import { freshOid, type GameState } from './gameState'
import type { ObjId, PlayerId, ZoneId } from './ids'
import { moveObject, type GameObject } from './object'
import { isToken, type CardType } from './cardTypes'
import { attachedTo } from './attach'
import { zoneCategory, type Zone } from './zones'

                                                            
export interface TokenSpec {
  readonly defId: string                
  readonly baseMight: number
  readonly baseKeywords?: readonly string[]
                                                 
  readonly baseTypes?: readonly CardType[]
                 
  readonly baseTags?: readonly string[]
}

   
                                                        
                                                                          
   
export function spawnToken(
  state: GameState,
  spec: TokenSpec,
  zoneId: ZoneId,
  owner: PlayerId,
): { state: GameState; oid: ObjId } {
  const z = state.zones[zoneId]
  if (!z) throw new Error(`目标区域不存在: ${zoneId}`)
  const { oid, nextOid } = freshOid(state)
  const token: GameObject = {
    oid,
    defId: spec.defId,
    owner,
    controller: owner,
    zone: zoneId,
    baseMight: spec.baseMight,
    baseKeywords: spec.baseKeywords ?? [],
    ...(spec.baseTypes ? { baseTypes: spec.baseTypes } : {}),
    ...(spec.baseTags ? { baseTags: spec.baseTags } : {}),
    damage: 0,
    counters: {},
    status: {},
  }
  const zones = withZoneContents(state.zones, zoneId, [...z.contents, oid])
  return { state: { ...state, zones, objects: { ...state.objects, [oid]: token }, nextOid }, oid }
}

function withZoneContents(zones: Readonly<Record<string, Zone>>, zoneId: string, contents: readonly ObjId[]): Record<string, Zone> {
  const z = zones[zoneId]
  if (!z) throw new Error(`区域不存在: ${zoneId}`)
  return { ...zones, [zoneId]: { ...z, contents } }
}

   
                                                                 
                                                 
   

export function moveObjectInState(state: GameState, oid: ObjId, toZoneId: ZoneId): GameState {
  const obj = state.objects[oid]
  if (!obj) throw new Error(`物件不存在: ${oid}`)
  const fromZone = state.zones[obj.zone]
  const toZone = state.zones[toZoneId]
  if (!fromZone) throw new Error(`源区域不存在: ${obj.zone}`)
  if (!toZone) throw new Error(`目标区域不存在: ${toZoneId}`)

                                                            
                                                             
                                                           
                                           
                                                                               
                                                                           
                                                         
                                                               
                                                                    
                                                                  
                                                                           
                                                                   
                            
                                                                                     
                                                                           
  if (isToken(obj) && zoneCategory(toZone.kind) === 'non-fielded' && toZone.kind !== 'chain') {
    const zonesGone = withZoneContents(state.zones, obj.zone, fromZone.contents.filter((id) => id !== oid))
    const objectsGone: Record<string, GameObject> = { ...state.objects }
    delete objectsGone[oid]
    for (const o of Object.values(state.objects)) {
      if (o.oid !== oid && attachedTo(o) === oid) objectsGone[o.oid] = { ...o, status: { ...o.status, attachedTo: undefined } }
    }
    return { ...state, zones: zonesGone, objects: objectsGone }
  }

  const { oid: newOid, nextOid } = freshOid(state)
  const moved = moveObject(obj, toZoneId, fromZone.kind, toZone.kind, newOid)

                                              
  let zones = withZoneContents(state.zones, obj.zone, fromZone.contents.filter((id) => id !== oid))
  zones = withZoneContents(zones, toZoneId, [...zones[toZoneId]!.contents, moved.oid])

                               
  const objects: Record<string, GameObject> = { ...state.objects }
  delete objects[oid]
  objects[moved.oid] = moved

                                                           
  for (const o of Object.values(state.objects)) {
    if (o.oid === oid) continue
    if ((o.status as { attachedTo?: ObjId }).attachedTo !== oid) continue
    if (moved.oid === oid && state.zones[toZoneId]!.kind !== undefined && objects[moved.oid]) {
                                       
                                                    
                                          
      const az = zones[o.zone]
      if (az) zones = withZoneContents(zones, o.zone, az.contents.filter((id) => id !== o.oid))
      zones = withZoneContents(zones, toZoneId, [...zones[toZoneId]!.contents, o.oid])
      objects[o.oid] = { ...o, zone: toZoneId }
    } else if (moved.oid !== oid) {
                                                  
                                                  
                                                       
      const status = { ...o.status }
      delete (status as { attachedTo?: ObjId }).attachedTo
      objects[o.oid] = { ...o, status }
    }
  }

  return { ...state, zones, objects, nextOid }
}

                                     
export function destroyToOwnerDiscard(state: GameState, oid: ObjId): GameState {
  const obj = state.objects[oid]
  if (!obj) throw new Error(`物件不存在: ${oid}`)
  const discardId = `discard:${obj.owner}` as ZoneId
  return moveObjectInState(state, oid, discardId)
}
