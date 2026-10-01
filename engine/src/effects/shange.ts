                                                         
                                                   
                                                   
import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'

                                                  
export function shangeCopies(state: GameState, o: GameObject): number {
  let n = 0
  for (const other of Object.values(state.objects)) {
    if (other.defId === 'SFD-059' && (other.status as { attachedTo?: string }).attachedTo === o.oid) n++
  }
  return n
}

   
                                                      
                                                                        
                                                            
                                            
   
export function withShangeCopies<T extends { readonly key: string }>(
  state: GameState, o: GameObject, printed: readonly T[],
): readonly T[] {
  const n = shangeCopies(state, o)
  if (n === 0 || printed.length === 0) return printed
  const out: T[] = [...printed]
  for (let i = 1; i <= n; i++) {
    for (const sp of printed) out.push({ ...sp, key: `${sp.key}:shange:${i}` })
  }
  return out
}
