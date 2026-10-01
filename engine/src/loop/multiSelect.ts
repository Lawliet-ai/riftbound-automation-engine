                                          
  
                                             
                                      
                                                          
  
                                                                                
                                                     
  
                                           
  
                                    
                                                                           
                                                                 
                                                                                
                                                                             
                                                                         
                                                                        
                                                                         
                                                                       
                                                           
                                                        
                                                            
                                                          
                                

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { ChoiceRequest } from './chain'

                        
export const MULTI_SELECT_DONE = '__done__'

                                                            
export function multiSelectPicked(
  chosen: Readonly<Record<string, string>> | undefined,
  prefix: string,
): readonly string[] {
  const out: string[] = []
  for (let i = 0; ; i++) {
    const v = chosen?.[`${prefix}${i}`]
    if (v === undefined || v === MULTI_SELECT_DONE) return out
    out.push(v)
  }
}

   
                                                                
                                                                  
  
                                                                             
                                                            
                                                                      
                                                                              
   
export function multiSelectPickedLegal(
  chosen: Readonly<Record<string, string>> | undefined,
  prefix: string,
  state: GameState,
  candidates: (state: GameState, picked: readonly string[]) => readonly (string | { readonly id: string })[],
): readonly string[] {
  const legal = new Set(candidates(state, []).map((c) => (typeof c === 'string' ? c : c.id)))
  return multiSelectPicked(chosen, prefix).filter((oid) => legal.has(oid))
}

   
                                                
  
                                                                
                                              
   
export function multiSelectChoice(spec: {
  readonly itemId: string
  readonly controller: PlayerId
  readonly prefix: string
  readonly prompt: string
  readonly doneLabel?: string
  readonly max?: number
     
                             
                                                               
                                                
                                                         
                                                          
     
  readonly allowRepeat?: boolean
     
                                                                   
                                 
                                                                          
                                                                                  
                                                                                                   
                                             
     
  readonly required?: boolean
     
                                                                    
                                                       
                                                                       
                                                          
                                                                  
                                                                               
     
  readonly minPicks?: number
     
                                                                      
                                                                            
                                                                           
                                                               
                         
     
  readonly isTarget?: boolean
     
                                                                      
                                                               
                                                                     
                                                                       
                                                   
                                                                               
     
  readonly dedupeTargetSignal?: boolean
  readonly candidates: (state: GameState, picked: readonly string[]) => readonly { readonly id: string; readonly label: string }[]
}): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null {
  return (state, chosen) => {
    const picked = multiSelectPicked(chosen, spec.prefix)
                                                              
    if (chosen[`${spec.prefix}${picked.length}`] === MULTI_SELECT_DONE) return null
    if (spec.max !== undefined && picked.length >= spec.max) return null
    const all = spec.candidates(state, picked)
                                                  
    const rest = spec.allowRepeat === true ? all : all.filter((c) => !picked.includes(c.id))
                                                       
    if (rest.length === 0) return null
                                                                       
    const offerDone = spec.required !== true && picked.length >= (spec.minPicks ?? 0)
    return {
      itemId: spec.itemId,
      controller: spec.controller,
      key: `${spec.prefix}${picked.length}`,
      prompt: picked.length === 0 ? spec.prompt : `${spec.prompt}(已选 ${picked.length} 个)`,
                                                     
                                                    
      candidates: offerDone ? [...rest, { id: MULTI_SELECT_DONE, label: spec.doneLabel ?? '够了,不再选' }] : [...rest],
      ...(spec.isTarget === true ? { isTarget: true } : {}), // ★1778
      ...(spec.dedupeTargetSignal === true ? { dedupeTargetSignal: true } : {}), // ★1807(缺省省略,不写 `false`)
    }
  }
}
