                                                             
                                                                        

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameEvent } from './events'
import type { Trigger, ChainOrder } from '../dsl/trigger'
import { detectTriggersForBatchAndNote } from '../dsl/trigger'
import { applyEvents, type ReduceDeps } from './reduce'
import { addItems } from './chain'
import { advanceFepr, applyFeprDecision, runFepr, type FeprDecide, type FeprDecision, type FeprStep } from './chainFepr'

                                                          
export type TriggerProvider = (state: GameState) => readonly Trigger[]

   
                                                     
                                                                         
   
export function landAndEnqueueTriggers(
  state: GameState,
  events: readonly GameEvent[],
  getTriggers: TriggerProvider,
  actor: PlayerId | null,
  deps: ReduceDeps = {},
                                                                          
  order?: ChainOrder,
): GameState {
                                               
                                                                           
  const { state: landed, events: landedEvents } = applyEvents(state, events, deps)
                                                                      
                                                               
                                                          
  const pre = { triggers: getTriggers(state), oids: new Set(Object.keys(state.objects)) }
  const { items, state: noted } = detectTriggersForBatchAndNote(landed, landedEvents, getTriggers(landed), actor, pre, order)
  if (items.length === 0) return noted
  return { ...noted, chain: addItems(noted.chain, items) }
}

                                                             
export function emitAndResolve(
  state: GameState,
  events: readonly GameEvent[],
  getTriggers: TriggerProvider,
  actor: PlayerId | null,
  decide: FeprDecide,
  deps: ReduceDeps = {},
): GameState {
  return runFepr(landAndEnqueueTriggers(state, events, getTriggers, actor, deps), decide, deps)
}

                                                        
export function emitAndStep(
  state: GameState,
  events: readonly GameEvent[],
  getTriggers: TriggerProvider,
  actor: PlayerId | null,
  deps: ReduceDeps = {},
): FeprStep {
  return advanceFepr(landAndEnqueueTriggers(state, events, getTriggers, actor, deps), deps)
}

                                      
export function stepAfterDecision(
  step: Extract<FeprStep, { kind: 'decision' }>,
  decision: FeprDecision,
  deps: ReduceDeps = {},
): FeprStep {
  return advanceFepr(applyFeprDecision(step.state, step.player, decision, deps), deps)
}
