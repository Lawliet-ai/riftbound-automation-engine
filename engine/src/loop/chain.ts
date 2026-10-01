                                                           

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameEvent } from './events'
import type { ReduceDeps } from './reduce'

export type ChainItemKind = 'unit' | 'equipment' | 'resource' | 'spell' | 'ability' | 'triggered'

                                                                       
export interface Rechoice {
  readonly location?: string
  readonly mode?: string
  readonly destination?: string
  readonly target?: ObjId
}

   
                                                      
                                     
   
export const FAST_RESOLVE_KINDS: ReadonlySet<ChainItemKind> = new Set<ChainItemKind>([
  'unit',
  'equipment',
  'resource',
])

                                                                                  
export interface ChoiceRequest {
  readonly itemId: string
  readonly controller: PlayerId
  readonly key: string                                 
  readonly prompt: string
     
                                                      
                                              
                                          
                                                   
                                
     
  readonly candidates: readonly {
    readonly id: string
    readonly label: string
    readonly note?: string
       
                                                        
                                          
                                            
                                                         
                                                 
       
    readonly sourceDefId?: string
  }[]
     
                                                     
                                                
                                            
                                                                                          
                                          
                                     
     
  readonly isTarget?: boolean
     
                                       
                                         
    
                                                  
                                   
                                   
                                              
                                                          
                                               
     
  readonly sourceDefId?: string
     
                                                                                 
                                                                                     
                                  
                                                                                 
                                                                        
     
  readonly stage?: 'confirm' | 'resolve'
     
                                                                 
                                                                
    
                                       
                                                                  
                                                    
                                        
                                                            
                                                      
                                    
                                                                                       
                                                                    
    
                                                               
                                                             
                                                            
                                                              
                                                                      
                                           
    
                                                                 
                                                       
    
                                                                   
     
  readonly dedupeTargetSignal?: boolean
     
                                   
    
                                                              
                                                                         
                                                                                
                                             
                                              
                                                
                                                                           
     
  readonly maskedOut?: true
}

export interface ChainItem {
     
                                                                                
                                                                    
                                                                                                                    
                                                                                                              
                                                                                      
                                                                    
                                                                       
                                                                   
     
  readonly id: string
     
                                         
    
                                                
                                                     
                                             
                                              
                                             
                                              
                             
     
  readonly batchId?: string
  readonly controller: PlayerId
  readonly kind: ChainItemKind
                                                          
  readonly cardOid?: ObjId
                                                                           
  readonly paidMana?: number
                                                             
  readonly chosenTarget?: string
     
                                                    
                                             
                                                                      
                                                   
                                             
                                      
                                                              
     
  readonly targets?: readonly string[]
                                                           
  readonly sourceDefId?: string
     
                                     
                                                          
                                                    
                                                              
                                                                 
                                                                   
                                                              
     
  readonly sourceOid?: ObjId
     
                                                           
                                                                  
    
                          
                                             
                                
                                                                        
                                                               
                                                        
                                       
                                                                    
                              
                                                               
                         
     
  readonly heldTriggers?: readonly ChainItem[]
                                                        
  readonly rechoice?: Rechoice
                                                                                                                                          
  readonly retarget?: (target: string | undefined) => ChainItem['resolve']
     
                                               
                                       
                                                
     
  readonly exileOnLeave?: boolean
     
                                                          
                                                    
                                
     
  readonly recycleOnLeave?: boolean
     
                                                              
                                                                 
                      
     
  readonly exileBy?: ObjId
                                          
  readonly status: 'pending' | 'confirmed'
     
                                                                         
    
                                                                          
                                                                      
                                                              
                                                     
                                               
                                                            
    
                                                               
                                                         
                                                                           
                                                                               
                             
     
  readonly frozenChoices?: Readonly<Record<string, string>>
     
                                 
                                                            
                                                    
     
