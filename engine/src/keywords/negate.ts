                                                
                                                          
                                                                   
                                          

import type { GameState } from '../state/gameState'
import { banishInState } from '../actions/banish'
import type { ZoneId } from '../state/ids'
import { dropItemChoices, removeItem } from '../loop/chain'
import { moveObjectInState } from '../state/mutations'
import { recycleObjects } from './insight'                                     

   
                                                         
                                                               
                                                       
   
let spellGuardProvider: ((state: GameState, player: string) => boolean) | null = null
export function setSpellGuardProvider(p: (state: GameState, player: string) => boolean): void {
  spellGuardProvider = p
}
export function spellGuarded(state: GameState, player: string): boolean {
  return spellGuardProvider !== null && spellGuardProvider(state, player)
}

   
                                                   
                                  
                                                            
                               
                                                       
                                                    
                                                    
                                                    
   
let unnegatableCardProvider: ((defId: string) => boolean) | null = null
export function setUnnegatableCardProvider(p: (defId: string) => boolean): void {
  unnegatableCardProvider = p
}
export function unnegatableCard(defId: string | undefined): boolean {
  return defId !== undefined && unnegatableCardProvider !== null && unnegatableCardProvider(defId)
}

export interface NegateOpts {
                                                                       
  readonly returnToHand?: boolean
}

   
                                                          
                                                     
   
export function negate(state: GameState, chainItemId: string, opts: NegateOpts = {}): GameState {
  const item = state.chain.find((i) => i.id === chainItemId)
  if (!item) return state
                                                     
                                    
  if (spellGuarded(state, item.controller as string)) return state
                                                            
                                                            
  if (item.cardOid !== undefined && unnegatableCard(state.objects[item.cardOid]?.defId)) return state
  let s: GameState = { ...state, chain: removeItem(state.chain, chainItemId) }                       
                                                                   
                                                                                
                                                                    
  s = dropItemChoices(s, item)
  const card = item.cardOid ? s.objects[item.cardOid] : undefined
  if (item.cardOid && card) {
                                                   
                                                                            
                                                                       
                                                                               
    if (item.exileOnLeave === true) {
      return banishInState(s, item.cardOid)
    }
                                                                                   
                                                                   
                                                                               
    if (item.recycleOnLeave === true) {
      return recycleObjects(s, [item.cardOid])
    }
    const dest = (opts.returnToHand ? `hand:${card.owner}` : `discard:${card.owner}`) as ZoneId                              
    s = moveObjectInState(s, item.cardOid, dest)
  }
  return s
}
