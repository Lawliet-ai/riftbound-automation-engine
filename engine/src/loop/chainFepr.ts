                                                
                                                                                                 
                                                              
                                                                            

import type { GameState } from '../state/gameState'
import { banishInState } from '../actions/banish'
import { noteCardConfirmed } from '../keywords/rally'
import type { PlayerId, ZoneId } from '../state/ids'
import { moveObjectInState } from '../state/mutations'
import { applyEvents, recycledOnLeaveSignal, type ReduceDeps } from './reduce'
import { runCleanupToFixpoint } from './cleanup'
import { recycleObjects } from '../keywords/insight'
import type { GameEvent } from './events'
import { spellGuarded } from '../keywords/negate'
import { isUnit } from '../state/cardTypes'
import type { ObjId } from '../state/ids'
import { detectTriggersForBatchAndNote } from '../dsl/trigger'
import { targetsOf, effectPlayedSpellTargetSignals, decodeTargetOids } from './chainTargets'                                                                 
import { filterTargetable } from '../keywords/untargetable'                                         
import {
  addItems,
  choicesFor,
  confirmItem,
  dropItemChoices,
  earliestPending,
  FAST_RESOLVE_KINDS,
  MAY_CHOOSE_DECLINE,
  MAY_CHOOSE_KEY,
  newestConfirmed,
  pendingItems,
  removeItem,
  reorderBatchFirst,
  SKIPPED_BY_757, // ★1805c §757 掐链:循环里跳过【这一问】的哨兵
  TRIGGER_ORDER_KEY,
  type ChainItem,
  type ChoiceRequest,
} from './chain'

                                                 
export const FEPR_STEP_NAMES = {
  finalize: '确认',
  execute: '执行',
  pass: '让过',
  resolve: '结算',
} as const

                                 
export const FEPR_ITERATION_CAP = 1000

   
                                                                
                                                  
                                           
   
export const GATING_SKIP_ITERATION_CAP = 200

export interface FeprDecision {
  readonly kind: 'play' | 'pass'
                                  
  readonly items?: readonly ChainItem[]
}

                                             
export type FeprDecide = (state: GameState, player: PlayerId) => FeprDecision

   
                      
                                                         
   
export function nextInTurnOrder(state: GameState, p: PlayerId): PlayerId {
  const i = state.players.indexOf(p)
  const next = state.players[(i + 1) % state.players.length]
  if (next === undefined) throw new Error('无玩家')
  return next
}

   
                                                                      
                                               
   
   
                                                        
                                                                 
                                                                         
   
                                                          
                                                          
                                                                
                                                               
let resolveRewriter: ((state: GameState, item: ChainItem, events: readonly GameEvent[]) => readonly GameEvent[]) | null = null
export function setResolveRewriter(p: (state: GameState, item: ChainItem, events: readonly GameEvent[]) => readonly GameEvent[]): void {
  resolveRewriter = p
}

function boostNegativePumps(state: GameState, item: ChainItem, events: readonly GameEvent[]): readonly GameEvent[] {
  if (!spellGuarded(state, item.controller as string)) return events
                                                             
                        
                                                                   
                                            
                                       
                                
  const targets = targetsOf(item)
    .map((oid) => state.objects[oid as ObjId])
    .filter((o): o is NonNullable<typeof o> => o !== undefined && isUnit(o))
  if (targets.length === 0) return events
  return events.map((ev) => {
    if (ev.kind !== 'addEffect') return ev
    const m = ev.effect.modification
    if (m.kind !== 'addMight' || m.delta >= 0) return ev
                                             
                                                            
                                                 
                                                            
                                         
    if (!targets.some((t) => ev.effect.predicate(t, state))) return ev
    return { ...ev, effect: { ...ev.effect, modification: { ...m, delta: m.delta - 1 } } }
  })
}

