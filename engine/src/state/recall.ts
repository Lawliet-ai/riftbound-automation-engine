                                                       
  
                                      
                                                  
                        
                                    
                                    
                      
                                              
                                      
                                               
                                              
                                  
  
                                                                    
                                                         
                                      
  
                                                     
                                                  

import type { GameState } from './gameState'
import type { ObjId, ZoneId } from './ids'
import type { GameObject } from './object'
import { attachedTo } from './attach'
import { isEquipment, isRune, isUnit } from './cardTypes'

   
                                               
                                   
   
export function recallToBase(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  const baseId = `base:${o.controller}` as ZoneId
  if (o.zone === baseId) return state
  const from = state.zones[o.zone]
  const to = state.zones[baseId]
  if (!to) return state

                                                    
                                   
                                                       
                                                    
                                                                 
                                                       
    
                                               
                         
                                                             
                                                                             
                                            
                                             
                                                           
                                                       
                                        
    
                                         
                                                         
                                                            
                                                          
                                           
  const attached = Object.values(state.objects).filter(
    (x) => x.oid !== oid && (x.status as { attachedTo?: ObjId }).attachedTo === oid,
  )
  const objects = { ...state.objects, [oid]: { ...o, zone: baseId } }
  for (const a of attached) objects[a.oid] = { ...a, zone: baseId }                          

  const moving = new Set<string>([oid, ...attached.map((a) => a.oid)])
  const zones = { ...state.zones }
                                                        
  for (const m of [o, ...attached]) {
    const z = zones[m.zone]
    if (z) zones[m.zone] = { ...z, contents: z.contents.filter((x) => !moving.has(x)) }
  }
  const dest = zones[baseId] ?? to
  zones[baseId] = { ...dest, contents: [...dest.contents.filter((x) => !moving.has(x)), oid, ...attached.map((a) => a.oid)] }
  return { ...state, objects, zones }
}

   
                                                   
  
                                                   
                                                                
                                      
  
            
                                   
                                                                               
                                                             
                                                                  
  
                                      
   
export function clearDamageDormantRecall(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  const status = { ...o.status, dormant: true as const }
  delete (status as { ready?: boolean }).ready
  delete (status as { attacking?: boolean }).attacking
  delete (status as { defending?: boolean }).defending
  const s = { ...state, objects: { ...state.objects, [oid]: (({ damagedBy: _db, ...rest }) => ({ ...rest, damage: 0, status }))(o) } }                       
  return recallToBase(s, oid)
}

   
                                                              
                                                                      
  
                                                       
                                                              
  
                                                  
                               
   
export function recallUnattachedEquipment(
  state: GameState,
  isEquip: (o: GameObject) => boolean = isEquipment,
): GameState {
  let s = state
  for (const o of Object.values(state.objects)) {
    if (state.zones[o.zone]?.kind !== 'battlefield') continue
                                                                
                                                     
                                                           
                                                     
                           
    if (!isEquip(o) && !isRune(o)) continue
    if (unitAndEquipment(o) || (isRune(o) && isUnit(o))) continue                              
    if (attachedTo(o) !== undefined) continue           
    s = recallToBase(s, o.oid)
  }
  return s
}

   
                                                   
                                              
                                                  
                                                 
                                                       
  
                                                        
                                                     
                                                                           
                                                     
  
                                                  
                                             
                                                     
                                                         
                                                 
                                                                             
                                                          
                                                                   
                                                                 
                                                               
                                                 
                                                     
                                                  
                                                 
                                         
                                 
                                                                             
   
export function removeMisplacedStandby(
  state: GameState,
  controllerOf: (state: GameState, battlefieldId: string) => string | null,
): GameState {
  let s = state
  for (const z of Object.values(state.zones)) {
    if (z.kind !== 'standby') continue
    const bf = z.parentBattlefield
    if (bf === undefined) continue
    const owner = controllerOf(state, bf as string)
    for (const oid of z.contents) {
      const o = s.objects[oid]
      if (!o) continue
      if (owner !== null && o.controller === owner) continue              
      s = moveToOwnerDiscard(s, oid)
    }
  }
  return s
}

   
                                                                  
                                                      
                                                                   
                                                            
                        
                                                         
                                           
                           
   
export function recallForeignBasePermanents(state: GameState): GameState {
  let s = state
  for (const o of Object.values(state.objects)) {
    if (state.zones[o.zone]?.kind !== 'base') continue
    if ((o.zone as string) === `base:${o.controller}`) continue
    if (attachedTo(o) !== undefined) continue                     
    s = recallToBase(s, o.oid)
  }
  return s
}

                                          
function moveToOwnerDiscard(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  const from = state.zones[o.zone]
  const to = state.zones[`discard:${o.owner}` as ZoneId]
  if (!from || !to) return state
  return {
    ...state,
    objects: { ...state.objects, [oid]: { ...o, zone: to.id } },
    zones: {
      ...state.zones,
      [from.id]: { ...from, contents: from.contents.filter((x) => x !== oid) },
      [to.id]: { ...to, contents: [...to.contents, oid] },
    },
  }
}

   
                                       
                                                      
                           
   
function unitAndEquipment(o: GameObject): boolean {
  const t = o.baseTypes
  return t !== undefined && t.includes('unit') && t.includes('equipment')
}
