                                            
                                                         
                                                               
                                                                     
                                                                       

import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { GameEvent, EventKind } from '../loop/events'
import type { ChainItem, ChoiceRequest } from '../loop/chain'
import type { ReduceDeps } from '../loop/reduce'
import type { ZoneKind } from '../state/zones'

export interface Trigger {
  readonly id: string
  readonly sourceOid: ObjId | null
  readonly sourceDefId?: string
  readonly controller: PlayerId
  readonly event: EventKind
     
                                                
                                                         
                    
     
  readonly abilityKey?: string
                                                                    
  readonly by?: 'you' | 'opponent' | 'any'
  readonly filter?: (ev: GameEvent, state: GameState) => boolean
                                     
  readonly additionalCondition?: (state: GameState) => boolean
                                        
  readonly activeZone?: readonly ZoneKind[]
                                              
  readonly nthType?: boolean
     
                                              
                                                              
                                               
                                                     
                                                       
     
  readonly oncePerTurn?: boolean
                                       
  readonly mayChoose?: boolean
     
                                                    
                                                                
                                                    
                                             
     
  readonly basePerform?: (state: GameState, ev: GameEvent, deps?: ReduceDeps) => GameState | null
                                     
                                                    
  readonly nextChoice?: (state: GameState, ev: GameEvent, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
  readonly effect: (state: GameState, ev: GameEvent, chosen?: Readonly<Record<string, string>>) => readonly GameEvent[]
}

   
                                              
                                                 
                                         
   
function responsibleFor(ev: GameEvent): readonly PlayerId[] | null {
                                                                      
                                                               
                                                                      
                                                              
                                                         
                                                  
  const r = (ev as { readonly responsible?: readonly PlayerId[] }).responsible
  return r && r.length > 0 ? r : null
}

                                                        
function byMatches(trigger: Trigger, actor: PlayerId | null, ev: GameEvent): boolean {
  if (!trigger.by || trigger.by === 'any') return true
  const responsible = responsibleFor(ev)
  if (responsible) {
    return trigger.by === 'you'
      ? responsible.includes(trigger.controller)
      : responsible.some((p) => p !== trigger.controller)
  }
  if (actor === null) return false
  return trigger.by === 'you' ? actor === trigger.controller : actor !== trigger.controller
}

                                                                          
function activeZoneSatisfied(trigger: Trigger, state: GameState): boolean {
  if (!trigger.activeZone || trigger.activeZone.length === 0) return true
                                                  
    
                                                     
                                                          
                             
                                                  
                       
                                                 
                                                        
    
                                                                
                                                       
                              
    
                                                                                               
                                                                 
                                                                  
                                                                  
                                                
  const bySource = trigger.sourceOid ? state.objects[trigger.sourceOid] : undefined
  if (bySource) {
    const z = state.zones[bySource.zone]
    return z ? trigger.activeZone.includes(z.kind) : false
  }
  return false                                   
}

                                        
export function checkTrigger(
  trigger: Trigger,
  ev: GameEvent,
  state: GameState,
  actor: PlayerId | null,
): boolean {
  if (trigger.event !== ev.kind) return false
  if (!byMatches(trigger, actor, ev)) return false
  if (trigger.filter && !trigger.filter(ev, state)) return false
  if (trigger.additionalCondition && !trigger.additionalCondition(state)) return false              
  if (!activeZoneSatisfied(trigger, state)) return false            
                                                  
  if (trigger.oncePerTurn === true && state.abilityFiredThisTurn?.[oncePerTurnKey(trigger)] === true) return false
  return true
}

   
                      
                                                             
                                                                
   
export function oncePerTurnKey(t: Trigger): string {
  return `${t.sourceOid ?? 'global'}:${t.abilityKey ?? t.id}`
}

   
                                              
                                              
   
   
                                                                     
  
                                                                
                                                        
                                                      
                              
                                                    
                     
  
                    
                                              
                                                           
                              
                                                  
  
                                                           
                                                                             
                                                                           
                                                                                              
                                                                            
                                                                     
                                                           
                                                               
  
                                                                    
                                               
  
                                                           
                                                                
                                                
                                                                   
                                                           
   
export interface PreBatchTriggers {
                        
  readonly triggers: readonly Trigger[]
                            
