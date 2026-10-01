                                        
                                                                      
                                                          

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import { applyEvents, type ReduceDeps } from '../loop/reduce'
import type { GameEvent } from '../loop/events'
import { compileTrigger } from '../dsl/triggerSpec'
import type { Trigger } from '../dsl/trigger'
import { currentKeywords } from '../state/object'
import { isFieldedKind } from '../state/zones'                                  

export function hasEphemeral(obj: GameObject): boolean {
  return (currentKeywords(obj)).includes('瞬息')
}

   
                                       
  
                                          
                                                            
  
                                        
                                           
                                
                                                                         
                                   
   
export const EPHEMERAL_IMMUNE = '瞬息不触发'

                            
export function isEphemeralImmune(obj: GameObject): boolean {
  return obj.derived?.restrictions.includes(EPHEMERAL_IMMUNE) === true
}

   
                                                   
  
                                                                        
                                                     
                                                   
                                                                                            
                                          
                                                                       
                                            
   
function isFielded(state: GameState, obj: GameObject): boolean {
  return isFieldedKind(state.zones[obj.zone]?.kind)
}

   
                                                  
                                                                      
                                                                
  
                                                       
                                                           
                                                           
                                                         
                                                       
                                                
                                          
                                                     
                                      
                                                      
                                                                                                    
                                                                                  
                                                                        
                                                                        
   
function ephemeralApplies(state: GameState, o: GameObject, activePlayer: PlayerId): boolean {
  return o.controller === activePlayer && hasEphemeral(o) && isFielded(state, o)
    && !isEphemeralImmune(o)                                    
    && o.status.faceDown !== true
}

   
                                                           
                                                              
   
export function ephemeralDestroyEvents(state: GameState, activePlayer: PlayerId): readonly GameEvent[] {
  return Object.values(state.objects)
    .filter((o) => ephemeralApplies(state, o, activePlayer))
    .map((o) => ({ kind: 'destroy', target: o.oid }))
}

   
                        
                                                            
                                         
                                                              
                                        
   
export function runEphemeralStep(state: GameState, activePlayer: PlayerId, deps: ReduceDeps = {}): GameState {
  const events = ephemeralDestroyEvents(state, activePlayer)
  if (events.length === 0) return state
  return applyEvents(state, events, deps).state
}

   
                                    
  
                                                           
                                                       
                        
  
                                                                  
                                                         
                                                   
                                           
                                                        
                                         
  
                                              
                                              
                                                
   
export function ephemeralTriggers(state: GameState, activePlayer: PlayerId): readonly Trigger[] {
  return Object.values(state.objects)
    .filter((o) => ephemeralApplies(state, o, activePlayer))
    .map((o) => compileTrigger({
      id: `§816:ephemeral:${String(o.oid)}`,
      event: 'startPhase',
      by: 'you', // §816.1.c 只在【该常驻牌控制者】的开始阶段
      when: [{ kind: 'eventPlayerIs', side: 'you' }],
                                                                   
                                                             
                                                           
                                                   
                                        
      effect: (st: GameState): readonly GameEvent[] =>
        (st.objects[o.oid] !== undefined ? [{ kind: 'destroy', target: o.oid } as GameEvent] : []),
    }, o.oid, o.controller))
}
