                                                 
                                    
                                                                    
                                                                  
                                                                                 
                                                                        

import type { GameState, PendingContest } from '../state/gameState'
import { typesDeclared } from '../state/exhaust'            
import { freshOid } from '../state/gameState'               
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import { restrictedMoveEvent } from '../state/moveRestriction'                       
import { eventDidHappen, ACTION_EVENT_KINDS } from './actionEvents'                           
import { controlsBattlefield, openBattlefields } from '../state/battlefieldControl'
import { isEquipment, isRune, isUnit } from '../state/cardTypes'
import { topOfDeck, takeRunesRecycled } from '../keywords/insight'
import { runCleanupToFixpoint, applyDestroyReplacement, type CleanupHooks } from './cleanup'
import { recomputeContinuous } from '../effects/continuousView'
import { collectMightCrossed } from '../effects/mightCrossed'                    
import {
  EMPTY_REPLACEMENT_REGISTRY,
  interceptEvent,
  type ReplacementRegistry,
  type ReplacementShield,
} from '../effects/replacementRegistry'
import type { ReplacementOrder } from '../effects/replacementRegistry'                 
                                                                                         
                                  
import type { BurnoutOpponentAsk } from '../scoring/burnout'
import { actionToEvents, type Action } from './actions'
import { liveTargetOids } from './chainTargets'                                       
import { type SpawnTokenEvent, eventTriggersCleanup, landEvent, type GameEvent, type PlaySpellFromZoneEvent, performPlayFromZone, isExemptEvent, type DrawForDestroyVictimEvent, type PumpIfDestroyedEvent } from './events'
import { clearDamageBlame, takeDeathSnapshots, takeDestroyed, type DestroyedRecord } from './cleanup'
import { makeLastRitesItems, type DeathSnapshot, type LastRitesChoiceOf } from '../keywords/lastRites'
import { addItems, type ChainItem } from './chain'
import { isRetargeting } from '../keywords/seize'                                        
import type { Trigger } from '../dsl/trigger'
import { noteCardConfirmed } from '../keywords/rally'

   
                                                               
                                                   
  
                                                                 
                                                           
                                                                            
                                                             
                                                           
                                                                             
                                               
                                                                              
                                                              
   
const REPLACE_AWARE_EVENT_KINDS: ReadonlySet<string> = new Set(
                                                                          
                                                               
  ['drawForDestroyVictim', 'pumpIfDestroyed'] satisfies readonly (DrawForDestroyVictimEvent['kind'] | PumpIfDestroyedEvent['kind'])[],
)

   
                                                         
                                                                        
                                          
                           
   
   
                                                           
                                                          
                                                  
                                               
                                                      
                                                                      
   
   
                                                             
                                                            
                                                            
                                                     
   
function viewedSignal(ev: GameEvent, before: GameState): GameEvent | null {
  if (ev.kind !== 'insight') return null
  const e = ev as unknown as { player: PlayerId; count: number }
  const cards = topOfDeck(before, e.player, e.count)
  if (cards.length === 0) return null
  return { kind: 'viewed', player: e.player, cards }
}

function playFreeSignal(ev: GameEvent, before: GameState, after: GameState): GameEvent | null {
  if (ev.kind !== 'playFree') return null
  const e = ev as unknown as { obj: string; player: PlayerId; to?: string; bonus?: boolean }
  const src = before.objects[e.obj as never]
  if (src === undefined) return null                                    
  const fromZoneKind = before.zones[src.zone]?.kind
  const to = (e.to ?? `base:${e.player}`) as ZoneId
  const was = before.zones[to]?.contents ?? []
  const now = after.zones[to]?.contents ?? []
  const unit = now.find((id) => !was.includes(id))
  if (unit === undefined) return null
                                                                                                          
                                                                                
                                                                                     
                                                                                        
                                                                                   
  return { kind: 'playUnit', unit, player: e.player, at: to as string,
    ...(fromZoneKind === undefined ? {} : { fromZoneKind }),
    ...(e.bonus === true ? { bonus: true } : {}) }                                           
}

   
                                                              
                                                 
  
                                                                                  
                                                            
                                                                  
                                                               
  
                                                            
                                                        
                               
  
                                                                     
                                                              
                                    
                                                 
                                                                        
   
function tokenPlaySignal(ev: GameEvent, before: GameState, after: GameState): readonly GameEvent[] {
  if (ev.kind !== 'spawnToken') return []
  const zone = ev.zone
  const was = before.zones[zone]?.contents ?? []
  const now = after.zones[zone]?.contents ?? []
  return now.filter((id) => !was.includes(id))
    .map((unit) => ({ kind: 'playUnit', unit, player: ev.owner, at: zone as string }))
}

