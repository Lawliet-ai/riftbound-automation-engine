                                                                
                                                            
                                                             
                                                             

import { freshOid, type GameState } from '../state/gameState'
import { asZoneId, type ObjId, type PlayerId, type ZoneId } from '../state/ids'
import { moveObject, type GameObject } from '../state/object'
import { drawN } from './setup'
import { makeRng, shuffle, type Rng } from '../util/rng'

export const MULLIGAN_MAX = 2               

export type MulliganResult = { readonly ok: true; readonly state: GameState } | { readonly ok: false; readonly reason: string }

                                
export function mulliganTurn(state: GameState): PlayerId | undefined {
  return state.mulliganQueue?.[0]
}

   
                                           
                            
                                                      
                                
   
export function applyMulligan(state: GameState, player: PlayerId, put: readonly ObjId[], rng?: Rng): MulliganResult {
  if (mulliganTurn(state) !== player) return { ok: false, reason: '未轮到该玩家调度(§117 依回合顺序)' }
  if (put.length > MULLIGAN_MAX) return { ok: false, reason: `最多搁置${MULLIGAN_MAX}张(§117.1)` }
  const handId = asZoneId(`hand:${player}`)
  const hand = state.zones[handId]
  if (!hand) return { ok: false, reason: '无手牌区' }
  if (new Set(put).size !== put.length || put.some((oid) => !hand.contents.includes(oid))) {
    return { ok: false, reason: '搁置牌必须来自手牌且不重复' }
  }

                                         
  let s = state
  const asideObjs: GameObject[] = []
  for (const oid of put) {
    asideObjs.push(s.objects[oid]!)
    const h = s.zones[handId]!
    const objects = { ...s.objects }
    delete objects[oid]
    s = { ...s, objects, zones: { ...s.zones, [handId]: { ...h, contents: h.contents.filter((c) => c !== oid) } } }
  }
                          
  s = drawN(s, player, put.length)
                                                                      
                           
  const ordered = asideObjs.length > 1 ? shuffle(asideObjs, rng ?? makeRng(state.nextOid * 2654435761 + 17)) : asideObjs
  const deckId = asZoneId(`mainDeck:${player}`)
  for (const o of ordered) {
    const { oid: newOid, nextOid } = freshOid(s)
                                                                                    
                                                                          
                                                              
                                                                
                                                              
                                                                                  
                                                                      
                                                  
                                              
                                                               
                                                                                             
                                                         
                                                                 
                                                                                               
                                                          
                                                                   
                                                        
                                                 
                                                  
                                                                    
                                                                  
                                                                               
    const moved: GameObject = moveObject(o, deckId as ZoneId, 'hand', 'mainDeck', newOid)
    const deck = s.zones[deckId]!
    s = { ...s, nextOid, objects: { ...s.objects, [newOid]: moved }, zones: { ...s.zones, [deckId]: { ...deck, contents: [newOid, ...deck.contents] } } }
  }
         
  return { ok: true, state: { ...s, mulliganQueue: (s.mulliganQueue ?? []).slice(1) } }
}