function resolveNewest(state: GameState, deps: ReduceDeps): GameState {
  const item = newestConfirmed(state.chain)
  if (!item) return state
                                                             
  const raw645 = item.resolve(state, choicesFor(state, item), item)
  const rewritten645 = resolveRewriter ? resolveRewriter(state, item, raw645) : raw645                 
                                                                       
                                                             
  const { state: afterEffect, events: resolveEvents } = applyEvents(state, boostNegativePumps(state, item, rewritten645), { ...deps, fromEffect: true, effectController: item.controller })
  let s: GameState = {
    ...afterEffect,
    chain: removeItem(afterEffect.chain, item.id),
    priority: null,
    feprPasses: 0,
    resolveChoices: {}, // 清空本项目的结算期选择
  }
                                                     
                                                
                                           
                                                       
  const spawnedSignals: GameEvent[] = []
  for (const ev of resolveEvents) {
    if (ev.kind !== 'playSpellFromZone' || !deps.playSpellFromZone) continue
    const defId = s.objects[ev.card]?.defId
                                       
    const fromZoneKind = s.zones[s.objects[ev.card]?.zone ?? ('' as never)]?.kind
    const played = deps.playSpellFromZone(s, ev)
    if (!played) continue
    s = { ...played.state, chain: addItems(played.state.chain, [played.item]) }
    if (defId !== undefined) {
      spawnedSignals.push({ kind: 'playSpell', player: ev.player, cardOid: ev.card, chainCardOid: (played.item as { cardOid?: unknown }).cardOid, defId,
        ...(fromZoneKind !== undefined ? { fromZoneKind } : {}), // ★720 从牌堆/废牌堆打出=「手牌以外」
        ...(played.paidMana !== undefined ? { manaPaid: played.paidMana } : {}), // ★685 实付法力账
        ...(ev.target !== undefined ? { target: ev.target } : {}) } as GameEvent)
                                                              
                                                                              
                                                                     
      spawnedSignals.push(...effectPlayedSpellTargetSignals(
        s, ev.target, ev.player, (played.item as { cardOid?: ObjId }).cardOid,
      ))
    }
  }
                                                          
                                                                   
                                                                      
                                                       
                                                                    
  if (item.kind === 'spell') {
    const rdefId = item.cardOid !== undefined ? s.objects[item.cardOid]?.defId : undefined
    spawnedSignals.push({
      kind: 'spellResolved',
      player: item.controller,
      ...(item.paidMana !== undefined ? { manaPaid: item.paidMana } : {}), // ★1735 实付法力随结算带出(缺省=不明)
      ...(item.cardOid !== undefined ? { cardOid: item.cardOid } : {}),
      ...(rdefId !== undefined ? { defId: rdefId } : {}),
    } as GameEvent)
  }
                                                              
                                                                 
  if (spawnedSignals.length > 0) s = applyEvents(s, spawnedSignals, deps).state
                                                           
                                              
                                                                      
                                        
  if (item.heldTriggers !== undefined && item.heldTriggers.length > 0) {
    s = { ...s, chain: addItems(s.chain, item.heldTriggers) }
  }
                                                          
                                                        
  if (deps.triggerSource) {
                                                              
                                                                  
                                                                   
    const pre1212 = { triggers: deps.triggerSource(state), oids: new Set(Object.keys(state.objects)) }
    const det = detectTriggersForBatchAndNote(s, [...resolveEvents, ...spawnedSignals], deps.triggerSource(s), item.controller, pre1212)
    s = det.state                                                
    if (det.items.length > 0) s = { ...s, chain: addItems(s.chain, det.items) }
  }
                                             
  if (item.kind === 'spell' && item.cardOid) {
    const card = s.objects[item.cardOid]
    const sBefore = s                             
    if (card && s.zones[card.zone]?.kind === 'chain') {
                                                      
                                                                      
      s = item.exileOnLeave === true
        ? banishInState(s, item.cardOid, item.exileBy)                               
        : item.recycleOnLeave === true
          ? recycleObjects(s, [item.cardOid])
          : moveObjectInState(s, item.cardOid, `discard:${card.owner}` as ZoneId)
                                                      
                                                       
      if (item.exileOnLeave === true && deps.triggerSource) {
                                                                                  
                                                                                  
                                                                        
        const exileId = `exile:${card.owner}` as ZoneId
        const landed = (s.zones[exileId]?.contents ?? []).find((id) => !(sBefore.zones[exileId]?.contents ?? []).includes(id))
        const note: GameEvent[] = landed === undefined ? [] : [{ kind: 'banished', player: card.owner, card: landed, defId: s.objects[landed]?.defId ?? card.defId, from: card.zone } as GameEvent]
        if (item.exileBy !== undefined) note.push({ kind: 'exiledOnLeave', by: item.exileBy, player: item.controller } as GameEvent)
        if (note.length > 0) {
                                                                   
          const pre2 = { triggers: deps.triggerSource(sBefore), oids: new Set(Object.keys(sBefore.objects)) }
          const det2 = detectTriggersForBatchAndNote(s, note, deps.triggerSource(s), item.controller, pre2)
          s = det2.state
          if (det2.items.length > 0) s = { ...s, chain: addItems(s.chain, det2.items) }
        }
      }
    }
  }
                                                                                      
  if (item.recycleOnLeave === true && deps.triggerSource) {
    const note = recycledOnLeaveSignal(item, state, s)
    if (note) {
      const det3 = detectTriggersForBatchAndNote(s, [note], deps.triggerSource(s), item.controller, { triggers: deps.triggerSource(state), oids: new Set(Object.keys(state.objects)) })
      s = det3.state
      if (det3.items.length > 0) s = { ...s, chain: addItems(s.chain, det3.items) }
    }
  }
                                                         
                                                                  
                                                           
                                                                    
                                                            
                                                        
                                                                 
                                                     
                                                          
                                   
  return runCleanupToFixpoint(s, deps.cleanupHooks ?? {})
}

   
                 
                                     
                                                        
                                                                      
                                                
   
export type FeprStep =
  | { readonly kind: 'done'; readonly state: GameState }
  | { readonly kind: 'decision'; readonly state: GameState; readonly player: PlayerId }
  | { readonly kind: 'choice'; readonly state: GameState; readonly request: ChoiceRequest }

   
                                                      
                                                               
   
                                                                                     
                                                                           
                                                                              
                                                                                
                                                       
                                                         