function banishedSignal(ev: GameEvent, before: GameState, after: GameState): GameEvent | null {
                                                                                                 
                                                                                         
                                                                    
  const target: ObjId | undefined = ev.kind === 'banish'
    ? ev.target
    : ev.kind === 'negate'
      ? before.chain.find((it) => it.id === ev.target)?.cardOid
      : undefined
  if (target === undefined) return null
  const owner = before.objects[target]?.owner
  if (owner === undefined) return null
  const exileId = `exile:${owner}` as ZoneId
  const was = before.zones[exileId]?.contents ?? []
  const now = after.zones[exileId]?.contents ?? []
  const card = now.find((id) => !was.includes(id))
  if (card === undefined) return null
                                          
                                                        
  const from = before.objects[target]?.zone
                                                                    
                                                                                     
  const negatedController = ev.kind === 'negate' ? before.chain.find((it) => it.id === ev.target)?.controller : undefined
  return {
    kind: 'banished', player: owner, card, defId: after.objects[card]?.defId ?? '',
    ...(from === undefined ? {} : { from }),
    ...(negatedController === undefined ? {} : { responsible: [negatedController] }),
  } as GameEvent
}

   
                                                                                              
                                                                                                
                                                                                   
                                                                                
   
export function recycledOnLeaveSignal(item: ChainItem | undefined, before: GameState, after: GameState): GameEvent | null {
  if (item?.recycleOnLeave !== true || item.cardOid === undefined) return null
  const card = before.objects[item.cardOid]
  if (card === undefined || card.owner !== item.controller) return null
  const deckId = `mainDeck:${card.owner}` as ZoneId
  const was = before.zones[deckId]?.contents ?? []
  const landed = (after.zones[deckId]?.contents ?? []).some((id) => !was.includes(id))
  return landed ? ({ kind: 'recycled', player: item.controller, count: 1 } as GameEvent) : null
}

   
                                                
                                                              
  
                                                 
                                                                 
                                                   
                                                          
                                                 
                                                                  
                                                            
                                                                     
                                                                      
                                                         
   
function seizeTargetedSignal(ev: GameEvent, before: GameState): readonly GameEvent[] {
  if (ev.kind !== 'seize' || ev.rechoiceTarget === undefined) return []
  const item = before.chain.find((i) => i.id === ev.target)
  if (!isRetargeting(item, { target: ev.rechoiceTarget as ObjId })) return []
  return liveTargetOids(before, ev.rechoiceTarget).map((oid) => ({
                                                                                 
    kind: 'targeted', chooser: ev.newController, target: oid as ObjId, sourceKind: 'spell',
    ...(item?.cardOid !== undefined ? { sourceOid: item.cardOid } : {}),
  } as GameEvent))
}

export interface ReduceDeps {
     
                                                
                                                               
                                                
                                                                  
                                                 
     
     
                                                                           
                                                       
     
  readonly scoreBlockedAnywhere?: (state: GameState, player: PlayerId) => boolean
     
                                                                           
                                                                                
                                                           
                                                                             
                                                            
                                                                           
                                                                                        
     
  readonly playBanned?: (state: GameState, player: PlayerId, defId: string, to: string, oid?: string) => boolean
     
                                                   
                                                       
                                                            
                                            
                                               
                                              
     
  readonly onWouldAskBurnoutOpponent?: (ask: BurnoutOpponentAsk) => void
  readonly replacementOrder?: ReplacementOrder
     
                                                        
                                
     
  readonly lastRitesEffect?: (snapshot: DeathSnapshot, chosen?: Readonly<Record<string, string>>, state?: GameState) => readonly GameEvent[]
     
                                                         
                                       
     
  readonly lastRitesChoice?: LastRitesChoiceOf
     
                                                    
                                                          
     
  readonly lastRitesBasePerform?: (snapshot: DeathSnapshot) => ((state: GameState) => GameState | null) | undefined
  readonly replacement?: ReplacementRegistry
     
                                                                
                                                                    
                                                          
                                                  
                                                                      
                                                               
     
  readonly fromEffect?: true
     
                                       
                                              
                                                                             
                                       
                                                       
                                                 
     
  readonly effectController?: PlayerId
     
                                                            
                                                     
                                                         
     
