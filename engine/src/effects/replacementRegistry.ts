                                                                             
                                                                           
                                                             

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import { isExemptEvent, type EventKind, type GameEvent } from '../loop/events'

export interface ReplacementShield {
  readonly id: string
                                                 
  readonly source: ObjId | null
  readonly controller: PlayerId | null
  readonly intercepts: EventKind
  readonly predicate: (ev: GameEvent, state: GameState) => boolean
                                          
  readonly rewrite: (ev: GameEvent, state: GameState) => GameEvent | null
     
                                                                      
                                                              
                                           
                                                  
                                                                          
                                                        
                                                              
                                                   
                                                            
     
                                 
  readonly optional?: boolean
     
                                        
                                          
                                              
     
  readonly onApplied?: (state: GameState, ev: GameEvent) => GameState
}

export interface ReplacementRegistry {
  readonly shields: readonly ReplacementShield[]
}

export const EMPTY_REPLACEMENT_REGISTRY: ReplacementRegistry = { shields: [] }

   
                                                                              
                                                            
                                                               
                                     
                                    
  
                                                       
                                                    
                                                                
                      
   
const orderHookError = (id: string): Error =>
  new Error(`§372 选序钩子返回了不在候选集里的替换效果(${id}):它要么已经对本事件生效过,要么并未命中本事件`)

                                                                 
export type ReplacementOrder = (
  matching: readonly ReplacementShield[],
  ev: GameEvent,
  state: GameState,
) => readonly ReplacementShield[]

export interface InterceptOpts {
                                    
  readonly order?: ReplacementOrder
                                            
  readonly chooseApply?: (shield: ReplacementShield, ev: GameEvent, state: GameState) => boolean
                                                  
  readonly onApply?: (shield: ReplacementShield, ev: GameEvent) => void
}

   
             
                                  
                                                              
                                                                
                                        
                          
   
export function interceptEvent(
  ev: GameEvent,
  state: GameState,
  registry: ReplacementRegistry = EMPTY_REPLACEMENT_REGISTRY,
  opts: InterceptOpts = {},
): GameEvent | null {
  if (isExemptEvent(ev)) return ev                     
  if (registry.shields.length === 0) return ev

  let current: GameEvent = ev
  const applied = new Set<string>()          

                                            
                                                 
  for (let i = 0; i <= registry.shields.length; i++) {
    const matching = registry.shields.filter(
      (sh) => !applied.has(sh.id) && sh.intercepts === current.kind && sh.predicate(current, state),
    )
    if (matching.length === 0) return current

    const ordered = opts.order ? opts.order(matching, current, state) : matching
    const shield = ordered[0]
    if (!shield) return current                                 
                                                           
    if (!matching.includes(shield)) throw orderHookError(shield.id)

    applied.add(shield.id)                                    
    if (shield.optional && opts.chooseApply && !opts.chooseApply(shield, current, state)) {
      continue                
    }
    const rewritten = shield.rewrite(current, state)
    opts.onApply?.(shield, current)
    if (rewritten === null) return null             
    current = rewritten
  }
                                                          
  throw new Error('替换层内部错误:进展不变式被打破(每轮本应消耗一个未生效的替换)')
}
