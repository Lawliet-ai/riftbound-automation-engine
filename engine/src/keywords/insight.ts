                                          
                                                                  
                                                         
                                                                        
                                               

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import { freshOid } from '../state/gameState'
import { isRune } from '../state/cardTypes'
import { moveObject } from '../state/object'
import { makeRng, shuffle, type Rng } from '../util/rng'

export const DEFAULT_INSIGHT = 1            

   
                     
                                                             
   
export function topOfDeck(state: GameState, player: PlayerId, n: number): ObjId[] {
  const deck = state.zones[`mainDeck:${player}` as ZoneId]
  if (!deck) return []
  const k = Math.min(n, deck.contents.length)
  return deck.contents.slice(deck.contents.length - k).reverse() as ObjId[]       
}

                                           
export type RecycleChoice = (top: readonly ObjId[], state: GameState) => readonly ObjId[]

   
                                          
                                             
   
export function insight(
  state: GameState,
  player: PlayerId,
  x: number = DEFAULT_INSIGHT,
  chooseRecycle: RecycleChoice = () => [],
  rng?: Rng,
): GameState {
  const deckId = `mainDeck:${player}` as ZoneId
  const deck = state.zones[deckId]
  if (!deck) return state
  const n = Math.min(x, deck.contents.length)                                
  if (n === 0) return state
  const topDown = deck.contents.slice(deck.contents.length - n).reverse()       
  const rest = deck.contents.slice(0, deck.contents.length - n)            
  let recycled = chooseRecycle(topDown, state).filter((o) => topDown.includes(o))
                                                        
  if (recycled.length > 1) recycled = shuffle(recycled, rng ?? makeRng(state.nextOid * 2654435761 + 41))
  const kept = topDown.filter((o) => !recycled.includes(o))                             
                                                          
  return {
    ...state,
    zones: { ...state.zones, [deckId]: { ...deck, contents: [...recycled.slice().reverse(), ...rest, ...kept.slice().reverse()] } },
  }
}


   
                           
                                                                   
                                                               
                                             
                                                   
                                                                     
                        
                                                     
                                                                 
                                                                  
  
                                                      
                                           
                                                                            
                                            
                                                               
                                                               
                                                       
   
export function recycleObjects(
  state: GameState,
  oids: readonly ObjId[],
  rng?: Rng,
): GameState {
  const present = oids.filter((o) => state.objects[o] !== undefined)
  if (present.length === 0) return state
                                                           
                                                     
  const allRunes = present.every((o) => isRune(state.objects[o]))
  const ordered = present.length > 1 && !allRunes
    ? shuffle(present, rng ?? makeRng(state.nextOid * 2654435761 + 29))                      
    : present
  let s = state
  for (const oid of ordered) {
    const o = s.objects[oid]
    if (!o) continue
    const from = s.zones[o.zone]
                                                 
    const deck = s.zones[`${isRune(o) ? 'runeDeck' : 'mainDeck'}:${o.owner}` as ZoneId]
    if (!from || !deck) continue
                                                                     
                                                           
                                                       
                                         
                                                           
                                                                     
                                                               
                                                          
                                                   
    const sameZone = from.id === deck.id
    const fresh = sameZone ? null : freshOid(s)
    const newOid = fresh ? fresh.oid : oid
    const objects = { ...s.objects }
    if (!sameZone) delete objects[oid]
                                                   
    objects[newOid] = sameZone
      ? { ...o, zone: deck.id, controller: o.owner }
                                                                   
                                                            
                                                                              
                                                              
                                          
                                                
                                                                                                                
                                                               
                                                           
                                                                                        
                                                                                                
                                                                           
                                                                             
                                                                         
                                                                                      
                                                      
                                                                  
                                                       
      : moveObject(o, deck.id, from.kind, deck.kind, newOid)
    s = {
      ...s, ...(fresh ? { nextOid: fresh.nextOid } : {}), objects,
      zones: {
        ...s.zones,
                                                
        ...(from.id !== deck.id ? { [from.id]: { ...from, contents: from.contents.filter((c) => c !== oid) } } : {}),
        [deck.id]: { ...deck, contents: [newOid, ...(from.id === deck.id ? deck.contents.filter((c) => c !== oid) : deck.contents)] }, // index 0 = 底
      },
    }
  }
                                                     
  const runeCount = present.filter((o) => isRune(state.objects[o])).length
  if (runeCount > 0) noteRunesRecycled(state.objects[present[0]!]!.owner, runeCount)
  return s
}

   
                                                              
                                                      
                                                  
                                                                 
                                           
                                        
   
let runesRecycledBuf: { readonly player: PlayerId; readonly count: number }[] = []
function noteRunesRecycled(player: PlayerId, count: number): void {
  runesRecycledBuf.push({ player, count })
}
export function takeRunesRecycled(): readonly { readonly player: PlayerId; readonly count: number }[] {
  const out = runesRecycledBuf
  runesRecycledBuf = []
  return out
}

                                                    
export function ownDiscard(state: GameState, player: PlayerId): ObjId[] {
  return [...(state.zones[`discard:${player}` as ZoneId]?.contents ?? [])] as ObjId[]
}
   
                                          
  
                                                          
                                      
                                                        
  
                                   
                                           
                                        
                                                              
                                   
  
                                                                             
                                                                               
                                                           
                                                      
                                                    
   
export function allDiscards(state: GameState): ObjId[] {
  return state.players.flatMap((p) => ownDiscard(state, p))
}