export { MAY_CHOOSE_KEY, MAY_CHOOSE_DECLINE, TRIGGER_ORDER_KEY } from './chain'

   
                                                           
  
                                                                     
                                                                                       
                                                   
                                                             
                                                             
                                                              
  
                                                                                   
                                                                                      
                                           
  
                                          
                                                                              
                                         
                                                                       
                                                           
                  
                                                    
                                                                
  
                                           
   
export function withTargetableCandidates(state: GameState, req: ChoiceRequest): ChoiceRequest | null {
  if (req.isTarget !== true) return req
  const ids = req.candidates.map((c) => c.id)
  const hasLiveObject = (id: string): boolean =>
    decodeTargetOids(id).some((oid) => state.objects[oid as ObjId] !== undefined)
                                        
  if (!ids.some(hasLiveObject)) return req
  const passes = new Set(filterTargetable(state.objects, req.controller as string, ids))
  const kept = req.candidates.filter((c) => passes.has(c.id))
                                                             
  if (!kept.some((c) => hasLiveObject(c.id))) return null
  return { ...req, candidates: kept }
}

   
                                                 
  
                                                                      
                                                                                 
                                                              
                                              
                                                  
  
                                                         
                                            
                                          
                                                                
                                
  
                                             
                                                                                 
                                                                             
                                                                                 
                                                     
                                                
                                                              
                                                           
                            
                                                                    
                                             
                                                                      
   
