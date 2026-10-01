                                          
                                             
                     
                                                             
                                               

   
                                            
                                                                                      
                                                
   
export interface RestrictedGrant {
  readonly mana: number
  readonly energy: Readonly<Record<string, number>>
  readonly purposes: readonly string[]
}

export interface RunePool {
                  
  readonly mana: number
                                              
  readonly duelMana?: number
                       
  readonly runes: Readonly<Record<string, number>>
     
                                                    
                                                              
                                                         
     
  readonly restricted?: readonly RestrictedGrant[]
}

   
                                             
  
                                   
                                                              
                                                             
                                               
   
export function addCosts(base: Cost, extra: Cost): Cost {
  const pips = [...(base.pips ?? []), ...(extra.pips ?? [])]
  const merged: Cost = { mana: (base.mana ?? 0) + (extra.mana ?? 0) }
  return pips.length > 0 ? { ...merged, pips } : merged
}

export function emptyRunePool(): RunePool {
  return { mana: 0, runes: {} }
}

                                       
export function clearRunePool(_pool: RunePool): RunePool {
  return emptyRunePool()
}

                                               
export function clearRunePoolAtMainPhaseStart(pool: RunePool): RunePool {
  return clearRunePool(pool)
}

                                    
export function clearRunePoolAtEndStep(pool: RunePool): RunePool {
  return clearRunePool(pool)
}

export function addMana(pool: RunePool, amount: number): RunePool {
  return { ...pool, mana: pool.mana + amount }
}

export function addRune(pool: RunePool, characteristic: string, amount: number): RunePool {
  return {
    ...pool,
    runes: { ...pool.runes, [characteristic]: (pool.runes[characteristic] ?? 0) + amount },
  }
}

export function isEmpty(pool: RunePool): boolean {
  return pool.mana === 0 && Object.values(pool.runes).every((v) => v === 0)
}

   
                                             
                                                             
                                                                       
   
export type Pip = readonly string[]

                                                                         
export interface Cost {
  readonly mana?: number
  readonly pips?: readonly Pip[]
}

   
                                    
                                    
                                                           
                                        
                                                  
                                              
                                            
   
export interface Capacity {
  readonly mana: number
  readonly energy: Readonly<Record<string, number>>
  readonly runes: Readonly<Record<string, number>>
  readonly activeRunes: number
}

                                            
export interface PaymentPlan {
                          
  readonly energyUsed: Readonly<Record<string, number>>
                                                   
  readonly runesRecycled: Readonly<Record<string, number>>
                                                               
  readonly runesTapped: number
                     
  readonly manaFromPool: number
}

                                                       
export const ANY_DOMAIN = '*'

const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] ?? 0) + 1 }

   
                                                   
                                                   
                                              
                                                  
   
export function solvePayment(cap: Capacity, cost: Cost): PaymentPlan | null {
  const pips = [...(cost.pips ?? [])]
  const manaNeed = cost.mana ?? 0
                      
  if (cap.mana + cap.activeRunes < manaNeed) return null
  const energy = { ...cap.energy }
  const runes = { ...cap.runes }
  const allDomains = (): string[] => [...new Set([...Object.keys(energy), ...Object.keys(runes)])]
                           
  pips.sort((a, b) => (a.length || 99) - (b.length || 99))

  const energyUsed: Record<string, number> = {}
  const runesRecycled: Record<string, number> = {}

  const dfs = (i: number): boolean => {
    if (i >= pips.length) return true
    const allowed = pips[i]!.length > 0 ? pips[i]! : allDomains()             
                                                           
    const cands = [...allowed, ANY_DOMAIN]
                                     
                                          
                                                  
                                            
                                    
                                                   
    for (const d of cands) {
      if ((energy[d] ?? 0) > 0) {
        energy[d]!--; inc(energyUsed, d)
        if (dfs(i + 1)) return true
        energy[d]!++; energyUsed[d]!--
      }
    }
    for (const d of cands) {
      if ((runes[d] ?? 0) > 0) {
        runes[d]!--; inc(runesRecycled, d)
        if (dfs(i + 1)) return true
        runes[d]!++; runesRecycled[d]!--
      }
    }
    return false
  }
  if (!dfs(0)) return null

  const manaFromPool = Math.min(cap.mana, manaNeed)
  return { energyUsed, runesRecycled, runesTapped: manaNeed - manaFromPool, manaFromPool }
}

                     
export function canPay(cap: Capacity, cost: Cost): boolean {
  return solvePayment(cap, cost) !== null
}

   
                             
                                                             
                                                     
                                                
  
                                                     
                                      
                                                             
                                                                            
                                            
   
export interface PaymentPick {
                                       
  readonly energyUsed?: Readonly<Record<string, number>>
                                               
  readonly runesRecycled?: Readonly<Record<string, number>>
                                                     
  readonly runesTapped?: number
                                     
  readonly manaFromPool?: number
                                                      
  readonly recycleOids?: readonly string[]
                                                         
  readonly tapOids?: readonly string[]
}

const cleanCounts = (m?: Readonly<Record<string, number>>): Record<string, number> | null => {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(m ?? {})) {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return null
    if (v > 0) out[k] = v
  }
  return out
}

const sumOf = (m: Readonly<Record<string, number>>): number =>
  Object.values(m).reduce((a, b) => a + b, 0)

   
                                       
                                                                
  
                                                        
                                           
                                                
                                                       
                                             
                                                        
   
export function validatePayment(cap: Capacity, cost: Cost, pick: PaymentPick): PaymentPlan | null {
  const energyUsed = cleanCounts(pick.energyUsed)
  const runesRecycled = cleanCounts(pick.runesRecycled)
  if (!energyUsed || !runesRecycled) return null
  const manaNeed = cost.mana ?? 0
  const manaFromPool = pick.manaFromPool ?? Math.min(cap.mana, manaNeed)
  const runesTapped = pick.runesTapped ?? manaNeed - manaFromPool
  if (!Number.isInteger(manaFromPool) || manaFromPool < 0) return null
  if (!Number.isInteger(runesTapped) || runesTapped < 0) return null
                
                                                            
                                        
                                                                 
                                                               
                                                                                     
  if (manaFromPool + runesTapped !== manaNeed) return null
         
  if (manaFromPool > cap.mana || runesTapped > cap.activeRunes) return null
  for (const [d, n] of Object.entries(energyUsed)) if (n > (cap.energy[d] ?? 0)) return null
  for (const [d, n] of Object.entries(runesRecycled)) {
    if (d === ANY_DOMAIN) return null                         
    if (n > (cap.runes[d] ?? 0)) return null
  }
                       
  const pips = [...(cost.pips ?? [])]
  if (sumOf(energyUsed) + sumOf(runesRecycled) !== pips.length) return null
  const supply: Record<string, number> = {}
  for (const [d, n] of Object.entries(energyUsed)) supply[d] = (supply[d] ?? 0) + n
  for (const [d, n] of Object.entries(runesRecycled)) supply[d] = (supply[d] ?? 0) + n
  pips.sort((a, b) => (a.length || 99) - (b.length || 99))                    
  const dfs = (i: number): boolean => {
    if (i >= pips.length) return true
    const allowed = pips[i]!.length > 0 ? pips[i]! : Object.keys(supply)              
    for (const d of [...new Set([...allowed, ANY_DOMAIN])]) {
      if ((supply[d] ?? 0) > 0) {
        supply[d]!--
        if (dfs(i + 1)) return true
        supply[d]!++
      }
    }
    return false
  }
                             
  if (!dfs(0)) return null
  return { energyUsed, runesRecycled, runesTapped, manaFromPool }
}
