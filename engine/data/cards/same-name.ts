                             
  
                                              
                                                          
                                           
  
                                                       
                                             
                                                        

import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'

                                    
export function sameNameCountInDiscard(
  state: GameState,
  player: PlayerId,
  selfDefId: string,
  nameOf: (defId: string) => string,
): number {
  const mine = nameOf(selfDefId)
  return (state.zones[`discard:${player}`]?.contents ?? []).filter((oid) => {
    const o = state.objects[oid]
    return o !== undefined && nameOf(o.defId) === mine
  }).length
}
