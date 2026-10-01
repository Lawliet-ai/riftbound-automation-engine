                                       
  
                                      
                                        
                                                    
                                              
                                               
                                  
                                                      
                                        
                                             
                                         
  
                                                    
                                                                                
                                                 
                                         
  
                                                         
                                     
                                     
  
                                               
                                                    
                                    

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'

                          
export const BUFF_COUNTER = 'buff'

                 
export function hasBuff(o: GameObject | undefined): boolean {
  return (o?.counters[BUFF_COUNTER] ?? 0) > 0
}

                                        
export function buffCount(o: GameObject | undefined): number {
  return o?.counters[BUFF_COUNTER] ?? 0
}

   
                               
                                                         
   
export function buffLimitOf(o: GameObject | undefined): number {
  const lim = (o?.derived as { buffLimit?: number } | undefined)?.buffLimit
  return typeof lim === 'number' && lim > 0 ? lim : 1
}

   
                                                       
                                          
   
export function grantBuffInState(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  const cur = buffCount(o)
  if (cur >= buffLimitOf(o)) return state                           
  return {
    ...state,
    objects: { ...state.objects, [oid]: { ...o, counters: { ...o.counters, [BUFF_COUNTER]: cur + 1 } } },
  }
}

   
                                  
  
        
                              
                                           
                                    
                                     
  
                                                          
  
                                                
                                            
                                  
   
export function consumeBuffInState(state: GameState, oid: ObjId, by?: PlayerId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  if (by !== undefined && o.controller !== by) return state              
  const cur = buffCount(o)
  if (cur <= 0) return state              
                                                                 
  const { [BUFF_COUNTER]: _removed, ...rest } = o.counters
  const counters = cur - 1 > 0 ? { ...rest, [BUFF_COUNTER]: cur - 1 } : rest
  return { ...state, objects: { ...state.objects, [oid]: { ...o, counters } } }
}

                                                        
export function canConsumeBuff(state: GameState, oid: ObjId, by: PlayerId): boolean {
  const o = state.objects[oid]
  return !!o && o.controller === by && buffCount(o) > 0
}

   
                                        
                                                 
   
export function buffedUnitsOf(state: GameState, player: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === player && buffCount(o) > 0)
    .map((o) => o.oid)
    .sort()
}

   
                                                
                                         
   
export interface BuffMightEffect {
  readonly oid: ObjId
  readonly delta: number
}
export function buffMightEffects(state: GameState): readonly BuffMightEffect[] {
  const out: BuffMightEffect[] = []
  for (const o of Object.values(state.objects)) {
    const n = buffCount(o)
    if (n <= 0) continue
                                                   
                                                    
    const bonus = state.buffBonusThisTurn?.[o.controller as string] ?? 0
    out.push({ oid: o.oid, delta: n * (1 + bonus) })                      
  }
  return out
}
