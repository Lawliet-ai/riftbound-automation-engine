                                                       
                                                                          
                                                                             
                                                          
                                                                   
                                                        
                                       

import type { ObjId, PlayerId, ZoneId } from './ids'

export type ZoneCategory = 'fielded' | 'non-fielded'

                                          
export type FieldedZoneKind = 'base' | 'battlefield' | 'standby' | 'legend'
                       
export type NonFieldedZoneKind =
  | 'chain'
  | 'discard'
  | 'heroZone'
  | 'mainDeck'
  | 'runeDeck'
  | 'exile'
  | 'hand'
export type ZoneKind = FieldedZoneKind | NonFieldedZoneKind

const FIELDED_KINDS: ReadonlySet<ZoneKind> = new Set<ZoneKind>([
  'base',
  'battlefield',
  'standby',
  'legend',
])

export const NON_FIELDED_KINDS: readonly NonFieldedZoneKind[] = [
  'chain',
  'discard',
  'heroZone',
  'mainDeck',
  'runeDeck',
  'exile',
  'hand',
]

                                                    
export function zoneCategory(kind: ZoneKind): ZoneCategory {
  return FIELDED_KINDS.has(kind) ? 'fielded' : 'non-fielded'
}

   
                        
                                                     
                                       
   
export function isPositionKind(kind: ZoneKind): boolean {
  return kind === 'base' || kind === 'battlefield'
}

   
                                                                                     
                                                           
                                                        
                                                            
                                             
                                                
                                                  
                                                      
                      
                                                                        
                                                                                                 
                                                     
                                                                 
                                                      
                                                                    
                                          
   
                                                                
  
                                                                 
                                             
                                                                                      
                                                                                       
                                                                                             
                                                   
                                                                     
                                                    
                                                       
                                                                                     
export function isFieldedKind(kind: ZoneKind | undefined): boolean {
  return kind !== undefined && zoneCategory(kind) === 'fielded'
}

export function isFieldedExceptStandby(kind: ZoneKind | undefined): boolean {
  return kind === 'base' || kind === 'battlefield' || kind === 'legend'
}

                       
export function isOrderedZone(kind: ZoneKind): boolean {
  return kind === 'mainDeck' || kind === 'runeDeck'
}

                                                 
export const STANDBY_DEFAULT_CAPACITY = 1

export interface Zone {
  readonly id: ZoneId
  readonly kind: ZoneKind
                                                   
  readonly owner: PlayerId | null
  readonly contents: readonly ObjId[]
                                          
  readonly parentBattlefield?: ZoneId
                                                 
  readonly capacity?: number
}

   
                                                          
                                                   
                                             
   
export function setStandbyCapacity(
  zone: Zone,
  capacity: number,
): { zone: Zone; overflow: readonly ObjId[] } {
  if (zone.kind !== 'standby') {
    throw new Error(`setStandbyCapacity 仅适用于待命区,收到 ${zone.kind}`)
  }
  const cap = Math.max(0, Math.floor(capacity))
  const excess = Math.max(0, zone.contents.length - cap)
  if (excess === 0) {
    return { zone: { ...zone, capacity: cap }, overflow: [] }
  }
  const keep = zone.contents.length - excess
  return {
    zone: { ...zone, capacity: cap, contents: zone.contents.slice(0, keep) },
    overflow: zone.contents.slice(keep),
  }
}