function askGated757(
  state: GameState,
  base: Readonly<Record<string, string>>,
  next: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null,
  label: string,
  first?: ChoiceRequest | null,
): ChoiceRequest | null {
  const asked: Record<string, string> = { ...base }
  let raw: ChoiceRequest | null = first === undefined ? next(state, asked) : first
  for (let iter = 0; iter < GATING_SKIP_ITERATION_CAP; iter++) {
    if (raw === null) return null
                                                                   
                                                                                
    if (raw.maskedOut !== true) {
      const gated = withTargetableCandidates(state, raw)
      if (gated !== null) return gated
    }
    asked[raw.key] = SKIPPED_BY_757                         
    raw = next(state, asked)
  }
  throw new Error(`§757 掐链循环在 ${GATING_SKIP_ITERATION_CAP} 轮内未收敛(${label}):卡似乎在恒返回同一问`)
}

export function advanceFepr(state: GameState, deps: ReduceDeps = {}): FeprStep {
  let s = state
  for (let iter = 0; iter < FEPR_ITERATION_CAP; iter++) {
    const pending = pendingItems(s.chain)

                         
    if (pending.length > 0) {
      const earliest = earliestPending(s.chain)!                  

                                                              
                                     
                                                            
                                                         
                                                        
                                                                    
                                              
                                                                                
                                  
      if (earliest.batchId !== undefined) {
        const batch = s.chain.filter(
          (it) => it.status === 'pending' && it.batchId === earliest.batchId && it.controller === earliest.controller,
        )
        if (batch.length >= 2) {
          const key = `${TRIGGER_ORDER_KEY}:${earliest.batchId}`
          const answered = s.resolveChoices?.[key]
          if (answered === undefined) {
            return { kind: 'choice', state: s, request: {
              itemId: earliest.id, controller: earliest.controller, key,
                                                         
              prompt: '这几个技能同时触发了,先结算哪一个?',
                                                                           
                                                                   
              candidates: batch.map((it) => ({
                id: it.id,
                label: '一个同时触发的技能',
                ...(it.sourceDefId !== undefined ? { sourceDefId: it.sourceDefId } : {}),
              })),
            } }
          }
                                                           
          const reordered = reorderBatchFirst(s.chain, earliest.batchId, answered)
          if (reordered !== s.chain) { s = { ...s, chain: reordered }; continue }
        }
      }
                                                   
                                                             
                                                              
      if (earliest.mayChoose === true) {
        const key = `${MAY_CHOOSE_KEY}:${earliest.id}`
        const answered = s.resolveChoices?.[key]
        if (answered === undefined) {
                                                         
                                                  
                                             
                                                                
                                                
          return { kind: 'choice', state: s, request: {
            itemId: earliest.id, controller: earliest.controller, key,
            prompt: '是否执行这条触发式技能?',
            ...(earliest.sourceDefId !== undefined ? { sourceDefId: earliest.sourceDefId } : {}),
            candidates: [{ id: 'yes', label: '执行' }, { id: MAY_CHOOSE_DECLINE, label: '不执行' }],
          } }
        }
        if (answered === MAY_CHOOSE_DECLINE) {
                                       
                                                         
          const ledger = { ...(s.abilityFiredThisTurn ?? {}) }
          if (earliest.oncePerTurnKey !== undefined) delete ledger[earliest.oncePerTurnKey]
          s = { ...s, chain: removeItem(s.chain, earliest.id), abilityFiredThisTurn: ledger, feprPasses: 0 }
                                                                      
                                                                       
          s = dropItemChoices(s, earliest)
                                                                      
                                                                      
                                                                            
                                                                         
                                                                                       
                                                                            
                                                                            
                                                                         
                                                                  
                                                   
                                                                         
          s = runCleanupToFixpoint(s, deps.cleanupHooks ?? {})
          continue
        }
      }
                                                    
                                                           
                                                      
                                                          
                                                                  
                                                   
      if (earliest.confirmChoice !== undefined) {
                                                    
                                                                  
                                                                  
        const req = askGated757(s, s.resolveChoices ?? {}, earliest.confirmChoice, `confirm:${earliest.id}`)
                                                                    
                                                             
        if (req !== null) return { kind: 'choice', state: s, request: { ...req, stage: 'confirm' } }
                                                    
                                                                        
        if (deps.flushTargetSignals) s = deps.flushTargetSignals(s, 'confirm')
      }
                                                         
                                                                
                                                                        
      if (earliest.basePerform !== undefined) {
        const paid = earliest.basePerform(s, deps)                       
        if (paid === null) {
          const ledger = { ...(s.abilityFiredThisTurn ?? {}) }
          if (earliest.oncePerTurnKey !== undefined) delete ledger[earliest.oncePerTurnKey]
          s = { ...s, chain: removeItem(s.chain, earliest.id), abilityFiredThisTurn: ledger, feprPasses: 0 }
                                                      
          s = dropItemChoices(s, earliest)
                                                                             
          s = runCleanupToFixpoint(s, deps.cleanupHooks ?? {})
          continue
        }
                                                            
                                                                             
                                                                         
                                                         
                                                  
                                                                         
                                                                                
                                                             
                                                                     
                                                    
                                                       
                                                                
                                                                     
                                                          
                     
                                                                           
                                                                        
                                                                            
                                                                 
                                                          
        s = paid === s ? paid : runCleanupToFixpoint(paid, deps.cleanupHooks ?? {})
      }
                                                             
                                                                    
                                                  
                                                                              
                                             
                                                                   
                           
                                                           
                                                  
      if (earliest.confirmSignals !== undefined) {
        const sig = earliest.confirmSignals(s, s.resolveChoices ?? {})
        if (sig.length > 0) {
          s = applyEvents(s, sig, deps).state
                                                     
          if (deps.triggerSource) {
            const det = detectTriggersForBatchAndNote(s, sig, deps.triggerSource(s), earliest.controller)
            s = det.state
            if (det.items.length > 0) s = { ...s, chain: addItems(s.chain, det.items) }
          }
        }
      }
      s = { ...s, chain: confirmItem(s.chain, earliest.id), feprPasses: 0 }                             
                                                                   
                                                                            
                                                                                    
                                                                     
                                                          
                                                                                    
                                                                                    
               
                                                                  
                                                                                        
                                                                          
                                                                 
                                                           
                                                                                  
                                                                        
                                                                        
                                                  
                                                                        
                                                                       
                                                                                             
                                              
                                                                      
                                                                                   
                                                                               
                                                                         
                                                                      
                                                    
                                                                            
                                              
                                                           
                                                     
      const frozenChoices = s.resolveChoices ?? {}
      if (Object.keys(frozenChoices).length > 0) {
        s = {
          ...s,
          chain: s.chain.map((i) => (i.id === earliest.id
            ? { ...i, frozenChoices: { ...(i.frozenChoices ?? {}), ...frozenChoices } }
            : i)),
        }
      }
                                                         
                                                                      
                                                                              
      const rcAfterFreeze = s.resolveChoices ?? {}
      const keptChoices = Object.fromEntries(
        Object.entries(rcAfterFreeze).filter(([k]) => k.startsWith(`${TRIGGER_ORDER_KEY}:`)),
      )
      if (Object.keys(keptChoices).length !== Object.keys(rcAfterFreeze).length) {
        s = { ...s, resolveChoices: keptChoices }
      }
                                        
                                                       
                                                         
      if (earliest.cardOid !== undefined) {
                                                       
                                                
                                                                  
        s = noteCardConfirmed(s, earliest.controller, earliest.cardOid)
      }
                                                   
                                                              
                                                            
                                                                
                                                        
                                                                               
                                                      
                                                                   
                                                             
                                                                                  
                                               
      s = runCleanupToFixpoint(s, deps.cleanupHooks ?? {})
      if (FAST_RESOLVE_KINDS.has(earliest.kind)) {
        s = resolveNewest(s, deps)                                      
      }
      continue                                     
    }

    if (s.chain.length === 0) {
                                                        
                                                          
                                                                       
                                                                 
                                             
                                                                                   
                                                                                     
                                                                  
                                                  
      const emptied = Object.keys(s.resolveChoices ?? {}).length > 0 ? { ...s, resolveChoices: {} } : s
      return { kind: 'done', state: { ...emptied, priority: null, feprPasses: 0 } }                  
    }

                                                        
    if (s.feprPasses >= s.players.length) {
      const item = newestConfirmed(s.chain)!
                                                  
      const req = item.nextChoice?.(s, choicesFor(s, item)) ?? null
                                                            
                                                                
                                                               
      const gated = item.nextChoice === undefined
        ? null
        : askGated757(s, choicesFor(s, item), item.nextChoice, `resolve:${item.id}`, req)
      if (gated) {
                                                    
                                                   
                                                    
                                                         
        const sd = (gated as { sourceDefId?: string }).sourceDefId
          ?? (item as { sourceDefId?: string }).sourceDefId
          ?? (item.kind === 'spell' ? s.objects[(item as { cardOid: ObjId }).cardOid]?.defId : undefined)
        const withStage = { ...gated, stage: 'resolve' as const }                                      
        return { kind: 'choice', state: s, request: sd !== undefined ? { ...withStage, sourceDefId: sd } : withStage }                     
      }
                                              
                                                                      
                                                               
      if (deps.flushTargetSignals) s = deps.flushTargetSignals(s, 'resolve')
      s = resolveNewest(s, deps)
      continue                      
    }

                                               
                                                                  
                                                           
                                                                    
    if (s.feprPasses === 0) {
      s = { ...s, priority: newestConfirmed(s.chain)!.controller }
    }
    return { kind: 'decision', state: s, player: s.priority! }
  }
  throw new Error(`FEPR 链循环未在 ${FEPR_ITERATION_CAP} 轮内收敛`)
}

   
                                          
                                                     
                                                                      
   
export function applyFeprDecision(
  state: GameState,
  player: PlayerId,
  decision: FeprDecision,
  _deps: ReduceDeps = {},
): GameState {
  if (decision.kind === 'play' && decision.items && decision.items.length > 0) {
    return { ...state, chain: addItems(state.chain, decision.items), priority: null, feprPasses: 0 }
  }
  const passes = state.feprPasses + 1               
  if (passes >= state.players.length) {
    return { ...state, feprPasses: passes }                                                 
  }
  return { ...state, priority: nextInTurnOrder(state, player), feprPasses: passes }          
}

                                                                             
export function submitChoice(state: GameState, key: string, answer: string): GameState {
  return { ...state, resolveChoices: { ...state.resolveChoices, [key]: answer } }
}

   
                                                               
                                                                                        
   
export function runFepr(
  state: GameState,
  decide: FeprDecide,
  deps: ReduceDeps = {},
  choiceDecide: (req: ChoiceRequest) => string = (req) => req.candidates[0]?.id ?? '',
): GameState {
  let s = state
  for (let iter = 0; iter < FEPR_ITERATION_CAP; iter++) {
    const step = advanceFepr(s, deps)
    if (step.kind === 'done') return step.state
    if (step.kind === 'choice') {
      s = submitChoice(step.state, step.request.key, choiceDecide(step.request))
      continue
    }
    s = applyFeprDecision(step.state, step.player, decide(step.state, step.player), deps)
  }
  throw new Error(`FEPR 链循环未在 ${FEPR_ITERATION_CAP} 轮内收敛`)
}
