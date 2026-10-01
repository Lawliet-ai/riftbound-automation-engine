                                                  
                                                             
                                                                 
                            

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameEvent } from '../loop/events'
import { isExemptEvent } from '../loop/events'
import type { InterceptOpts, ReplacementShield } from './replacementRegistry'

                                                 
export function affectedController(ev: GameEvent, state: GameState): PlayerId | null {
  switch (ev.kind) {
    case 'damage':
    case 'statusChange':
    case 'destroy':
      return state.objects[ev.kind === 'destroy' ? ev.target : ev.target]?.controller ?? null
    case 'gainPoint':
      return ev.player                 
    case 'zoneChange':
      return state.objects[ev.obj]?.controller ?? state.activePlayer
    default:
      return state.activePlayer                          
  }
}

                                                  
export function skipScoringShield(
  id: string,
  controller: PlayerId | null,
  predicate: (ev: GameEvent, state: GameState) => boolean,
): ReplacementShield {
  return { id, source: null, controller, intercepts: 'gainPoint', predicate, rewrite: () => null }
}

                                            
export function preventDamageShield(
  id: string,
  controller: PlayerId | null,
  reduceBy: number,
  predicate: (ev: GameEvent, state: GameState) => boolean = () => true,
): ReplacementShield {
  return {
    id,
    source: null,
    controller,
    intercepts: 'damage',
    predicate,
    rewrite: (ev) => (ev.kind === 'damage' ? { ...ev, amount: Math.max(0, ev.amount - reduceBy) } : ev),
  }
}

                              
export function doubleDamageShield(
  id: string,
  controller: PlayerId | null,
  predicate: (ev: GameEvent, state: GameState) => boolean = () => true,
): ReplacementShield {
  return {
    id,
    source: null,
    controller,
    intercepts: 'damage',
    predicate,
    rewrite: (ev) => (ev.kind === 'damage' ? { ...ev, amount: ev.amount * 2 } : ev),
  }
}

   
                        
  
                                                  
                                                    
                                                     
                                                            
                                                       
  
                                                         
                                                                
                                                            
                                                              
                                                 
  
                          
                                                        
                                               
                                            
                                                     
                                               
                                                     
                                                             
                                                            
                                                           
                                 
   
export function interceptEventBatch(
  events: readonly GameEvent[],
  state: GameState,
  shields: readonly ReplacementShield[],
  opts: InterceptOpts = {},
): (GameEvent | null)[] {
  const results: (GameEvent | null)[] = [...events]
  for (const shield of shields) {
    for (let i = 0; i < results.length; i++) {
      const ev = results[i]
      if (!ev || isExemptEvent(ev)) continue                         
      if (shield.intercepts !== ev.kind || !shield.predicate(ev, state)) continue
                                            
      if (shield.optional && opts.chooseApply && !opts.chooseApply(shield, ev, state)) continue
      results[i] = shield.rewrite(ev, state)                               
      opts.onApply?.(shield, ev)                              
    }
  }
  return results
}