  readonly oncePerTurnKey?: string
     
                                                              
                                                                
     
  readonly nextChoice?: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
     
                                            
                                                                      
     
  readonly resolve: (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => readonly GameEvent[]
                                                        
  readonly mayChoose?: boolean
     
                                                                
    
                                  
                                                            
                                                       
                                                            
                                                                                 
                                                                
                                 
     
  readonly confirmChoice?: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
     
                                                 
                                                         
                                                                      
                                                                   
                                                       
     
  readonly confirmSignals?: (state: GameState, chosen: Readonly<Record<string, string>>) => readonly GameEvent[]
     
                                                          
                                                         
                                                           
                                                                  
                                                        
     
                                                                    
                                                         
  readonly basePerform?: (state: GameState, deps?: ReduceDeps) => GameState | null
}

export function pendingItems(chain: readonly ChainItem[]): readonly ChainItem[] {
  return chain.filter((i) => i.status === 'pending')
}


   
                                                        
  
                                                               
                                              
                                          
                                                              
                                                        
                                                   
                                                             
                                                 
                                                                
                                                           
                                                        
                                                                    
   
export function reorderBatchFirst(chain: readonly ChainItem[], batchId: string, firstId: string): readonly ChainItem[] {
  const target = chain.findIndex((it) => it.id === firstId)
  if (target < 0 || chain[target]!.batchId !== batchId) return chain
  const controller = chain[target]!.controller
  const idxs = chain.map((it, i) => (it.batchId === batchId && it.controller === controller ? i : -1)).filter((i) => i >= 0)
  if (idxs.length < 2) return chain
  const last = idxs[idxs.length - 1]!
  if (target === last) return chain                   
                                             
  const inBatch = idxs.map((i) => chain[i]!)
                                                                                    
                                                                                                                                            
  const rest = inBatch.filter((_it, k) => idxs[k] !== target)
  const reordered = [...rest, chain[target]!]
  const out = [...chain]
  idxs.forEach((slot, k) => { out[slot] = reordered[k]! })
  return out
}

                                   
export function earliestPending(chain: readonly ChainItem[]): ChainItem | undefined {
  return chain.find((i) => i.status === 'pending')
}

                                 
export function newestConfirmed(chain: readonly ChainItem[]): ChainItem | undefined {
  for (let i = chain.length - 1; i >= 0; i--) {
    const item = chain[i]
    if (item && item.status === 'confirmed') return item
  }
  return undefined
}

export function confirmItem(chain: readonly ChainItem[], id: string): readonly ChainItem[] {
  return chain.map((i) => (i.id === id ? { ...i, status: 'confirmed' as const } : i))
}

   
                                                      
  
                                                             
                                                                
                                              
                                                   
                                
                                               
                                                                        
   
export function choicesFor(state: GameState, item: ChainItem): Readonly<Record<string, string>> {
  return { ...(item.frozenChoices ?? {}), ...(state.resolveChoices ?? {}) }
}

export function removeItem(chain: readonly ChainItem[], id: string): readonly ChainItem[] {
  return chain.filter((i) => i.id !== id)
}

   
                                        
  
                                                                
                                                                       
                                                                          
                                                                
                                            
                                                                                  
                                                     
                                                          
                                                         
                                             
  
                                                              
                                                                                
                                       
   
export function addItems(chain: readonly ChainItem[], items: readonly ChainItem[]): readonly ChainItem[] {
  const used = new Set(chain.map((i) => i.id))
  const out: ChainItem[] = []
  for (const it of items) {
    if (!used.has(it.id)) { used.add(it.id); out.push(it); continue }
    let n = 2
    while (used.has(`${it.id}#${n}`)) n += 1
    used.add(`${it.id}#${n}`)
    out.push({ ...it, id: `${it.id}#${n}` })
  }
  return [...chain, ...out]
}

   
                                  
                                  
                                                                                
                                                              
                                                                                        
   
export const MAY_CHOOSE_KEY = '__mayChoose__'
                                                                   
export const MAY_CHOOSE_DECLINE = 'no'

   
                                                                       
                                                   
  
                                                     
                                                                
                                                                    
                                                                                
                                                              
                                                                 
                       
                                                                                  
                                                
                                       
   
export const SKIPPED_BY_757 = '__done__'

   
                                               
                                                                                
   
export const TRIGGER_ORDER_KEY = '§383.3.d:triggerOrder'

   
                                                       
  
                                                              
                                                                  
                                                              
                                                         
                                    
  
                                                                         
                                                      
                                           
                                                                          
                                                        
  
                                              
                                                                  
   
export function dropItemChoices(state: GameState, item: ChainItem): GameState {
  const rc = state.resolveChoices
  if (rc === undefined) return state
  const mayKey = `${MAY_CHOOSE_KEY}:${item.id}`
  const mayPresent = Object.prototype.hasOwnProperty.call(rc, mayKey)
                                 
  const sameBatchPending = item.batchId !== undefined && state.chain.some(
    (it) => it.id !== item.id && it.status === 'pending' && it.batchId === item.batchId,
  )
  const orderKey = item.batchId === undefined ? undefined : `${TRIGGER_ORDER_KEY}:${item.batchId}`
  const orderPresent = !sameBatchPending && orderKey !== undefined
    && Object.prototype.hasOwnProperty.call(rc, orderKey)
  if (!mayPresent && !orderPresent) return state
  const next: Record<string, string> = { ...rc }
  if (mayPresent) delete next[mayKey]
  if (orderPresent && orderKey !== undefined) delete next[orderKey]
  return { ...state, resolveChoices: next }
}
