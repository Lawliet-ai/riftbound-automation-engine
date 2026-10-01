                             
  
                                           
                                        
  
          
                               
                         
                                                              
                                                        
                                                  
  
                                      
                                                     
                                                 
                                                   
                                                              
                                              
                                         
                                          
                                                            
                                                        
  
                      
                                             
                                    
                                      
                                         
                                              

import type { Deck } from './setup'
import type { CardFacts, DeckViolation, LegalityOptions } from './deckLegality'
import { decodeDeck, type DecodeOptions } from './deckCode'
import { draftToDeck } from './deckDraft'

export const CUSTOM_PREFIX = 'custom|'

   
                                      
                                                  
   
const CUSTOM_HERO_SEG = /^([A-Za-z0-9][A-Za-z0-9_-]*)\|/

   
                                
                                               
                                         
   
export function encodeCustomPick(text: string, hero?: string): string {
  return hero ? `${CUSTOM_PREFIX}${hero}|${text}` : `${CUSTOM_PREFIX}${text}`
}

export type PickResult =
  | { readonly ok: true; readonly deck: Deck }
  | { readonly ok: false; readonly reason: string; readonly violations?: readonly DeckViolation[] }

export interface PickDeps {
                          
  readonly known: Readonly<Record<string, Deck>>
                     
  readonly fallback: Deck
                        
  readonly facts: (defId: string) => CardFacts | undefined
                                              
  readonly heroOk?: (legend: string | undefined, hero: string) => boolean
  readonly options?: LegalityOptions
                                                 
  readonly decode?: DecodeOptions
}

                                                           
function withHero(deck: Deck, hero: string | undefined, deps: PickDeps): Deck {
  if (!hero || hero === deck.hero) return deck
  if (!deck.mainDeck.includes(hero)) return deck                    
  if (!deps.heroOk?.(deck.legend, hero)) return deck
  return { ...deck, hero }
}

export function resolveDeckPick(pick: string | undefined, deps: PickDeps): PickResult {
  if (!pick) return { ok: true, deck: deps.fallback }

  if (pick.startsWith(CUSTOM_PREFIX)) {
    const body = pick.slice(CUSTOM_PREFIX.length)
    const seg = CUSTOM_HERO_SEG.exec(body)
    const hero = seg?.[1]
    const text = seg ? body.slice(seg[0].length) : body
    const decoded = decodeDeck(text, deps.decode)
    if (!decoded.ok) {
      const first = decoded.errors[0]
      return { ok: false, reason: `牌表读不了:第 ${first?.line} 行 ${first?.reason ?? ''}`.trim() }
    }
                                                       
                                                                      
                                                              
                                                        
                                                    
                                            
    if (hero !== undefined && !decoded.draft.mainDeck.includes(hero)) {
      return { ok: false, reason: `选定英雄〈${hero}〉不在这副牌的主牌堆里(§103.2 它必须是那 40 张中的一张)` }
    }
    const draft = hero !== undefined ? { ...decoded.draft, hero } : decoded.draft
                                   
    const built = draftToDeck(draft, deps.facts, decoded.name ?? '自定义牌组', deps.options)
    if (!built.ok) {
      return { ok: false, reason: '这副牌不符合构筑规则', violations: built.violations }
    }
    return { ok: true, deck: built.deck }
  }

  const [deckId, hero] = pick.split('|')
  const base = (deckId ? deps.known[deckId] : undefined) ?? deps.fallback
  return { ok: true, deck: withHero(base, hero, deps) }
}
