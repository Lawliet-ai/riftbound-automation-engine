                        
  
                                                                   
                                         
                                       
                                             
  
        
                                                     
                                                           
                                                       
  
                                             
                                                              
                                                
                                               
  
                                            

import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import type { StaticEffect } from './continuousView'
import { isFieldedExceptStandby, zoneCategory } from '../state/zones'
import { shangeCopies } from './shange'        
import { resolveCopyBase } from './copyChain'                                                  
import type { PlayerId, ObjId } from '../state/ids'
import { safePredicate } from './safePredicate'

                                                         
export type CardPassiveProvider = (obj: GameObject, state: GameState) => readonly StaticEffect[]

let provider: CardPassiveProvider | null = null

                                                
export function setCardPassiveProvider(p: CardPassiveProvider | null): void {
  provider = p
}

   
                                                            
                                                                        
                                                                                         
   
function isFielded(state: GameState, o: GameObject): boolean {
  const kind = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(kind)
}

   
                                                        
  
                                                            
                                                                    
                                                                
                                     
  
                         
                                                                         
                                                                                   
                          
                                                                
                                                                                          
                                                                      
                                    
                                                                                           
                          
  
                                   
   
function copiedIdentityOf(state: GameState, o: GameObject): string | undefined {
                                                                     
                         
                                                                          
                                                          
                                                                     
                                                                                 
                                               
                                                               
                                                                    
                                                       
                                                                         
                                                            
                                                                 
  let last: { readonly sourceOid: ObjId } | undefined
  for (const e of state.continuousEffects) {
    if (e.modification.kind !== 'copyOf') continue
    if (!safePredicate(e, o, state)) continue
    last = e.modification as { readonly sourceOid: ObjId }
  }
  if (last === undefined) return undefined
  const finalSrc = resolveCopyBase(state, state.continuousEffects, last.sourceOid, safePredicate)
  return finalSrc && finalSrc.oid !== o.oid ? finalSrc.defId : undefined
}

   
                               
  
                  
                                                        
                                                                            
                                                
                    
  
                                                               
                                             
                                                 
   
export type BattlefieldPassiveProvider = (
  defId: string,
  zoneId: string,
  owner: PlayerId,
  state: GameState,
) => readonly StaticEffect[]

let bfProvider: BattlefieldPassiveProvider | null = null

export function setBattlefieldPassiveProvider(p: BattlefieldPassiveProvider | null): void {
  bfProvider = p
}

                                             
export function cardPassiveEffects(state: GameState): readonly StaticEffect[] {
  const out: StaticEffect[] = []
                                          
  const hasCopyEffect = state.continuousEffects.some((e) => e.modification.kind === 'copyOf')
  if (provider) {
    for (const o of Object.values(state.objects)) {
      if (!isFielded(state, o)) continue
                                                                   
                                                                    
                                                             
      const copied = hasCopyEffect ? copiedIdentityOf(state, o) : undefined
      const forProvider = copied === undefined ? o : ({
        ...o,
        derived: { ...(o.derived ?? { might: o.baseMight, keywords: [...(o.baseKeywords ?? [])], restrictions: [], controller: o.controller }), copiedDefId: copied },
      } as GameObject)
      const base = provider(forProvider, state)
      out.push(...base)
                                                           
                                                           
                                             
                                                                     
                                                                
      if (base.length > 0) {
        const n = shangeCopies(state, o)
        for (let i = 1; i <= n; i++) {
          out.push(...base.map((e) => ({ ...e, id: `${e.id}:shange:${i}` })))
        }
      }
    }
  }
  if (bfProvider) {
    for (const [zoneId, bc] of Object.entries(state.battlefieldCards ?? {})) {
      out.push(...bfProvider(bc.defId, zoneId, bc.owner, state))
    }
  }
  return out
}
