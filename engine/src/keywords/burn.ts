                                                       
  
                                      
                                           
                                                  
                                                                
                                                         
                                                      
                           
  
                                 
                                                          
                                            
  
                                               
                                                      

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import { moveObjectInState } from '../state/mutations'
import { burnOut } from '../scoring/burnout'
import type { ReduceDeps } from '../loop/reduce'

                                                 
const BURN_LOOP_CAP = 100

function deckOf(state: GameState, player: PlayerId): readonly ObjId[] {
  return state.zones[`mainDeck:${player}` as ZoneId]?.contents ?? []
}

                                                                
function burnOne(state: GameState, player: PlayerId): GameState {
  const deck = deckOf(state, player)
  const top = deck[deck.length - 1]
  if (top === undefined) return state
  return moveObjectInState(state, top, `discard:${player}` as ZoneId)
}

   
                                       
                                             
  
                           
                                      
                                                         
                                        
   
export function burn(state: GameState, player: PlayerId, count: number, deps: ReduceDeps = {}): GameState {
  if (count <= 0) return state
  let s = state
  let remaining = count
  for (let i = 0; i < BURN_LOOP_CAP && remaining > 0; i++) {
    const available = deckOf(s, player).length
    const k = Math.min(remaining, available)
                                     
    for (let n = 0; n < k; n++) s = burnOne(s, player)
    remaining -= k
    if (remaining <= 0) break
                                                                       
                                         
    const before = s
    s = burnOut(s, player, deps)
    if (s.winner) return s                             
                                                             
                                     
    if (deckOf(s, player).length === 0 && s === before) break
    if (deckOf(s, player).length === 0) break
  }
  return s
}
