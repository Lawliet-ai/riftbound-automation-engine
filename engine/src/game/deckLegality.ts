                                                             
  
                                      
                                                         
                                     
                                                      
                                                      
                                                  
                                                        
                                              
                                             
                                             
                                  
                                                              
                                                    
                                                          
                                        
                                           
  
                                                              
                                        
                                       
                                                          
                                                   
                                                     
                                       
                                                      
  
                                   
                                                            
                                                        
  
                                            
                                               
  
                                                 
                                              

                                     
export interface CardFacts {
                                             
  readonly name: string
                      
  readonly solitary?: boolean
     
                                                        
                                                   
    
                                                 
                                                             
                                                            
     
  readonly anyNumber?: boolean
                          
  readonly exclusive?: boolean
                                      
  readonly heroTag?: string
                                        
  readonly heroUnit?: boolean
     
                                                 
                                  
     
  readonly domains?: readonly string[]
     
                                                                              
    
                                                      
                                
                                                     
                                                        
     
  readonly kind?: string
}

export interface DeckToCheck {
  readonly mainDeck: readonly string[]
  readonly battlefields: readonly string[]
  readonly legend?: string
  readonly hero?: string
     
                                                  
                                        
                                              
     
  readonly runeDeck?: readonly string[]
     
                                                                
                                     
    
                                                       
                                                
                                                           
                                                
                                                    
     
  readonly side?: readonly string[]
}

export interface DeckViolation {
  readonly rule: string
  readonly detail: string
     
                                                  
                                                
                                                        
     
  readonly subject?: string
     
                                        
                                         
                                         
     
  readonly excess?: number
}

export const MIN_MAIN_DECK = 40          
export const MAX_SAME_NAME = 3            
export const MAX_EXCLUSIVE = 3              
export const RUNE_DECK_SIZE = 12            
                                                     
export const MAX_SIDE_DECK = 10
   
                                                       
                                           
                                            
                                                        
   
export const SIDE_FORBIDDEN_KINDS: ReadonlySet<string> = new Set(['battlefield', 'legend', 'rune'])
                          
const KIND_LABEL: Readonly<Record<string, string>> = { battlefield: '战场', legend: '传奇', rune: '符文' }
   
                                                       
                                                    
                                                 
   
export const BATTLEFIELDS_1V1 = 3

   
                       
                                       
                             
   
export interface LegalityOptions {
                                                         
  readonly battlefieldCount?: number | null
}

