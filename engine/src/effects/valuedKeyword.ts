                                               
  
                                      
                                                  
                                                  
                                              
                                                       
                                                    
                                      
  
                                                                  
                                                   
                                            

import type { GameState } from '../state/gameState'
import { shangeCopies } from './shange'        
import type { GameObject } from '../state/object'
import type { StaticEffect } from './continuousView'
import { grantsOf } from './attachmentGrants'                       
import { resolveCopyBase } from './copyChain'                   

                                   
type SafePredicate = (e: StaticEffect, o: GameObject, state: GameState) => boolean

   
                            
                                                                     
   
export function keywordSources(state: GameState, o: GameObject, safePredicate: SafePredicate): string[] {
  const sources: string[] = []
                                                     
                                                        
                                                     
  const printedBase = resolveCopyBase(state, state.continuousEffects, o.oid, safePredicate) ?? o
  sources.push(...(printedBase.baseKeywords ?? []))
                     
  sources.push(...(o.status.tempKeywords ?? []))
                                           
  const ifAbsent: string[] = []                                      
  for (const e of state.continuousEffects) {
    if (e.modification.kind !== 'grantKeyword') continue
    if (!safePredicate(e, o, state)) continue
    if (e.modification.ifAbsent === true) { ifAbsent.push(e.modification.keyword); continue }
    sources.push(e.modification.keyword)
  }
                                                                      
                                                               
                                                            
                                                           
                                              
                                                                       
  for (const other of Object.values(state.objects)) {
    if ((other.status as { attachedTo?: string }).attachedTo !== o.oid) continue
    const gr = grantsOf(other, state)
    if (gr.length === 0) continue
    sources.push(...gr)
  }
                                                       
                                                  
                                                            
                                                        
                                                   
                                                       
  const shangeCount = shangeCopies(state, o)                                       
  if (shangeCount > 0) {
                                  
    const printed = printedBase.baseKeywords ?? []
    for (let i = 0; i < shangeCount; i++) sources.push(...printed)
  }
                                                                            
  for (const kw of ifAbsent) {
    const family = kw.replace(/\d+$/, '')
    if (!sources.some((k) => k.replace(/\d+$/, '') === family)) sources.push(kw)
  }
  return sources
}

   
                                                             
                                                     
   
export function parseValuedKeyword(kw: string, name: string): number | null {
  const m = new RegExp(`^${name}(\\d*)$`).exec(kw)
  if (!m) return null
  return m[1] ? Number(m[1]) : 1
}

   
                                           
                                                   
                                      
   
export function valuedKeywordTotal(
  state: GameState,
  o: GameObject,
  name: string,
  safePredicate: SafePredicate,
): number {
  let total = 0
  for (const kw of keywordSources(state, o, safePredicate)) {
    const v = parseValuedKeyword(kw, name)
    if (v !== null) total += v
  }
  return total
}
