                                                        
  
                                                       
                     
                                                                               
                                                       
                                                     
                                                       
                                                   
                                                          
                                           
  
        
                                         
                                                               
                                                         
                                                             
  
                                               
                                       
                           

import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import type { ObjId } from '../../src/state/ids'

                               
export const DAMAGE_SHIELD_COUNTER = 'dmgShield'

                                            
export function grantDamageShield(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  const cur = o.counters[DAMAGE_SHIELD_COUNTER] ?? 0
  return {
    ...state,
    objects: { ...state.objects, [oid]: { ...o, counters: { ...o.counters, [DAMAGE_SHIELD_COUNTER]: cur + 1 } } },
  }
}

   
                         
                                                             
                                                          
   
export function damageShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const o of Object.values(state.objects)) {
    const n = o.counters[DAMAGE_SHIELD_COUNTER] ?? 0
    if (n <= 0) continue
    out.push({
      id: `dmgShield:${o.oid}`,
      source: o.oid,
      controller: o.controller,
      intercepts: 'damage',
                                                                       
                                                                      
                                                                         
                                                      
                                                
      predicate: (ev: GameEvent, st: GameState) =>
        ev.kind === 'damage' && ev.target === o.oid
        && (st.objects[o.oid]?.counters[DAMAGE_SHIELD_COUNTER] ?? 0) > 0,
      rewrite: () => null, // §443 替换为无:这次伤害不发生
      onApplied: (st) => consumeDamageShield(st, o.oid), // 用掉一层(写回 state,不藏在护盾里)
    })
  }
  return out
}

                          
export function consumeDamageShield(state: GameState, oid: ObjId): GameState {
  const o = state.objects[oid]
  if (!o) return state
  const cur = o.counters[DAMAGE_SHIELD_COUNTER] ?? 0
  if (cur <= 0) return state
  const counters = { ...o.counters }
  if (cur - 1 <= 0) delete counters[DAMAGE_SHIELD_COUNTER]
  else counters[DAMAGE_SHIELD_COUNTER] = cur - 1
  return { ...state, objects: { ...state.objects, [oid]: { ...o, counters } } }
}
