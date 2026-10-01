                                
  
                                      
                                                      
                                
                                            
                                            
                                                        
  
                                     
                                           
                                           
  
                                           
                                                                  
                                                    

import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import { attachedTo } from '../state/attach'
import type { StaticEffect } from './continuousView'

   
                                             
                                          
                                               
   
   
                             
  
                                            
                                              
                                       
  
                                               
                                           
                                                               
                                                   
   
export type ExtraGrantsProvider = (gear: GameObject, state: GameState) => readonly string[]

let extraProvider: ExtraGrantsProvider | null = null

                                                
export function setExtraGrantsProvider(p: ExtraGrantsProvider | null): void {
  extraProvider = p
}

   
                                                
                                                
   
export function grantsOf(gear: GameObject, state: GameState): readonly string[] {
  const printed = gear.baseGrants ?? []
  const extra = extraProvider?.(gear, state) ?? []
  return extra.length === 0 ? printed : [...printed, ...extra]
}

export function attachmentGrantEffects(state: GameState): StaticEffect[] {
  const out: StaticEffect[] = []
  for (const o of Object.values(state.objects)) {
    const grants = grantsOf(o, state)
    if (grants.length === 0) continue
    const host = attachedTo(o)
    if (host === undefined) continue                    
    grants.forEach((kw, i) => {
      out.push({
        id: `grant:${o.oid}:${i}`,
        duration: 'permanent',
        fromPassive: true, // 印刷特质来源,§477.3.b 不快照
        predicate: (x: GameObject) => x.oid === host,
        modification: { kind: 'grantKeyword', keyword: kw },
        timestamp: 0,
      })
    })
  }
  return out
}
