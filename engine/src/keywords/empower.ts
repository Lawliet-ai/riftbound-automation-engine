                                                   
  
                                     
                                               
                                                     
                                           
                                           
                                     
  
                                      
                                          
                                                       
                                   
                                                    
                                                        
                                                   
                                                          
                                         
                                     
                                                          
  
                                               
                                                               
                                                   
                                 
  
                                                              
                                                                         

import type { GameState } from '../state/gameState'
import type { ObjId } from '../state/ids'
import type { GameObject } from '../state/object'
import { isFieldedExceptStandby, zoneCategory } from '../state/zones'

                                            
export const EMPOWER_COUNTER = 'empower'

                                    
export function isEmpowered(o: GameObject | undefined): boolean {
  return (o?.counters[EMPOWER_COUNTER] ?? 0) > 0
}

                                     
export function empowerCount(o: GameObject | undefined): number {
  return o?.counters[EMPOWER_COUNTER] ?? 0
}

   
                                  
                                                      
   
export function empowerLimitOf(o: GameObject | undefined): number {
  const lim = (o?.derived as { empowerLimit?: number } | undefined)?.empowerLimit
  return typeof lim === 'number' && lim > 0 ? lim : 1
}

   
                           
                                                                   
                                                      
   
function isFielded(state: GameState, o: GameObject): boolean {
  const kind = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(kind)
}

   
                                                   
                            
                                                                  
                                           
                                         
   
export function empower(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o || !isFielded(state, o)) return state
  const cur = empowerCount(o)
  if (cur >= empowerLimitOf(o)) return state                           
  return {
    ...state,
    objects: { ...state.objects, [oid]: { ...o, counters: { ...o.counters, [EMPOWER_COUNTER]: cur + 1 } } },
  }
}

   
                                                
  
                                                    
                                                       
                                                  
                                                    
                                 
                                              
                                               
                                                                            
   
export function disempower(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o || !isEmpowered(o)) return state                           
  const counters = { ...o.counters }
  const left = (counters[EMPOWER_COUNTER] ?? 1) - 1                
  if (left > 0) counters[EMPOWER_COUNTER] = left
  // ⚠️【语义锚·548 破坏刀 4 实测】把这行换成无条件 `counters[X] = left`(即留一个 0 值)
  //   **一条都不红** —— `isEmpowered` 判的是 `> 0`、`empowerCount` 读不到也返 0,
  //   留个 0 值谁都看不见。留着摘键是为了 counters 干净(免得 0 值到处漂),
  //   ⚠️ 将来若有人改成按「键在不在」判是否已强化,这一行就会立刻变成承重的。
  else delete counters[EMPOWER_COUNTER]
  return { ...state, objects: { ...state.objects, [oid]: { ...o, counters } } }
}
