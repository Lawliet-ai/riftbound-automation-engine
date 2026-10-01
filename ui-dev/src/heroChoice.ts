                              
  
                                      
                                                        
                                            
                                           
                                                            
                                                    
                                                   
                                                      
  
                                                  
                                       

import { CARD_POOL, type PoolCard } from './data/cardPool'

export interface HeroOption {
  readonly no: string
  readonly card: PoolCard
                                            
  readonly playable: boolean
}

                                         
export function legendHeroTag(legendNo: string | undefined): string {
  if (!legendNo) return ''
  return CARD_POOL[legendNo]?.hero ?? ''
}

   
                                             
                                
   
export function heroChoices(mainDeck: readonly string[], legendNo: string | undefined): readonly HeroOption[] {
  const tag = legendHeroTag(legendNo)
  if (!tag) return []
  const seen = new Set<string>()
  const out: HeroOption[] = []
  for (const no of mainDeck) {
    if (seen.has(no)) continue
    const c = CARD_POOL[no]
    if (!c || c.type !== '英雄单位' || c.hero !== tag) continue
    seen.add(no)
    out.push({ no, card: c, playable: c.playable })
  }
  return out.sort((a, b) => (Number(b.playable) - Number(a.playable)) || a.no.localeCompare(b.no))
}

                                            
export function fullName(c: PoolCard): string {
  return c.sub ? `${c.name} · ${c.sub}` : c.name
}
