                                                                        
                                           
                                           
                                                                    
                                                             
                                                           
                                                          
                                                     
                                       
import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import type { ObjId } from '../state/ids'
import type { StaticEffect } from './continuousView'

export type CopyChainPredicate = (e: StaticEffect, o: GameObject, state: GameState) => boolean

                                                     
export function resolveCopyBase(
  state: GameState,
  allEffects: readonly StaticEffect[],
  startOid: ObjId,
  safePredicate: CopyChainPredicate,
): GameObject | undefined {
  const visited = new Set<string>()
  let cur = state.objects[startOid]
  while (cur && !visited.has(cur.oid as string)) {
    visited.add(cur.oid as string)
    const links = allEffects.filter((e) => e.modification.kind === 'copyOf' && safePredicate(e, cur!, state))
    if (links.length === 0) return cur
    const last = links.reduce((a, b) => (b.timestamp >= a.timestamp ? b : a))
    const next = state.objects[(last.modification as { readonly sourceOid: ObjId }).sourceOid]
    if (!next) return cur                                   
    cur = next
  }
  return cur
}
