                                                
  
                      
                                                 
                                                   
  
                                    
                                                              
                                   
                                           
                                        
  
                                                      
                                                        
                                         
                                                      
                                                 
                                             
                                            

import { checkDeckLegality, type CardFacts, type DeckToCheck, type DeckViolation, type LegalityOptions, MIN_MAIN_DECK } from './deckLegality'
import type { Deck } from './setup'

export type FactsLookup = (defId: string) => CardFacts | undefined

                                        
export interface DeckDraft {
  readonly mainDeck: readonly string[]
  readonly battlefields: readonly string[]
  readonly legend?: string
  readonly hero?: string
                                                            
  readonly runeDeck?: readonly string[]
     
                                                               
                                                        
     
  readonly side?: readonly string[]
}

export const emptyDraft = (): DeckDraft => ({ mainDeck: [], battlefields: [] })

const toCheck = (d: DeckDraft): DeckToCheck => ({
  mainDeck: d.mainDeck,
  battlefields: d.battlefields,
  ...(d.legend !== undefined ? { legend: d.legend } : {}),
  ...(d.hero !== undefined ? { hero: d.hero } : {}),
  ...(d.runeDeck !== undefined ? { runeDeck: d.runeDeck } : {}),
                                                                   
                                                           
  ...(d.side !== undefined ? { side: d.side } : {}),
})

                                                        
const keyOf = (v: DeckViolation): string => `${v.rule}|${v.subject ?? ''}`

   
                                            
  
                                                
                                           
                                       
                                                         
   
function worsened(before: readonly DeckViolation[], after: readonly DeckViolation[]): DeckViolation[] {
  const prev = new Map<string, number>()
  for (const v of before) {
    const k = keyOf(v)
    prev.set(k, Math.max(prev.get(k) ?? 0, v.excess ?? 0))
  }
  const out: DeckViolation[] = []
  for (const v of after) {
    const k = keyOf(v)
    if (!prev.has(k)) { out.push(v); continue }           
    if ((v.excess ?? 0) > (prev.get(k) ?? 0)) out.push(v)              
  }
  return out
}

export interface AddCheck {
  readonly ok: boolean
                                          
  readonly blockedBy: readonly DeckViolation[]
}

   
                
                                               
   
export function canAddToMain(draft: DeckDraft, defId: string, facts: FactsLookup): AddCheck {
  const before = checkDeckLegality(toCheck(draft), facts)
  const after = checkDeckLegality(toCheck({ ...draft, mainDeck: [...draft.mainDeck, defId] }), facts)
  const blockedBy = worsened(before, after)
  return { ok: blockedBy.length === 0, blockedBy }
}

                               
export function canAddBattlefield(draft: DeckDraft, defId: string, facts: FactsLookup): AddCheck {
  const before = checkDeckLegality(toCheck(draft), facts)
  const after = checkDeckLegality(toCheck({ ...draft, battlefields: [...draft.battlefields, defId] }), facts)
  const blockedBy = worsened(before, after)
  return { ok: blockedBy.length === 0, blockedBy }
}

export const addToMain = (d: DeckDraft, defId: string): DeckDraft => ({ ...d, mainDeck: [...d.mainDeck, defId] })

   
                                                          
  
                                                      
                                                
                                              
  
                                                                              
                                                           
                                          
                                     
                                                         
                                                                                   
                                                    
   
export function canAddRune(draft: DeckDraft, defId: string, facts: FactsLookup): AddCheck {
  const base: DeckDraft = { ...draft, runeDeck: draft.runeDeck ?? [] }
  const before = checkDeckLegality(toCheck(base), facts)
  const after = checkDeckLegality(toCheck({ ...base, runeDeck: [...(base.runeDeck ?? []), defId] }), facts)
  const blockedBy = worsened(before, after)
  return { ok: blockedBy.length === 0, blockedBy }
}

                                                                     
export const addToRune = (d: DeckDraft, defId: string): DeckDraft => ({ ...d, runeDeck: [...(d.runeDeck ?? []), defId] })

                                                              
export function removeFromRune(d: DeckDraft, defId: string): DeckDraft {
  const runes = d.runeDeck
  if (runes === undefined) return d
  const i = runes.indexOf(defId)
  if (i < 0) return d
  return { ...d, runeDeck: [...runes.slice(0, i), ...runes.slice(i + 1)] }
}

                              
export function runeEntries(d: DeckDraft, facts: FactsLookup): readonly DraftEntry[] {
  return draftEntries({ ...d, mainDeck: d.runeDeck ?? [] }, facts)
}

                                                     
export function battlefieldEntries(d: DeckDraft, facts: FactsLookup): readonly DraftEntry[] {
  return draftEntries({ ...d, mainDeck: d.battlefields }, facts)
}

                                
export function removeBattlefield(d: DeckDraft, defId: string): DeckDraft {
  const i = d.battlefields.indexOf(defId)
  if (i < 0) return d
  return { ...d, battlefields: [...d.battlefields.slice(0, i), ...d.battlefields.slice(i + 1)] }
}

   
                                                          
                                                       
                                                      
                                                   
                                                                
   
export const addToSide = (d: DeckDraft, defId: string): DeckDraft => ({ ...d, side: [...(d.side ?? []), defId] })

                                
export function removeFromSide(d: DeckDraft, defId: string): DeckDraft {
  const side = d.side
  if (side === undefined) return d
  const i = side.indexOf(defId)
  if (i < 0) return d
  return { ...d, side: [...side.slice(0, i), ...side.slice(i + 1)] }
}

   
                                                     
                                                 
   
