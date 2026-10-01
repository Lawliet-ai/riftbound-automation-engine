                                     
                                               

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'
import { zoneCategory, type ZoneKind } from '../state/zones'
import type { GameEvent } from '../loop/events'
import { effectiveMight } from '../state/might'
import { topOfDeck } from '../keywords/insight'
import { typesOf, type CardType } from '../state/cardTypes'
import { eventBattlefield } from '../state/selfHere'                    

export type Relation = 'you' | 'opponent' | 'any'

export interface Selector {
     
                               
                                                            
                                                     
                                        
     
  readonly type: 'unit' | 'spell' | 'equipment' | 'rune' | 'legend' | 'any'
  readonly zone?: ZoneKind
                              
  readonly owner?: Relation
                              
  readonly controller?: Relation
  readonly filter?: (obj: GameObject, state: GameState) => boolean
                      
  readonly count?: number
                        
  readonly chooser?: PlayerId
     
                                        
    
                                                      
                                                               
                                                         
                                            
                              
                                                       
                                                                                    
                                                                   
                                                                             
                                                                          
                                                                      
                                                       
                                                                              
                                                               
                                                                                    
                                                                            
                                                    
                                                                     
    
                                                                  
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
                                                                         
                                                  
                                              
     
  readonly isTarget?: boolean

                                                     
     
                         
                                             
     
  readonly excludeSelf?: boolean
     
                                                      
                                         
     
  readonly maxMight?: number
     
                                    
                                                           
     
  readonly atEventBattlefield?: boolean
     
                                         
                                                    
                                              
                                                     
                                                                 
                                           
     
  readonly topOfDeck?: number

                                                        
     
                                                
                                                    
                                                          
                                                          
     
  readonly fielded?: boolean
     
                                          
                                                 
                                                      
     
  readonly minMight?: number
     
                                     
                                       
                                                            
                                                      
                                     
                                    
     
  readonly atSelfZone?: boolean
}

function relationMatches(rel: Relation | undefined, subject: PlayerId, controller: PlayerId): boolean {
  if (!rel || rel === 'any') return true
  return rel === 'you' ? subject === controller : subject !== controller
}

   
                        
                                                              
                                                       
                                                   
   
function typeMatches(t: Selector['type'], o: GameObject): boolean {
  if (t === 'any') return true
  return typesOf(o).includes(t as CardType)
}

   
                                               
  
                                                
                                                     
  
                                  
   
export function resolveSelector(
  state: GameState,
  sel: Selector,
  controller: PlayerId,
  ctx?: { readonly ev?: GameEvent; readonly selfOid?: ObjId | null },
): ObjId[] {
  const bf = sel.atEventBattlefield
    ? eventBattlefield(ctx?.ev as { battlefield?: unknown } | undefined)                
    : undefined
  if (sel.atEventBattlefield && bf === undefined) return []                     
                                     
  const selfZone = sel.atSelfZone
    ? (ctx?.selfOid != null ? (state.objects[ctx.selfOid]?.zone as string | undefined) : undefined)
    : undefined
  if (sel.atSelfZone && selfZone === undefined) return []
                                            
  const topSet = sel.topOfDeck !== undefined
    ? new Set<string>(topOfDeck(state, controller, sel.topOfDeck) as string[])
    : undefined
  const result: ObjId[] = []
  for (const o of Object.values(state.objects)) {
    const z = state.zones[o.zone]
    if (!z) continue
    if (topSet !== undefined && !topSet.has(o.oid as string)) continue
    if (sel.zone && z.kind !== sel.zone) continue
    if (sel.fielded !== undefined && (zoneCategory(z.kind) === 'fielded') !== sel.fielded) continue
    if (bf !== undefined && (o.zone as string) !== bf) continue
    if (selfZone !== undefined && (o.zone as string) !== selfZone) continue
    if (!typeMatches(sel.type, o)) continue
    if (sel.excludeSelf && ctx?.selfOid != null && o.oid === ctx.selfOid) continue
    if (!relationMatches(sel.owner, o.owner, controller)) continue
    if (!relationMatches(sel.controller, o.controller, controller)) continue
                                      
    if (sel.maxMight !== undefined && effectiveMight(o).reference > sel.maxMight) continue
                                                     
    if (sel.minMight !== undefined && effectiveMight(o).reference < sel.minMight) continue
    if (sel.filter && !sel.filter(o, state)) continue
    result.push(o.oid)
  }
  return sel.count !== undefined ? result.slice(0, sel.count) : result
}
