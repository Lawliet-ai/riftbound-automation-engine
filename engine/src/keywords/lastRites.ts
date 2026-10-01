                                               
  
                                      
                                                            
                                         
                                               
                                             
                                 
                                                         
                                    
                                                        
                                       
                                                     
                                            
                                             
                                         
                                                  
                                                      
                                                
                               
                                                   
  
                                                 
                                                                     
                                                 
                       
                                                       
                                     
  
                                          
                                                            
                                                                                             
                                       
                                                                 
  
                                                   
                                                          

import { keywordSources } from '../effects/valuedKeyword'
import type { ReduceDeps } from '../loop/reduce'
import { grantsOf } from '../effects/attachmentGrants'                         
import { turnOrderRank } from '../dsl/trigger'
import type { ChainItem, ChoiceRequest } from '../loop/chain'
import type { GameEvent } from '../loop/events'
import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import { typesOf, type CardType } from '../state/cardTypes'
import type { ZoneId } from '../state/ids'
import { currentKeywords } from '../state/object'

export const LAST_RITES = '绝念'

   
                                                            
                                     
  
                                                             
                                                  
   
export type LastRitesChoiceOf = (
  snapshot: DeathSnapshot,
  itemId: string,
  state: GameState,
  chosen: Readonly<Record<string, string>>,
) => ChoiceRequest | null

   
                                                             
  
                                                         
                                                        
                                                         
                                                 
                                
   
export type LastRitesRepeats = (state: GameState, controller: PlayerId) => number

let repeatsProvider: LastRitesRepeats | null = null

                                                    
export function setLastRitesRepeatsProvider(p: LastRitesRepeats | null): void {
  repeatsProvider = p
}

                                                           
                                                           
                                                                  
                                                

   
                                
                      
   
export function lastRitesTriggerCount(keywords: readonly string[] | undefined): number {
  return (keywords ?? []).filter((k) => k === LAST_RITES).length
}

   
                                            
                             
                                               
   
export interface DeathSnapshot {
  readonly oid: ObjId
     
                                                                 
                                                                    
                                                     
     
  readonly defId: string
     
                                                             
    
                                                       
                                                          
                            
                                                 
                                                                
                                                                
                                     
     
  readonly copiedDefId?: string
     
                                     
    
                                                     
                                                                        
                                                                         
    
                                             
                                                              
                                                                  
                                                             
                                                      
                                         
                                                       
                                                                    
                                                              
                                                                         
                                                                       
     
  readonly riteFrom?: 'self' | { readonly gearOid: ObjId; readonly defId: string }
  readonly controller: PlayerId
  readonly owner: PlayerId
                                                   
  readonly zone: string
                                 
  readonly might: number
  readonly damage: number
  readonly keywords: readonly string[]
  readonly counters: Readonly<Record<string, number>>
  readonly status: GameObject['status']
     
                                                  
                                                                       
     
  readonly types: readonly CardType[]
     
                                      
                                           
                                                        
                                              
     
  readonly attachedDefIds: readonly string[]
     
                                                        
                                              
                                         
                                                       
                                        
                                           
     
  readonly attached: readonly { readonly oid: ObjId; readonly defId: string }[]
     
                                                  
    
                               
                                                     
                                            
                                               
                                         
                                                                                 
                              
     
  readonly hereOtherAllies: readonly ObjId[]
     
                                                    
    
                                                            
                                                     
                                                                           
                                        
     
  readonly hereOtherUnits: readonly ObjId[]
     
                                 
                                                     
                                                                                          
                                                     
     
  readonly phaseAtDeath: string
  readonly activePlayerAtDeath: PlayerId | undefined
     
                                         
                                                                  
                                        
                                               
     
  readonly postDeathOid?: ObjId
     
                                                            
    
                                                      
                                                                         
                                                
                                                                    
                           
                                                    
                                               
    
                                            
                                                                   
                                                  
                                          
     
  readonly tokenSentToDiscard?: true
}

   
                                              
  
                                                         
                                                                                   
                                                                     
                                                      
                                                            
                                                   
                                                                 
                             
   