  readonly playSpellFromZone?: (state: GameState, ev: PlaySpellFromZoneEvent) => { readonly state: GameState; readonly item: ChainItem; readonly paidMana?: number } | null
     
                                          
                                                            
                                                     
     
  readonly replacementShields?: (state: GameState) => readonly ReplacementShield[]
  readonly cleanupHooks?: CleanupHooks
     
                                                                
                                                  
     
  readonly triggerSource?: (state: GameState) => readonly Trigger[]
     
                                                                     
                                                                 
                                                          
                                                                                
                                                                              
                                               
     
  readonly flushTargetSignals?: (state: GameState, stage: 'confirm' | 'resolve') => GameState
     
                                                          
                                                                      
                                                      
                                                       
                                             
     
  readonly tokenEntersReady?: (state: GameState, owner: PlayerId) => boolean
                                                                                
  readonly unitEntersReady?: (state: GameState, player: PlayerId, defId: string, to: string, oid: string) => boolean
                                                   
  readonly tokenSpawnDoublerFor?: (state: GameState, ev: SpawnTokenEvent) => ObjId | undefined
     
                                                        
                                                                              
                                                               
     
  readonly isArmament?: (defId: string) => boolean
     
                                                             
                                                     
                                                                
     
  readonly isPlainEquipment?: (defId: string) => boolean
                                                                 
  readonly isPlainUnit?: (defId: string) => boolean
     
                                                       
                             
                                            
                       
                                      
     
  readonly barrierIgnoredAt?: (state: GameState, player: PlayerId, battlefield: string) => boolean
     
                                                
                                                  
                                                 
                                                           
                                               
                                 
     
  readonly combatImmuneAt?: (state: GameState, oid: ObjId) => boolean
     
                                                          
                                                      
     
  readonly onEvent?: (ev: GameEvent, before: GameState) => void
}

export interface ReduceResult {
  readonly state: GameState
                                            
  readonly events: readonly GameEvent[]
}

   
                                                           
                                                                 
   
   
                           
                                                        
                                                              
                                   
   
export function destroyedEventsFrom(records: readonly DestroyedRecord[]): readonly GameEvent[] {
                                                      
  return records.map((rec) => {
    const cards = rec.byCards ?? []
    const withCards = cards.length > 0 ? { byCards: cards } : {}
    return rec.responsible.length > 0
      ? { kind: 'destroyed' as const, victim: rec.victim, responsible: rec.responsible, ...withCards }
      : { kind: 'destroyed' as const, victim: rec.victim, ...withCards }
  })
}

   
                                                             
             
                                                                       
                             
                                                                                
                                                        
  
                                                                            
                                                                    
                                                                      
                                                                   
                                                         
                                                                     
                                                           
                                      
                                                       
                                                                         
                          
                                                            
                                                      
   
export function noteDestroyedLedgers(state: GameState, evs: readonly GameEvent[]): GameState {
  let led = state.unitDestroyedThisTurn
  let ally = state.allyDiedInStartPhaseThisTurn
  for (const ev of evs) {
    if (ev.kind !== 'destroyed' || !ev.victim.types.includes('unit')) continue
    const who = ev.victim.controller as string
    if (led?.[who] !== true) led = { ...(led ?? {}), [who]: true }
                                                           
    if (state.phase === 'start' && (state.activePlayer as string) === who && ally?.[who] !== true) {
      ally = { ...(ally ?? {}), [who]: true }
    }
  }
  if (led === state.unitDestroyedThisTurn && ally === state.allyDiedInStartPhaseThisTurn) return state
  return {
    ...state,
    ...(led !== undefined ? { unitDestroyedThisTurn: led } : {}),
    ...(ally !== undefined ? { allyDiedInStartPhaseThisTurn: ally } : {}),
  }
}

   
                                        
                                                                
                                                          
                                                         
                                                         
                                            
                                                        
                                                       
   
