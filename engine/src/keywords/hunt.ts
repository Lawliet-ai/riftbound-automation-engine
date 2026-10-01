                                           
  
                                      
                                                          
                                    
                                
                                              
                                
                                      
                             
                                                           
                                          
                                                 
  
                                        
                                                   
                                                   
                                                                    
  
                                         
                                             
                                              

import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import type { Trigger } from '../dsl/trigger'
                                                                       
import { passiveDefId } from '../../data/passiveIdentity'
import type { GameEvent } from '../loop/events'
import { valuedKeywordTotal } from '../effects/valuedKeyword'
import type { StaticEffect } from '../effects/continuousView'

export const HUNT = '狩猎'

                                                         
type SafePredicate = (e: StaticEffect, o: GameObject, state: GameState) => boolean
const allowAll: SafePredicate = () => true

   
                                             
                               
                                                       
                                                
   
export function huntValueOf(
  state: GameState,
  o: GameObject,
  safePredicate: SafePredicate = allowAll,
): number {
  return valuedKeywordTotal(state, o, HUNT, safePredicate)
}

                          
export function hasHunt(state: GameState, o: GameObject, safePredicate: SafePredicate = allowAll): boolean {
  return huntValueOf(state, o, safePredicate) > 0
}

   
                                           
                                              
   
export type HuntTiming = 'conquer' | 'hold'
export const HUNT_TIMINGS: readonly HuntTiming[] = ['conquer', 'hold']

   
                       
                                     
   
export function huntExperienceGain(
  state: GameState,
  o: GameObject,
  safePredicate: SafePredicate = allowAll,
): number {
  return huntValueOf(state, o, safePredicate)
}

   
                                         
                                                             
  
                     
                                                                                   
                                                           
                                                                   
                                                          
  
                              
                                                         
                                      
                                     
                                         
   
export function makeHuntTriggers(state: GameState): Trigger[] {
  const out: Trigger[] = []
  for (const o of Object.values(state.objects)) {
    if (state.zones[o.zone]?.kind !== 'battlefield') continue
    if (!hasHunt(state, o)) continue
    const selfOid = o.oid
    const controller = o.controller
    for (const timing of HUNT_TIMINGS) {
      out.push({
        id: `hunt:${timing}:${selfOid}`,
                                                 
                                          
        abilityKey: `hunt:${selfOid}`,
        sourceOid: selfOid,
        sourceDefId: passiveDefId(o),
        controller,
        event: timing,
        by: 'you',
        activeZone: ['battlefield'],
        filter: (ev, s) => {
          if (ev.kind !== timing) return false
          const self = s.objects[selfOid]
          return ev.player === controller && !!self && self.zone === ev.battlefield
        },
        effect: (s): readonly GameEvent[] => {
          const self = s.objects[selfOid]
          if (!self || s.zones[self.zone]?.kind !== 'battlefield') return []                      
          const x = huntValueOf(s, self)
          if (x <= 0) return []                            
          return [{ kind: 'gainResource', player: controller, experience: x }]
        },
      })
    }
  }
  return out
}
