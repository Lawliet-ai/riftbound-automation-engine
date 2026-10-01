                                                     
  
                                      
                                     
                                                    
                                               
                                                 
                                                        
                                                
                                                
                                     
                                                         
                         
                         
                                               
                                 
                                                        
                                                    
                                                          
  
                                               
                                             
                                
                                                        
  
                                                      
                                         

import type { Cost, Pip } from '../state/runePool'
import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'

   
                                     
                                                                  
                                                      
                                                            
                                                     
   
export type CostPart = 'mana' | 'pips' | 'total' | 'extra'

export interface CostMod {
                                                                        
                                                                        
                                              
  readonly kind: 'reduce' | 'increase' | 'zero' | 'replace'
                                                             
  readonly part: CostPart
                                 
  readonly mana?: number
                                                      
  readonly pips?: number
     
                                                                              
                                                          
                                                
                                                   
                                              
                                                
     
  readonly pipColors?: readonly string[]
     
                                             
                          
     
  readonly floor?: number
                                
  readonly source?: string
     
                                                             
                                               
                                                                         
                                            
                                           
     
  readonly alt?: Omit<CostMod, 'alt'>
                                                      
  readonly replaceWith?: Cost
}

const manaOf = (c: Cost): number => c.mana ?? 0
const pipsOf = (c: Cost): readonly Pip[] => c.pips ?? []

                                                       
function reduceWithFloor(current: number, amount: number, floor: number | undefined): number {
  const target = current - amount
  if (floor === undefined) return Math.max(0, target)         
  return current <= floor ? current : Math.max(floor, target)
}

   
                         
  
                                                 
                                           
                              
  
                                                               
   
export function computeCost(printed: Cost, mods: readonly CostMod[] = []): Cost {
  let mana = manaOf(printed)
  let pips = [...pipsOf(printed)]

                                                                
                                           
  const rep = mods.find((m) => m.kind === 'replace')
  if (rep?.replaceWith) {
    mana = manaOf(rep.replaceWith)
    pips = [...pipsOf(rep.replaceWith)]
  }

                                  
  for (const m of mods) {
    if (m.kind !== 'zero') continue
    if (m.part === 'mana' || m.part === 'total') mana = 0
    if (m.part === 'pips' || m.part === 'total') pips = []
  }

                      
  for (const m of mods) {
    if (m.kind !== 'increase') continue
    if (m.part !== 'pips') mana += m.mana ?? 0
                                                 
                                                                 
    for (let i = 0; i < (m.pips ?? 0); i++) pips.push([...(m.pipColors ?? [])])
  }

                                   
                                                                       
                                                          
                                                                      
  for (const m of mods) {
    if (m.kind !== 'reduce' || m.part === 'total') continue
    if (m.part === 'mana') mana = reduceWithFloor(mana, m.mana ?? 0, m.floor)
    if (m.part === 'pips') pips = pips.slice(0, Math.max(m.floor ?? 0, pips.length - (m.pips ?? 0)))
  }

                                        
  for (const m of mods) {
    if (m.kind !== 'reduce' || m.part !== 'total') continue
                                            
    if ((m.mana ?? 0) > 0) mana = reduceWithFloor(mana, m.mana ?? 0, m.floor)
    if ((m.pips ?? 0) > 0) pips = pips.slice(0, Math.max(m.floor ?? 0, pips.length - (m.pips ?? 0)))
  }

  return pips.length > 0 ? { mana, pips } : { mana }
}

                                                                   
export type CostModSource = (defId: string) => readonly CostMod[]

                                                                   
                                                                     
                                                           
                                                                

   
                                   
  
                                        
                                      
                                             
   
export function consumeNextSpellDiscount(state: GameState, player: PlayerId): GameState {
  const cur = state.nextSpellDiscountThisTurn
  if (!cur || !(cur[player] ?? 0)) return state
  return { ...state, nextSpellDiscountThisTurn: { ...cur, [player]: 0 } }
}

   
                                                
                                              
                                             
                                     
                          
   
export function consumeNextCardDiscount(state: GameState, player: PlayerId): GameState {
  const cur = state.nextCardDiscountThisTurn
  if (!cur || !(cur[player] ?? 0)) return state
  return { ...state, nextCardDiscountThisTurn: { ...cur, [player]: 0 } }
}

   
                                           
  
                                                   
                                                
                          
   
   
                                                       
                                                          
                                                                
                                                         
                                                               
                                                     
   
let echoGrantProvider: ((state: GameState, player: string) => readonly Cost[]) | null = null
export function setSpellEchoGrantProvider(p: (state: GameState, player: string) => readonly Cost[]): void {
  echoGrantProvider = p
}
export function passiveEchoGrants(state: GameState, player: string): readonly Cost[] {
  return echoGrantProvider === null ? [] : echoGrantProvider(state, player)
}

export function consumeNextSpellEcho(state: GameState, player: PlayerId): GameState {
  const cur = state.nextSpellEchoThisTurn
  if (!cur || !(cur[player] ?? 0)) return state
  return { ...state, nextSpellEchoThisTurn: { ...cur, [player]: 0 } }
}

   
                                               
  
                                                    
                                                  
                                    
   
export function consumePlayFromDiscardGrant(state: GameState, player: PlayerId, defId: string): GameState {
  const all = state.playFromDiscardGrants
  const left = all?.[player]?.[defId] ?? 0
  if (left <= 0) return state
  return { ...state, playFromDiscardGrants: {
    ...all, [player]: { ...all![player], [defId]: left - 1 } } }
}


                                                                   
                                                 
                                                  
  
                                                     
                                      
                                                             
                                                                      
                                               

                                                       
export const MAX_COST_CHOICE_MODS = 3

                         
export function countCostChoices(mods: readonly CostMod[]): number {
  return mods.filter((m) => m.alt !== undefined).length
}

   
                                               
                                                       
                                                             
   
export function costChoiceVariants(mods: readonly CostMod[]): readonly string[] {
  const n = countCostChoices(mods)
  if (n === 0) return ['']
  if (n > MAX_COST_CHOICE_MODS) return ['0', String((1 << n) - 1)]
  return Array.from({ length: 1 << n }, (_, i) => String(i))
}

                                              
export function resolveCostChoices(mods: readonly CostMod[], choice?: string): readonly CostMod[] {
  const mask = choice === undefined || choice === '' ? 0 : Number(choice)
  if (!Number.isInteger(mask) || mask < 0) return mods.map(stripAlt)                        
  let k = 0
  return mods.map((m) => {
    if (m.alt === undefined) return m
    const pick = (mask >> k++) & 1
    return pick === 1 ? { ...m.alt } : stripAlt(m)
  })
}

const stripAlt = (m: CostMod): CostMod => {
  if (m.alt === undefined) return m
  const { alt: _alt, ...rest } = m
  return rest
}


                                                              
                                    
                                           
                                               
                                                       

                                                             
export function reduceExtraCost(extra: Cost, mods: readonly CostMod[]): Cost {
  let mana = manaOf(extra)
  let pips = [...pipsOf(extra)]
  for (const m of mods) {
    if (m.kind !== 'reduce' || m.part !== 'extra') continue
    if ((m.mana ?? 0) > 0) mana = reduceWithFloor(mana, m.mana ?? 0, m.floor)
    if ((m.pips ?? 0) > 0) pips = pips.slice(0, Math.max(m.floor ?? 0, pips.length - (m.pips ?? 0)))
  }
  return pips.length > 0 ? { mana, pips } : { mana }
}