function contestSignal(before: GameState, ev: GameEvent): PendingContest | null {
  if (ev.kind === 'zoneChange') {
    const o = before.objects[ev.obj]
    if (!o || !isUnit(o)) return null
    const fromKind = before.zones[o.zone]?.kind
    if (fromKind !== 'base' && fromKind !== 'battlefield') return null
    if (before.zones[ev.to]?.kind !== 'battlefield') return null
    const causedBy = o.controller
    if (controlsBattlefield(before, causedBy, ev.to as string)) return null
    const wasOpen = openBattlefields(before).includes(ev.to as string)
    return { battlefield: ev.to, causedBy, ...(wasOpen ? { wasOpen: true as const } : {}) }
  }
  if (ev.kind === 'changeController') {
    const o = before.objects[ev.target]
    if (!o || !isUnit(o)) return null
    if (before.zones[o.zone]?.kind !== 'battlefield') return null
    if (controlsBattlefield(before, ev.player, o.zone as string)) return null
    return { battlefield: o.zone, causedBy: ev.player }
  }
  return null
}

   
                                                              
                                                             
                                                     
   
   
                                                              
                                                 
                                          
                                                                       
                                            
                                                                                            
                                          
                                  
                                                                   
                                                        
                                                     
                                                          
                        
                                                    
   
export function appendContest(s: GameState, c: PendingContest): GameState {
  const q = s.pendingContests ?? []
  if (q.some((e) => e.battlefield === c.battlefield && e.causedBy === c.causedBy)) return s
  return { ...s, pendingContests: [...q, c] }
}

