                                                        
  
                                      
                             
                            
                                
                                     
                                                              
                               
                                     
                                                      
                                
                                    
                                                             
                                                    
                                                 
                                               
                                               
                                                  
  
                       
                                                  
                                                         
                                                
                                                          
                                              
  
                                                   
                                                 

import type { GameState } from '../state/gameState'
import type { ObjId } from '../state/ids'
import type { GameObject } from '../state/object'
import { attachedTo, attachmentsOf } from '../state/attach'
import { isUnit } from '../state/cardTypes'
import { isFieldedExceptStandby, zoneCategory } from '../state/zones'
import type { Cost } from '../state/runePool'
import { parseCostSuffix } from './costSuffix'

                       
export const ARMAMENT_TAG = '武装'
                        
export const EQUIP_KEYWORD = '装配'

                           
export function isArmament(o: GameObject | undefined): boolean {
  return o?.baseTags?.includes(ARMAMENT_TAG) === true
}

   
                                         
                                                          
                                                 
                                                                
                                                             
   
export function parseEquipCost(kw: string): Cost | null {
  if (!kw.startsWith(EQUIP_KEYWORD)) return null
  const suffix = kw.slice(EQUIP_KEYWORD.length)
  if (suffix.length === 0) return null                  
  return parseCostSuffix(suffix)
}

   
                                          
                                                 
                                                         
   
export function equipCostOptions(keywords: readonly string[] | undefined): {
  readonly parsed: readonly { readonly keyword: string; readonly cost: Cost }[]
  readonly unparsed: readonly string[]
} {
  const parsed: { keyword: string; cost: Cost }[] = []
  const unparsed: string[] = []
  for (const k of keywords ?? []) {
    if (!k.startsWith(EQUIP_KEYWORD)) continue
    const c = parseEquipCost(k)
    if (c) parsed.push({ keyword: k, cost: c })
    else unparsed.push(k)
  }
  return { parsed, unparsed }
}

   
                                                         
                                                          
   
export function hasEquipAbility(o: GameObject | undefined): boolean {
  return o?.baseKeywords?.some((k) => k.startsWith(EQUIP_KEYWORD)) === true
}

                                            
export function armamentsOn(state: GameState, topOid: ObjId): readonly GameObject[] {
  return attachmentsOf(state, topOid).filter(isArmament)
}

   
                          
                                               
                                         
   
export function isGeared(state: GameState, topOid: ObjId): boolean {
  return armamentsOn(state, topOid).length > 0
}

   
                                     
              
                                   
                                    
                                        
                                                               
   
export function equipDefaultTargets(
  state: GameState,
  controller: string,
  gearOid: ObjId,
): readonly ObjId[] {
  const gear = state.objects[gearOid]
  if (!gear) return []
  const gearFielded = isFieldedZone(state, gear)
  if (!gearFielded) return []
  const current = attachedTo(gear)
  return Object.values(state.objects)
    .filter((o) => isUnit(o) && o.controller === controller && isFieldedZone(state, o))
    // §434.1.g 贴到当前顶部卡牌不会产生任何效果 ⇒ 不算合法目标,别让玩家白付费用
    .filter((o) => o.oid !== current)
    .map((o) => o.oid)
}

   
                                                          
                                                                    
                                                                                      
   
function isFieldedZone(state: GameState, o: GameObject): boolean {
  const kind = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(kind)
}