  readonly oids: ReadonlySet<string>
}

                                           
function isNewlyAcquired(t: Trigger, pre: PreBatchTriggers, preIds: ReadonlySet<string>): boolean {
  if (t.sourceOid === null) return false                 
  if (!pre.oids.has(String(t.sourceOid))) return false                       
  return !preIds.has(t.id)             
}

export function detectTriggersForBatchAndNote(
  state: GameState,
  events: readonly GameEvent[],
  triggers: readonly Trigger[],
  actor: PlayerId | null = null,
                                                       
  pre?: PreBatchTriggers,
                                                           
  order?: ChainOrder,
): { readonly items: ChainItem[]; readonly state: GameState } {
  const visible = pre === undefined
    ? triggers
    : (() => {
        const preIds = new Set(pre.triggers.map((t) => t.id))
        return triggers.filter((t) => !isNewlyAcquired(t, pre, preIds))
      })()
  const raw = detectTriggersForBatch(state, events, visible, actor, order)
  if (raw.length === 0) return { items: raw, state }
                                                                   
                                                                                
                                                                                            
                                    
                                   
                                                                   
                                                     
                                                                               
                                                                                    
                                                                   
                                                  
                                                         
                                                               
  const used = new Set(state.chain.map((i) => i.id))
  const deduped = raw.map((it) => {
    if (!used.has(it.id)) { used.add(it.id); return it }
    let n = 2
    while (used.has(`${it.id}#${n}`)) n += 1
    used.add(`${it.id}#${n}`)
    return { ...it, id: `${it.id}#${n}` }
  })
                                               
                                                 
  const batchId = deduped[0]!.id
  const items = deduped.length === 1 ? deduped : deduped.map((it) => ({ ...it, batchId }))
  const fired: Record<string, true> = {}
                                                                 
                                                     
                                                                  
                                                                                 
                                                                     
  for (const t of visible) {
    if (t.oncePerTurn !== true) continue
                                                                 
    if (!items.some((i) => i.id.startsWith(`trig:${t.id}:`))) continue
    fired[oncePerTurnKey(t)] = true
  }
  if (Object.keys(fired).length === 0) return { items, state }
  return { items, state: { ...state, abilityFiredThisTurn: { ...state.abilityFiredThisTurn, ...fired } } }
}

                                                                      
function eventDiscriminator(ev: GameEvent): string {
  if ('unit' in ev && ev.unit !== undefined) return ev.unit                                      
  if ('target' in ev) return String((ev as { target: unknown }).target)
  if ('obj' in ev) return (ev as { obj: string }).obj
  if (ev.kind === 'hold') return `${ev.player}:${ev.battlefield}:${ev.nth ?? 1}`                  
  if (ev.kind === 'conquer') return `${ev.player}:${ev.battlefield}:${ev.nth ?? 1}`                       
  if ('player' in ev) return (ev as { player: string }).player
  return ev.kind
}

function toChainItem(trigger: Trigger, ev: GameEvent): ChainItem {
  return {
    id: `trig:${trigger.id}:${ev.kind}:${eventDiscriminator(ev)}`,
    controller: trigger.controller,
    kind: 'triggered',
    status: 'pending',
    ...(trigger.sourceDefId ? { sourceDefId: trigger.sourceDefId } : {}), // 界面要显示"是谁的技能触发了"
    ...(trigger.sourceOid !== null ? { sourceOid: trigger.sourceOid } : {}), // ★1767 §355.6 信号要按【来源是不是单位】分桶

    resolve: (st, chosen) => trigger.effect(st, ev, chosen),
    ...(trigger.nextChoice ? { nextChoice: (st: GameState, chosen: Readonly<Record<string, string>>) => trigger.nextChoice!(st, ev, chosen) } : {}), // §355.17
    ...(trigger.mayChoose ? { mayChoose: true } : {}), // §383.3.a
                                                         
    ...(trigger.basePerform ? { basePerform: (st: GameState, deps?: ReduceDeps) => trigger.basePerform!(st, ev, deps) } : {}),
                                                     
    ...(trigger.oncePerTurn === true ? { oncePerTurnKey: oncePerTurnKey(trigger) } : {}),
  }
}

                              
export function detectTriggers(
  state: GameState,
  ev: GameEvent,
  triggers: readonly Trigger[],
  actor: PlayerId | null = null,
): ChainItem[] {
  return triggers.filter((t) => checkTrigger(t, ev, state, actor)).map((t) => toChainItem(t, ev))
}

   
                            
                                                            
                                    
                    
   
export function detectTriggersForBatch(
  state: GameState,
  events: readonly GameEvent[],
  triggers: readonly Trigger[],
  actor: PlayerId | null = null,
                                                           
  order?: ChainOrder,
): ChainItem[] {
  const items: ChainItem[] = []
  for (const t of triggers) {
    const matched = events.filter((ev) => checkTrigger(t, ev, state, actor))
    if (matched.length === 0) continue
    if (t.nthType) {
      items.push(toChainItem(t, matched[0]!))                       
    } else {
      for (const ev of matched) items.push(toChainItem(t, ev))       
    }
  }
  const ordered = orderByApnap(state, items, order)
                                                                                   
                                                                         
                                                                          
                                                            
                                                              
                                                           
                                                    
                                                       
                                                
                                                          
                                                  
                                                                       
  const seenOnce = new Set<string>()
  return ordered.filter((it) => {
    if (it.oncePerTurnKey === undefined) return true
    if (seenOnce.has(it.oncePerTurnKey)) return false
    seenOnce.add(it.oncePerTurnKey)
    return true
  })
}

   
                                                
                                              
                                       
  
                                                        
                                                                               
                                          
                                                
                                                               
                                                       
                                                                    
                                                    
  
                                                         
                                                     
                                           
  
                                    
                                                        
                                  
                       
                                       
                                        
                                             
                                           
                                                                
                                                          
                                      
                                             
                                                   
                                                
   
   
                                                          
                                                       
                                                                                       
                                               
                                                  
   
export function turnOrderRank(state: GameState, p: PlayerId): number {
  const ps = state.players
  const start = ps.indexOf(state.activePlayer)
  const i = ps.indexOf(p)
  if (start < 0 || i < 0) return ps.length                      
  return (i - start + ps.length) % ps.length
}

   
                                                                      
                                                                 
                                                                
                                                 
                                                                            
                                                                  
                                                                            
                                                    
   
export interface ChainOrder { readonly first: PlayerId; readonly last: PlayerId }

function orderByApnap(state: GameState, items: readonly ChainItem[], order?: ChainOrder): ChainItem[] {
  if (items.length < 2) return [...items]
                                              
  const first = items[0]!.controller
  if (items.every((i) => i.controller === first)) return [...items]
                                                  
  const rankOf = (p: PlayerId): number => {
    if (order === undefined) return turnOrderRank(state, p)
    if (p === order.first) return -1
    if (p === order.last) return state.players.length
    return turnOrderRank(state, p)
  }
  return items
    .map((it, idx) => ({ it, idx, rank: rankOf(it.controller) }))
    .sort((a, b) => a.rank - b.rank || a.idx - b.idx)                          
    .map((x) => x.it)
}