export function checkDeckLegality(
  deck: DeckToCheck,
  facts: (defId: string) => CardFacts | undefined,
  options: LegalityOptions = {},
): readonly DeckViolation[] {
  const out: DeckViolation[] = []
  const nameOf = (id: string): string => facts(id)?.name ?? id

                                            
  if (deck.mainDeck.length < MIN_MAIN_DECK) {
    out.push({ rule: '§103.2', detail: `主牌堆只有 ${deck.mainDeck.length} 张,至少需要 ${MIN_MAIN_DECK} 张`, excess: MIN_MAIN_DECK - deck.mainDeck.length })
  }

     
                                 
                                                           
                                                  
    
                                                
                                                            
                                                
                                                       
                                         
     
  const mainAndSide = deck.side === undefined ? deck.mainDeck : [...deck.mainDeck, ...deck.side]

                                  
                                                         
                                                
                                                           
                                                      
                                  
                                                              
                                                            
                                                             
                                                     
  const heroExtra = deck.hero !== undefined && !deck.mainDeck.includes(deck.hero) ? [deck.hero] : []
  const byName = new Map<string, number>()
                                                
  const anyNumberNames = new Set<string>()
  for (const id of [...mainAndSide, ...heroExtra]) {
    const n = nameOf(id)
    byName.set(n, (byName.get(n) ?? 0) + 1)
    if (facts(id)?.anyNumber === true) anyNumberNames.add(n)
  }
  for (const [name, count] of byName) {
                              
    const isSolitary = [...mainAndSide, ...heroExtra].some((id) => nameOf(id) === name && facts(id)?.solitary === true)
    if (isSolitary && count > 1) {
      out.push({ rule: '§825.3.a', detail: `〈${name}〉带[唯我],每副卡组只能包含一张,现有 ${count} 张`, subject: name, excess: count - 1 })
      continue                 
    }
                                                             
                                                   
    if (anyNumberNames.has(name)) continue
    if (count > MAX_SAME_NAME) {
      out.push({ rule: '§103.2.b', detail: `〈${name}〉有 ${count} 张,同名最多 ${MAX_SAME_NAME} 张`, subject: name, excess: count - MAX_SAME_NAME })
    }
  }

                               
  const exclusives = deck.mainDeck.filter((id) => facts(id)?.exclusive === true)
  if (exclusives.length > MAX_EXCLUSIVE) {
    out.push({ rule: '§103.2.d.1', detail: `专属卡共 ${exclusives.length} 张,总数最多 ${MAX_EXCLUSIVE} 张(不论名称)`, excess: exclusives.length - MAX_EXCLUSIVE })
  }

                               
  const legendTag = deck.legend ? facts(deck.legend)?.heroTag : undefined
                                                        
                                                    
  const reportedExclusiveTag = new Set<string>()
  for (const id of exclusives) {
    const tag = facts(id)?.heroTag
    if (legendTag && tag !== legendTag && !reportedExclusiveTag.has(nameOf(id))) {
      reportedExclusiveTag.add(nameOf(id))
      out.push({ rule: '§103.2.d.2', detail: `专属卡〈${nameOf(id)}〉的英雄标签(${tag ?? '无'})与传奇(${legendTag})不一致`, subject: nameOf(id) })
    }
  }

                                       
  if (deck.hero) {
    const h = facts(deck.hero)
    if (h && h.heroUnit !== true) {
      out.push({ rule: '§103.2.a.2', detail: `选定英雄〈${nameOf(deck.hero)}〉不是英雄单位` })
    } else if (h && legendTag && h.heroTag !== legendTag) {
      out.push({ rule: '§103.2.a.2', detail: `选定英雄〈${nameOf(deck.hero)}〉的英雄标签(${h.heroTag ?? '无'})与传奇(${legendTag})不一致` })
    }
  }

                      
  const bfNames = new Map<string, number>()
  for (const id of deck.battlefields) {
    const n = nameOf(id)
    bfNames.set(n, (bfNames.get(n) ?? 0) + 1)
  }
  for (const [name, count] of bfNames) {
    if (count > 1) out.push({ rule: '§103.4.c', detail: `战场〈${name}〉出现 ${count} 次,不得包含一个以上的同名战场`, subject: name, excess: count - 1 })
  }

                                        
                                                     
  const legendDomains = deck.legend ? (facts(deck.legend)?.domains ?? []) : undefined
  const withinIdentity = (id: string): boolean => {
    if (!legendDomains || legendDomains.length === 0) return true
    const d = facts(id)?.domains ?? []
    return d.length === 0 || d.every((x) => legendDomains.includes(x))               
  }
  if (legendDomains && legendDomains.length > 0) {
                           
                                                      
                                          
                                               
                                                                           
    const offenders = new Set(mainAndSide.filter((id) => !withinIdentity(id)).map(nameOf))
    for (const name of offenders) {
      out.push({
        rule: '§103.2.c',
        detail: `〈${name}〉的特性不在卡组符文特性(${legendDomains.join('/')})之内`,
        subject: name,
      })
    }
  }

  if (deck.runeDeck !== undefined) {
                         
    if (deck.runeDeck.length !== RUNE_DECK_SIZE) {
      out.push({
        rule: '§103.3.a',
        detail: `符文牌堆有 ${deck.runeDeck.length} 张,须为 ${RUNE_DECK_SIZE} 张`,
        excess: Math.abs(deck.runeDeck.length - RUNE_DECK_SIZE),
      })
    }
                              
    if (legendDomains && legendDomains.length > 0) {
      const bad = new Set(deck.runeDeck.filter((id) => !withinIdentity(id)).map(nameOf))
      for (const name of bad) {
        out.push({
          rule: '§103.3.a.1',
          detail: `符文〈${name}〉不符合传奇的符文特性(${legendDomains.join('/')})`,
          subject: name,
        })
      }
    }
  }

                                              
                                                                 
  if (deck.side !== undefined) {
                                         
    if (deck.side.length > MAX_SIDE_DECK) {
      out.push({
        rule: '§601.1.c.1', // 赛规
        detail: `备牌有 ${deck.side.length} 张,最多 ${MAX_SIDE_DECK} 张`,
        excess: deck.side.length - MAX_SIDE_DECK,
      })
    }
                                        
                                            
    const wrongKind = new Map<string, string>()           
    for (const id of deck.side) {
      const k = facts(id)?.kind
      if (k !== undefined && SIDE_FORBIDDEN_KINDS.has(k)) wrongKind.set(nameOf(id), k)
    }
    for (const [name, k] of wrongKind) {
      out.push({
        rule: '§601.1.c.2', // 赛规
        detail: `备牌里的〈${name}〉是${KIND_LABEL[k] ?? k}牌,备牌中仅可包含主牌堆内也有效的卡牌`,
        subject: name,
      })
    }
  }

                                                                
  const wantBf = options.battlefieldCount === undefined ? BATTLEFIELDS_1V1 : options.battlefieldCount
  if (wantBf !== null && deck.battlefields.length !== wantBf) {
    out.push({
      rule: '§485.4.a',
      detail: `战场有 ${deck.battlefields.length} 张,本模式须为 ${wantBf} 张`,
      excess: Math.abs(deck.battlefields.length - wantBf),
    })
  }

  return out
}
