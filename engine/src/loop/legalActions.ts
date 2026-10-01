                                                             
                                                    
                                                             
                                                     

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { Action } from './actions'

   
                                         
                                                            
   
export function legalActions(_state: GameState, player: PlayerId): readonly Action[] {
  return [{ kind: 'PASS', player }]
}
