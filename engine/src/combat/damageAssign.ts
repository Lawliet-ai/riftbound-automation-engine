                                  
                                                                    
                                                             
                                                                  

import type { ObjId, PlayerId } from '../state/ids'

export interface DamageTarget {
  readonly oid: ObjId
                                            
  readonly lethalNeeded: number
                              
  readonly barrier?: boolean
                               
  readonly backline?: boolean
                                      
  readonly immune?: boolean
}

function priority(t: DamageTarget, answered: readonly string[] = []): number {
                                                                   
                                                             
  if (t.barrier && t.backline) return answered.includes(flexLastId(t.oid)) ? 2 : 0
  return t.barrier ? 0 : t.backline ? 2 : 1                            
}

   
                                                                  
                                                              
                                                                          
                             
   
export const FLEX_LAST_SUFFIX = '@后'
export const flexLastId = (oid: string): string => `${oid}${FLEX_LAST_SUFFIX}`
const isFlex = (t: DamageTarget): boolean => t.barrier === true && t.backline === true
const flexDecided = (t: DamageTarget, answered: readonly string[]): boolean =>
  answered.includes(String(t.oid)) || answered.includes(flexLastId(t.oid))

                                                         
                                               
                                         
                                            
                                           
                                           
                                          
                                                                 
                                                
                                                         
                                                                     
                                      

   
                                      
                                                               
                                                          
   

   
                                  
                                                     
                                                                  
                             
   
export function damageOrderKey(battlefield: string, assigner: PlayerId): string {
  return `§465.2.c.7:damageOrder:${battlefield}:${String(assigner)}`
}

                                                             
export const parseDamageOrder = (raw: string | undefined): readonly string[] =>
  raw === undefined || raw === '' ? [] : raw.split(',')

   
                                             
                                                        
                                     
   
export function orderTargets(targets: readonly DamageTarget[], answered: readonly string[]): readonly DamageTarget[] {
                                                                                
                                                        
                                                                    
                  
  const rank = new Map(answered.map((o, i) => [o, i]))
  return [...targets].sort((a, b) => {
    const pa = priority(a, answered), pb = priority(b, answered)
    if (pa !== pb) return pa - pb
    const ra = rank.get(String(a.oid)) ?? rank.get(flexLastId(a.oid)) ?? Number.MAX_SAFE_INTEGER
    const rb = rank.get(String(b.oid)) ?? rank.get(flexLastId(b.oid)) ?? Number.MAX_SAFE_INTEGER
    return ra - rb
  })
}

                                
export interface DamageOrderAsk {
  readonly candidates: readonly DamageTarget[]
                                                     
  readonly remaining: number
}

   
                                        
  
                                           
                                 
                               
                                                      
                                               
                                                
                                                
                             
   
export function pendingDamageOrder(
  total: number,
  targets: readonly DamageTarget[],
  answered: readonly string[] = [],
): DamageOrderAsk | null {
  const eligible = targets.filter((t) => !t.immune)
                                                                           
  if (total > 0 && eligible.length >= 2) {
    const flex = eligible.find((t) => isFlex(t) && !flexDecided(t, answered))
    if (flex) return { candidates: [flex, { ...flex, oid: flexLastId(flex.oid) as ObjId, barrier: false }], remaining: total }
  }
  const ordered = orderTargets(eligible, answered)
  const decided = new Set([...answered, ...answered.filter((a) => a.endsWith(FLEX_LAST_SUFFIX)).map((a) => a.slice(0, -FLEX_LAST_SUFFIX.length))])
  let remaining = total
  for (let i = 0; i < ordered.length; i++) {
    const t = ordered[i]!
    if (remaining <= 0) return null     
    if (!decided.has(String(t.oid))) {
      const p = priority(t, answered)
      const rest = ordered.slice(i).filter((x) => priority(x, answered) === p && !decided.has(String(x.oid)))
                                                               
                                                              
                                                       
                                                     
      const lethalable = rest.filter((x) => Math.max(1, x.lethalNeeded) <= remaining)
      const askable = lethalable.length > 0 ? lethalable : rest
      const needAll = rest.reduce((n, x) => n + Math.max(1, x.lethalNeeded), 0)
      if (askable.length >= 2 && remaining < needAll) return { candidates: askable, remaining }      
    }
    remaining -= Math.min(remaining, Math.max(1, t.lethalNeeded))
  }
  return null
}

export function assignDamage(
  total: number,
  targets: readonly DamageTarget[],
                                                                  
  answered: readonly string[] = [],
): Map<ObjId, number> {
  const eligible = targets.filter((t) => !t.immune)
                                                             
  const ordered = orderTargets(eligible, answered)
  const assign = new Map<ObjId, number>()
  let remaining = total
                                                             
                                                            
                                                   
                                                      
                                                                     
                                                          
                                                   
                                                          
                                                       
  const pending = [...ordered]
  while (pending.length > 0 && remaining > 0) {
    const p0 = priority(pending[0]!, answered)
    const group = pending.filter((x) => priority(x, answered) === p0)
    const lethalable = group.filter((x) => Math.max(1, x.lethalNeeded) <= remaining)
    const t = (lethalable[0] ?? group[0])!
    const need = Math.max(1, t.lethalNeeded)                   
                                                                    
                                                           
                                                          
                                                                   
                                                                     
                                                         
    const isLast = pending.length === 1
    const give = isLast ? remaining : Math.min(remaining, need)                          
    assign.set(t.oid, give)
    remaining -= give
    pending.splice(pending.indexOf(t), 1)
  }
  return assign
}