export function victimIsSelf(
  victim: { readonly oid?: ObjId; readonly postDeathOid?: ObjId } | undefined,
  selfOid: ObjId,
): boolean {
  if (victim === undefined) return false
  return victim.postDeathOid === selfOid || victim.oid === selfOid
}

                                                    
export function fillPostDeathOids(
  snapshots: readonly DeathSnapshot[],
  map: Readonly<Record<string, ObjId>>,
     
                                                        
                                                            
     
  tokenGone?: ReadonlySet<string>,
): readonly DeathSnapshot[] {
  return snapshots.map((s) => {
    const withOid = map[s.oid] === undefined ? s : { ...s, postDeathOid: map[s.oid] }
    return tokenGone?.has(String(s.oid)) === true ? { ...withOid, tokenSentToDiscard: true as const } : withOid
  })
}

   
                                                            
  
                                   
                                      
                                                             
                                                        
                                                    
                                                                         
                                                                          
                                                  
   
export function lastRitesTextDefId(snap: { readonly defId?: string; readonly copiedDefId?: string }): string | undefined {
  return snap.copiedDefId ?? snap.defId
}

                                                          
export function snapshotOnDeath(o: GameObject, state?: GameState): DeathSnapshot {
                                         
  const attached = state
    ? Object.values(state.objects)
        .filter((x) => (x.status as { attachedTo?: ObjId }).attachedTo === o.oid)
        .map((x) => ({ oid: x.oid, defId: x.defId }))
    : []
                                                     
                                                  
  const hereOtherUnits = state
    ? Object.values(state.objects)
        .filter((x) => x.oid !== o.oid && x.zone === o.zone && typesOf(x).includes('unit'))
        .map((x) => x.oid)
    : []
  const hereOtherAllies = state
    ? hereOtherUnits.filter((oid) => state.objects[oid]?.controller === o.controller)
    : []
  return {
    attached,
    attachedDefIds: attached.map((a) => a.defId), // 与 attached 同源同序,不会错位
    hereOtherAllies,
    hereOtherUnits,
    phaseAtDeath: state?.phase ?? '',
    activePlayerAtDeath: state?.activePlayer,
    oid: o.oid,
    defId: o.defId, // 印刷卡号(存续校验用,见字段注释)
                                                         
    ...(o.derived?.copiedDefId !== undefined ? { copiedDefId: o.derived.copiedDefId } : {}),
    controller: o.controller,
    owner: o.owner,
    zone: o.zone,
    might: o.derived?.might ?? o.baseMight,
    damage: o.damage,
    keywords: currentKeywords(o),
    counters: { ...o.counters },
    status: { ...o.status },
    types: typesOf(o), // §178 死后取不到,必须在此刻定格
  }
}

   
                                                
                                   
                                                                                            
  
                                                       
   
   
                                                          
  
                                                                   
                                                                 
                                         
                                                                    
                                          
   
export function lastRitesGearSources(
  state: GameState, o: GameObject,
): readonly { readonly gearOid: ObjId; readonly defId: string }[] {
  const out: { gearOid: ObjId; defId: string }[] = []
  for (const other of Object.values(state.objects)) {
    if ((other.status as { attachedTo?: string }).attachedTo !== o.oid) continue
    for (const k of grantsOf(other, state)) {
      if (k === LAST_RITES) out.push({ gearOid: other.oid, defId: other.defId })
    }
  }
  return out
}

