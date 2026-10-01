                                           
                                                                 
                                      
                                                                           
                                                           

import { zonesByKind, type GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import type { Zone } from '../state/zones'
import { moveObjectInState } from '../state/mutations'
import { controlledBattlefields } from '../state/battlefieldControl'

                           
export function standbyOfBattlefield(state: GameState, battlefieldId: string): Zone | undefined {
  return zonesByKind(state, 'standby').find((z) => z.parentBattlefield === (battlefieldId as ZoneId))
}

                                                      
function faceDownStandbyCount(state: GameState, sb: Zone): number {
  return sb.contents.filter((oid) => state.objects[oid]?.status.faceDown === true).length
}

                                                  
export function canPlaceStandby(state: GameState, player: PlayerId, battlefieldId: string): boolean {
  if (!controlledBattlefields(state, player).includes(battlefieldId)) return false
  const sb = standbyOfBattlefield(state, battlefieldId)
  return !!sb && faceDownStandbyCount(state, sb) < (sb.capacity ?? 1)
}

   
                                                       
                                                               
                                          
                                      
   
export function placeStandby(
  state: GameState,
  oid: ObjId,
  battlefieldId: string,
  player: PlayerId,
): { state: GameState; oid: ObjId } {
  const sb = standbyOfBattlefield(state, battlefieldId)
  if (!sb || !canPlaceStandby(state, player, battlefieldId)) return { state, oid }
  const moved = moveObjectInState(state, oid, sb.id)                           
  const placedOid = moved.zones[sb.id]!.contents[moved.zones[sb.id]!.contents.length - 1]!
  const o = moved.objects[placedOid]!
  return {
    state: {
      ...moved,
      objects: { ...moved.objects, [placedOid]: { ...o, controller: player, status: { ...o.status, faceDown: true } } },
    },
    oid: placedOid,
  }
}

                                             
export function hasReactionFromStandby(state: GameState, oid: ObjId): boolean {
  return state.objects[oid]?.status.faceDown === true
}

   
                                                                    
                                           
                                                                  
                                                                          
                                                   
   
export function lockUnitDropToStandby(candidates: readonly string[], standbyBattlefield: string | undefined): readonly string[] {
  return standbyBattlefield === undefined ? candidates : candidates.filter((z) => z === standbyBattlefield)
}

                                                           
export function standbyLockedBattlefield(state: GameState, oid: ObjId): string | null {
  const o = state.objects[oid]
  if (!o) return null
  const sb = state.zones[o.zone]
  if (!sb || sb.kind !== 'standby') return null
  return (sb.parentBattlefield as string) ?? null
}

   
                                                          
  
        
                                                   
                                                      
                                                      
                                                                 
                                                              
  
                                      
                                                 
                                                        
                              
                                                           
                                                   
                                                                  
                                                               
                            
                                                               
                                                                                     
                      
  
                                                        
                                                              
                                                         
                                                              
                          
   
export function standbyTargetViolatesLock(
  state: GameState,
  lockedBattlefield: string | null,
  targetOids: readonly string[],
): boolean {
  if (!lockedBattlefield) return false
  return targetOids.some((x) => {
    const to = state.objects[x as ObjId]
    if (!to) return false                                  
    const k = state.zones[to.zone]?.kind
    if (k !== 'battlefield' && k !== 'base') return false                       
    return (to.zone as string) !== lockedBattlefield
  })
}
