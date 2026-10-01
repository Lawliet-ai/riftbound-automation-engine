                                   
  
                                                           
                                        
                                                             
                                                            
                                                                 
                                                            
                                                           
  
                                                       
import { addItems, type ChainItem } from './chain'
import type { GameState } from '../state/gameState'
import type { GameEvent } from './events'
import type { ObjId, PlayerId } from '../state/ids'

   
                                                              
  
                                                        
                                                                                  
                                                                        
                                                                        
                                         
               
                                                               
                                                                                   
                                   
                                                                
                                                                                       
                                                                                  
                                                                   
   
export const TARGET_MODE_PREFIXES: readonly string[] = [
  'emp', 'dis', 'dmg2', 'dmg3', 'dmg4', 'wreck', 'stun', 'draw', 'ready', 'prowl',
]

   
                                    
                             
                                           
                                                    
                                                           
                                                                         
                                                          
                                   
                                                                                       
                                                                        
                                               
                                                                     
                                                              
                                                                              
                                                 
                      
                                                                     
                                                      
   
export function decodeTargetOids(t: string | undefined): readonly string[] {
  if (t === undefined) return []
  if (t.startsWith('play:')) return []              
  if (t.startsWith('pair:')) return t.split(':').slice(1)                    
  if (t.startsWith('back:') || t.startsWith('weak:')) return [t.slice(5)]
  if (t.startsWith('swap:')) return t.split(':').slice(1)
                                                                              
  if (t.startsWith('beam:')) return t.split(':').slice(1)
                                                                                
  const ci = t.indexOf(':')
  if (ci > 0 && TARGET_MODE_PREFIXES.includes(t.slice(0, ci))) {
    const x = t.slice(ci + 1)
    return x === '-' ? [] : [x]                   
  }
  const tier = t.indexOf(':::')                       
  if (tier > 0) return [t.slice(0, tier)]
  return [t]
}

   
                                 
                                                              
                                                               
                                                      
                                                                   
   
export function targetsOf(item: ChainItem): readonly string[] {
  return item.targets ?? mainTargetOids(item)
}

   
                                                       
                                                         
                                                
                                                                               
                                                                       
   
export function mainTargetOids(item: ChainItem): readonly string[] {
  return decodeTargetOids(item.chosenTarget)
}

   
                                                   
  
                                               
                                                    
                                                  
                                                                      
                                           
                                                
                                             
                                      
                                                                    
                                                                     
                                              
                                                           
                   
                               
   
   
                                                                   
                                                                     
   
function newestConfirmedIndex(state: GameState): number {
  for (let i = state.chain.length - 1; i >= 0; i--) {
    if (state.chain[i]!.status === 'confirmed') return i
  }
  return -1
}

   
                                                            
                                                            
                                                                
                                            
                                                                              
                                                                     
                               
   
function itemIndexById(state: GameState, itemId: string): number {
  const exact = state.chain.findIndex((it) => it.id === itemId)
  if (exact >= 0) return exact
  const prefixed = state.chain.findIndex((it) => it.id.startsWith(itemId + ':'))
  if (prefixed >= 0) return prefixed
  const seg = itemId.split(':')
  if (seg[0] === 'spell' && seg.length >= 2) {
    const byCard = state.chain.findIndex((it) => it.cardOid !== undefined && String(it.cardOid) === seg[1])
    if (byCard >= 0) return byCard
  }
  return -1
}

                                                                               
function mergeChosenTargetAt(state: GameState, answer: string, idx: number): GameState {
  const add = liveTargetOids(state, answer)
  if (add.length === 0) return state
  if (idx < 0) return state
  const it = state.chain[idx]!
  const merged = [...new Set([...targetsOf(it), ...add])]
  const chain = [...state.chain]
  chain[idx] = { ...it, targets: merged }
  return { ...state, chain }
}

   
                                                                       
  
                                                            
                                                                        
                                                                  
                                                                     
   
export function addChosenTargetTo(state: GameState, answer: string, itemId: string): GameState {
  return mergeChosenTargetAt(state, answer, itemIndexById(state, itemId))
}

   
                                                                                         
  
                                                                                
                                              
                                                                              
                                                                    
                                                                         
                                                    
                                          
                                                
                                                                    
                                                                
                            
                                                                             
                                                          
   
export function liveTargetOids(state: GameState, answer: string): readonly string[] {
  return decodeTargetOids(answer).filter((oid) => state.objects[oid as ObjId] !== undefined)
}

export function addChosenTarget(state: GameState, answer: string): GameState {
  return mergeChosenTargetAt(state, answer, newestConfirmedIndex(state))
}

   
                                                              
                                                                               
  
                                                      
                                    
                                                                        
                                                                        
  
                                                                                   
                                                         
                                                     
                                                
   
export function holdTriggersOnResolvingItem(state: GameState, items: readonly ChainItem[]): GameState {
  if (items.length === 0) return state
  const idx = newestConfirmedIndex(state)
  if (idx < 0) return { ...state, chain: addItems(state.chain, items) }                
  const it = state.chain[idx]!
  const chain = [...state.chain]
  chain[idx] = { ...it, heldTriggers: [...(it.heldTriggers ?? []), ...items] }
  return { ...state, chain }
}

   
                                                              
  
                                                                 
                                              
                                                     
                                   
                                                         
                                                         
                                                                                 
                                               
                                                           
                                                                   
                                                                
                                 
  
                                                             
                       
                                           
                                                                   
                                             
                                                                                        
                                                                       
                                                                                  
                                                                                  
                                                                 
                                                             
                                                            
                                                             
                                                                                 
                                           
                                                                     
   
export function chosenTargetSignals(state: GameState, answer: string, chooser: PlayerId, itemId?: string, dedupe?: boolean): readonly GameEvent[] {
  const add = liveTargetOids(state, answer)                                          
  if (add.length === 0) return []
  const idx = itemId === undefined ? newestConfirmedIndex(state) : itemIndexById(state, itemId)
  if (idx < 0) return []
  const it = state.chain[idx]!
                                                 
  const sourceKind = it.kind === 'spell' ? 'spell' : 'ability'
                                                          
                                                                         
  const src = it.cardOid ?? it.sourceOid
  const emit = (fresh: readonly string[]): readonly GameEvent[] =>
    fresh.map((oid) => ({
      kind: 'targeted', chooser, target: oid as ObjId, sourceKind,
      ...(src !== undefined ? { sourceOid: src } : {}),
    } as GameEvent))
                                                  
                                                                           
                                                                
                                                 
                                                                              
  if (dedupe !== true) return emit(add)
  const already = new Set(targetsOf(it))
  const fresh = add.filter((oid) => !already.has(oid))
  if (fresh.length === 0) return []
  return emit(fresh)
}

   
                                                     
  
                             
                                                                                                      
                                      
                                 
                                                                   
                                                                 
                                                                                        
                                                                          
                                                                                
                                                                 
                                                                 
                                                          
                                                                          
                                   
                                                                         
                           
   
export function effectPlayedSpellTargetSignals(
  state: GameState, target: string | undefined, chooser: PlayerId, cardOid?: ObjId,
): readonly GameEvent[] {
  if (target === undefined) return []
  return liveTargetOids(state, target).map((oid) => ({
    kind: 'targeted', chooser, target: oid as ObjId, sourceKind: 'spell',
    ...(cardOid !== undefined ? { sourceOid: cardOid } : {}),
  } as GameEvent))
}