export function canAddToSide(draft: DeckDraft, defId: string, facts: FactsLookup): AddCheck {
  const before = checkDeckLegality(toCheck(draft), facts)
  const after = checkDeckLegality(toCheck({ ...draft, side: [...(draft.side ?? []), defId] }), facts)
  const blockedBy = worsened(before, after)
  return { ok: blockedBy.length === 0, blockedBy }
}

                                   
export function sideEntries(d: DeckDraft, facts: FactsLookup): readonly DraftEntry[] {
  return draftEntries({ ...d, mainDeck: d.side ?? [] }, facts)
}

                                   
export function removeFromMain(d: DeckDraft, defId: string): DeckDraft {
  const i = d.mainDeck.indexOf(defId)
  if (i < 0) return d
  return { ...d, mainDeck: [...d.mainDeck.slice(0, i), ...d.mainDeck.slice(i + 1)] }
}

export interface DraftEntry {
  readonly defId: string
  readonly name: string
  readonly count: number
}

   
                                      
                                          
                                       
   
export function draftEntries(d: DeckDraft, facts: FactsLookup): readonly DraftEntry[] {
  const byName = new Map<string, DraftEntry>()
  for (const id of d.mainDeck) {
    const name = facts(id)?.name ?? id
    const cur = byName.get(name)
    byName.set(name, cur ? { ...cur, count: cur.count + 1 } : { defId: id, name, count: 1 })
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
}

export interface DraftSummary {
  readonly total: number
                                     
  readonly needed: number
  readonly violations: readonly DeckViolation[]
                     
  readonly legal: boolean
}

export function draftSummary(d: DeckDraft, facts: FactsLookup): DraftSummary {
  const violations = checkDeckLegality(toCheck(d), facts)
  return {
    total: d.mainDeck.length,
    needed: Math.max(0, MIN_MAIN_DECK - d.mainDeck.length),
    violations,
    legal: violations.length === 0,
  }
}

export type ToDeckResult =
  | { readonly ok: true; readonly deck: Deck }
  | { readonly ok: false; readonly violations: readonly DeckViolation[] }

   
                                         
                                      
  
                                           
                                                     
                                                                     
                                  
                                                              
                                              
                                                            
                                            
   
export function draftToDeck(
  d: DeckDraft,
  facts: FactsLookup,
  name: string,
  options?: LegalityOptions,
): ToDeckResult {
  const violations = checkDeckLegality(toCheck(d), facts, options)
  if (violations.length > 0) return { ok: false, violations }
  return {
    ok: true,
    deck: {
      name,
      mainDeck: [...d.mainDeck],
      runeDeck: [...(d.runeDeck ?? [])],
      battlefields: [...d.battlefields],
      ...(d.legend !== undefined ? { legend: d.legend } : {}),
      ...(d.hero !== undefined ? { hero: d.hero } : {}),
    },
  }
}

                                                  
export interface CurveBucket {
  readonly cost: number
  readonly count: number
}

export interface CostCurve {
  readonly buckets: readonly CurveBucket[]
     
              
                                              
                                                    
                                       
     
  readonly unknown: number
                                    
  readonly total: number
}

export const CURVE_MAX = 7

   
                                         
                                                            
   
export function costCurve(d: DeckDraft, energyOf: (defId: string) => number | undefined): CostCurve {
  const counts = new Map<number, number>()
  let unknown = 0
  for (const id of d.mainDeck) {
    const e = energyOf(id)
    if (e === undefined) { unknown++; continue }
    const k = Math.min(Math.max(0, e), CURVE_MAX)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const buckets: CurveBucket[] = []
  for (let c = 0; c <= CURVE_MAX; c++) buckets.push({ cost: c, count: counts.get(c) ?? 0 })
  return { buckets, unknown, total: d.mainDeck.length }
}
