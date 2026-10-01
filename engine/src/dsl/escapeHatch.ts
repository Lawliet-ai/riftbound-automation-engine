                                 
                                                      
                                        
                                                    
                                     
                    
                                                  

import { nextEffectTimestamp } from '../effects/effectTimestamp'               
import type { GameState } from '../state/gameState'
import type { ObjId } from '../state/ids'
import type { GameEvent } from '../loop/events'
import { applyEvents, type ReduceDeps } from '../loop/reduce'
import { createPrimitiveApi, type PrimitiveApi } from './primitives'

export interface EscapeContext {
                             
  readonly state: GameState
  readonly self: ObjId | null
  readonly event?: GameEvent
}

                                    
export type EscapeHatchFn = (api: PrimitiveApi, ctx: EscapeContext) => void

                                 
function freeze<T>(o: T): Readonly<T> {
  return Object.freeze(o)
}

   
                                                      
                      
   
export function runEscapeHatch(
  state: GameState,
  fn: EscapeHatchFn,
  self: ObjId | null,
  deps: ReduceDeps = {},
  event?: GameEvent,
): { state: GameState; events: readonly GameEvent[] } {
  const { api, ops } = createPrimitiveApi()
  const ctx: EscapeContext = freeze({ state: freeze(state), self, ...(event ? { event } : {}) })

  fn(api, ctx)                                  

                                             
  let s = state
  let landed: readonly GameEvent[] = []
  if (ops.events.length > 0) {
    const r = applyEvents(s, ops.events, deps)
    s = r.state
    landed = r.events
  }
                                                      
  if (ops.effects.length > 0) {
                                                        
                                         
    const base = nextEffectTimestamp(s.continuousEffects)
    const withTs = ops.effects.map((e, i) => ({ ...e, timestamp: base + i }))
    s = { ...s, continuousEffects: [...s.continuousEffects, ...withTs] }
  }
                                                                 
  if (ops.wins.length > 0 && !s.winner) {
    s = { ...s, winner: ops.wins[0]! }
  }
  return { state: s, events: landed }
}