export function applyEvents(
  state: GameState,
  rawEvents: readonly GameEvent[],
  deps: ReduceDeps = {},
): ReduceResult {
  const dynamic = deps.replacementShields?.(state) ?? []
  const replacement: ReplacementRegistry = dynamic.length > 0
    ? { shields: [...(deps.replacement?.shields ?? []), ...dynamic] }
    : (deps.replacement ?? EMPTY_REPLACEMENT_REGISTRY)

                                   
  let s = state
  const landed: GameEvent[] = []
  let cleanupNeeded = false
                                                        
                                                                   
                                            
  const savedInSpan = new Set<string>()
  const askedInSpan = new Set<string>()
                                                                  
                                                                            
                                                                                        
  const queue: GameEvent[] = [...rawEvents]
  for (let evIdx = 0; evIdx < queue.length; evIdx++) {
    const raw0 = queue[evIdx]!
    let raw = raw0
                                                   
                                                 
                                              
                                                          
                                       
    if (raw.kind === 'playUnit' && raw.play !== undefined) {
                                                
      const srcOid = (raw.play as { readonly card?: ObjId }).card
      const fromZoneKind = srcOid === undefined ? undefined : s.zones[s.objects[srcOid]?.zone ?? ('' as never)]?.kind
                                                                               
                                                                                                       
                                                                      
                                                                                   
                                                                          
      if (srcOid !== undefined && s.objects[srcOid] !== undefined
        && deps.playBanned?.(s, raw.player, s.objects[srcOid]!.defId, String(raw.play.to), srcOid) === true) continue
      const done = performPlayFromZone(s, raw.play, raw.player, deps)                                                
      if (done === null) continue                                  
      s = done.state
                                                        
                                                                         
                                                                         
      s = noteCardConfirmed(s, raw.player, done.fieldedOid)                                    
      raw = { kind: 'playUnit', unit: done.fieldedOid, player: raw.player, at: String(raw.play.to), // ★1256 收尾 缺陷 159:效果打出路也带落点(偶像谷 / 鲛人按 at 判)
        ...(fromZoneKind !== undefined ? { fromZoneKind } : {}),
                                                                                                         
                                                                   
        ...(raw.play.bonus === true ? { bonus: true } : {}),
        ...(raw.play.bonusChoice !== undefined ? { bonusChoice: raw.play.bonusChoice } : {}) } as typeof raw
    }
                                                  
    const enriched = raw.kind === 'zoneChange' && raw.from === undefined
      ? { ...raw, from: s.objects[raw.obj]?.zone, defId: s.objects[raw.obj]?.defId }
      : raw
                                                           
                                  
                                               
                                                  
                                                            
                                                            
                                 
                                                          
                                               
    const fired: { readonly sh: ReplacementShield; readonly ev: GameEvent }[] = []
                                                   
                                                                          
                                                         
                                          
                                               
                                                
                                                                     
                                                     
                                          
                                                            
                                                              
                                                      
    const ev = interceptEvent(enriched as typeof raw, s, replacement, {
      order: (shields, cur, st) =>
        deps.replacementOrder?.(shields, cur, st) ?? shields,
      onApply: (sh, cur) => fired.push({ sh, ev: cur }),
    })
                                              
                                                      
    for (const f of fired) if (f.sh.onApplied) s = f.sh.onApplied(s, f.ev as typeof raw)
    if (ev === null) continue                          
                                                            
                                                       
                                                        
                                                                 
                                                         
                                                            
                                               
                                                      
                                                             
                                                           
                                                                   
                                                                              
                                                                  
                                                          
                                                                  
                                           
                                                                                 
                                                                    
                                                                         
                                                 
                                                             
                                                           
                                                                    
                                                                                      
                                                                       
                                                                                      
                                                                   
                                                                   
                                                              
    if (ev.kind === 'gainPoint' && !isExemptEvent(ev) && deps.scoreBlockedAnywhere?.(s, ev.player) === true) continue
                                                                           
                                                                                    
                                                                                                          
                                                                                         
                                                                                       
                                              
    if (ev.kind === 'playFree') {
      const fo = s.objects[(ev as unknown as { obj: ObjId }).obj]
      if (fo !== undefined && typesDeclared(fo) && !isUnit(fo) && !isEquipment(fo)) continue
    }
                                                                      
                                                                     
                                                                             
                                                                             
    if (ev.kind === 'playFree' && s.objects[ev.obj] !== undefined
      && deps.playBanned?.(s, ev.player, s.objects[ev.obj]!.defId, String(ev.to ?? `base:${ev.player}`), ev.obj) === true) continue
    if (ev.kind === 'zoneChange' && !s.objects[ev.obj]) continue
    if (ev.kind === 'zoneChange' && ev.entry !== true && restrictedMoveEvent(s, ev.obj, ev.to as string, deps.effectController)) continue                         
    if (ev.kind === 'unitMoved'
      && restrictedMoveEvent(s, (ev as { unit?: ObjId }).unit, (ev as { to?: string }).to, deps.effectController)) continue
                                                         
                                                  
                                                   
                                               
                                                      
                                                         
                                                                                                 
                                            
                                                                   
                                                      
                                                                    
                                                  
                                                     
                                           
                                                                                            
                                                   
                                                          
                                                   
                                                          
                                                        
                                                                 
                                                              
                                                        
                                                 
                                                        
    if (ev.kind === 'destroy') {
      const prevRaw = evIdx > 0 ? queue[evIdx - 1] : undefined
      if (prevRaw === undefined || prevRaw.kind !== 'destroy') {
                                               
        savedInSpan.clear(); askedInSpan.clear()
        for (let j = evIdx; j < queue.length; j++) {
          const e = queue[j]
          if (e === undefined || e.kind !== 'destroy') break
          const t = (e as { readonly target: ObjId }).target
          if (askedInSpan.has(t as string)) continue
          askedInSpan.add(t as string)
          const r = applyDestroyReplacement(s, t, deps.cleanupHooks)
          if (r) { s = r; cleanupNeeded = true; savedInSpan.add(t as string) }
        }
      }
      if (savedInSpan.has(ev.target as string)) continue             
      if (!askedInSpan.has(ev.target as string)) {
                                                        
                                                               
                                                             
                                                                     
                               
                                                                                          
                                                                                       
                                                         
        askedInSpan.add(ev.target as string)
        const replaced = applyDestroyReplacement(s, ev.target, deps.cleanupHooks)
        if (replaced) { s = replaced; cleanupNeeded = true; continue }
      }
    }
                                                                 
                                                              
                                                     
                                                              
                                                         
                                                     
    if (!ACTION_EVENT_KINDS.has(ev.kind)) deps.onEvent?.(ev, s)                         
    const beforeLand = s
                                                              
                                                                  
                                                                                       
    const landedOid = ev.kind === 'zoneChange' ? freshOid(s).oid : undefined
                                                            
                                                           
                                                                                     
                                                                 
                                                                      
                                                                   
                                                                     
                                                                             
                                                                      
                                                     
                                        
    const evToLand = REPLACE_AWARE_EVENT_KINDS.has(ev.kind)
      && savedInSpan.has(String((ev as { readonly victim?: ObjId }).victim))
      ? { ...ev, destroyWasReplaced: true as const }
      : ev
    s = landEvent(s, evToLand, deps)
                                                      
                                                  
                                                              
                                                                     
    if (!eventDidHappen(ev.kind, beforeLand, s)) continue
                                                     
    if (ACTION_EVENT_KINDS.has(ev.kind)) deps.onEvent?.(ev, beforeLand)
    landed.push(ev.kind === 'zoneChange' && landedOid !== undefined && s !== beforeLand ? { ...ev, landedOid } : ev)               
                                                             
    if (deps.fromEffect) {
      const contest = contestSignal(beforeLand, ev)
      if (contest) s = appendContest(s, contest)
    }
                                                             
                                                              
    const banished = banishedSignal(ev, beforeLand, s)
    if (banished) landed.push(banished)
                                                                          
    for (const sig of seizeTargetedSignal(ev, beforeLand)) landed.push(sig)
                                                                  
    const freed = playFreeSignal(ev, beforeLand, s)
    if (freed) landed.push(freed)
                                                                                                              
                                                                                                    
                                                                    
    for (const sig of tokenPlaySignal(ev, beforeLand, s)) landed.push(sig)
                                                     
    const viewed = viewedSignal(ev, beforeLand)
    if (viewed) landed.push(viewed)
                                                              
                                                       
                                              
    const recycledCount = insightRecycledCount(ev, s)
    if (recycledCount > 0) landed.push({ kind: 'recycled', player: (ev as { player: PlayerId }).player, count: recycledCount })
                                                                
                                                         
                                             
                                                    
    if (ev.kind === 'recycle') {
                                                               
                                                                       
                                                                                        
                                                                                       
                                                                                 
      const cardCount = ev.objs.filter((o) => { const b = beforeLand.objects[o]; return b !== undefined && !isRune(b) && b.owner === ev.player }).length
      if (cardCount > 0) landed.push({ kind: 'recycled', player: (ev as unknown as { player: PlayerId }).player, count: cardCount })
    }
                                                                       
    if (ev.kind === 'negate') {
      const recycledOnLeave = recycledOnLeaveSignal(beforeLand.chain.find((it) => it.id === ev.target), beforeLand, s)
      if (recycledOnLeave) landed.push(recycledOnLeave)
    }
    if (eventTriggersCleanup(ev)) cleanupNeeded = true        
  }

                                         
  if (cleanupNeeded) {
    s = runCleanupToFixpoint(s, deps.cleanupHooks ?? {})
                                                
                                             
                                                        
                                                         
                                                        
                                  
    const snaps = takeDeathSnapshots()
    if (deps.lastRitesEffect && snaps.length > 0) {
      const items = makeLastRitesItems(snaps, s, deps.lastRitesEffect, s.activePlayer, deps.lastRitesChoice, deps.lastRitesBasePerform)
      if (items.length > 0) s = { ...s, chain: addItems(s.chain, items) }
    }
  }

                              
                                                   
                                           
                                                                
  const destroyedSignals = destroyedEventsFrom(takeDestroyed())
  for (const ev of destroyedSignals) {
    deps.onEvent?.(ev, s)                                                          
    landed.push(ev)
  }
                                                                    
  s = noteDestroyedLedgers(s, destroyedSignals)
                                    
                                     
                                                           
  for (const rec of takeRunesRecycled()) {
    for (let i = 0; i < rec.count; i++) landed.push({ kind: 'runeRecycled', player: rec.player })
  }
  clearDamageBlame()                     

                                      
  s = recomputeContinuous(s)

                                                   
                                                                                      
                                                         
                                             
                                                       
                                                                 
                                          
                                                             
                                                           
                                               
  for (const ev2 of collectMightCrossed(state, s)) landed.push(ev2)

  return { state: s, events: landed }
}

export function reduce(state: GameState, action: Action, deps: ReduceDeps = {}): ReduceResult {
  return applyEvents(state, actionToEvents(state, action), deps)
}

   
                                                         
                                                      
                                                         
   
function insightRecycledCount(ev: GameEvent, after: GameState): number {
  if (ev.kind !== 'insight') return 0
  const deck = after.zones[`mainDeck:${ev.player}` as ZoneId]
  const available = deck?.contents.length ?? 0
  if (ev.recycleAll === true) return Math.min(ev.count, available)
  return ev.recycle?.length ?? 0
}