export function collectLastRites(
  state: GameState,
  dyingOids: readonly ObjId[],
): readonly DeathSnapshot[] {
  const out: DeathSnapshot[] = []
  for (const oid of dyingOids) {
    const o = state.objects[oid]
    if (!o) continue
                                                        
                                                         
                                                                        
    const kws = keywordSources(state, o, () => true)
    const n = lastRitesTriggerCount(kws)
                                                             
                                                              
                                                    
    if (n === 0) continue
                                              
                                                    
                                                   
                                                             
    const times = Math.max(1, repeatsProvider?.(state, o.controller) ?? 1)
                                           
                                                                   
                                                              
                                                                  
    const gearRites = lastRitesGearSources(state, o)
    const selfCount = Math.max(0, n - gearRites.length)
    const froms: DeathSnapshot['riteFrom'][] = [
      ...Array<'self'>(selfCount).fill('self'),
      ...gearRites,
    ]
                                                        
    for (const from of froms) {
      for (let t = 0; t < times; t++) out.push({ ...snapshotOnDeath(o, state), riteFrom: from })
    }
  }
  return out
}

   
                                              
                   
                                
   
export function lastRitesStillValid(snapshot: DeathSnapshot, after: GameState): boolean {
                                                                 
                                   
                                                             
                                                            
                                             
  if (snapshot.tokenSentToDiscard === true) return true
  const post = snapshot.postDeathOid
  if (post !== undefined) {
    const po = after.objects[post]
    return po !== undefined && after.zones[po.zone]?.kind === 'discard'
  }
  const o = after.objects[snapshot.oid]
  if (o) return after.zones[o.zone]?.kind === 'discard'                         
                                          
                                                         
                                                      
                                                         
                                                      
                                                                   
                                               
                                                     
  const disc = after.zones[`discard:${snapshot.owner}` as ZoneId]
  return (disc?.contents ?? []).some((id) => after.objects[id]?.defId === snapshot.defId)
}

   
                                       
  
                                    
                                              
                                                                   
                                                    
                                                                      
                                                              
                                                                  
                                                                
                                                                    
  
                                                        
                                                 
   
export function makeLastRitesItems(
  snapshots: readonly DeathSnapshot[],
  after: GameState,
  effectOf: (snapshot: DeathSnapshot, chosen?: Readonly<Record<string, string>>, state?: GameState) => readonly GameEvent[],
  activePlayer?: PlayerId,
  choiceOf?: LastRitesChoiceOf,
  basePerformOf?: (snapshot: DeathSnapshot) => ((state: GameState, deps?: ReduceDeps) => GameState | null) | undefined, // ★1423 deps 透传:绝念的基础费用要走 reducer(信号/替换/清理)
): ChainItem[] {
                                 
  const valid = snapshots.filter((s) => lastRitesStillValid(s, after))
                                                                          
                                                                  
                                                                                       
                                            
                                                                      
                                   
  const ordered = activePlayer === undefined
    ? valid
    : [...valid]
      .map((s, idx) => ({ s, idx, rank: turnOrderRank({ ...after, activePlayer }, s.controller) }))
      .sort((a, b) => a.rank - b.rank || a.idx - b.idx)
      .map((x) => x.s)
  const items: ChainItem[] = []
  ordered.forEach((snap, i) => {
    const id = `lastrites:${snap.oid}:${i}`
    const evs = effectOf(snap)
                                                      
                                                       
                                          
                                                                
                                                                    
                                                                                
                              
                                                      
                                                                                   
                                                           
                                                         
                                                                      
                                                         
                                                
    const selfRite = snap.riteFrom === undefined || snap.riteFrom === 'self'
    const gearRite = typeof snap.riteFrom === 'object' ? snap.riteFrom : undefined
                                                  
                                                         
                                                                    
    const asksSomething = selfRite && choiceOf?.(snap, id, after, {}) != null
                                                      
                                                                  
    const basePerform = selfRite ? basePerformOf?.(snap) : undefined
    if (evs.length === 0 && !asksSomething && basePerform === undefined) return                    
    items.push({
      id,
      controller: snap.controller,
      kind: 'ability',
      status: 'pending',
                                                       
                                                                    
                                                          
                                                     
      sourceDefId: gearRite !== undefined ? gearRite.defId : (lastRitesTextDefId(snap) ?? snap.defId),
                                                                  
                                                              
      ...(choiceOf && selfRite ? { nextChoice: (s: GameState, chosen: Readonly<Record<string, string>>) => choiceOf(snap, id, s, chosen) } : {}),
                                                
                               
                                                 
                                                                 
                                               
                                                        
      resolve: (state, chosen) => effectOf(snap, chosen, state),
      ...(basePerform !== undefined ? { basePerform } : {}), // §383.3.b 确认前付(chainFepr 消费)
    })
  })
                                                          
                                                                                     
                                                                      
  if (items.length < 2) return items
  const batchId = items[0]!.id
  return items.map((it) => ({ ...it, batchId }))
}
