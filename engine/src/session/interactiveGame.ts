                                         
                                                                    
                                                                                

import { freshOid, zonesByKind, TURN_END_LEDGER_LIST_KEYS, TURN_END_LEDGER_RECORD_KEYS, type GameState, type PendingContest, type PendingTargetSignalBatch } from '../state/gameState'
import { computeCost, type CostMod, consumeNextSpellDiscount, consumeNextCardDiscount, consumeNextSpellEcho, consumePlayFromDiscardGrant, passiveEchoGrants, costChoiceVariants, resolveCostChoices, reduceExtraCost } from '../game/costPipeline'
import { isEmpowered } from '../keywords/empower'                                                         
import { addCosts } from '../state/runePool'
import { entryStatusPatch, hasHaste, hasteExtraCost } from '../keywords/haste'
import { GEAR_MANA_FREE_MAX } from '../loop/events'
import { hasNimble, withImpliedKeywords } from '../keywords/nimble'
import { totalDeflectSurcharge } from '../keywords/deflect'
import { isRecursionSource, recursionCostOptions } from '../keywords/recursion'
import { noteCardConfirmed } from '../keywords/rally'
import { consumeNextUnitReadyInState } from '../effects/nextUnitReady'
import { withShangeCopies } from '../effects/shange'        
import type { ReplacementShield } from '../effects/replacementRegistry'
import type { GameObject } from '../state/object'
import { isFieldedExceptStandby } from '../state/zones'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import type { ZoneKind } from '../state/zones'
import { moveObjectInState } from '../state/mutations'
import { isExhausted, exhaustPatch } from '../state/exhaust'               
import { moveRestricted } from '../state/moveRestriction'
import { project, type ClientView } from '../net/project'
import { landAndEnqueueTriggers, stepAfterDecision, type TriggerProvider } from '../loop/orchestrate'
import { pendingReplaceEventAsk, type ReplaceEventAsk, runCleanupToFixpoint, DECLINE_REPLACEMENT, type DestroyReplacement, type DestroyAsk } from '../loop/cleanup'
import { advanceFepr, submitChoice, withTargetableCandidates, GATING_SKIP_ITERATION_CAP, type FeprStep } from '../loop/chainFepr'                                          
import type { ReduceDeps } from '../loop/reduce'
import { type ChainItem, addItems, type ChoiceRequest, earliestPending, SKIPPED_BY_757 } from '../loop/chain'
import { playCard } from '../loop/playCard'
import { spellResolveGated, spellNextChoiceGated } from '../loop/spellTargetAtResolve'                                          
import { canPlayInTiming, isClosed } from '../loop/timing'
import { canActivateNow, type ActivationSite } from '../loop/activationTiming'
import type { DeathSnapshot } from '../keywords/lastRites'

                                                     
export type InteractiveGameLastRites = (snapshot: DeathSnapshot, chosen?: Readonly<Record<string, string>>, state?: import('../state/gameState').GameState) => readonly import('../loop/events').GameEvent[]
import { assignBattleRoles } from '../combat/battleRoles'
import { recallUnattachedEquipment, removeMisplacedStandby, recallForeignBasePermanents } from '../state/recall'
import { isEquipment, isUnit, type TypeSource } from '../state/cardTypes'
import type { Cost, Pip } from '../state/runePool'
import { spellLegalTargets, spellNeedsTarget, type ActivatedSpec, type PlayCtx, type PlaySpec, type PlaySpecProvider } from '../loop/playSpec'                                      
import type { SpawnTokenEvent, GameEvent, PlayUnitEvent } from '../loop/events'
import { runAwakenPhase, runExpirationStep } from '../loop/turnStructure'
import { ephemeralTriggers } from '../keywords/ephemeral'
import { expireThisTurnEffects, recomputeContinuous } from '../effects/continuousView'
import { collectMightCrossed } from '../effects/mightCrossed'               
import { attemptConquer, attemptHold, resetTurnLedgers } from '../scoring/score'
import { advanceTurnQueue } from '../state/turnQueue'
import { drawCard } from '../goldfish/singleSeat'
import { openBattlefields, controlledBattlefields, controlsBattlefield, writeControl, loseUncontrolledBattlefields, soleUnitControllerAt, controlMap } from '../state/battlefieldControl'
import { openCombat, runCombatDamageAndResolve, pendingCombatDamageOrder, type CombatDamageOrderAsk } from '../combat/battle'
import { assignBattleRolesWithSignals } from '../combat/battleRoles'
import { noteRoleGains, orderForChain, emptyLedger, type SignalLedger, type RoleSignal } from '../combat/roleSignals'
import { parseDamageOrder } from '../combat/damageAssign'
import { summarizeCombat } from '../combat/summary'
import { resolveConquer } from '../scoring/holdConquer'
import { BURNOUT_OPPONENT_KEY, parseBurnoutOpponents, type BurnoutOpponentAsk } from '../scoring/burnout'                      
import { canPayFromState, manaAvailable, payFromState, recallRunes, refreshRunePool } from '../game/economy'
import type { PaymentPick } from '../state/runePool'                  
import { applyEvents, appendContest } from '../loop/reduce'
import { applyMulligan, mulliganTurn } from '../game/mulligan'
import { canPlaceStandby, placeStandby, standbyLockedBattlefield, standbyTargetViolatesLock } from '../keywords/standby'
import type { Rng } from '../util/rng'
import { Journal } from '../net/journal'
import { addChosenTarget, addChosenTargetTo, chosenTargetSignals, decodeTargetOids, liveTargetOids, holdTriggersOnResolvingItem } from '../loop/chainTargets'                                                                                   
import { detectTriggersForBatchAndNote } from '../dsl/trigger'
import { currentKeywords } from '../state/object'

export type InteractiveAction =
                                                                            
                                                   
                                                                 
                                                                  
  | { readonly kind: 'PLAY_UNIT'; readonly player: PlayerId; readonly oid: string; readonly to: string; readonly haste?: boolean; readonly bonus?: boolean; readonly bonusChoice?: string; readonly costChoice?: string; readonly payWith?: PaymentPick; readonly due?: Cost }
  // ★第482轮 §820.1.c.2/§820.3:一张牌可以有【多个回响】,各自决定付不付 ⇒ `echoPicks`
  //   记的是"付了哪几个"(下标进 `echoCostsOf` 的清单)。`echo: true` 是旧写法 = 付第 0 个,
  //   两者都认(旧动作/老测试照走),`echoPicks` 优先。
  | { readonly kind: 'PLAY_CARD'; readonly player: PlayerId; readonly cardOid: string; readonly target?: string; readonly echo?: boolean; readonly echoPicks?: readonly number[]; readonly echoDiscardOid?: string; readonly echoTarget?: string; readonly echoTargets?: readonly string[]; readonly altCost?: boolean; readonly altChoice?: string; readonly recursionIndex?: number; readonly costChoice?: string; readonly bonus?: boolean; readonly bonusChoice?: string; readonly payWith?: PaymentPick; readonly due?: Cost }                                                                                                                                               
  | { readonly kind: 'ATTACK'; readonly player: PlayerId; readonly battlefield: string }
  | { readonly kind: 'CHOOSE'; readonly player: PlayerId; readonly key: string; readonly answer: string }
  | { readonly kind: 'PASS'; readonly player: PlayerId }
  | { readonly kind: 'END_TURN'; readonly player: PlayerId }
  | { readonly kind: 'MULLIGAN'; readonly player: PlayerId; readonly put: readonly string[] }                 
  | { readonly kind: 'PLACE_STANDBY'; readonly player: PlayerId; readonly oid: string; readonly battlefield: string; readonly alt?: boolean; readonly free?: boolean; readonly payWith?: PaymentPick; readonly due?: Cost }                                                                                   
  | { readonly kind: 'PLAY_STANDBY'; readonly player: PlayerId; readonly oid: string; readonly target?: string; readonly due?: Cost; readonly haste?: boolean; readonly bonus?: boolean; readonly bonusChoice?: string; readonly costChoice?: string; readonly echoPicks?: readonly number[] }                                                                                                          
  | { readonly kind: 'ACTIVATE'; readonly player: PlayerId; readonly oid: string; readonly ability: string; readonly label?: string; readonly target?: string; readonly discardOid?: string; readonly extraChoice?: string; readonly costChoice?: string; readonly payWith?: PaymentPick; readonly due?: Cost }                                                                          
  | { readonly kind: 'MOVE'; readonly player: PlayerId; readonly oid: string; readonly to: string }                        
  // ★769 §144.3「玩家可**同时**执行多个单位的标准移动。这会被视为对多个单位执行的**一次**游戏行动。」
  //   §144.3.a 终点【统一】= 一个 `to`;§144.3.b 起点可各不相同;§144.3.c 休眠费用同时支付。
  //   ⚠️ 不进 legalActions 枚举(子集是 2^n,列不完)——界面自己按已枚举的单点 MOVE 求交集拼这条,
  //     处理器这边把每个单位都按单点 MOVE 的同一套门再验一遍(与 ATTACK 同款:内部入口 + 处理器权威)。
  | { readonly kind: 'MOVE_GROUP'; readonly player: PlayerId; readonly oids: readonly string[]; readonly to: string }
  | { readonly kind: 'CONCEDE'; readonly player: PlayerId }                                       

                                    
export interface BlockedPlay {
  readonly oid: string
  readonly defId: string
  readonly reason: 'timing' | 'cost' | 'noTarget' | 'notImplemented'
                                             
  readonly detail: string
                                                
  readonly costMana?: number
  readonly costPips?: readonly string[]
  readonly haveMana?: number
}

   
                                                    
  
                                                    
                                              
                                                           
                                   
  
                                                     
                                                                
                                                         
                                                               
                                                       
                                      
                                                                  
                                                      
                                                     
   
export interface DuelInfo {
                                                                         
  readonly kind: 'combat' | 'noncombat'
                             
  readonly battlefield: string
                                      
  readonly passes: number
                                          
  readonly needed: number
}

export type Pending =
  | { readonly mode: 'action'; readonly player: PlayerId }
  | { readonly mode: 'window'; readonly player: PlayerId; readonly chainDepth: number; readonly duel?: DuelInfo }
  | { readonly mode: 'choice'; readonly player: PlayerId; readonly request: ChoiceRequest }
  | { readonly mode: 'mulligan'; readonly player: PlayerId }                              
  | { readonly mode: 'gameover'; readonly winner: PlayerId }

   
                                                     
                                               
                                                                      
   
export interface InteractiveSnapshot {
  readonly state: GameState
  readonly window: Extract<FeprStep, { kind: 'decision' }> | null
  readonly choice: Extract<FeprStep, { kind: 'choice' }> | null
  readonly pendingCombat: { readonly battlefield: string; readonly attacker: PlayerId; readonly defender: PlayerId } | null
  readonly pendingTurnStart: { readonly player: PlayerId; readonly stage: 'start' | 'scoring' } | null
  readonly duelPasses: number | null
  readonly duelPlayOpener: PlayerId | null
  readonly pendingNonCombatDuel: { readonly battlefield: string; readonly contester: PlayerId; readonly wasOpen?: boolean } | null
  readonly pendingMoveContest: { readonly player: PlayerId; readonly to: string; readonly preOwned: boolean; readonly wasOpen: boolean } | null
  readonly pendingTurnEnd: PlayerId | null
                                                               
  readonly pendingDamageOrder: CombatDamageOrderAsk | null
                                          
  readonly pendingDestroyOrder: DestroyAsk | null
                                                  
  readonly pendingContestOrder: ContestOrderAsk | null
                                             
  readonly pendingBurnoutOpponent: BurnoutOpponentAsk | null
                                  
  readonly pendingReplaceEventOrder: ReplaceEventAsk | null
  readonly replayAfterAnswer: InteractiveAction | null
                                            
  readonly roleLedger: SignalLedger
  readonly pendingRoleSignals: readonly RoleSignal[]
}

                                                       
const DUEL_PLAY_KINDS: ReadonlySet<string> = new Set(['PLAY_CARD', 'PLAY_STANDBY', 'PLAY_UNIT', 'ACTIVATE'])

   
                                    
                                                         
                                                           
                                                            
                                                                            
                                                                   
                                                                 
  
                                                    
                                                                            
                                                                       
   
export interface PlayExtraCost {
  readonly label: string
                                            
  readonly required?: boolean
                                      
  readonly cost?: Cost
                                                        
  readonly options?: (state: GameState, player: PlayerId) => readonly { readonly id: string; readonly label: string }[]
     
                                                          
                                                
                                          
                                                        
     
  readonly available?: (state: GameState, player: PlayerId) => boolean
                                      
  readonly payEvents?: (state: GameState, player: PlayerId, choice?: string) => readonly GameEvent[]
     
               
    
                                             
                                                     
                                             
                                                                   
                                                                     
    
                                                       
                                            
                                                            
                                                                 
                                                               
                                    
                                                     
                                                        
                                                
     
  readonly events?: (player: PlayerId, selfOid: string, choice?: string) => readonly GameEvent[]
     
                                                       
                                                                 
                                                  
                                               
     
  readonly discount?: (state: GameState, player: PlayerId, choice?: string) => readonly CostMod[]
     
                                  
    
                                                    
                                              
                                                
    
                                                       
                                                 
                                                            
     
  readonly destinations?: (state: GameState, player: PlayerId, choice?: string) => readonly string[]
}

                                         
interface PlayDeclaration {
  readonly haste?: boolean
  readonly bonus?: boolean
  readonly bonusChoice?: string
                                                                       
  readonly costChoice?: string
}

export interface InteractiveDeps {
  readonly getTriggers: TriggerProvider
  readonly handPlaySpecs: PlaySpecProvider
                                       
  readonly cardCost?: (defId: string) => Cost
     
                                                  
                       
                                                   
                                      
     
  readonly costModsFor?: (
    state: GameState, player: PlayerId, defId: string, ctx?: CostCtx,
  ) => readonly CostMod[]
                                                              
  readonly cardDomains?: (defId: string) => readonly string[]
     
                                                
                                                          
     
  readonly battlefieldName?: (state: GameState, battlefield: string) => string | undefined
     
                                                             
                                                    
                                                       
     
  readonly entryReadyFor?: (state: GameState, player: PlayerId, defId: string, to?: string, self?: string) => boolean
     
                                                          
                                          
                                                    
                                                  
                               
                                                  
     
  readonly entryDormantFor?: (state: GameState, player: PlayerId, defId: string) => boolean
                                                            
  readonly rng?: Rng
                                                  
  readonly cardKeywords?: (defId: string) => readonly string[]
                                                       
                                                             
                                                 
  readonly hasteGrantedBy?: (state: GameState, player: PlayerId, defId: string, fromZone?: string, spec?: TypeSource) => boolean                                                
                                                  
  readonly standbyAltCost?: (state: GameState, player: PlayerId) => Cost | null
                                           
  readonly playSpecFor?: (defId: string) => PlaySpec | undefined
                                             
  readonly activatedFor?: (defId: string) => readonly ActivatedSpec[]
     
                                                    
                                                         
                                                         
                                              
                            
     
  readonly grantedSpec?: (key: string) => ActivatedSpec | undefined
                                                   
  readonly scoringBonus?: (state: GameState, player: PlayerId, battlefield: string, kind: 'conquer' | 'hold') => number
                                      
  readonly scoreBlocked?: (state: GameState, player: PlayerId, battlefield: string) => boolean
     
                                                     
                                                                
                                                                 
                                         
     
  readonly scoreBlockedAnywhere?: (state: GameState, player: PlayerId) => boolean
     
                                              
                                                                            
     
  readonly scoreDrawInstead?: (state: GameState, player: PlayerId, battlefield: string) => boolean
     
                                    
                        
                                                             
                                                     
     
  readonly playBanned?: (
    state: GameState, player: PlayerId, defId: string, to: string,
                                                    
                                                       
    oid?: string,
  ) => boolean
     
                                                  
                                                      
     
  readonly deflectWaivedAt?: (state: GameState, zoneId: string) => boolean
     
                                                   
                                    
                                                                      
               
                                              
                           
     
  readonly deflectWaivedForCard?: (defId: string) => boolean
                                                                 
  readonly tokenEntersReady?: (state: GameState, owner: PlayerId) => boolean
                                                      
  readonly tokenSpawnDoublerFor?: (state: GameState, ev: SpawnTokenEvent) => ObjId | undefined
                                                      
  readonly skipDrawPhase?: (state: GameState, player: PlayerId) => boolean
                                                 
  readonly isArmament?: (defId: string) => boolean
                                                 
  readonly isPlainEquipment?: (defId: string) => boolean
                                                                 
  readonly isPlainUnit?: (defId: string) => boolean
                                                           
  readonly barrierIgnoredAt?: (state: GameState, player: PlayerId, battlefield: string) => boolean
                                                          
  readonly combatImmuneAt?: (state: GameState, oid: ObjId) => boolean
                                                              
  readonly echoDiscountFor?: (state: GameState, player: PlayerId) => number
     
                                                
                                        
                           
                                                                       
     
  readonly extraAmbushZones?: (state: GameState, player: PlayerId, defId: string) => readonly string[]
     
                                         
                                                     
                                                          
     
  readonly playBonusFor?: (defId: string) => PlayExtraCost | undefined
     
                                                     
                      
                                                                
                                                      
                                                               
                                                                    
                                                            
                                                          
     
  readonly extraPlaySources?: (state: GameState, player: PlayerId) => readonly ObjId[]
     
                                                           
                                                             
                                                            
                                                
                                                                            
     
  readonly abilityCostModsFor?: (
    state: GameState, player: PlayerId, defId: string, abilityKey: string, selfOid: string,
  ) => readonly CostMod[]
     
                                                     
                                                        
     
  readonly summonRuneCap?: (state: GameState) => number | undefined
     
                                      
                                                    
                                                     
     
  readonly extraPlayZones?: (state: GameState, player: PlayerId, defId: string) => readonly string[]
                                                                                              
  readonly standardMoveSurcharge?: (state: GameState, player: PlayerId, oids: readonly string[], to: string) => Cost | undefined
                                                               
  readonly replaceDestroy?: (state: GameState, oid: ObjId) => GameState | null
     
                                                       
                                             
                                                              
     
  readonly replaceDestroyCandidates?: (state: GameState, oid: ObjId) => readonly DestroyReplacement[]
     
                                              
                                                       
     
  readonly onWouldAskDestroyOrder?: (ask: DestroyAsk) => void
                                                       
  readonly onWouldAskEventOrder?: (ask: ReplaceEventAsk) => void
     
                                                      
                                                      
                                                                          
     
  readonly onWouldAskBurnoutOpponent?: (ask: BurnoutOpponentAsk) => void
                                                             
  readonly extraLethal?: (state: GameState, obj: GameObject) => boolean
     
                                                       
                                                     
                                              
                                                     
     
  readonly replacementShields?: (state: GameState) => readonly ReplacementShield[]
                                               
  readonly lastRitesEffect?: InteractiveGameLastRites
                                                           
  readonly lastRitesBasePerform?: ReduceDeps['lastRitesBasePerform']
                                                     
  readonly lastRitesChoice?: import('../keywords/lastRites').LastRitesChoiceOf
                                                        
  readonly cardKind?: (defId: string) => string
                                                             
  readonly startStepHook?: (state: GameState, player: PlayerId) => GameState
     
                                            
                                       
     
  readonly holdRepeats?: (state: GameState, player: PlayerId, battlefield: string) => number
     
                                           
                                                    
                                                    
     
  readonly conquerRepeats?: (state: GameState, player: PlayerId, battlefield: string) => number
}

   
                                                          
                                                      
                                
                                                                    
                                                                      
                                                   
                                                            
                                                
                                                                                         
                                                 
   
function targetedSignals(
  chooser: PlayerId, target: string | undefined, sourceKind: 'spell' | 'ability',
  sourceOid: string | undefined, state: GameState,
): readonly GameEvent[] {
  return target === undefined ? [] : liveTargetOids(state, target).map((oid) => ({
    kind: 'targeted', chooser, target: oid as ObjId, sourceKind,
    ...(sourceOid !== undefined ? { sourceOid: sourceOid as ObjId } : {}),
  } as GameEvent))
}

   
                           
                                                  
                                                                          
                                                      
                                                             
                                                        
                                
                                                     
                                                                               
                                                     
                                                                                     
                                                               
                                                       
   
export interface CostCtx {
                                   
  readonly fromZone?: ZoneKind
                                                      
  readonly target?: string
     
                                                                      
                                          
                                    
     
  readonly costChoice?: string
     
                                                                                 
                                                                                     
     
  readonly grantedRecursion?: true
     
                                                            
                                                          
                                          
     
  readonly standbyFaceDown?: true
}

                                                              
function costCtxOf(
  state: GameState, cardOid: string | undefined, target?: string, costChoice?: string,
): CostCtx | undefined {
  const z = cardOid === undefined ? undefined : state.objects[cardOid as ObjId]?.zone
  const kind = z === undefined ? undefined : state.zones[z]?.kind
  const ctx: CostCtx = {
    ...(kind !== undefined ? { fromZone: kind } : {}),
    ...(target !== undefined ? { target } : {}),
    ...(costChoice !== undefined && costChoice !== '' ? { costChoice } : {}),
    ...(cardOid !== undefined && state.grantedRecursionThisTurn?.[cardOid] !== undefined ? { grantedRecursion: true as const } : {}), // ★1688 缺陷 222
    ...(kind === 'standby' && cardOid !== undefined && state.objects[cardOid as ObjId]?.status.faceDown === true ? { standbyFaceDown: true as const } : {}), // ★1692 缺陷 224(§811.6)
  }
  return Object.keys(ctx).length === 0 ? undefined : ctx
}

   
                                                               
                                        
                                                       
   
   
                                                
                                                          
                                
   
   
                                             
                                    
                                    
   
function modesDistinct(targets: readonly (string | undefined)[]): boolean {
  const seen = new Set<string>()
  for (const t of targets) {
    if (t === undefined) continue
    const mode = t.includes(':') ? t.slice(0, t.indexOf(':')) : t
    if (seen.has(mode)) return false
    seen.add(mode)
  }
  return true
}

function targetTuples(
  targets: readonly (string | undefined)[],
  n: number,
): readonly (readonly (string | undefined)[])[] {
  let out: (string | undefined)[][] = [[]]
  for (let i = 0; i < n; i++) {
    const next: (string | undefined)[][] = []
    for (const pre of out) for (const t of targets) next.push([...pre, t])
    out = next
  }
  return out
}

function subsetsOf(n: number): readonly (readonly number[])[] {
  const out: number[][] = []
  for (let mask = 1; mask < (1 << n); mask++) {
    const pick: number[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(i)
    out.push(pick)
  }
  return out
}


   
                                                                                         
                                                                                                
                                                                                               
   
function noteMaxSpellMana(s: GameState, player: PlayerId, paid: number): GameState {
  const cur = s.maxSpellManaThisTurn?.[player as string] ?? 0
  return paid > cur ? { ...s, maxSpellManaThisTurn: { ...s.maxSpellManaThisTurn, [player as string]: paid } } : s
}

   
                                                                     
                                                                       
                                                     
   
export interface ContestOrderAsk {
  readonly key: string
  readonly player: PlayerId
                                                                
  readonly candidates: readonly { readonly battlefield: string; readonly label: string }[]
                                                   
  readonly kind: 'combat' | 'duel'
}

                                                    
export const CONTEST_ORDER_KEY = '§323.12:contestOrder'

   
                                          
                            
   
type TrialAsk =
  | { readonly kind: 'destroy'; readonly ask: DestroyAsk }
  | { readonly kind: 'burnout'; readonly ask: BurnoutOpponentAsk }
  | { readonly kind: 'replaceEvent'; readonly ask: ReplaceEventAsk }              

   
                                                                                                    
                                                                                                                      
                                                                                                          
                                                                                                           
                                                            
   
type PaidBonus = { readonly choice?: string }

                                                  
const costIsZero = (c: Cost): boolean => (c.mana ?? 0) === 0 && (c.pips ?? []).length === 0

   
                                                 
                                                         
   
const DFS_ASK_DEPTH_CAP = 16

   
                                                 
                                               
   
const DFS_ASK_NODE_CAP = 2000

export class InteractiveGame {
  state: GameState
  private readonly deps: InteractiveDeps
                                                                
  private readonly rdeps: ReduceDeps
                                      
  private window: Extract<FeprStep, { kind: 'decision' }> | null = null
                                         
  private choice: Extract<FeprStep, { kind: 'choice' }> | null = null
                                                         
  private pendingCombat: { readonly battlefield: string; readonly attacker: PlayerId; readonly defender: PlayerId } | null = null
     
                                                    
                                                      
                                   
                                                      
                                                        
     
  private pendingDamageOrder: CombatDamageOrderAsk | null = null
     
                                              
                                                         
     
  private pendingDestroyOrder: DestroyAsk | null = null
  private pendingContestOrder: ContestOrderAsk | null = null                    
  private pendingReplaceEventOrder: ReplaceEventAsk | null = null                          
     
                                                              
                                                          
                                                
                                         
     
  private pendingBurnoutOpponent: BurnoutOpponentAsk | null = null
     
                                            
                                                    
                      
     
  private roleLedger: SignalLedger = emptyLedger()
                                   
  private pendingRoleSignals: readonly RoleSignal[] = []
                                 
  private replayAfterAnswer: InteractiveAction | null = null
                                                           
  private pendingTurnStart: { readonly player: PlayerId; readonly stage: 'start' | 'scoring' } | null = null
     
                                                            
                                         
                                                                            
     
  private duelPasses: number | null = null
     
                                                    
                                          
                                                         
                                           
     
  private duelPlayOpener: PlayerId | null = null
                                                                    
  private pendingNonCombatDuel: { readonly battlefield: string; readonly contester: PlayerId; readonly wasOpen?: boolean } | null = null
                                                             
  private pendingMoveContest: { readonly player: PlayerId; readonly to: string; readonly preOwned: boolean; readonly wasOpen: boolean } | null = null
                                                     
  private pendingTurnEnd: PlayerId | null = null

                               
  readonly journal = new Journal()

     
                                               
    
                                                                 
                                                       
                                                    
                             
                                                            
                                                                           
                                                                          
                                     
                                                      
                                                     
                                                       
                                      
    
                                  
                                                           
                                                  
                                          
                                                      
                                                                       
                                                                             
     
  snapshot(): InteractiveSnapshot {
    return {
      state: this.state,
      window: this.window,
      choice: this.choice,
      pendingCombat: this.pendingCombat,
      pendingTurnStart: this.pendingTurnStart,
      duelPasses: this.duelPasses,
      duelPlayOpener: this.duelPlayOpener,
      pendingNonCombatDuel: this.pendingNonCombatDuel,
      pendingMoveContest: this.pendingMoveContest,
      pendingTurnEnd: this.pendingTurnEnd,
      pendingDamageOrder: this.pendingDamageOrder,
      pendingDestroyOrder: this.pendingDestroyOrder,
      pendingReplaceEventOrder: this.pendingReplaceEventOrder,
      pendingContestOrder: this.pendingContestOrder,
      pendingBurnoutOpponent: this.pendingBurnoutOpponent,
      replayAfterAnswer: this.replayAfterAnswer,
      roleLedger: this.roleLedger,
      pendingRoleSignals: this.pendingRoleSignals,
    }
  }

                                                             
  restore(s: InteractiveSnapshot): void {
    this.state = s.state
    this.window = s.window
    this.choice = s.choice
    this.pendingCombat = s.pendingCombat
    this.pendingTurnStart = s.pendingTurnStart
    this.duelPasses = s.duelPasses
    this.duelPlayOpener = s.duelPlayOpener
    this.pendingNonCombatDuel = s.pendingNonCombatDuel
    this.pendingMoveContest = s.pendingMoveContest
    this.pendingTurnEnd = s.pendingTurnEnd
    this.pendingDamageOrder = s.pendingDamageOrder
    this.pendingDestroyOrder = s.pendingDestroyOrder
    this.pendingReplaceEventOrder = s.pendingReplaceEventOrder
    this.pendingContestOrder = s.pendingContestOrder
    this.pendingBurnoutOpponent = s.pendingBurnoutOpponent
    this.replayAfterAnswer = s.replayAfterAnswer
    this.roleLedger = s.roleLedger
    this.pendingRoleSignals = s.pendingRoleSignals
  }

  constructor(initial: GameState, deps: InteractiveDeps) {
    this.state = initial
    this.deps = deps
    this.rdeps = {
                                                            
      ...(deps.scoreBlockedAnywhere ? { scoreBlockedAnywhere: deps.scoreBlockedAnywhere } : {}),
                                                                        
                                                                                     
                                                                                          
                                                                                      
      ...(deps.playBanned ? { playBanned: deps.playBanned } : {}),
                                                              
                                                                           
      ...(deps.onWouldAskBurnoutOpponent !== undefined
        ? { onWouldAskBurnoutOpponent: (ask: BurnoutOpponentAsk): void => { this.deps.onWouldAskBurnoutOpponent!(ask) } }
        : {}),
      ...(deps.lastRitesEffect ? { lastRitesEffect: deps.lastRitesEffect } : {}),
      ...(deps.lastRitesChoice ? { lastRitesChoice: deps.lastRitesChoice } : {}),
      ...(deps.lastRitesBasePerform ? { lastRitesBasePerform: deps.lastRitesBasePerform } : {}),
      triggerSource: deps.getTriggers,
                                                                      
      flushTargetSignals: (s, stage) => this.flushTargetSignals(s, stage),
                                                              
                                                                                 
      playSpellFromZone: (s, ev) => {
        const card = s.objects[ev.card]
        if (!card) return null
        const spec = this.deps.playSpecFor?.(card.defId)
        if (!spec || spec.kind !== 'spell') return null
                                                        
                                                   
        const base = spec.cost
                                                    
                                                      
        const cost: Cost = ev.freeAll === true
          ? { mana: 0 }
          : { mana: ev.freeMana === true ? 0 : (base.mana ?? 0),
            ...(base.pips !== undefined ? { pips: base.pips } : {}) }
        const res = playCard(s, {
          deps: this.rdeps, // ★1122【缺陷 113】§820 回响推进模拟态那趟要过替换/禁令层
          cardOid: ev.card, controller: ev.player, cost,
          paidMana: cost.mana ?? 0, // ★1735 与下面 `return { …, paidMana: cost.mana ?? 0 }` 那笔(★685 给 playSpell 用的)同源
          keywords: spec.keywords, kind: 'spell',
          limitedAction: true, // §419.3.a 限定行动,时机门不适用
          ...(ev.recycleOnLeave === true ? { recycleOnLeave: true } : {}),
          ...(ev.target !== undefined ? { chosenTarget: ev.target } : {}),
          makeResolve: (moved) => spellResolveGated(spec, { movedCardOid: moved as string, controller: ev.player,
            ...(ev.target !== undefined ? { target: ev.target } : {}) }, (c) => c.movedCardOid),
          ...(spec.makeNextChoice ? { makeNextChoice: (moved: ObjId) => spellNextChoiceGated(spec, {
            movedCardOid: moved as string, controller: ev.player,
            ...(ev.target !== undefined ? { target: ev.target } : {}) }, (c) => c.movedCardOid) } : {}),
          ...(spec.choiceTiming !== undefined ? { choiceTiming: spec.choiceTiming } : {}), // ★1800 §355 打出时选择提前到确认期
                                                                 
          ...(spec.makeConfirmChoice ? { makeConfirmChoice: (moved: ObjId) => spec.makeConfirmChoice!({
            movedCardOid: moved as string, controller: ev.player,
            ...(ev.target !== undefined ? { target: ev.target } : {}) }) } : {}),
                                          
          ...(spec.makeConfirmSignals ? { makeConfirmSignals: (moved: ObjId) => spec.makeConfirmSignals!({
            movedCardOid: moved as string, controller: ev.player,
            ...(ev.target !== undefined ? { target: ev.target } : {}) }) } : {}),
        })
                                                             
        return res.ok ? { state: res.state, item: res.item, paidMana: cost.mana ?? 0 } : null
      },
                                                                   
      replacementShields: (s: GameState) => this.deps.replacementShields?.(s) ?? [],
                                                          
      tokenEntersReady: (st, owner) => this.deps.tokenEntersReady?.(st, owner) === true,
                                                                                           
      unitEntersReady: (st, player, defId, to, oid) => this.deps.entryReadyFor?.(st, player, defId, to, oid) === true,
      tokenSpawnDoublerFor: (st, ev) => this.deps.tokenSpawnDoublerFor?.(st, ev), // ★736
                                                                
      isArmament: (defId: string) => this.deps.isArmament?.(defId) === true,
                                                                
      isPlainEquipment: (defId: string) => this.deps.isPlainEquipment?.(defId) === true,
                                                                  
      isPlainUnit: (defId: string) => this.deps.isPlainUnit?.(defId) === true,
                                                                
      barrierIgnoredAt: (st, player, bf) => this.deps.barrierIgnoredAt?.(st, player, bf) === true,
                                                                
      combatImmuneAt: (st, oid) => this.deps.combatImmuneAt?.(st, oid) === true,
      onEvent: (ev, before) => this.journal.record(ev, before),
                                                                              
                                                       
                                                                   
                                                                  
      cleanupHooks: {
                                                                        
                                                                       
                                       
                                                
                                                            
                                                                  
                                                                
                                                           
                                                              
                           
        assignBattleRoles: (s) => {
          const ctx = this.pendingCombat
            ? { battlefield: this.pendingCombat.battlefield as ZoneId, attacker: this.pendingCombat.attacker }
            : null
          const { state: next, gains } = assignBattleRolesWithSignals(s, ctx)
          if (ctx !== null && gains.length > 0) {
            const noted = noteRoleGains(this.roleLedger, gains)
            this.roleLedger = noted.ledger
                                                            
                                                     
            this.pendingRoleSignals = [...this.pendingRoleSignals, ...orderForChain(noted.signals)]
          }
          return next
        },
                                                        
                                          
                                                                           
        loseUncontrolledBattlefields: (s) => loseUncontrolledBattlefields(s),
                                                                 
                                                           
                                                             
                                                              
                                                               
                                                     
        recallAndRemoveMisplaced: (s) =>
          removeMisplacedStandby(
            recallForeignBasePermanents(recallUnattachedEquipment(s, (o) => this.deps.cardKind?.(o.defId) === 'equipment' || isEquipment(o))),
            (st, bf) => controlMap(st)[bf] ?? null,
          ),
                                                    
        replaceDestroy: (s, oid) => this.deps.replaceDestroy?.(s, oid) ?? null,
                                                        
        replaceDestroyCandidates: (s, oid) => this.deps.replaceDestroyCandidates?.(s, oid) ?? [],
                                                                      
        ...(this.deps.onWouldAskEventOrder !== undefined
          ? { onWouldAskEventOrder: (ask: ReplaceEventAsk): void => { this.deps.onWouldAskEventOrder!(ask) } }
          : {}),
        ...(this.deps.onWouldAskDestroyOrder !== undefined
          ? { onWouldAsk: (ask: DestroyAsk): void => { this.deps.onWouldAskDestroyOrder!(ask) } }
          : {}),
                                        
        extraLethal: (s, o) => this.deps.extraLethal?.(s, o) ?? false,
      },
    }
  }

  view(viewer: PlayerId = this.state.activePlayer): ClientView {
    return project(this.state, viewer, this.revealForChoice(viewer))
  }

     
                                               
                                        
                                                             
     
  private revealForChoice(viewer: PlayerId): ReadonlySet<string> | undefined {
    if (!this.choice || this.choice.request.controller !== viewer) return undefined
    const oids = new Set<string>()
    for (const c of this.choice.request.candidates) {
      const bare = c.id.replace(/^(back|weak):/, '')              
      if (this.state.objects[bare]) oids.add(bare)
    }
    return oids.size ? oids : undefined
  }

                             
  private cur(): GameState {
    return this.choice ? this.choice.state : this.window ? this.window.state : this.state
  }

                                                                     
  private cannotPlayCards(player: PlayerId): boolean {
    return this.state.cannotPlayCardsThisTurn?.includes(player) === true
  }

     
                                                             
                                                                     
                                                         
                                    
                                            
                                    
     
  private cannotPlaySpells(player: PlayerId): boolean {
    return this.state.cannotPlaySpellsThisTurn?.includes(player) === true
  }

  private spellPlayBanned(action: InteractiveAction): boolean {
    if (!this.cannotPlaySpells(action.player)) return false
    let oid: string
    if (action.kind === 'PLAY_CARD') oid = action.cardOid
    else if (action.kind === 'PLAY_STANDBY') oid = action.oid
    else if (action.kind === 'PLAY_UNIT') oid = action.oid
    else return false
    const po = this.cur().objects[oid as ObjId]
    return po !== undefined && this.deps.cardKind?.(po.defId) === 'spell'
  }

     
                                                         
                                                   
                                
                                                     
                                                 
     
     
                                       
                                                        
                                                        
     
  private scoringHooksBase(): { bonusPoints?: NonNullable<InteractiveDeps['scoringBonus']>
    ; pointsBlockedAt?: NonNullable<InteractiveDeps['scoreBlocked']>
    ; drawInsteadAt?: NonNullable<InteractiveDeps['scoreDrawInstead']> } {
    return {
      ...(this.deps.scoringBonus ? { bonusPoints: this.deps.scoringBonus } : {}),
      ...(this.deps.scoreBlocked ? { pointsBlockedAt: this.deps.scoreBlocked } : {}),
                                                        
      ...(this.deps.scoreDrawInstead ? { drawInsteadAt: this.deps.scoreDrawInstead } : {}),
    }
  }

  private cardPlayBanned(state: GameState, player: PlayerId, defId: string, to: string, oid?: string): boolean {
    return this.deps.playBanned?.(state, player, defId, to, oid) === true
  }

     
                                                  
                                                                     
                                                              
                                  
                                        
                                                               
                                                     
                                                       
                                                           
                                                    
                                                          
                                                       
                                                          
                                                                   
                                                             
                                           
                                                             
                                                     
                                                                 
                                                              
                                                             
                                                
     
  private echoCostsOf(state: GameState, player: PlayerId, spec: PlaySpec): readonly Cost[] {
    const out: Cost[] = []
                                                                
    if (spec.echoes !== undefined) out.push(...spec.echoes)
    else if (spec.echo !== undefined) out.push(spec.echo)
    if (spec.kind === 'spell') {
      const granted = state.nextSpellEchoThisTurn?.[player] ?? 0
      for (let i = 0; i < granted; i++) out.push(spec.cost)                        
                                                         
      out.push(...passiveEchoGrants(state, player as string))
    }
                                                           
                                                       
                                                           
    const disc = this.deps.echoDiscountFor?.(state, player) ?? 0
    if (disc > 0 && out.length > 0) {
      return out.map((c) => ({ ...c, mana: Math.max(0, (c.mana ?? 0) - disc) }))
    }
    return out
  }

     
                                                      
                                                                     
                                         
     
  private standbyEchoPickSets(state: GameState, player: PlayerId, spec: PlaySpec): readonly (readonly number[])[] {
    const n = this.echoCostsOf(state, player, spec).length
    return n === 0 ? [[]] : [[], ...subsetsOf(n)]
  }

                                               
  private echoPicksCost(costs: readonly Cost[], picks: readonly number[]): Cost {
    let mana = 0
    let pips: readonly Pip[] = []
    for (const i of picks) {
      const c = costs[i]
      if (c === undefined) continue
      mana += c.mana ?? 0
      if (c.pips) pips = [...pips, ...c.pips]
    }
    return { mana, ...(pips.length > 0 ? { pips } : {}) }
  }

     
                                                          
                                                     
                                                                      
     
  private echoTargetsOf(
    action: { readonly echoTarget?: string; readonly echoTargets?: readonly string[] },
    n: number,
  ): readonly string[] {
    if (action.echoTargets !== undefined) return action.echoTargets.slice(0, n)
    return action.echoTarget !== undefined && n > 0 ? [action.echoTarget] : []
  }

     
                                            
    
                                                     
                                                                 
                                                       
                                                            
                                                                
                                         
                                               
                                                                      
                          
                                                            
     
  private echoPicksOf(action: { readonly echo?: boolean; readonly echoPicks?: readonly number[] }): readonly number[] {
    if (action.echoPicks !== undefined) return [...new Set(action.echoPicks)]                         
    return action.echo === true ? [0] : []
  }

     
                                                
                                                           
                                                              
                                                       
                                                      
                                                      
                                                        
                                 
                                                        
     
  private playCardActionBanned(action: InteractiveAction): boolean {
    const state = this.cur()
    let oid: string
    let to = ''
    if (action.kind === 'PLAY_CARD') oid = action.cardOid
    else if (action.kind === 'PLAY_STANDBY') oid = action.oid
    else if (action.kind === 'PLAY_UNIT') { oid = action.oid; to = action.to }
    else return false
    const po = state.objects[oid as ObjId]
    return po !== undefined && this.cardPlayBanned(state, action.player, po.defId, to, oid)
  }

  pending(): Pending {
    if (this.state.winner) return { mode: 'gameover', winner: this.state.winner }
    const mp = mulliganTurn(this.state)
    if (mp) return { mode: 'mulligan', player: mp }                      
    if (this.choice) return { mode: 'choice', player: this.choice.request.controller, request: this.choice.request }
                                                                   
                                                                        
                                  
    if (this.pendingDamageOrder) {
      const a = this.pendingDamageOrder
      return {
        mode: 'choice',
        player: a.assigner,
        request: {
          itemId: a.key,
          controller: a.assigner,
          key: a.key,
          prompt: `先把战斗伤害分给谁?(还剩 ${a.remaining} 点)`,
                                                                   
                                                          
          candidates: a.candidates.map((c) => ({
            id: String(c.oid), label: `需 ${c.lethalNeeded} 点致命`, note: `需 ${c.lethalNeeded} 点致命`,
          })),
        },
      }
    }
                                                               
    if (this.pendingBurnoutOpponent) {
      const a = this.pendingBurnoutOpponent
      return {
        mode: 'choice',
        player: a.player,
        request: {
          itemId: a.key,
          controller: a.player,
          key: a.key,
          prompt: '你的主牌堆已空 —— 这 1 分要送给哪名对手?',
                                                             
                                       
          candidates: a.candidates.map((p) => ({ id: String(p), label: String(p) })),
        },
      }
    }
                                                                         
    if (this.pendingContestOrder) {
      const a = this.pendingContestOrder
      return {
        mode: 'choice',
        player: a.player,
        request: {
          itemId: a.key,
          controller: a.player,
          key: a.key,
          prompt: a.kind === 'combat'
            ? '有多处战场同时要开战 —— 先打哪一处?'
            : '有多处战场同时要开法术对决 —— 先开哪一处?',
                                                                       
          candidates: a.candidates.map((c) => ({ id: c.battlefield, label: c.label })),
        },
      }
    }
                                                       
                                                                  
    if (this.pendingReplaceEventOrder) {
      const a = this.pendingReplaceEventOrder
      return {
        mode: 'choice',
        player: a.controller,
        request: {
          itemId: a.key,
          controller: a.controller,
          key: a.key,
                                                                              
          prompt: '这条替换只够救一个 —— 先对哪个生效?',
          candidates: a.oids.map((o) => ({ id: String(o), label: String(o), note: '先救它' })),
        },
      }
    }
    if (this.pendingDestroyOrder) {
      const a = this.pendingDestroyOrder
      return {
        mode: 'choice',
        player: a.controller,
        request: {
          itemId: a.key,
          controller: a.controller,
          key: a.key,
                                                  
          prompt: a.candidates.some((c) => c.id === DECLINE_REPLACEMENT)
            ? '这次摧毁可以被替换 —— 要用吗?'
            : '这次摧毁上有多个替换效果,先用哪一个?',
                                                                      
                                                  
          candidates: a.candidates.map((c) => (c.id === DECLINE_REPLACEMENT
            ? { id: c.id, label: '不使用(照常被摧毁)' }
            : { id: c.id, label: '一个替换效果', ...(c.sourceDefId !== undefined ? { sourceDefId: c.sourceDefId } : {}) })),
        },
      }
    }
    if (this.window) {
      const duel = this.duelInfo()
      return {
        mode: 'window',
        player: this.window.player,
        chainDepth: this.window.state.chain.length,
        ...(duel ? { duel } : {}),
      }
    }
    return { mode: 'action', player: this.state.activePlayer }
  }

     
                                        
                                                              
                                              
                                              
     
  private duelInfo(): DuelInfo | null {
    if (this.duelPasses === null) return null
    if (!this.state.spellDuelActive) return null
    if (this.state.chain.length > 0) return null
    const bf = this.pendingCombat?.battlefield ?? this.pendingNonCombatDuel?.battlefield
      ?? (this.state.duelBattlefield as string | undefined)
    if (bf === undefined) return null
    return {
      kind: this.pendingCombat ? 'combat' : 'noncombat',
      battlefield: bf,
      passes: this.duelPasses,
      needed: this.state.players.length, // §347.2.a 所有玩家各让过一次
    }
  }

                                                               
     
                                                     
                                                               
                                    
                                                            
                                                             
                                                                                
                                                                                     
                                                               
                                                                                  
     
  private defaultPlaySources(state: GameState, player: PlayerId): readonly ObjId[] {
    return [
      ...(state.zones[`hand:${player}` as ZoneId]?.contents ?? []),
      ...(state.zones[`heroZone:${player}` as ZoneId]?.contents ?? []),
    ]
  }

     
                                                           
                                                                 
    
                                             
                                                          
                                                   
                           
                                                
                                                               
    
                                                            
                              
     
  private playableSources(state: GameState, player: PlayerId): readonly ObjId[] {
    const base = this.defaultPlaySources(state, player)
    const extra = this.deps.extraPlaySources?.(state, player) ?? []
    if (extra.length === 0) return base
                                         
    const seen = new Set<string>(base as readonly string[])
    return [...base, ...extra.filter((o) => !seen.has(o as string))]
  }

     
                                             
                                             
                                                   
                                                       
                           
     
                                                              
                                                                         
                                 
  private recursionOptsOf(state: GameState, defId: string, oid: string): readonly Cost[] {
    const printed = recursionCostOptions(this.deps.cardKeywords?.(defId))
    const granted = state.grantedRecursionThisTurn?.[oid]
    return granted !== undefined ? [...printed, granted] : printed
  }

  private recursionPlays(state: GameState, player: PlayerId, specs: readonly PlaySpec[]): InteractiveAction[] {
    if (!this.deps.cardKeywords) return []
    const acts: InteractiveAction[] = []
    const discard = state.zones[`discard:${player}` as ZoneId]?.contents ?? []
    for (const oid of discard) {
      const o = state.objects[oid]
      if (!o) continue
      const opts = this.recursionOptsOf(state, o.defId, oid as string)
      if (opts.length === 0) continue
                                                                 
                                                      
                                                 
                                                                             
      const spec = this.deps.playSpecFor?.(o.defId) ?? specs.find((sp) => sp.defId === o.defId)
      if (!spec) continue
                                                                
                                                  
                                                                   
                                                                          
                                                               
                                                        
                                                                           
                                                                  
                                                                   
                                                                      
                                                            
                                                                      
                                              
      if (!canPlayInTiming(state, spec.keywords ?? [], !isClosed(state))) continue
      const targets = !spellNeedsTarget(spec) ? [undefined] : this.legalTargetsOf(spec, state, player)                                                        
      if (targets.length === 0) continue
      opts.forEach((cost, i) => {
                                                                
                                          
        for (const t of targets) {
          const ccs = costChoiceVariants(this.deps.costModsFor?.(state, player, o.defId, costCtxOf(state, oid as string, t)) ?? [])
          for (const cc of ccs) {
            const due = this.effectiveCost(state, player, o.defId, cost, [], costCtxOf(state, oid as string, t, cc))
            if (!canPayFromState(state, player, due, this.purposeOfKind(o.defId))) continue                                
            acts.push({ kind: 'PLAY_CARD', player, cardOid: oid as string, recursionIndex: i,
              due: addCosts(due, this.deflectCost(state, player, [t], spec.defId)), // ★772 纯展示
              ...(t !== undefined ? { target: t } : {}), ...(cc !== '' ? { costChoice: cc } : {}) })
          }
        }
      })
    }
    return acts
  }

                                                       
  private expandPlays(state: GameState, player: PlayerId, specs: readonly PlaySpec[]): InteractiveAction[] {
    const acts: InteractiveAction[] = []
    const hand = this.playableSources(state, player)
                                                                                    
                                                              
    for (const spec of specs) for (const cardOid of hand.filter((oid) => state.objects[oid]?.defId === spec.defId)) {
                                          
                                     
      const printed = spec.cost
                                                 
                                              
                                                    
                                                        
                                                       
                                              
                                                            
                                      
      const targetsNoBonus = spec.target === 'none' ? [undefined] : this.legalTargetsOf(spec, state, player)
      const targetsWithBonus = spec.target === 'none'
        ? [undefined]
        : this.legalTargetsOf(spec, state, player, '', true)
                                                                     
                                                                                   
      const targets: (string | undefined)[] = spec.target === 'none' || spec.targetlessChoice === true
        ? [undefined]
        : [...new Set([...targetsNoBonus, ...targetsWithBonus] as string[])]
      const costAt = (t: string | undefined, cc?: string): Cost =>
        this.effectiveCost(state, player, spec.defId, printed, [], costCtxOf(state, cardOid, t, cc))
                                                     
      const choicesAt = (t: string | undefined): readonly string[] =>
        costChoiceVariants(this.deps.costModsFor?.(state, player, spec.defId, costCtxOf(state, cardOid, t)) ?? [])
      const normalOkAt = (t: string | undefined): boolean =>
        choicesAt(t).some((cc) => canPayFromState(state, player, costAt(t, cc), this.purposeOfKind(spec.defId)))                                                   
                                                
      const normalOk = targets.some(normalOkAt)
                                                   
                                                          
      const altChoices: (string | undefined)[] = []
                                                            
                                                                     
                                                      
                                                                          
      const altDueAt = (t: string | undefined): Cost | undefined => spec.altCost === undefined ? undefined
        : this.effectiveCost(state, player, spec.defId, spec.altCost.cost, [], costCtxOf(state, cardOid, t))
      const altPayable = spec.altCost !== undefined
        && targets.some((t) => { const d = altDueAt(t); return d !== undefined && canPayFromState(state, player, d, this.purposeOfKind(spec.defId)) })               
      if (spec.altCost && altPayable) {
        const opts = spec.altCost.options?.(state, player)
        if (opts) {
          for (const o of opts) if (spec.altCost.pay(state, player, o.id) !== null) altChoices.push(o.id)
        } else if (spec.altCost.pay(state, player) !== null) {
          altChoices.push(undefined)
        }
      }
      if (!normalOk && altChoices.length === 0) continue
      for (const t of targets) {
       for (const cc of choicesAt(t)) {
        const payCost = costAt(t, cc)                           
                                                          
                                         
                                                                 
                                                           
                                                                  
        const echoCosts = this.echoCostsOf(state, player, spec)
        const echoSubsets = subsetsOf(echoCosts.length)
                                                           
                                                              
                                                                                   
                                                                  
        const spellBonus = this.deps.playBonusFor?.(spec.defId)
        const bonusVars: PlayDeclaration[] = []
        if (spellBonus?.required !== true) bonusVars.push({})
        if (spellBonus && (!spellBonus.available || spellBonus.available(state, player))) {
          const bpicks = spellBonus.options?.(state, player)
          if (bpicks === undefined) bonusVars.push({ bonus: true })
          else for (const bp of bpicks) bonusVars.push({ bonus: true, bonusChoice: bp.id })
        }
                                              
        const withDeflect = addCosts(payCost, this.deflectCost(state, player, [t], spec.defId))
        const payableHere = canPayFromState(state, player, withDeflect, this.purposeOfKind(spec.defId))                        
        for (const bv of bonusVars) {
                                                       
          const reachable = bv.bonus === true ? targetsWithBonus : targetsNoBonus
          if (t !== undefined && !(reachable as (string | undefined)[]).includes(t)) continue
                                                           
          const dueHere = bv.bonus === true
            ? addCosts(
              this.playDue(state, player, spec.defId, printed,
                { ...bv, ...(cc !== '' ? { costChoice: cc } : {}) }, cardOid as string),
              this.deflectCost(state, player, [t], spec.defId))
            : withDeflect
          if (!canPayFromState(state, player, dueHere, this.purposeOfKind(spec.defId))) continue        
          acts.push({ kind: 'PLAY_CARD', player, cardOid, due: dueHere, // ★772 due 纯展示
            ...(t !== undefined ? { target: t } : {}), ...(cc !== '' ? { costChoice: cc } : {}),
            ...(bv.bonus === true ? { bonus: true } : {}),
            ...(bv.bonusChoice !== undefined ? { bonusChoice: bv.bonusChoice } : {}) })
        }
                                                  
                                                
                                             
        if (cc === '') {
          for (const ac of altChoices) {
            const altDue = altDueAt(t)                                              
            acts.push({ kind: 'PLAY_CARD', player, cardOid, altCost: true, ...(ac !== undefined ? { altChoice: ac } : {}), ...(t !== undefined ? { target: t } : {}),
              ...(altDue !== undefined ? { due: addCosts(altDue, this.deflectCost(state, player, [t], spec.defId)) } : {}) })
          }
        }
        if (!payableHere) continue
        for (const picks of echoSubsets) {
                                                                               
          const ec = this.optionalExtraDue(state, player, spec.defId, this.echoPicksCost(echoCosts, picks), cc)
          const echoOk = canPayFromState(state, player, {
            mana: (payCost.mana ?? 0) + (ec.mana ?? 0),
            pips: [...(payCost.pips ?? []), ...(ec.pips ?? [])],
          })
          if (!echoOk) continue
                                                             
                                              
                                                                 
                                                            
                                                                
                                                        
                                                            
          const needsDiscard = picks.includes(0) && (spec.echoDiscard ?? 0) > 0
          const handCards = needsDiscard
            ? (state.zones[`hand:${player}` as ZoneId]?.contents ?? []).filter((h) => (h as string) !== (cardOid as string))
            : []
                                                               
                                                                  
          if (needsDiscard && handCards.length < (spec.echoDiscard ?? 0)) continue
          const discardVars: (string | undefined)[] = needsDiscard ? (handCards as string[]) : [undefined]
          for (const combo of targetTuples(targets, picks.length)) {
                                                               
            if (spec.echoModeDistinct === true && !modesDistinct([t, ...combo])) continue
            for (const dv of discardVars) {
            acts.push({ kind: 'PLAY_CARD', player, cardOid,
              due: addCosts(withDeflect, ec), // ★772 纯展示:基础费(含法盾)+ 这几份回响费
              ...(picks.length === 1 && picks[0] === 0 ? { echo: true } : {}), // 旧形状原样留着(老用户/回放)
              echoPicks: picks,
              ...(dv !== undefined ? { echoDiscardOid: dv } : {}), // ★688 回响弃牌费:弃哪张
              ...(t !== undefined ? { target: t } : {}),
              ...(combo.length > 0 && combo[0] !== undefined ? { echoTarget: combo[0] } : {}), // 旧读者只看得懂第一份
              ...(combo.some((x) => x !== undefined) ? { echoTargets: combo.filter((x): x is string => x !== undefined) } : {}),
              ...(cc !== '' ? { costChoice: cc } : {}) })
            }
          }
        }
       }
      }
    }
    return acts
  }

                                                                       
  private standbyPlacements(state: GameState, player: PlayerId): InteractiveAction[] {
    if (!this.deps.cardKeywords) return []
    const acts: InteractiveAction[] = []
    const sources = this.defaultPlaySources(state, player)                                  
    const bfs = zonesByKind(state, 'battlefield').map((b) => b.id).filter((bf) => canPlaceStandby(state, player, bf))
    if (bfs.length === 0) return []
    const free = state.freeStandbyThisTurn?.includes(player) === true               
    const canA = free || canPayFromState(state, player, { pips: [[]] })                    
    const alt = free ? null : (this.deps.standbyAltCost?.(state, player) ?? null)
    const canAlt = alt !== null && canPayFromState(state, player, alt)
    if (!canA && !canAlt) return []
    for (const oid of sources) {
      const o = state.objects[oid]
      if (!o || !this.deps.cardKeywords(o.defId).includes('待命')) continue
      for (const bf of bfs) {
                                              
                                                                                 
                            
                                                                               
        if (canA) acts.push({ kind: 'PLACE_STANDBY', player, oid, battlefield: bf, ...(free ? { free: true } : { due: { pips: [[]] } }) })
        if (canAlt) acts.push({ kind: 'PLACE_STANDBY', player, oid, battlefield: bf, alt: true, ...(alt !== null ? { due: alt } : {}) })
      }
    }
    return acts
  }

     
                                                   
                                                         
     
  private ambushPlays(state: GameState, player: PlayerId): InteractiveAction[] {
    if (!this.deps.cardKeywords) return []
    const acts: InteractiveAction[] = []
    const hand = this.playableSources(state, player)                   
    for (const oid of hand) {
      const o = state.objects[oid]
      if (!o || !this.deps.cardKeywords(o.defId).includes('伏击')) continue
                                                    
                                                                    
                                                                    
                                                             
      const printed = this.deps.cardCost?.(o.defId)                      
      const usable = this.playVariants(state, player, o.defId, oid as string).filter(
        (v) => printed === undefined || canPayFromState(state, player, this.playDue(state, player, o.defId, printed, v, oid as string), this.purposeOfKind(o.defId)), // ★725
      )
      for (const v of usable) {
        const due = printed === undefined ? undefined : this.playDue(state, player, o.defId, printed, v, oid as string)            
        for (const bf of this.ambushDestinations(state, player, o.defId, this.paidBonus(v))) {
          if (this.cardPlayBanned(state, player, o.defId, bf)) continue                   
          acts.push({ kind: 'PLAY_UNIT', player, oid, to: bf, ...v, ...(due !== undefined ? { due } : {}) })
        }
      }
    }
    return acts
  }

     
                                                        
                                                  
                                                   
                                                 
                                                      
     
  private reactionUnitPlays(state: GameState, player: PlayerId): InteractiveAction[] {
    if (!this.deps.cardKeywords) return []
    const acts: InteractiveAction[] = []
    const hand = this.playableSources(state, player)
    for (const oid of hand) {
      const o = state.objects[oid]
      if (!o || this.deps.cardKind?.(o.defId) !== 'unit') continue
      if (!this.deps.cardKeywords(o.defId).includes('反应')) continue
      const due = this.deps.cardCost ? this.effectiveCost(state, player, o.defId, this.deps.cardCost(o.defId)) : undefined            
      if (due !== undefined && !canPayFromState(state, player, due, this.purposeOfKind(o.defId))) continue                                
                                                                                      
                                                                                        
      const dests = [...new Set([`base:${player}`, ...controlledBattlefields(state, player), ...(this.deps.extraPlayZones?.(state, player, o.defId) ?? [])])]
      for (const to of dests) {
        if (this.cardPlayBanned(state, player, o.defId, to)) continue
        acts.push({ kind: 'PLAY_UNIT', player, oid, to, ...(due !== undefined ? { due } : {}) })
      }
    }
    return acts
  }

     
                                                    
                                    
                                             
                                                              
                                                               
                                                
                                     
     
  private ambushDestinations(
    state: GameState, player: PlayerId, defId: string,
                                                                
                                                                
    bonus?: PaidBonus, // ★1253 收尾:按「付了没」判,不按 bonusChoice(缺陷 156)
  ): string[] {
                                                              
                                                             
                                                             
                                                               
                                         
                                                             
                                             
                                                                      
                                                                      
                       
                                                               
                                                                        
                                                             
                                                                                  
                                                                                
    const paidAway = bonus?.choice
    const bfsWithMine = zonesByKind(state, 'battlefield')
      .filter((z) => z.contents.some((oid) => { const u = state.objects[oid]; return oid !== paidAway && isUnit(u) && u!.controller === player }))
      .map((z) => z.id)
    return [...new Set([...bfsWithMine, ...(this.deps.extraAmbushZones?.(state, player, defId) ?? [])])]
  }

     
                                                                  
                                                                    
                             
     
  private decodeTargetOidsImpl(t: string): string[] {
    return [...decodeTargetOids(t)]
  }

                                                           
  private standbyPlays(state: GameState, player: PlayerId): InteractiveAction[] {
    const acts: InteractiveAction[] = []
    for (const z of zonesByKind(state, 'standby')) {
      for (const oid of z.contents) {
        const o = state.objects[oid]
        if (!o || o.controller !== player || o.status.faceDown !== true || o.status.standbyFresh === true) continue
        const spec = this.deps.playSpecFor?.(o.defId)
        if (spec && spellNeedsTarget(spec)) { // ★1255 缺陷 158:targetlessChoice(禁军之墙 SFD-043 等)当无目标 —— 修前 legalTargets 恒 [] ⇒ 一条 PLAY_STANDBY 都列不出
                                                                
          const locked = standbyLockedBattlefield(state, oid as ObjId)
          for (const t of this.legalTargetsOf(spec, state, player)) {
                                                                  
                                                             
                                                                                     
                                                        
            if (standbyTargetViolatesLock(state, locked, this.decodeTargetOidsImpl(t))) continue
                                                             
                                                                         
                                                                   
                                                                             
                                                                              
                                                           
            const dc = addCosts(this.standbyDue(state, player, o.defId, {}, oid as string), this.deflectCost(state, player, [t], o.defId))                             
                                                                                       
                                                                               
            for (const picks of this.standbyEchoPickSets(state, player, spec)) {
              const dcE = addCosts(dc, this.echoPicksCost(this.echoCostsOf(state, player, spec), picks))
              if (!canPayFromState(state, player, dcE)) continue                          
              acts.push({ kind: 'PLAY_STANDBY', player, oid, target: t, ...(picks.length > 0 ? { echoPicks: picks } : {}), ...(costIsZero(dcE) ? {} : { due: dcE }) })
            }
          }
        } else if (spec) {
                                                                      
          const due = this.standbyDue(state, player, o.defId, {}, oid as string)
          if (!canPayFromState(state, player, due)) continue
                                            
          for (const picks of this.standbyEchoPickSets(state, player, spec)) {
            const dueE = addCosts(due, this.echoPicksCost(this.echoCostsOf(state, player, spec), picks))
            if (!canPayFromState(state, player, dueE)) continue
            acts.push({ kind: 'PLAY_STANDBY', player, oid, ...(picks.length > 0 ? { echoPicks: picks } : {}), ...(costIsZero(dueE) ? {} : { due: dueE }) })
          }
        } else {
                                                                               
                                                                         
          for (const v of this.playVariants(state, player, o.defId, oid as string)) {
            const due = this.standbyDue(state, player, o.defId, v, oid as string)
            if (!canPayFromState(state, player, due, this.purposeOfKind(o.defId))) continue
            acts.push({ kind: 'PLAY_STANDBY', player, oid, ...v, ...(costIsZero(due) ? {} : { due }) })
          }
        }
      }
    }
    return acts
  }

     
                                     
                               
                                                       
     
  private effectiveCost(
    state: GameState, player: PlayerId, defId: string, printed: Cost, extraMods: readonly CostMod[] = [],
    ctx?: CostCtx,
  ): Cost {
                                                        
    const raw = [...(this.deps.costModsFor?.(state, player, defId, ctx) ?? []), ...extraMods]
    const mods = resolveCostChoices(raw, ctx?.costChoice)
    return mods.length === 0 ? printed : computeCost(printed, mods)
  }

                                                  
                                                          
  private hasteAvailableFor(state: GameState, player: PlayerId, defId: string, cardOid?: string): boolean {
    if (hasHaste(this.deps.cardKeywords?.(defId))) return true
    if (this.deps.hasteGrantedBy === undefined) return false
    const z = cardOid === undefined ? undefined : state.objects[cardOid as ObjId]?.zone
    const kind = z === undefined ? undefined : state.zones[z]?.kind
    return this.deps.hasteGrantedBy(state, player, defId, kind)
  }

                                                                                                           
                                                                                                   

                                                                
  private purposeOfKind(defId: string): string | undefined {
    const k = this.deps.cardKind?.(defId)
    return k === 'spell' ? 'playSpell' : k === 'unit' ? 'playUnit' : k === 'equipment' ? 'playGear' : undefined
  }

     
                                   
                                                      
                                                                
                                                           
                                                        
                                                             
                                                                            
                                                      
     
  private abilityPurpose(defId: string): string {
    const k = this.deps.cardKind?.(defId)
    if (k === 'equipment') return 'gearAbility'
    if (k === 'legend' || k === 'battlefield') return 'otherAbility'
    return 'unitAbility'
  }

     
                                                
                                                 
     
  private playDeclarationOk(
    state: GameState, player: PlayerId, defId: string, a: PlayDeclaration, cardOid?: string,
  ): boolean {
    if (a.haste === true && !this.hasteAvailableFor(state, player, defId, cardOid)) return false
                                              
                                                        
                                                
                                                       
    if (a.costChoice !== undefined) {
      const declMods = this.deps.costModsFor?.(state, player, defId, costCtxOf(state, cardOid)) ?? []
      const hasNonExtraAlt = declMods.some((m) => m.alt !== undefined && m.part !== 'extra')
      if (a.bonus !== true && !hasNonExtraAlt) return false
      if (!costChoiceVariants(declMods).includes(a.costChoice)) return false
    }
    const bs = this.deps.playBonusFor?.(defId)
    if (bs?.required === true && a.bonus !== true) return false                  
    if (a.bonus !== true) return true
    if (!bs) return false                                                      
    if (bs.available && !bs.available(state, player)) return false             
    if (bs.options && !bs.options(state, player).some((c) => c.id === a.bonusChoice)) return false
    return true                                                             
  }

     
                                                                   
                                                       
                                          
     
     
                                                                                   
                                                                        
                                                                                 
                                                    
     
  private standbyDue(state: GameState, player: PlayerId, defId: string, a: PlayDeclaration, cardOid: string): Cost {
    return this.playDue(state, player, defId, { mana: 0 }, a, cardOid)
  }

  private playDue(
    state: GameState, player: PlayerId, defId: string, printed: Cost, a: PlayDeclaration,
    cardOid?: string,
  ): Cost {
    const bs = this.deps.playBonusFor?.(defId)
    const discount = a.bonus === true ? (bs?.discount?.(state, player, a.bonusChoice) ?? []) : []
                                                                     
                                                       
                                                   
                                                              
    let due = this.effectiveCost(state, player, defId, printed, discount, costCtxOf(state, cardOid, undefined, a.costChoice))
                                                   
                                                                                
                                                            
                                           
    if (a.haste === true || a.bonus === true) {
      let extra: Cost = {}
      if (a.haste === true) extra = addCosts(extra, hasteExtraCost(this.deps.cardDomains?.(defId)))
                                                       
                                                           
                                                     
                                                                          
                                                         
                                       
      if (a.bonus === true) extra = addCosts(extra, this.deps.playBonusFor?.(defId)?.cost ?? {})
      due = addCosts(due, this.optionalExtraDue(state, player, defId, extra, a.costChoice))
    }
    return due                                                          
  }

     
                                                                   
                                                
                                                                   
                                                 
                                                  
     
  private bonusResourceDue(state: GameState, player: PlayerId, defId: string, costChoice?: string): Cost {
    const bs = this.deps.playBonusFor?.(defId)
    return this.optionalExtraDue(state, player, defId, bs?.cost ?? {}, costChoice)
  }

     
                                                                                     
                                                                          
                                                                 
     
  private optionalExtraDue(state: GameState, player: PlayerId, defId: string, extra: Cost, costChoice?: string): Cost {
    const extraMods = resolveCostChoices(this.deps.costModsFor?.(state, player, defId) ?? [], costChoice)
    return reduceExtraCost(extra, extraMods)
  }

     
                            
                                                      
                                                             
                                                          
     
  private playVariants(state: GameState, player: PlayerId, defId: string, cardOid?: string): PlayDeclaration[] {
    const bs = this.deps.playBonusFor?.(defId)
    const canHaste = this.hasteAvailableFor(state, player, defId, cardOid)
    const out: PlayDeclaration[] = []
    if (bs?.required !== true) {
      out.push({})
      if (canHaste) out.push({ haste: true })
    }
    if (bs && (!bs.available || bs.available(state, player))) {
      const picks = bs.options?.(state, player)
                                                       
      if (picks === undefined) {
        out.push({ bonus: true })
        if (canHaste) out.push({ bonus: true, haste: true })
      } else for (const p of picks) {
        out.push({ bonus: true, bonusChoice: p.id })
        if (canHaste) out.push({ bonus: true, bonusChoice: p.id, haste: true })
      }
    }
                                                                                                  
                                                      
                                                                   
                                                            
                                                          
                         
    const mods = this.deps.costModsFor?.(state, player, defId, costCtxOf(state, cardOid)) ?? []
    const ccs = costChoiceVariants(mods)
    if (ccs.length <= 1) return out
    const hasNonExtraAlt = mods.some((m) => m.alt !== undefined && m.part !== 'extra')
    return out.flatMap((v) => (hasNonExtraAlt || v.bonus === true ? ccs.map((cc) => ({ ...v, costChoice: cc })) : [v]))
  }

     
                                                 
                                                          
                                                   
     
  private nimblePlays(state: GameState, player: PlayerId): InteractiveAction[] {
    if (!this.deps.cardKeywords) return []
    const acts: InteractiveAction[] = []
    for (const oid of this.playableSources(state, player)) {
      const o = state.objects[oid]
                                                      
                                                            
                                                                      
                                                                               
                                                             
                                                                                
      if (!o) continue
      if (!hasNimble(this.deps.cardKeywords(o.defId)) && !hasNimble(o.derived?.keywords)) continue
      const due = this.deps.cardCost ? this.effectiveCost(state, player, o.defId, this.deps.cardCost(o.defId)) : undefined            
      if (due !== undefined && !canPayFromState(state, player, due, this.purposeOfKind(o.defId))) continue                                
      acts.push({ kind: 'PLAY_UNIT', player, oid, to: `base:${player}`, ...(due !== undefined ? { due } : {}) })
    }
    return acts
  }

     
                                                  
                                       
                                                    
                                                       
                                         
    
                                                                              
                                                                                    
                                                                       
                                                                        
                                                                                          
                                              
                                                               
                                                                 
                                                       
     
  private deflectCost(
    state: GameState, caster: PlayerId, targets: readonly (string | undefined)[],
    casterDefId?: string,
  ): Cost {
                                                          
                                                    
    if (casterDefId !== undefined && this.deps.deflectWaivedForCard?.(casterDefId) === true) {
      return { mana: 0 }
    }
                                                                  
                                                      
                                                      
                                                           
    const charged = targets.filter((t): t is string => t !== undefined)
      .flatMap((t) => liveTargetOids(state, t))
      .filter((t) => {
        const z = state.objects[t as ObjId]?.zone
        return z === undefined || this.deps.deflectWaivedAt?.(state, z as string) !== true
      })
    const n = totalDeflectSurcharge(state, charged as never, caster)
    return n > 0 ? { mana: 0, pips: Array.from({ length: n }, () => []) } : { mana: 0 }
  }

                                                  
     
                                               
                                       
                                                     
     
  private activationCost(
    state: GameState, player: PlayerId, spec: ActivatedSpec, selfOid: string,
    costChoice?: string, target?: string,
  ): Cost {
    const mods = resolveCostChoices(this.abilityRawMods(state, player, spec, selfOid, target), costChoice)
    return mods.length > 0 ? computeCost(spec.cost, mods) : spec.cost
  }

     
                                                  
                                                          
     
  private abilityRawMods(
    state: GameState, player: PlayerId, spec: ActivatedSpec, selfOid: string, target?: string,
  ): readonly CostMod[] {
    return [
      ...this.abilityMods(state, player, spec, selfOid),
      ...(spec.costMods?.(state, player, selfOid, target) ?? []),
    ]
  }

     
                                                  
                                      
     
  private abilityMods(
    state: GameState, player: PlayerId, spec: ActivatedSpec, selfOid: string,
  ): readonly CostMod[] {
    const defId = state.objects[selfOid as ObjId]?.defId
    if (defId === undefined) return []
    return this.deps.abilityCostModsFor?.(state, player, defId, spec.key, selfOid) ?? []
  }

     
                                      
                                                                        
    
                                                                           
                                                   
                                           
                                                    
                                                         
     
  private specsOf(state: GameState, o: GameObject): readonly ActivatedSpec[] {
                                                        
                                                             
      
                                                                       
                                                                                 
                                                                 
                                                            
                                                   
                                       
                                                                     
                                                                    
                                       
                                                                             
                                           
                                                                                  
                                                                                               
                                                                                      
                                                                                    
    const copiedOrSelf = o.derived?.copiedDefId ?? o.defId                                          
    const printed = withShangeCopies(state, o, this.deps.activatedFor?.(copiedOrSelf) ?? [])
    const keys = o.derived?.grantedActivated ?? []
    if (keys.length === 0) return printed
    const granted: ActivatedSpec[] = []
    for (const k of keys) {
      const sp = this.deps.grantedSpec?.(k)
      if (sp) granted.push(sp)
    }
    return [...printed, ...granted]
  }

  private activations(state: GameState, player: PlayerId, site: ActivationSite = 'action'): InteractiveAction[] {
    if (!this.deps.activatedFor) return []
    const acts: InteractiveAction[] = []
    const hand = state.zones[`hand:${player}` as ZoneId]?.contents ?? []
    for (const o of Object.values(state.objects)) {
      if (o.controller !== player) continue
      const z = state.zones[o.zone]
      if (!z || !isFieldedExceptStandby(z.kind)) continue
                                                       
                                                          
                                                                                                                       
      const attached = o.status.attachedTo !== undefined
      for (const spec of this.specsOf(state, o)) { // ★576 印刷的 + 被授予的(+★707 尚歌复制)
        if (attached && !spec.key.startsWith('equip:')) continue
                                                                    
        if (!canActivateNow(state, player, spec.keywords, site)) continue
                                                             
                                    
        if (spec.available && !spec.available(state, player, o.oid)) continue
                                                    
        if (spec.oncePerTurn === true && state.activatedThisTurn?.[`${o.oid}:${spec.key}`] === true) continue
        if (spec.tapSelf && isExhausted(o)) continue                                                
                                                
        if (spec.unempowerSelf && !isEmpowered(o)) continue
                                                             
                                          
        const targets = spec.target && spec.target !== 'none' ? this.legalTargetsOf(spec, state, player, o.oid) : [undefined]
        if (targets.length === 0) continue
                                                       
                                               
        const ccsAt = (t: string | undefined): readonly string[] =>
          costChoiceVariants(this.abilityRawMods(state, player, spec, o.oid, t))
                                            
        if (!targets.some((t) => ccsAt(t).some((cc) =>
          canPayFromState(state, player, this.activationCost(state, player, spec, o.oid, cc, t), this.abilityPurpose(o.defId))))) continue        
                                               
        const discardable = spec.discardFilter
          ? hand.filter((h) => spec.discardFilter!(state.objects[h]?.defId ?? ''))
          : hand
        if ((spec.discard ?? 0) > 0 && discardable.length < (spec.discard ?? 0)) continue
                                                  
                                                   
                                                           
        for (const t of targets) {
          let extras: (string | undefined)[] = [undefined]
          if (spec.extraCost) {
            const opts = spec.extraCost.options?.(state, player, o.oid, t)
            if (opts) {
              extras = opts.filter((c) => spec.extraCost!.pay(state, player, o.oid, c.id) !== null).map((c) => c.id)
            } else if (spec.extraCost.pay(state, player, o.oid) === null) {
              extras = []
            }
          }
          if (extras.length === 0) continue
          for (const xc of extras) {
            for (const cc of ccsAt(t)) {
              if (!canPayFromState(state, player, this.activationCost(state, player, spec, o.oid, cc, t), this.abilityPurpose(o.defId))) continue        
              const base = { kind: 'ACTIVATE' as const, player, oid: o.oid, ability: spec.key, due: this.activationCost(state, player, spec, o.oid, cc, t), ...(spec.label ? { label: spec.label } : {}), ...(t !== undefined ? { target: t } : {}), ...(xc !== undefined ? { extraChoice: xc } : {}), ...(cc !== '' ? { costChoice: cc } : {}) }
              if ((spec.discard ?? 0) > 0) for (const d of discardable) acts.push({ ...base, discardOid: d })
              else acts.push(base)
            }
          }
        }
      }
    }
    return acts
  }

     
                       
                                        
                                      
                                 
     
  blockedFor(player: PlayerId): readonly BlockedPlay[] {
    const p = this.pending()
    if (p.mode === 'gameover' || p.mode === 'mulligan' || p.mode === 'choice') return []
    const state = this.cur()
    const hand = this.playableSources(state, player)                        
    const ok = new Set<string>()
    for (const a of this.legalActions(player)) {
      const x = a as { cardOid?: string; oid?: string }
      if (x.cardOid) ok.add(x.cardOid)
      if (x.oid) ok.add(x.oid)
    }
    const inWindow = p.mode === 'window'
    const myTurn = player === this.state.activePlayer
                                                      
                                                       
    const haveMana = manaAvailable(state, player)
    const out: BlockedPlay[] = []
    for (const oid of hand) {
      const o = state.objects[oid]
      if (!o || ok.has(oid)) continue
      const defId = o.defId
      const kws = this.deps.cardKeywords?.(defId) ?? []
      const spec = this.deps.playSpecFor?.(defId)
      const base = { oid, defId }
                                                                     
      if (!inWindow && !myTurn) { out.push({ ...base, reason: 'timing', detail: '现在是对手的回合' }); continue }
      const kwsImplied = withImpliedKeywords(kws)
                                                                                    
                                                        
      const swiftInDuel = kwsImplied.includes('迅捷') && state.spellDuelActive === true && !isClosed(state)                        
      if (inWindow && !kwsImplied.includes('反应') && !kws.includes('伏击') && !swiftInDuel) {
        out.push({ ...base, reason: 'timing', detail: isClosed(state) ? '结算链开着,只有[反应]或[伏击]的牌能打(§309.1.a;[迅捷]只能在对决开环时起链)' : '结算链开着,只有[反应]或[伏击]的牌能打(§309.1.a;法术对决中[迅捷]也可)' })
        continue
      }
      const printedCost = spec?.cost ?? this.deps.cardCost?.(defId)
      const cost = printedCost === undefined ? undefined : this.effectiveCost(state, player, defId, printedCost)
      if (cost && !canPayFromState(state, player, cost)) {
        out.push({
          ...base, reason: 'cost',
          costMana: cost.mana ?? 0,
          costPips: (cost.pips ?? []).map((pip) => (pip.length === 0 ? '*' : pip.join('/'))),
          haveMana,
          detail: '资源不够',
        })
        continue
      }
      if (spec && spellNeedsTarget(spec) && this.legalTargetsOf(spec, state, player).length === 0) { // ★1255 诊断口同口径(targetlessChoice 别报 noTarget)
        out.push({ ...base, reason: 'noTarget', detail: '场上没有它的合法目标(§355.6)' })
        continue
      }
      if (!spec && !this.deps.cardCost) { out.push({ ...base, reason: 'notImplemented', detail: '这张卡的效果还没实现' }); continue }
      out.push({ ...base, reason: 'timing', detail: '此刻的时机不允许打出它' })
    }
    return out
  }

     
                                                        
    
                                             
                                             
                                            
                                                  
                                                       
     
  private playDestinations(
    state: GameState, player: PlayerId, defId: string,
                                                                                                    
    bonus?: PaidBonus, // ★1253 收尾:按「付了没」判,不按 bonusChoice(缺陷 156)
  ): string[] {
    const out: string[] = []
    const push = (to: string): void => {
                                                       
      if (out.includes(to) || this.cardPlayBanned(state, player, defId, to)) return
      out.push(to)
    }
    push(`base:${player}`)
    if (this.deps.cardKind?.(defId) === 'equipment') return out                    
                                                
                                                             
    for (const bf of controlledBattlefields(state, player)) push(bf)
                                                         
    for (const bf of this.deps.extraPlayZones?.(state, player, defId) ?? []) push(bf)
                                                  
                                                             
                          
    if (bonus !== undefined) {
      for (const bf of this.deps.playBonusFor?.(defId)?.destinations?.(state, player, bonus.choice) ?? []) push(bf)
    }
    return out
  }

                                                                                            
  private paidBonus(d: { readonly bonus?: boolean; readonly bonusChoice?: string }): PaidBonus | undefined {
    if (d.bonus !== true) return undefined
    return d.bonusChoice !== undefined ? { choice: d.bonusChoice } : {}
  }

     
                                                           
                                                                            
    
                                                     
                                                        
                                                          
                           
                                                
     
  private landPlayedUnit(
    s0: GameState,
    action: Extract<InteractiveAction, { kind: 'PLAY_UNIT' }>,
    defId: string,
  ): { state: GameState; events: readonly GameEvent[] } | null {
    let s = s0
                                                    
                                                      
    if (!this.playDeclarationOk(s, action.player, defId, action, action.oid)) return null
    const bs = this.deps.playBonusFor?.(defId)
                                                  
                                     
    const payEvents = action.bonus === true
      ? (bs?.payEvents?.(s, action.player, action.bonusChoice) ?? [])
      : []
                                                       
    const fromZoneKind = s.zones[s.objects[action.oid as ObjId]?.zone as ZoneId]?.kind
    if (this.deps.cardCost) {
                                                             
      const due = this.playDue(s, action.player, defId, this.deps.cardCost(defId), action, action.oid)
      const pay = payFromState(s, action.player, due, this.purposeOfKind(defId), action.payWith)                              
      if (!pay.ok) return null
      s = pay.state
      // ★1059 第二十三本账(maxSpellManaThisTurn)原先写在这里、套 `cardKind === 'spell'`:这是 PLAY_UNIT 路,法术从不经过 ⇒ 死代码,已移到法术主路(noteMaxSpellMana)。
    }
                                                             
                                                         
                                                                
                                                                         
    {
      const jayceMods = this.deps.costModsFor?.(s, action.player, defId, costCtxOf(s, action.oid, undefined, action.costChoice)) ?? []
      const resolved = resolveCostChoices(jayceMods, action.costChoice)
      const usedJayceFree = resolved.some((m) => m.kind === 'zero' && m.part === 'mana' && (m.source ?? '').startsWith('杰斯 - 推陈出新'))
      if (usedJayceFree && (s.gearManaFreeThisTurn?.[action.player as string] ?? 0) > 0) {
        const cur = s.gearManaFreeThisTurn ?? {}
        s = { ...s, gearManaFreeThisTurn: { ...cur, [action.player as string]: (cur[action.player as string] ?? 1) - 1 } }
      }
    }
                                                        
                                                               
                                                   
                              
    s = consumeNextCardDiscount(s, action.player)
                                                             
                                                                                        
    const handObj0 = s.objects[action.oid as ObjId]
    const nimbleOnPlay = handObj0 !== undefined && hasNimble(handObj0.derived?.keywords) && !hasNimble(this.deps.cardKeywords?.(handObj0.defId))
    const { oid: fieldedOid } = freshOid(s)
    s = moveObjectInState(s, action.oid as ObjId, action.to as ZoneId)
                                                              
                                                          
    const placed = s.objects[fieldedOid]
                                                                                          
                                                      
                                                         
    const bonusEvents0 = action.bonus === true ? (bs?.events?.(action.player, fieldedOid, action.bonusChoice) ?? []) : []
                                                                                   
    const selfReadyByBonus = bonusEvents0.some((e) => e.kind === 'markNextUnitReady')
    if (placed && this.deps.cardKind?.(placed.defId) !== 'equipment') {
      const ready = action.haste === true || selfReadyByBonus
                                                              
                                                         
        || this.deps.entryReadyFor?.(s, action.player, placed.defId, placed.zone as string, fieldedOid as string) === true                            
      const patch = entryStatusPatch(ready)
      s = { ...s, objects: { ...s.objects, [fieldedOid]: { ...placed, status: { ...placed.status, ...patch } } } }
                                                          
                                                   
                                                                          
                                                       
                              
      s = consumeNextUnitReadyInState(s, action.player)
    } else if (placed && this.deps.entryDormantFor?.(s, action.player, placed.defId) === true) {
                                                                
      s = { ...s, objects: { ...s.objects, [fieldedOid]: { ...placed, status: { ...placed.status, tapped: true } } } }
    }
                                               
                                               
    s = noteCardConfirmed(s, action.player, fieldedOid)                                    
    if (nimbleOnPlay) { const nb = s.objects[fieldedOid]; if (nb) s = { ...s, objects: { ...s.objects, [fieldedOid]: { ...nb, status: { ...nb.status, nimbleOnPlay: true } } } } }               
                                                          
    const ev: PlayUnitEvent = { kind: 'playUnit', unit: fieldedOid, player: action.player, at: action.to, fromZoneKind: 'hand', ...(action.bonus === true ? { bonus: true } : {}) }                   
                                           
    const bonusEvents = bonusEvents0.filter((e) => e.kind !== 'markNextUnitReady')                              
                                                  
    return { state: s, events: [...payEvents, ev, ...bonusEvents] }
  }

     
                                                       
                                                
                                            
                                                 
                                                      
     
     
                                                               
                                                    
                                                                
                                                                  
                                                                  
                                                        
                                                                       
                                             
                                                          
                                             
     
  private legalTargetsOf(
    spec: { legalTargets?: (state: GameState, controller: PlayerId, selfOid: string, bonus?: boolean) => readonly string[] },
    state: GameState,
    player: PlayerId,
    selfOid = '',
                                                                 
    bonus = false,
  ): string[] {
                                                         
                                                         
    return spellLegalTargets(spec, state, player, selfOid, bonus)
  }

  private targetOk(
                                       
    legal: readonly string[] | null,
    target: string | undefined,
    echoTargets: readonly string[] = [],
  ): boolean {
                                                    
    if (legal === null) return target === undefined && echoTargets.length === 0
    if (target === undefined || !legal.includes(target)) return false
    return echoTargets.every((t) => legal.includes(t))
  }

     
                                               
                                                          
                                                                                  
                                           
                                                        
     
  private activationAllowed(
    state: GameState,
    player: PlayerId,
    action: Extract<InteractiveAction, { kind: 'ACTIVATE' }>,
    spec: ActivatedSpec,
    site: ActivationSite,
  ): boolean {
    const src = state.objects[action.oid as ObjId]
    if (!src || src.controller !== player) return false
    if (src.status.attachedTo !== undefined && !spec.key.startsWith('equip:')) return false                                                                  
    if (!canActivateNow(state, player, spec.keywords, site)) return false                        
    if (spec.available && !spec.available(state, player, action.oid)) return false                 
                                         
    if (spec.oncePerTurn === true && state.activatedThisTurn?.[`${action.oid}:${spec.key}`] === true) return false
    if (spec.tapSelf && isExhausted(src)) return false                            
    if (spec.unempowerSelf && !isEmpowered(src)) return false                      
                                               
    if (action.costChoice !== undefined && !costChoiceVariants(
      this.abilityRawMods(state, player, spec, action.oid, action.target),
    ).includes(action.costChoice)) return false
                                          
    const legal = spec.target !== undefined && spec.target !== 'none'
      ? this.legalTargetsOf(spec, state, player, action.oid)
      : null
    return this.targetOk(legal, action.target)
  }

     
                                                               
                                                                   
                                          
    
                                                         
                                               
                                          
                                                            
                                                    
                                                                                
    
                                              
                                                  
                                                         
                                          
                                                                 
                                                                
                                                         
    
                              
                                                                       
                                                 
                                                                     
                                                                                                
                                                 
                                  
                                                                                   
                                                                     
    
                                                                    
                                                                   
                                                       
                                                     
                                                         
                                                       
                                                                          
                                              
    
                                                                       
                                                 
                                                                                              
                                                                                               
                                                                                                
                                                                          
                                               
     
  private firstAskBlocksPlay(
    state: GameState,
    action: InteractiveAction,
  ): boolean {
                                                             
                                                                             
                                                                            
                                                                             
                                                    
                                                                              
    if (action.kind === 'ACTIVATE') {
      const src = state.objects[action.oid as ObjId]
      if (src === undefined) return false
      const spec = this.specsOf(state, src).find((a) => a.key === action.ability)
      if (spec === undefined) return false
      if (spec.choiceTiming !== 'confirm' && spec.makeConfirmChoice === undefined) return false
      const ask = spec.makeConfirmChoice ?? (spec.choiceTiming === 'confirm' ? spec.makeNextChoice : undefined)
      if (ask === undefined) return false
      const ctx = {
        selfOid: action.oid,
        controller: action.player,
        ...(action.target !== undefined ? { target: action.target } : {}),
        ...(action.extraChoice !== undefined ? { extraChoice: action.extraChoice } : {}),
      }
                                                                                      
                                                               
      return this.firstAskBlocks(state, ask(ctx), spec.firstAskOptional === true)
    }
    if (action.kind !== 'PLAY_CARD' && action.kind !== 'PLAY_STANDBY') return false
    const cardOid = action.kind === 'PLAY_CARD' ? action.cardOid : action.oid
    const defId = state.objects[cardOid as ObjId]?.defId
    if (defId === undefined) return false
    const spec = this.deps.playSpecFor?.(defId)
    if (spec === undefined) return false
    if (spec.choiceTiming !== 'confirm' && spec.makeConfirmChoice === undefined) return false
    const ask = spec.makeConfirmChoice ?? spec.makeNextChoice
    if (ask === undefined) return false
    const ctx: PlayCtx = {
      movedCardOid: cardOid,
      controller: action.player,
      ...(action.target !== undefined ? { target: action.target } : {}),
      ...(action.bonus === true ? { bonus: true } : {}),
      ...(action.bonusChoice !== undefined ? { bonusChoice: action.bonusChoice } : {}),
                                                                       
                                                     
                                                          
                                                                        
                                                               
                                                            
      ...(action.bonusChoice !== undefined && state.objects[action.bonusChoice as ObjId]?.defId !== undefined
        ? { bonusChoiceDefId: state.objects[action.bonusChoice as ObjId]!.defId } : {}),
    }
                                                                   
                                                                   
                                                
                                                               
                                                              
                             
                                                   
                       
                                                      
                                                                      
                                                           
                                                                        
                                                          
    let askState = state
    const bonusSpecForAsk = this.deps.playBonusFor?.(defId)
    if (action.bonus === true && bonusSpecForAsk?.payEvents !== undefined) {
      const payEvents = bonusSpecForAsk.payEvents(state, action.player, action.bonusChoice)
      if (payEvents.length > 0) askState = applyEvents(state, payEvents, this.simDepsForAsk()).state
    }
    return this.firstAskBlocks(askState, ask(ctx), spec.firstAskOptional === true)
  }

     
                                                      
                                                                      
                                                        
                                                             
                                               
     
  private simDepsForAsk(): ReduceDeps {
    const { onEvent: _oe, onWouldAskBurnoutOpponent: _ob, cleanupHooks, ...rest } = this.rdeps
    if (cleanupHooks === undefined) return rest
    const { onWouldAsk: _oa, ...hooks } = cleanupHooks
    return { ...rest, cleanupHooks: hooks }
  }

     
                                                                               
    
                        
                                                       
                                                            
                                                        
                                              
    
                  
                                                                    
                                                                             
                                                                                     
                                                  
                                    
                                                 
                                                                                    
                              
                                                                    
                                                           
                                                                            
                                                                            
    
                                                                        
                                                 
                                                              
     
  private firstAskBlocks(
    state: GameState,
    ask: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null,
    firstAskOptional = false,
  ): boolean {
                                                                           
                                                                       
    return !this.askChainViable(state, ask, {}, firstAskOptional, 0)
  }

     
                                                                                   
    
                                                                      
                                                                     
                                              
                                                                 
                                                                              
                                                                                      
                                                                      
                                                                          
                                                                     
                                                                                                    
                                                                            
                                                                  
                                                                                   
                                                                               
                                                                        
                                                            
                                                                
                                                                                              
                                                                          
                                
                                                                                               
                    
                                                
     
  private askChainViable(
    state: GameState,
    ask: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null,
    chosen: Readonly<Record<string, string>>,
    firstAskOptional = false,
    rootDepth = 0,
    skipGated = false,
  ): boolean {
    let nodes = 0
    let overflow = false
    const node = (ch: Record<string, string>, depth: number): boolean => {
                                                                         
      if (depth === 0 && firstAskOptional === true) return true
      nodes++
      if (nodes > DFS_ASK_NODE_CAP) { overflow = true; return false }
      if (depth > DFS_ASK_DEPTH_CAP) return false           
      const raw = ask(state, ch)
                                            
      if (raw === null) return depth > 0
                                                           
                                                                    
                                                             
                                                    
      if (ch[raw.key] !== undefined) return true
                                                                        
      const gp = this.askGateReason(state, raw)
      if (skipGated) {
                                                                                       
                                                                 
                                                                            
                                                                   
        if (gp.kind === 'masked' || gp.kind === 'gated') return true
        if (gp.kind !== 'ok') return false
        for (const c of gp.req.candidates) if (node({ ...ch, [gp.req.key]: c.id }, depth + 1)) return true
        return false
      }
      if (gp.kind !== 'ok') return false
      for (const c of gp.req.candidates) {
                                            
        if (node({ ...ch, [gp.req.key]: c.id }, depth + 1)) return true
      }
      return false
    }
    const found = node({ ...chosen }, rootDepth)
    if (!overflow) return found
                                        
    if (firstAskOptional === true) return true                              
    if (skipGated) return true                                
    const raw = ask(state, chosen)
    if (raw === null) return false                  
    return this.gateAsk(state, raw) !== null                          
  }

     
                                          
    
                                           
                                                               
                                                              
                                                                  
                                          
    
                                                            
                                                         
                                                          
                                                      
                                                                  
                                                                           
                                                                     
                                                          
                                                                            
                                                                      
                                                                        
    
                                                    
                                                  
                                                   
                                                                    
                                                                        
                                                 
    
                                                                          
                                                               
    
                           
                                                                                
                                                                  
                                                                          
                                                                              
                                                                                         
                                                                     
                                
     
  private filterDeadConfirmCandidates(step: FeprStep): FeprStep {
    if (step.kind !== 'choice') return step
    const req = step.request
    if (req.stage !== 'confirm' || req.candidates.length === 0) return step
    const item = earliestPending(step.state.chain)
    const ask = item?.confirmChoice
    if (ask === undefined) return step
    const chosen = step.state.resolveChoices ?? {}
    const kept = req.candidates.filter((c) =>
                                                                                                 
      this.askChainViable(step.state, ask, { ...chosen, [req.key]: c.id }, false, 1, true),
    )
    if (kept.length === req.candidates.length) return step
    return { ...step, request: { ...req, candidates: kept } }
  }

     
                                                                     
                                                     
                                                                             
                                        
                                                               
                                                           
                                                                                 
                                                                                  
     
  private askGateReason(
    state: GameState,
    raw: ChoiceRequest,
  ): { kind: 'ok'; req: ChoiceRequest } | { kind: 'masked' | 'gated' | 'empty' | 'noRealTarget' } {
    if (raw.maskedOut === true) return { kind: 'masked' }                                  
    const req = withTargetableCandidates(state, raw)
    if (req === null) return { kind: 'gated' }                 
    if (req.candidates.length === 0) return { kind: 'empty' }                     
    if (req.isTarget === true
      && !req.candidates.some((c) => this.askCandidateResolves(state, c.id))) return { kind: 'noRealTarget' }               
    return { kind: 'ok', req }
  }

     
                                                               
                                             
     
  private gateAsk(state: GameState, raw: ChoiceRequest): ChoiceRequest | null {
    const gp = this.askGateReason(state, raw)
    return gp.kind === 'ok' ? gp.req : null
  }

     
                                                          
                                                                     
                                                                      
                                                                         
                                                      
     
  private askCandidateResolves(state: GameState, id: string): boolean {
    if (state.objects[id as ObjId] !== undefined) return true
    if (state.zones[id as ZoneId] !== undefined) return true
    if (state.chain.some((it) => it.id === id)) return true
    if (state.players.includes(id as PlayerId)) return true                               
                                                                      
    return decodeTargetOids(id).some((oid) => state.objects[oid as ObjId] !== undefined)
  }

  legalActions(player: PlayerId): InteractiveAction[] {
                                                   
                                              
                                                      
    const raw = this.cannotPlayCards(player)
      ? this.legalActionsRaw(player).filter((a) =>
          a.kind !== 'PLAY_CARD' && a.kind !== 'PLAY_STANDBY' && a.kind !== 'PLAY_UNIT')
      : this.legalActionsRaw(player)
                                                        
                                                                               
                                                     
                                                                         
                                                    
                                               
                                                                    
                                                                               
                                                  
                                                                 
                                              
    const state = this.cur()
    return raw.filter((a) =>
      ((a.kind !== 'PLAY_CARD' && a.kind !== 'PLAY_STANDBY') || !this.playCardActionBanned(a))
      && !this.spellPlayBanned(a)
      && !this.firstAskBlocksPlay(state, a))
  }

  private legalActionsRaw(player: PlayerId): InteractiveAction[] {
    const p = this.pending()
    if (p.mode === 'gameover') return []
    const state = this.cur()

    if (p.mode === 'mulligan') {
      if (player !== p.player) return []
                                             
      const hand = state.zones[`hand:${player}` as ZoneId]?.contents ?? []
      const acts: InteractiveAction[] = [{ kind: 'MULLIGAN', player, put: [] }]
      for (let i = 0; i < hand.length; i++) {
        acts.push({ kind: 'MULLIGAN', player, put: [hand[i]!] })
        for (let j = i + 1; j < hand.length; j++) acts.push({ kind: 'MULLIGAN', player, put: [hand[i]!, hand[j]!] })
      }
      return acts
    }
    if (p.mode === 'choice') {
      if (player !== p.player) return []
      return p.request.candidates.map((c) => ({ kind: 'CHOOSE', player, key: p.request.key, answer: c.id }))
    }
    if (p.mode === 'window') {
      if (player !== p.player) return []            
                                                            
                                                         
                                                     
                                                                     
                                                 
                                                                            
                                            
                                                                                  
                                                                  
                                                                    
                                                                   
      const reactions = this.deps.handPlaySpecs(state, player).filter((s) => {
        const kws = withImpliedKeywords(s.keywords)
        if (kws.includes('反应')) return true
                                                                       
                                                                               
                                                                                    
        return kws.includes('迅捷') && state.spellDuelActive === true && !isClosed(state)
      })
                                                            
                                                 
                                                                         
                                                                
                                                            
      const fastActs = this.activations(state, player, 'window')
                                                            
                                                
                                              
      return [...this.expandPlays(state, player, reactions), ...this.recursionPlays(state, player, reactions), ...this.nimblePlays(state, player), ...this.standbyPlays(state, player), ...this.ambushPlays(state, player), ...this.reactionUnitPlays(state, player), ...fastActs, { kind: 'PASS', player }]
    }

                
    if (player !== this.state.activePlayer) return []
    const acts: InteractiveAction[] = []
    const bfs = zonesByKind(state, 'battlefield').map((b) => b.id)
    const hand = this.playableSources(state, player)                   
    const specs = this.deps.handPlaySpecs(state, player)
    const specDefIds = new Set(specs.map((s) => s.defId))
    for (const oid of hand) {
      const o = state.objects[oid]
      if (!o || specDefIds.has(o.defId)) continue                     
                                                                 
                                                            
                                                    
                                         
      const printed = this.deps.cardCost?.(o.defId)                      
      const usable = this.playVariants(state, player, o.defId, oid as string).filter(
        (v) => printed === undefined || canPayFromState(state, player, this.playDue(state, player, o.defId, printed, v, oid as string), this.purposeOfKind(o.defId)), // ★725
      )
                                                              
                                                       
                                            
      for (const v of usable) {
                                                                      
        const due = printed === undefined ? undefined : this.playDue(state, player, o.defId, printed, v, oid as string)
        for (const to of this.playDestinations(state, player, o.defId, this.paidBonus(v))) {
          acts.push({ kind: 'PLAY_UNIT', player, oid, to, ...v, ...(due !== undefined ? { due } : {}) })
        }
      }
    }
                                                        
    acts.push(...this.activations(state, player))
                                           
    acts.push(...this.expandPlays(state, player, specs))
                                                    
    acts.push(...this.recursionPlays(state, player, specs))
                                                                  
    acts.push(...this.standbyPlacements(state, player))
                                      
    acts.push(...this.standbyPlays(state, player))
                                                               
                                                                        
    if (state.chain.length === 0 && !state.spellDuelActive) {
      for (const o of Object.values(state.objects)) {
        if (o.controller !== player || o.status.dormant === true) continue
        const z = state.zones[o.zone]
        if (!z || (z.kind !== 'base' && z.kind !== 'battlefield')) continue
        if (!this.isStandardMovable(o)) continue                             
        for (const dest of [`base:${player}`, ...bfs]) {
          if (dest === o.zone) continue                      
          if (!standardMoveAllowed(this.state, o, dest, player)) continue               
          acts.push({ kind: 'MOVE', player, oid: o.oid, to: dest })
        }
      }
    }
    acts.push({ kind: 'END_TURN', player })
    return acts
  }

     
                                     
                                                             
                                                             
                                                            
                                          
                                                                         
                                                                
                                                    
                                             
                                                                          
     
  apply(action: InteractiveAction): void {
    const winnerBefore = this.state.winner
                                      
                                                          
                                                  
                                                     
                                             
                                                    
                                                                 
                                        
                                               
                                                   
                                                  
    this.applyWithTrial(action)
    this.drainRoleSignals()                                 
    this.drainReplacementSignals()                                        
    this.drainScoreSignals()                                               
    const w = this.state.winner
    if (!winnerBefore && w) this.journal.note(this.state.turn, { kind: 'winGame', player: w })
  }


     
                                                       
                                               
                                                       
                                                             
                                                      
     
  private applyWithTrial(action: InteractiveAction): void {
                                                      
                                                               
    if (this.deps.onWouldAskDestroyOrder === undefined && this.deps.onWouldAskBurnoutOpponent === undefined
      && this.deps.onWouldAskEventOrder === undefined                             
      && this.pendingDestroyOrder === null && this.pendingBurnoutOpponent === null
      && this.pendingReplaceEventOrder === null && this.replayAfterAnswer === null
      && (this.hasMultiReplacementCandidate() || this.mayAskBurnoutOpponent())) {
      const ask = this.trialRun(action)
      if (ask?.kind === 'destroy') {
        this.pendingDestroyOrder = ask.ask
        this.replayAfterAnswer = action
        return                    
      }
      if (ask?.kind === 'burnout') {
        this.pendingBurnoutOpponent = ask.ask
        this.replayAfterAnswer = action
        return      
      }
      if (ask?.kind === 'replaceEvent') { // ★1760 §373
        this.pendingReplaceEventOrder = ask.ask
        this.replayAfterAnswer = action
        return      
      }
    }
    this.applyInner(action)
  }

     
                                              
                                          
     
  private hasMultiReplacementCandidate(): boolean {
    const cand = this.deps.replaceDestroyCandidates
    if (cand === undefined) return false
    for (const o of Object.values(this.state.objects)) {
                                                        
                                                        
                                                                     
                                                      
                                                           
                                                          
                                                                     
                                                   
      if (cand(this.state, o.oid).length >= 1) return true
    }
    return false
  }

     
                                                 
                                      
                                                                        
                                                            
                                            
                                                     
     
     
                                        
    
                                                            
                                                                                       
                                                                            
                           
                                                             
     
  private writeRuleChoice(key: string, value: string): void {
    const put = (st: GameState): GameState => ({ ...st, ruleChoices: { ...st.ruleChoices, [key]: value } })
    this.state = put(this.state)
    if (this.window) this.window = { ...this.window, state: put(this.window.state) }
    if (this.choice) this.choice = { ...this.choice, state: put(this.choice.state) }
  }

                                       
  private dropRuleChoice(key: string): void {
    const drop = (st: GameState): GameState => {
      const rest = { ...st.ruleChoices }
      delete rest[key]
      return { ...st, ruleChoices: rest }
    }
    this.state = drop(this.state)
    if (this.window) this.window = { ...this.window, state: drop(this.window.state) }
    if (this.choice) this.choice = { ...this.choice, state: drop(this.choice.state) }
  }

  private trialRun(action: InteractiveAction): TrialAsk | null {
    let seen: TrialAsk | null = null
    const twin = new InteractiveGame(this.state, {
      ...this.deps,
                                                      
      onWouldAskDestroyOrder: (ask: DestroyAsk) => { seen ??= { kind: 'destroy', ask } },
      onWouldAskEventOrder: (ask: ReplaceEventAsk) => { seen ??= { kind: 'replaceEvent', ask } }, // ★1760 §373
                                                
      onWouldAskBurnoutOpponent: (ask: BurnoutOpponentAsk) => { seen ??= { kind: 'burnout', ask } },
    } as InteractiveDeps)
    twin.restore(this.snapshot())
    try { twin.apply(action) } catch { return null }                               
    return seen
  }

     
                                                
                                                       
                                                    
                                                    
                                                     
     
  private mayAskBurnoutOpponent(): boolean {
    return this.state.players.length >= 3
  }


     
                                                       
    
                                                        
                                                      
                                                                        
                                                                    
                                                         
                                                  
                                                            
     
     
                                                                                      
                                                     
                                                                                             
                                      
     
     
                                                         
                                                 
                                                             
                                                                            
                                              
                                                                     
                                                              
                                                                   
     
  private drainScoreSignals(): void {
    for (let round = 0; round < 4; round++) {
      const sig = this.state.pendingScoreSignals ?? []
      if (sig.length === 0) return
      const { pendingScoreSignals: _drop, ...rest } = this.state
      this.state = rest as GameState
                                                                              
                                                      
                                                                              
      const evs = sig.map((s): GameEvent => ({ kind: 'gainPoint', player: s.player, amount: s.amount }))                                 
      const { items, state: noted } = detectTriggersForBatchAndNote(this.state, evs, this.deps.getTriggers(this.state), sig[0]!.player)
      this.state = items.length > 0 ? { ...noted, chain: addItems(noted.chain, items) } : noted
      if (!this.window && this.state.chain.length > 0) this.advance(advanceFepr({ ...this.state, priority: null, feprPasses: 0 }, this.rdeps))
    }
  }

     
                                                                               
    
                                                                                  
                                                                                     
                                                                 
                                                                  
    
                                                                        
                                                                         
                                                                                     
    
                                                                
                                                                      
     
  private flushTargetSignals(state: GameState, stage: 'confirm' | 'resolve'): GameState {
    const all = state.pendingTargetSignals ?? []
    const staged = all.filter((b) => b.stage === stage)
    if (staged.length === 0) return state
    const remaining = all.filter((b) => b.stage !== stage)
    let answered: GameState = remaining.length > 0
      ? { ...state, pendingTargetSignals: remaining }
      : { ...state, pendingTargetSignals: undefined }
                                                                                
    const det = detectTriggersForBatchAndNote(answered, staged.flatMap((b) => b.events), this.deps.getTriggers(answered), staged[0]!.controller)
    answered = det.state
    const delivered = stage === 'confirm'
      ? { ...answered, chain: addItems(answered.chain, det.items) }
      : holdTriggersOnResolvingItem(answered, det.items)
    return delivered
  }


  private drainReplacementSignals(): void {
    for (let round = 0; round < 4; round++) {
      const sig = this.state.pendingReplacementSignals ?? []
      if (sig.length === 0) return
      const { pendingReplacementSignals: _drop, ...rest } = this.state
      this.state = rest as GameState
      const evs: GameEvent[] = []
      for (const r of sig) {
        if (r.kind === 'banished') {
          this.journal.note(this.state.turn, { kind: 'banish', targetOid: r.card, defId: r.defId } as never)
          evs.push({ kind: 'banished', player: r.player, card: r.card, defId: r.defId, ...(r.from === undefined ? {} : { from: r.from }) })
        } else {
                                                                                           
                                                      
          evs.push({ kind: 'destroyed', victim: r.victim })
        }
      }
      this.state = landAndEnqueueTriggers(this.state, evs, this.deps.getTriggers, sig[0]!.player, this.rdeps)
                                                                              
                                                                        
      if (!this.window && this.state.chain.length > 0) this.advance(advanceFepr({ ...this.state, priority: null, feprPasses: 0 }, this.rdeps))
    }
  }

  private drainRoleSignals(): void {
    if (this.pendingRoleSignals.length === 0) return
    const sig = this.pendingRoleSignals
    this.pendingRoleSignals = []
    const pc = this.pendingCombat
    if (pc === null) return                                           
    const evs = sig.map((r) => ({
      kind: r.role === 'attacking' ? 'attack' : 'defend',
      unit: r.oid,
      battlefield: pc.battlefield,
      responsible: [r.role === 'attacking' ? pc.attacker : pc.defender],
    })) as never[]
    const actor = pc.attacker
    this.state = landAndEnqueueTriggers(this.state, evs, this.deps.getTriggers, actor, this.rdeps)
  }

  private applyInner(action: InteractiveAction): void {
    const p = this.pending()
    if (p.mode === 'gameover') return
    this.journal.observe(this.state)                                   

                                                    
                                           
    if (this.state.spellDuelActive && DUEL_PLAY_KINDS.has(action.kind)) {
      this.duelPlayOpener = action.player
    }

                                                       
    if (action.kind === 'CONCEDE') {
      const rest = this.state.players.filter((x) => x !== action.player)
      const winner = rest.length === 1 ? rest[0] : undefined                      
      if (!winner) return                           
      this.state = { ...this.state, concededBy: action.player, winner }
      this.window = null
      this.choice = null
                                                           
      return
    }

    if (p.mode === 'mulligan') {
                                   
      if (action.kind !== 'MULLIGAN' || action.player !== p.player) return
      const res = applyMulligan(this.state, action.player, action.put as readonly ObjId[], this.deps.rng)
      if (!res.ok) return
      this.state = res.state
                                                              
                                                        
      if ((this.state.mulliganQueue ?? []).length === 0) {
        const first = this.state.activePlayer
        const handBefore = this.state.zones[`hand:${first}`]?.contents.length ?? 0
        this.state = drawCard(this.state, first, this.rdeps)                   
        this.noteDraw(this.state, first, handBefore)
      }
      return
    }
    if (action.kind === 'MULLIGAN') return            

    if (action.kind === 'CHOOSE') {
                                                      
                                                               
      if (this.pendingDamageOrder) {
        const a = this.pendingDamageOrder
        if (action.player !== a.assigner || action.key !== a.key) return
                                                   
        if (!a.candidates.some((c) => String(c.oid) === action.answer)) return
        const prev = parseDamageOrder(this.state.ruleChoices[a.key])
        if (prev.includes(action.answer)) return            
        this.state = {
          ...this.state,
          ruleChoices: { ...this.state.ruleChoices, [a.key]: [...prev, action.answer].join(',') },
        }
        this.pendingDamageOrder = null
                                          
        this.advance({ kind: 'done', state: this.state })
        return
      }
                                                                
                                               
                                                      
                                                                 
      if (this.pendingBurnoutOpponent) {
        const a = this.pendingBurnoutOpponent
        if (action.player !== a.player || action.key !== a.key) return
        if (!a.candidates.some((p) => String(p) === action.answer)) return
        const prev = parseBurnoutOpponents(this.state.ruleChoices[a.key])
        const replay = this.replayAfterAnswer
        this.state = { ...this.state, ruleChoices: { ...this.state.ruleChoices, [a.key]: [...prev, action.answer].join(',') } }
        this.pendingBurnoutOpponent = null
        this.replayAfterAnswer = null
        if (replay) this.applyWithTrial(replay)                           
        return
      }
                                                                 
                                                                    
                                  
      if (this.pendingContestOrder) {
        const a = this.pendingContestOrder
        if (action.player !== a.player || action.key !== a.key) return
        if (!a.candidates.some((c) => c.battlefield === action.answer)) return
        this.state = { ...this.state, ruleChoices: { ...this.state.ruleChoices, [a.key]: action.answer } }
        this.pendingContestOrder = null
        this.consumePendingContests()
        return
      }
                                                     
      if (this.pendingReplaceEventOrder) {
        const a = this.pendingReplaceEventOrder
        if (action.player !== a.controller || action.key !== a.key) return
        if (!a.oids.some((o) => String(o) === action.answer)) return
        const replay = this.replayAfterAnswer
        this.writeRuleChoice(a.key, action.answer)                    
        this.pendingReplaceEventOrder = null
        this.replayAfterAnswer = null
        if (replay) this.applyInner(replay)
        this.dropRuleChoice(a.key)                            
        return
      }
                                      
      if (this.pendingDestroyOrder) {
        const a = this.pendingDestroyOrder
        if (action.player !== a.controller || action.key !== a.key) return
        if (!a.candidates.some((c) => c.id === action.answer)) return
        const replay = this.replayAfterAnswer
        this.state = { ...this.state, ruleChoices: { ...this.state.ruleChoices, [a.key]: action.answer } }
        this.pendingDestroyOrder = null
        this.replayAfterAnswer = null
                                                 
                                                                    
                                              
        if (replay) this.applyInner(replay)
        const rest = { ...this.state.ruleChoices }
        delete rest[a.key]
        this.state = { ...this.state, ruleChoices: rest }
        return
      }
      if (!this.choice || action.player !== this.choice.request.controller || action.key !== this.choice.request.key) return
                                                     
      if (!this.choice.request.candidates.some((c) => c.id === action.answer)) return
                                                                  
                                                          
                                      
                                                   
                                                        
                                                  
                                                                        
                                                                                        
      const isTargetPick = this.choice.request.isTarget === true && action.answer !== 'skip'
                                   
                                                                                   
                                                                         
                                                          
      const stage = this.choice.request.stage
      const itemId = this.choice.request.itemId
                                                                 
                                                                                     
                                                                      
                                                                                       
                              
      let answered = this.choice.state
      if (isTargetPick) {
                                                      
                                                               
                                                       
                                                    
                                                                  
                                                                  
                                                                           
                                                                             
                                                                           
                                                             
        const sig = stage === 'confirm'
          ? chosenTargetSignals(answered, action.answer, this.choice.request.controller, itemId, this.choice.request.dedupeTargetSignal)
          : chosenTargetSignals(answered, action.answer, this.choice.request.controller, undefined, this.choice.request.dedupeTargetSignal)
        if (sig.length > 0) {
          answered = applyEvents(answered, sig, this.rdeps).state
                                                                               
                                                                                
                                                                         
                                                         
                                                                                   
                                                                                  
          const batch: PendingTargetSignalBatch = {
            stage: stage === 'confirm' ? 'confirm' : 'resolve',
            controller: this.choice.request.controller,
            events: sig,
          }
          answered = { ...answered, pendingTargetSignals: [...(answered.pendingTargetSignals ?? []), batch] }
        }
                                                              
                                                                                     
                                       
                                               
        answered = stage === 'confirm'
          ? addChosenTargetTo(answered, action.answer, itemId)
          : addChosenTarget(answered, action.answer)
      }
      this.advance(advanceFepr(submitChoice(answered, action.key, action.answer), this.rdeps))
      return
    }
    if (this.choice) return                  
    if (this.pendingDamageOrder) return                             
    if (this.pendingDestroyOrder) return                    
    if (this.pendingBurnoutOpponent) return                     
    if (this.pendingReplaceEventOrder) return                       

    if (action.kind === 'PASS') {
      if (!this.window || action.player !== this.window.player) return
                                                        
                                                                         
                                                                                        
                                                                
                                                                         
                                                  
                                                           
                                                              
                                                         
                                                                                      
                                                                                       
                                                             
                                                                          
                                                   
                                                                    
      if (this.duelPasses !== null && this.state.spellDuelActive && this.state.chain.length === 0) {
                                                
        const passes = this.duelPasses + 1
        const s = this.window.state
        if (passes >= s.players.length) {
          this.duelPasses = null
          this.window = null
          this.advance({ kind: 'done', state: { ...s, priority: null, feprPasses: 0 } })
        } else {
          this.duelPasses = passes
          const nextP = s.players[(s.players.indexOf(action.player) + 1) % s.players.length]!
                                                              
                                                                    
                             
                                                  
                                               
                                                                  
                                                                                
                                                                   
                                                       
                                                                                
                                                                         
                                                          
                                                          
                                                          
          const ns = { ...s, priority: nextP, focus: nextP }
          this.state = ns
          this.window = { kind: 'decision', state: ns, player: nextP }
        }
        return
      }
      this.advance(stepAfterDecision(this.window, { kind: 'pass' }, this.rdeps))
      return
    }
                                              
                                                                         
                                                      
                                                     
                               
    if (this.cannotPlayCards(action.player)
      && (action.kind === 'PLAY_CARD' || action.kind === 'PLAY_STANDBY' || action.kind === 'PLAY_UNIT')) return
                                         
                                                   
                                                              
                                                      
                                                               
    if (this.playCardActionBanned(action)) return
                                          
    if (this.spellPlayBanned(action)) return
    if (action.kind === 'PLAY_CARD') {
      this.playCardAction(action)
      return
    }
    if (action.kind === 'PLAY_STANDBY') {
      this.playStandbyAction(action)
      return
    }
    if (p.mode === 'window') {
                                         
      if (action.kind === 'ACTIVATE' && action.player === p.player) {
        const src0 = this.cur().objects[action.oid as ObjId]
        const sp = src0 && this.specsOf(this.cur(), src0).find((a) => a.key === action.ability)            
                                                                 
        if (!sp || !this.activationAllowed(this.cur(), action.player, action, sp, 'window')) return
        if (sp.fastResolve) { this.doFastActivate(action, sp); return }
                                                    
                                                                
                                                      
        const built = this.buildActivation(this.cur(), action, sp)
        if (!built) return
        this.duelPasses = null                                
        this.window = { kind: 'decision', state: built.state, player: p.player }
        this.advance(stepAfterDecision(this.window, { kind: 'play', items: [built.item] }, this.rdeps))
        return
      }
                                           
                                                         
                                                               
                                                   
                                                  
      if (action.kind !== 'PLAY_UNIT' || action.player !== p.player) return
      const here = this.cur()
      const same = (a: InteractiveAction): boolean =>
        a.kind === 'PLAY_UNIT' && a.oid === action.oid && a.to === action.to
      const isAmbush = this.ambushPlays(here, action.player).some(same)
      if (!isAmbush && !this.nimblePlays(here, action.player).some(same)
        && !this.reactionUnitPlays(here, action.player).some(same)) return
      this.playUnitInWindow(action, isAmbush)
      return
    }
    if (action.player !== this.state.activePlayer) return                         

    switch (action.kind) {
      case 'PLACE_STANDBY': {
                                                                
        const o = this.state.objects[action.oid as ObjId]
        const okSource = o !== undefined && this.defaultPlaySources(this.state, action.player).includes(o.oid) && o.owner === action.player
        if (!okSource || !this.deps.cardKeywords?.(o!.defId).includes('待命')) return
        if (!canPlaceStandby(this.state, action.player, action.battlefield)) return
        const free = this.state.freeStandbyThisTurn?.includes(action.player) === true
        const cost: Cost | null = free ? {} : action.alt ? (this.deps.standbyAltCost?.(this.state, action.player) ?? null) : { pips: [[]] }
        if (!cost) return
                                                             
        const pay = payFromState(this.state, action.player, cost, undefined, action.payWith)
        if (!pay.ok) return
        const placed = placeStandby(pay.state, action.oid as ObjId, action.battlefield, action.player)
        const po = placed.state.objects[placed.oid]!
                                                                       
        this.state = { ...placed.state, objects: { ...placed.state.objects, [placed.oid]: { ...po, status: { ...po.status, standbyFresh: true } } } }
                                                              
                                                                  
                                                    
                                                                     
        this.advance(advanceFepr(landAndEnqueueTriggers(this.state, [
          { kind: 'standbyPlaced', player: action.player, card: placed.oid, battlefield: action.battlefield } as GameEvent,
        ], this.deps.getTriggers, action.player, this.rdeps), this.rdeps))
        break
      }
      case 'PLAY_UNIT': {
                                                                 
        const unit = this.state.objects[action.oid as ObjId]
        const okZone = unit !== undefined && this.playableSources(this.state, action.player).includes(unit.oid)
        if (!unit || !okZone || unit.owner !== action.player) return
                                                  
                                                  
                                                                    
    if (!this.playDestinations(this.state, action.player, unit.defId,
      this.paidBonus(action)).includes(action.to)) return
                                                              
                                                       
                                                           
                                                         
                                                                              
                                                                    
                                                                        
        const toZone = this.state.zones[action.to as ZoneId]
        const contestsBf = toZone?.kind === 'battlefield' && !controlsBattlefield(this.state, action.player, action.to)
        const playWasOpen = contestsBf && openBattlefields(this.state).includes(action.to)
        const landed = this.landPlayedUnit(this.state, action, unit.defId)
        if (!landed) return                        
        this.state = contestsBf
          ? appendContest(landed.state, { battlefield: action.to as ZoneId, causedBy: action.player, ...(playWasOpen ? { wasOpen: true as const } : {}) })
          : landed.state
        this.advance(advanceFepr(landAndEnqueueTriggers(this.state, landed.events, this.deps.getTriggers, action.player, this.rdeps), this.rdeps))
        break
      }
      case 'ACTIVATE': {
                                                                                 
        const src = this.state.objects[action.oid as ObjId]
        const spec = src && this.specsOf(this.state, src).find((a) => a.key === action.ability)            
        if (!src || !spec) return
                                                                   
        if (!this.activationAllowed(this.state, action.player, action, spec, 'action')) return
        if ((spec.discard ?? 0) > 0) {
          const inHand = !!action.discardOid && this.state.zones[`hand:${action.player}` as ZoneId]?.contents.includes(action.discardOid as ObjId) === true
          if (!inHand) return
                                                
          if (spec.discardFilter && !spec.discardFilter(this.state.objects[action.discardOid as ObjId]?.defId ?? '')) return
        }
        if (spec.fastResolve) { this.doFastActivate(action, spec); return }                      
        const built = this.buildActivation(this.state, action, spec)
        if (!built) return
        this.advance(advanceFepr({ ...built.state, chain: addItems(built.state.chain, [built.item]), priority: null, feprPasses: 0 }, this.rdeps))
        break
      }
      case 'MOVE':
        this.standardMove(action.player, [action.oid], action.to)                                  
        break
      case 'MOVE_GROUP':
        this.standardMove(action.player, action.oids, action.to)                      
        break
      case 'ATTACK': // 保留内部/测试用入口;UI 不再列出(战斗由 §316.7.a 自动引发)
                                                          
                                                           
                                                       
                                                                           
                                                            
                                                          
                                                                  
                                                           
                                 
                                                                  
                                                
        if (!this.pendingBattleAt(this.state, action.battlefield, action.player)) return
        this.attack(action.player, action.battlefield)
        break
      case 'END_TURN':
        this.endTurn(action.player)
        break
    }
  }

     
                                         
    
                                             
                                              
                                                           
                                                         
                                                    
                                                      
                                                   
                                                   
                                                  
                                                  
    
                                                   
                                                   
                                
    
                                                                  
                                                       
                                                       
     
     
                                                
                                     
    
                                                                        
                                                                         
                                               
                                                 
                                                                
               
                                                                 
                                                                  
                                                       
                                                              
                                              
                                             
     
  private isStandardMovable(o: GameObject): boolean {
    if (o.defId.startsWith('rune:')) return false                
    if (this.deps.cardKind?.(o.defId) === 'equipment') return false        
    return isUnit(o)             
  }

  private standardMove(player: PlayerId, oids: readonly string[], to: string): void {
                                                             
    if (this.state.chain.length > 0 || this.state.spellDuelActive) return
    const uniq = [...new Set(oids)]
    if (uniq.length === 0) return
                                      
    for (const oid of uniq) {
      const u = this.state.objects[oid as ObjId]
                                      
      if (!u || u.controller !== player || u.status.dormant === true) return
                                                      
                                                   
      if (!this.isStandardMovable(u)) return
      const z = this.state.zones[u.zone]
      if (!z || (z.kind !== 'base' && z.kind !== 'battlefield') || (u.zone as string) === to) return
      if (!standardMoveAllowed(this.state, u, to, player)) return                     
    }
                                                      
    const preOwned = (this.state.zones[to as ZoneId]?.contents ?? [])
      .some((o) => { const x = this.state.objects[o]; return !!x && x.controller === player && !x.defId.startsWith('rune:') })
                                                       
                                                       
    const wasOpen = openBattlefields(this.state).includes(to)
    let s = this.state
                                                                                          
    const surcharge = this.deps.standardMoveSurcharge?.(s, player, uniq, to)
    if (surcharge !== undefined) { const pay = payFromState(s, player, surcharge); if (!pay.ok) return; s = pay.state }
    const movedEvents: GameEvent[] = []
    for (const oid of uniq) {
      const fromZone = s.objects[oid as ObjId]!.zone
      s = moveObjectInState(s, oid as ObjId, to as ZoneId)
                                      
                                                        
      const movedOid = (s.objects[oid as ObjId] ? oid : (s.zones[to as ZoneId]?.contents.at(-1) ?? oid)) as ObjId
      const mo = s.objects[movedOid]
                                                 
      if (mo) s = { ...s, objects: { ...s.objects, [movedOid]: { ...mo, status: { ...mo.status, dormant: true } } } }
                                                  
      movedEvents.push({ kind: 'unitMoved', unit: movedOid, player, from: fromZone, to: to as ZoneId } as GameEvent)
    }
                                                   
                                                  
    let landed = s
    for (const ev of movedEvents) landed = landAndEnqueueTriggers(landed, [ev], this.deps.getTriggers, player, this.rdeps)
    if (landed.chain.length === 0) {
      this.state = landed
                                                        
      if (!this.maybeStartCombat(player) && !preOwned) this.startNonCombatDuel(player, to, wasOpen)
    } else {
                                                                
      this.pendingMoveContest = { player, to, preOwned, wasOpen }
      this.advance(advanceFepr(landed, this.rdeps))
    }
  }

     
                                                                  
                                                                      
     
  private playStandbyAction(action: Extract<InteractiveAction, { kind: 'PLAY_STANDBY' }>): void {
    const p = this.pending()
    if (p.mode === 'window' && action.player !== p.player) return
    if (p.mode === 'action' && action.player !== this.state.activePlayer) return                     
    if (p.mode === 'choice' || p.mode === 'mulligan') return
    const state = this.cur()
    const o = state.objects[action.oid as ObjId]
    if (!o || o.controller !== action.player || o.status.faceDown !== true || o.status.standbyFresh === true) return
    const sbZone = state.zones[o.zone]
    if (!sbZone || sbZone.kind !== 'standby') return
    const bf = standbyLockedBattlefield(state, action.oid as ObjId)
    if (!bf) return

    const spec = this.deps.playSpecFor?.(o.defId)
                                                                   
                           
    const standbyDefId = o.defId
    if (spec) {
                                               
      if (!this.targetOk(spec.target === 'none' || spec.targetlessChoice === true
        ? null : this.legalTargetsOf(spec, state, action.player), action.target)) return
                                                                                          
                                                       
                                                                             
      if (standbyTargetViolatesLock(state, bf,
        action.target === undefined ? [] : this.decodeTargetOidsImpl(action.target))) return
                                                     
                                                               
                                               
                                                                                             
      const ctx = (movedOid: string) => ({ movedCardOid: movedOid, target: action.target, controller: action.player, fromZoneKind: 'standby', standbyBattlefield: bf })
                                                                      
                                                           
      const sbEchoCosts = this.echoCostsOf(state, action.player, spec)
      const sbPicks = this.echoPicksOf(action).filter((i) => sbEchoCosts[i] !== undefined)
      const res = playCard(state, {
        deps: this.rdeps, // ★1122【缺陷 113】同上
        cardOid: action.oid as ObjId,
        controller: action.player,
        paidMana: 0, // ★1735 §811.1.b 从待命打出【无视基础费用】—— 与这条路发 `playSpell` 时写死的 0 一致(口径不在这里改)
        ...(sbPicks.length > 0 ? { echoTimes: sbPicks.length } : {}), // §820.3 每付一份多执行一次
        cost: addCosts(addCosts(this.standbyDue(state, action.player, standbyDefId, {}, action.oid), this.echoPicksCost(sbEchoCosts, sbPicks)), this.deflectCost(state, action.player, [action.target], standbyDefId)), // ★1670 缺陷 216:§356 增费照算;§811.1.b 无视【基础】费用;★1406【缺陷 178】§356.2.a.2 [法盾]是强制额外费用 ⇒ 这一笔仍要付(与枚举侧同一个件、同一份目标)
        keywords: [...new Set([...spec.keywords, '反应'])],
        kind: spec.kind,
        ...(action.target !== undefined ? { chosenTarget: action.target } : {}),
        isChainStarter: !isClosed(state),
        makeResolve: (movedOid) => spellResolveGated(spec, ctx(movedOid), (c) => c.movedCardOid),
                                          
      makeResolveFor: (movedOid: ObjId, t: string | undefined, i?: number) =>
        spellResolveGated(spec, { ...ctx(movedOid), ...(t !== undefined ? { target: t } : {}), ...(i !== undefined ? { echoIndex: i } : {}) }, (c) => c.movedCardOid), // ★1401 与主阶段路同形:份序号 + 完整 ctx(fromZoneKind 'standby' 照带),目标缺省沿用初次
        ...(spec.makeNextChoice ? { makeNextChoice: (movedOid: string) => spellNextChoiceGated(spec, ctx(movedOid), (c) => c.movedCardOid) } : {}),
        ...(spec.choiceTiming !== undefined ? { choiceTiming: spec.choiceTiming } : {}), // ★1800 §355 待命路同口径
        ...(spec.makeConfirmChoice ? { makeConfirmChoice: (movedOid: string) => spec.makeConfirmChoice!(ctx(movedOid)) } : {}), // ★1762 §355.14.b
        ...(spec.makeConfirmSignals ? { makeConfirmSignals: (movedOid: string) => spec.makeConfirmSignals!(ctx(movedOid)) } : {}), // ★1764 §355.14.d
      })
      if (!res.ok) return
                                                                           
                                                                 
                                                                  
                                                              
                                                                          
      const afterLedgers = consumeNextSpellEcho(consumeNextSpellDiscount(consumeNextCardDiscount(res.state, action.player), action.player), action.player)
      const emitSpell = (st: GameState): GameState =>
        spec.kind === 'spell'
          ? landAndEnqueueTriggers(st, [{ kind: 'playSpell', player: action.player, cardOid: action.oid as ObjId, chainCardOid: (res.item as { cardOid?: ObjId }).cardOid, fromStandby: true, fromZoneKind: 'standby', manaPaid: 0, ...(standbyDefId !== undefined ? { defId: standbyDefId } : {}), ...(action.target !== undefined ? { target: action.target } : {}) }, ...targetedSignals(action.player, action.target, 'spell', action.oid, st)], this.deps.getTriggers, action.player, this.rdeps)
          : st
      if (this.window) {
        this.window = { kind: 'decision', state: afterLedgers, player: this.window.player }
        const stepped = stepAfterDecision(this.window, { kind: 'play', items: [res.item] }, this.rdeps)
        const withSignal = emitSpell(stepped.state)
        this.window = null
        this.choice = null
        this.advance(advanceFepr({ ...withSignal, priority: null, feprPasses: 0 }, this.rdeps))
      } else {
        const s: GameState = { ...afterLedgers, chain: addItems(afterLedgers.chain, [res.item]), priority: null, feprPasses: 0 }
        this.advance(advanceFepr(emitSpell(s), this.rdeps))
      }
      return
    }
                                                    
                                                                    
                                                                         
                                                                                  
                                                  
    if (!this.playDeclarationOk(state, action.player, o.defId, action, action.oid)) return
    const sbBonus = this.deps.playBonusFor?.(o.defId)
    const sbPayEvents = action.bonus === true ? (sbBonus?.payEvents?.(state, action.player, action.bonusChoice) ?? []) : []
    const sbPay = payFromState(state, action.player, this.standbyDue(state, action.player, o.defId, action, action.oid), this.purposeOfKind(o.defId))
    if (!sbPay.ok) return
                                                              
                                                        
                                                                                    
                                               
                                                                                   
    const sbContests = state.zones[bf as ZoneId]?.kind === 'battlefield' && !controlsBattlefield(state, action.player, bf as string)
    const sbWasOpen = sbContests && openBattlefields(state).includes(bf as string)
    let s = moveObjectInState(consumeNextCardDiscount(sbPay.state, action.player), action.oid as ObjId, bf as ZoneId)
                                                                                        
                                                                          
                                                                  
                                                                     
                                                              
                                                              
    const fieldedOid = action.oid as ObjId
    const fo = s.objects[fieldedOid]
    if (!fo) throw new Error(`★1266 待命打出:落地物件不见了(§124 场地内移动本应不换 oid):${String(action.oid)}`)
                                                               
                                                      
                                                               
                                                                 
                                                                           
                                                                        
                                                                     
                                                                            
                                                                                
                                                                                         
                                                                
                                         
    const sbIsUnit = this.deps.cardKind?.(fo.defId) !== 'equipment'
                                                                                    
    const sbBonusEvents0 = action.bonus === true ? (sbBonus?.events?.(action.player, fieldedOid, action.bonusChoice) ?? []) : []
    const sbSelfReady = sbBonusEvents0.some((e) => e.kind === 'markNextUnitReady')
    const sbPatch = sbIsUnit
      ? entryStatusPatch(action.haste === true || sbSelfReady || this.deps.entryReadyFor?.(s, action.player, fo.defId, bf as string, fieldedOid as string) === true)
      : {}
    s = { ...s, objects: { ...s.objects, [fieldedOid]: { ...fo, status: { ...fo.status, faceDown: false, standbyFresh: false, ...sbPatch } } } }
    if (sbIsUnit) s = consumeNextUnitReadyInState(s, action.player)                                   
                                                                       
    if (sbIsUnit && sbContests) s = appendContest(s, { battlefield: bf as ZoneId, causedBy: action.player, ...(sbWasOpen ? { wasOpen: true as const } : {}) })
                                                                    
                                                                
                                                                    
                                                                 
                                                            
                                                                                   
                                                                                        
                                                                 
    s = noteCardConfirmed(s, action.player, fieldedOid)                                    
                                                                 
                                        
    const ev: PlayUnitEvent = { kind: 'playUnit', unit: fieldedOid, player: action.player, fromStandby: true, fromZoneKind: 'standby', at: bf as string, ...(action.bonus === true ? { bonus: true } : {}) }                                         
                                                        
    s = landAndEnqueueTriggers(s, [...sbPayEvents, ev, ...sbBonusEvents0.filter((e) => e.kind !== 'markNextUnitReady')], this.deps.getTriggers, action.player, this.rdeps)
    this.window = null
    this.choice = null
    this.advance(advanceFepr({ ...s, priority: null, feprPasses: 0 }, this.rdeps))
  }

     
                                                         
                                             
     
     
                                                         
                                                    
                                                           
     
  private buildActivation(
    state: GameState,
    action: Extract<InteractiveAction, { kind: 'ACTIVATE' }>,
    spec: ActivatedSpec,
  ): { state: GameState; item: ChainItem } | null {
                                                        
    const pay = payFromState(state, action.player, this.activationCost(state, action.player, spec, action.oid, action.costChoice, action.target), this.abilityPurpose(state.objects[action.oid as ObjId]?.defId ?? ''), action.payWith)             
    if (!pay.ok) return null
    let s = pay.state
    if (spec.tapSelf) {
      const cur = s.objects[action.oid as ObjId]!
      s = { ...s, objects: { ...s.objects, [action.oid]: { ...cur, status: { ...cur.status, ...exhaustPatch(cur) } } } }                                  
    }
                                           
                                                           
                                                                   
                                                                        
                                                                        
                                                                       
                                    
                                                                            
                                                              
                                                                  
                                                                                                      
                                                    
    if (spec.unempowerSelf) {
      s = landAndEnqueueTriggers(s, [{ kind: 'disempower', target: action.oid as ObjId } as GameEvent], this.deps.getTriggers, action.player, this.rdeps)
    }
    if (spec.extraCost) {
      const paid = this.payExtraCost(s, action, spec)                                    
      if (paid === null) return null
      s = paid
    }
                                                              
                                                                      
                                                                   
                                                                     
                                                 
                                                                  
                                                                                        
                                                                                              
                                                  
                                                                                      
                                                                                                
                                                                   
                                                           
                                                                 
                                                
                                                                                    
                                                                                   
                                                                            
                                                                 
                                                                   
                                                                
                                
                                                       
                                                                 
                                            
                                                           
                                                                  
                                                              
                                                    
    s = runCleanupToFixpoint(s, this.rdeps.cleanupHooks ?? {})
    if (spec.destroySelf) {
                                                      
                                                         
                                                    
                                                   
      s = landAndEnqueueTriggers(s, [{ kind: 'destroy', target: action.oid as ObjId, sourcePlayer: action.player }], this.deps.getTriggers, action.player, this.rdeps)
    }
                                                                       
                                                            
                                                                  
    if (spec.recycleSelf) {
      s = landAndEnqueueTriggers(s, [{ kind: 'recycle', player: action.player, objs: [action.oid as ObjId] } as GameEvent], this.deps.getTriggers, action.player, this.rdeps)
    }
                                                                                                          
    if (action.discardOid) s = landAndEnqueueTriggers(s, [{ kind: 'zoneChange', obj: action.discardOid as ObjId, to: `discard:${action.player}` as ZoneId } as GameEvent], this.deps.getTriggers, action.player, this.rdeps)
                                                                     
                                                       
                                                            
                                                             
                                                    
                                
                                                      
                                                                 
                                                              
                                                     
                                                               
                                                                   
                                                                   
                                                            
                                                            
                                                 
    const activateSignal = { kind: 'activateAbility', source: action.oid as ObjId, player: action.player, abilityKey: spec.key, baseCostMana: spec.cost.mana ?? 0 } as GameEvent                     
                                                                      
    if (spec.oncePerTurn === true) s = { ...s, activatedThisTurn: { ...s.activatedThisTurn, [`${action.oid}:${spec.key}`]: true } }
                                                                 
    const ctx = { selfOid: action.oid, controller: action.player, ...(action.target !== undefined ? { target: action.target } : {}), ...(action.extraChoice !== undefined ? { extraChoice: action.extraChoice } : {}) }
    const { oid: itemSeq } = freshOid(s)
                                                                                                       
                                                                      
                                             
    const makeActivateNextFn = spec.makeNextChoice ? spellNextChoiceGated(spec, ctx, (c) => c.selfOid) : undefined
    const activateNextChoice = spec.choiceTiming === 'confirm' ? undefined : makeActivateNextFn
    const activateConfirmChoice = spec.makeConfirmChoice
      ? spec.makeConfirmChoice(ctx)
      : (spec.choiceTiming === 'confirm' && makeActivateNextFn !== undefined ? makeActivateNextFn : undefined)
    const item: ChainItem = {
      id: `act:${action.oid}:${spec.key}:${itemSeq}`,
      controller: action.player,
      kind: 'ability' as const,
      status: 'pending' as const,
      sourceOid: action.oid as ObjId, // ★1767 §355.6 结算期追问的目标要认得出来源是不是单位
      ...(action.target !== undefined ? { chosenTarget: action.target } : {}),
                                                                    
                                                                  
                                                                                              
                                                                                 
                                          
      resolve: ((base) => ((st, choices, it) => [activateSignal, ...base(st, choices, it)]) as ChainItem['resolve'])(spellResolveGated(spec, ctx, (c) => c.selfOid)),
      ...(activateNextChoice !== undefined ? { nextChoice: activateNextChoice } : {}),
      ...(activateConfirmChoice !== undefined ? { confirmChoice: activateConfirmChoice } : {}), // ★1762 §355.14.b;★1800 choiceTiming='confirm' 接这个口
      ...(spec.makeConfirmSignals ? { confirmSignals: spec.makeConfirmSignals(ctx) } : {}), // ★1764 §355.14.d
    }
    return { state: s, item }
  }

     
                                                                                                           
                                                                                              
                                                       
                                               
                                           
     
  private payExtraCost(s: GameState, action: Extract<InteractiveAction, { kind: 'ACTIVATE' }>, spec: ActivatedSpec): GameState | null {
    if (!spec.extraCost) return s
                                                                            
    const opts = spec.extraCost.options?.(s, action.player, action.oid, action.target)
    if (opts !== undefined && !opts.some((c) => c.id === action.extraChoice)) return null
    const paid = spec.extraCost.pay(s, action.player, action.oid, action.extraChoice)
    if (paid === null) return null
    const payEvs = spec.extraCost.payEvents?.(s, action.player, action.oid, action.extraChoice) ?? []
    let out = paid
    if (payEvs.length > 0) out = landAndEnqueueTriggers(out, payEvs, this.deps.getTriggers, action.player, this.rdeps)
    return out
  }

  private doFastActivate(action: Extract<InteractiveAction, { kind: 'ACTIVATE' }>, spec: ActivatedSpec): void {
    const inWindow = this.window !== null
    let s = this.cur()
    const chainBefore = s.chain.length
    const src0 = s.objects[action.oid as ObjId]
    if (!src0 || src0.controller !== action.player) return
    if (spec.tapSelf && isExhausted(src0)) return                  
                                                            
    if (spec.oncePerTurn === true && s.activatedThisTurn?.[`${action.oid}:${spec.key}`] === true) return
                                                              
                                               
                                               
    const pay = payFromState(s, action.player, this.activationCost(s, action.player, spec, action.oid, action.costChoice, action.target), this.abilityPurpose(s.objects[action.oid as ObjId]?.defId ?? ''), action.payWith)             
    if (!pay.ok) return
    s = pay.state
                                                                                  
                                                                                               
    if (spec.extraCost) {
      const paid = this.payExtraCost(s, action, spec)
      if (paid === null) return                       
      s = paid
    }
                              
    if (spec.oncePerTurn === true) s = { ...s, activatedThisTurn: { ...s.activatedThisTurn, [`${action.oid}:${spec.key}`]: true } }
    if (spec.tapSelf) {
      const cur = s.objects[action.oid as ObjId]!
      s = { ...s, objects: { ...s.objects, [action.oid]: { ...cur, status: { ...cur.status, ...exhaustPatch(cur) } } } }                                  
    }
                                                           
                                                               
                                      
                                                         
    s = runCleanupToFixpoint(s, this.rdeps.cleanupHooks ?? {})
                                                                     
    const evs = spec.makeResolve({ selfOid: action.oid, controller: action.player, ...(action.target !== undefined ? { target: action.target } : {}), ...(action.extraChoice !== undefined ? { extraChoice: action.extraChoice } : {}) })(s)
                                                                   
                                                      
    s = landAndEnqueueTriggers(s, [
      { kind: 'activateAbility', source: action.oid as ObjId, player: action.player, abilityKey: spec.key, baseCostMana: spec.cost.mana ?? 0 } as GameEvent, // ★722 §206.1 基础费采集
      ...targetedSignals(action.player, action.target, 'ability', action.oid, s),
    ], this.deps.getTriggers, action.player, this.rdeps)
                                                      
                                                        
                                                                
                                            
                                                                 
    const batch: GameEvent[] = [
      ...(spec.destroySelf ? [{ kind: 'destroy' as const, target: action.oid as ObjId, sourcePlayer: action.player }] : []),
      ...(spec.recycleSelf ? [{ kind: 'recycle' as const, player: action.player, objs: [action.oid as ObjId] } as GameEvent] : []),
      ...evs,
    ]
                                                             
                                                 
                                                                      
    s = landAndEnqueueTriggers(s, batch, this.deps.getTriggers, action.player, { ...this.rdeps, fromEffect: true, effectController: action.player })
                                                  
    if (inWindow && this.window) this.window = { kind: 'decision', state: s, player: this.window.player }
    else this.state = s
                                                             
                                                          
                                                
                                                                       
                                                        
                                                                      
                                                               
                                                           
                                                                    
    if (!inWindow && s.chain.length > chainBefore) {
      this.advance(advanceFepr({ ...s, priority: null, feprPasses: 0 }, this.rdeps))
    }
  }

     
                                                         
                                                   
                                                    
     
  private playUnitInWindow(
    action: Extract<InteractiveAction, { kind: 'PLAY_UNIT' }>,
                                                  
    viaAmbush: boolean,
  ): void {
    if (!this.window) return
    let s = this.window.state
    const o = s.objects[action.oid as ObjId]
                                                          
    if (!o || !this.playableSources(s, action.player).includes(o.oid)) return
    if (viaAmbush) {
                                                     
                                                               
                                           
      if (!this.ambushDestinations(s, action.player, o.defId,
        this.paidBonus(action)).includes(action.to)) return
    }
    const landed = this.landPlayedUnit(s, action, o.defId)
    if (!landed) return                         
    s = landAndEnqueueTriggers(landed.state, landed.events, this.deps.getTriggers, action.player, this.rdeps)
                                                                   
                                     
    this.window = null
    this.choice = null
    this.advance(advanceFepr({ ...s, priority: null, feprPasses: 0 }, this.rdeps))
  }

     
                                                     
                                                      
     
     
                                                    
                                                                    
                                                 
                                                     
     
  private pendingBattleAt(state: GameState, battlefield: string, mover: PlayerId): boolean {
    const units = (state.zones[battlefield as ZoneId]?.contents ?? [])
      .map((o) => state.objects[o]).filter((o): o is GameObject => isUnit(o))
    return units.some((u) => u.controller === mover) && units.some((u) => u.controller !== mover)
  }

  private maybeStartCombat(mover: PlayerId): boolean {
    const s = this.state
    for (const z of zonesByKind(s, 'battlefield')) {
                                                           
                                                             
                                                                     
                                                                                          
                                                             
                                                         
                                               
                                                      
                                                             
                                                                                 
                                                                    
                                                                 
                                    
                                                                         
      if (this.pendingBattleAt(s, z.id as string, mover)) { this.attack(mover, z.id); return true }
    }
    return false
  }

                                                                       
  private attack(attacker: PlayerId, battlefield: string): void {
    const { state, defendEvents, defender } = openCombat(this.state, battlefield, attacker)
    this.pendingCombat = { battlefield, attacker, defender }
                                                                      
                                                                    
                                                                           
                                                                  
                                                                                
    const landed = landAndEnqueueTriggers(state, defendEvents, this.deps.getTriggers, defender, this.rdeps,
      { first: attacker, last: defender })
    if (landed.chain.length === 0) {
                                                        
      this.duelPasses = 0
      this.state = { ...landed, priority: attacker, feprPasses: 0 }
      this.window = { kind: 'decision', state: this.state, player: attacker }
      return
    }
    this.advance(advanceFepr(landed, this.rdeps))                          
  }

     
                                                              
                                                              
                                                            
                                                                  
     
  private startNonCombatDuel(contester: PlayerId, battlefield: string, wasOpen = false): void {
                                                         
                                                             
                                                          
                                                 
      
                                                                  
                                                            
                                                                
                                                                              
                                            
                                                          
                                                             
                                                              
    if (this.state.zones[battlefield as ZoneId]?.kind !== 'battlefield') return
                                                            
                                                            
                                                            
                                               
                                                             
                                                                   
                                                      
                                                           
                                                               
                                                                   
                                                        
                                                 
                                                        
                                   
                                                               
                                                                            
                                                           
                                                      
                                                    
    const trackedBf = this.state.battlefieldControl
    if (trackedBf !== undefined && battlefield in trackedBf
      && controlsBattlefield(this.state, contester, battlefield)) return
    this.pendingNonCombatDuel = { battlefield, contester, ...(wasOpen ? { wasOpen: true } : {}) }
                                                                                
    const opened: GameState = { ...this.state, spellDuelActive: true, duelBattlefield: battlefield, focus: contester, priority: contester }
                                                            
    const landed = landAndEnqueueTriggers(opened, [{ kind: 'duelStart', battlefield, combat: false }], this.deps.getTriggers, contester, this.rdeps)
    if (landed.chain.length === 0) {
      this.duelPasses = 0
      this.state = { ...landed, feprPasses: 0 }
      this.window = { kind: 'decision', state: this.state, player: contester }
      return
    }
    this.advance(advanceFepr(landed, this.rdeps))
  }

                                                             
  private playCardAction(action: Extract<InteractiveAction, { kind: 'PLAY_CARD' }>): void {
    const p = this.pending()
    if (p.mode === 'window' && action.player !== p.player) return             
    if (p.mode === 'action' && action.player !== this.state.activePlayer) return                     
    if (p.mode === 'choice') return                
    const state = this.cur()
    const card = state.objects[action.cardOid as ObjId]
    if (!card) return
                                                               
                                                            
                                                          
                                                                                
    const specs = this.deps.handPlaySpecs(state, action.player)
    const spec = this.deps.playSpecFor?.(card.defId) ?? specs.find((s) => s.defId === card.defId)
    if (!spec) return

                                              
                                                                 
                                                            
                                                 
                                                             
                                                  
    if (action.recursionIndex === undefined
      && !this.playableSources(state, action.player).includes(action.cardOid as ObjId)) return
                                                                 
                                                           
                                                                              
    if (!this.targetOk(spec.target === 'none' || spec.targetlessChoice === true
      ? null
      : this.legalTargetsOf(spec, state, action.player, '', action.bonus === true),
    action.target, this.echoTargetsOf(action, this.echoPicksOf(action).length))) return

                                                            
                                                  
    const fromZoneKind = state.zones[state.objects[action.cardOid as ObjId]?.zone as ZoneId]?.kind
                                                       
    const ctx = (movedOid: string) => ({ movedCardOid: movedOid, target: action.target, controller: action.player,
      ...(action.bonus === true ? { bonus: true } : {}),
      ...(fromZoneKind !== undefined ? { fromZoneKind } : {}), // ★505 从哪打出(「如果你从手牌中打出此牌」)
                                                                  
      ...(action.bonusChoice !== undefined && state.objects[action.bonusChoice as ObjId]?.defId !== undefined ? { bonusChoiceDefId: state.objects[action.bonusChoice as ObjId]!.defId } : {}),
      ...(action.bonusChoice !== undefined ? { bonusChoice: action.bonusChoice } : {}) })                 
                                                         
                                                   
    let paid = state
                                                                        
                                                               
                                                                 
    const altPayEvents = action.altCost === true && spec.altCost
      ? (spec.altCost.payEvents?.(state, action.player, action.altChoice) ?? [])
      : []
    if (action.altCost && spec.altCost) {
      const after = spec.altCost.pay(state, action.player, action.altChoice)
      if (!after) return                
                                                    
                                                                
                                                                                       
                                                              
                                                    
                                                        
                                           
                                                           
                                                                   
                                           
                                                                    
                                                         
                                                                     
                                                
                                 
                                                                         
                                 
      paid = runCleanupToFixpoint(after, this.rdeps.cleanupHooks ?? {})
    }
                                 
                                                                  
                           
                              
                                                                     
                                                       
                                                              
                                                        
                                                 
                                                           
                                                    
                                                        
                                                              
                                  
                                          
    const recursionCost = action.recursionIndex !== undefined
      ? this.recursionOptsOf(paid, card.defId, action.cardOid)[action.recursionIndex]
      : undefined
    if (action.recursionIndex !== undefined && !recursionCost) return                   
    if (action.recursionIndex !== undefined && !isRecursionSource(card.zone, action.player)) return                   
                                           
                                                           
    if (action.costChoice !== undefined && !costChoiceVariants(
      this.deps.costModsFor?.(paid, action.player, spec.defId, costCtxOf(paid, action.cardOid, action.target)) ?? [],
    ).includes(action.costChoice)) return
                                                      
                                                               
                                                                                    
                                                          
                                                            
                                                              
    const declForBonus = { ...action, costChoice: undefined }
    if (!this.playDeclarationOk(paid, action.player, card.defId, declForBonus, action.cardOid)) return
    const spellBonusSpec = this.deps.playBonusFor?.(card.defId)
                                                                 
    const bonusPayEvents = action.bonus === true
      ? (spellBonusSpec?.payEvents?.(paid, action.player, action.bonusChoice) ?? [])
      : []
    const rawBase: Cost = recursionCost ?? (action.altCost && spec.altCost ? spec.altCost.cost : spec.cost)
    const baseCost: Cost =
      this.effectiveCost(paid, action.player, spec.defId, rawBase, [], costCtxOf(paid, action.cardOid, action.target, action.costChoice))
                                                 
    const echoCosts = this.echoCostsOf(paid, action.player, spec)
    const picks = this.echoPicksOf(action).filter((i) => echoCosts[i] !== undefined)
                                                     
    const echoDue = picks.length > 0 ? this.optionalExtraDue(paid, action.player, spec.defId, this.echoPicksCost(echoCosts, picks), action.costChoice) : undefined
    const echoed: Cost = echoDue !== undefined
      ? { mana: (baseCost.mana ?? 0) + (echoDue.mana ?? 0), pips: [...(baseCost.pips ?? []), ...(echoDue.pips ?? [])] }
      : baseCost
                                                       
                                           
                                                                   
    const echoPayEvents: GameEvent[] = []
    if (picks.includes(0) && (spec.echoDiscard ?? 0) > 0) {
      const d = action.echoDiscardOid
      const inHand = d !== undefined
        && (paid.zones[`hand:${action.player}` as ZoneId]?.contents ?? []).some((h) => (h as string) === d)
      if (!inHand) return                                   
      echoPayEvents.push({ kind: 'zoneChange', obj: d as ObjId, to: `discard:${action.player}` as ZoneId } as GameEvent)                                                                      
    }
    const echoTargets = this.echoTargetsOf(action, picks.length)
    const deflectTargets = [action.target, ...echoTargets]
                                                       
                                                                         
    const bonusResource: Cost = action.bonus === true
      ? this.bonusResourceDue(paid, action.player, card.defId, action.costChoice)
      : {}
    const totalCost: Cost = addCosts(addCosts(echoed, bonusResource), this.deflectCost(paid, action.player, deflectTargets, card.defId))
                                                                                                                               
    const ctxE = (movedOid: string) => ({ ...ctx(movedOid), ...(picks.length > 0 ? { echoTimes: picks.length } : {}) })
    const res = playCard(paid, {
      deps: this.rdeps, // ★1122【缺陷 113】同上 —— 这条是回响真正的入口(picks 就在下面)
      cardOid: action.cardOid as ObjId,
      controller: action.player,
      cost: totalCost,
      paidMana: totalCost.mana ?? 0, // ★1735 与这条路发 `playSpell` 时用的值**同源**(★685 口径)
      purpose: this.purposeOfKind(card.defId), // ★742 受限资源用途(验/扣同径)
      ...(action.payWith !== undefined ? { payWith: action.payWith } : {}), // ★772 玩家宣告的付费方案
      ...(picks.length > 0 ? { echoTimes: picks.length } : {}), // §820.3 每付一份多执行一次
                                   
      ...(echoTargets.length > 0 ? { echoTargets } : {}),
      keywords: spec.keywords,
      kind: spec.kind,
      ...(action.target !== undefined ? { chosenTarget: action.target } : {}), // §355 锁定目标
      isChainStarter: !isClosed(state), // 开环起链 / 闭环叠链(§358.4)
      ...(action.recursionIndex !== undefined ? { exileOnLeave: true } : {}), // §829.1.b.1 离链改放逐
      makeResolve: (movedOid) => spellResolveGated(spec, ctxE(movedOid), (c) => c.movedCardOid),
                                                                                                                   
      makeResolveFor: (movedOid: ObjId, t: string | undefined, i?: number) =>
        spellResolveGated(spec, { ...ctxE(movedOid), ...(t !== undefined ? { target: t } : {}), ...(i !== undefined ? { echoIndex: i } : {}) }, (c) => c.movedCardOid),
      ...(spec.makeNextChoice ? { makeNextChoice: (movedOid: string) => spellNextChoiceGated(spec, ctxE(movedOid), (c) => c.movedCardOid) } : {}),
      ...(spec.choiceTiming !== undefined ? { choiceTiming: spec.choiceTiming } : {}), // ★1800 §355 主打出路同口径
      ...(spec.makeConfirmChoice ? { makeConfirmChoice: (movedOid: string) => spec.makeConfirmChoice!(ctxE(movedOid)) } : {}), // ★1762 §355.14.b(㊼ 四条 apply 路同口径)
      ...(spec.makeConfirmSignals ? { makeConfirmSignals: (movedOid: string) => spec.makeConfirmSignals!(ctxE(movedOid)) } : {}), // ★1764 §355.14.d
    })
    if (!res.ok) return                        

                                                 
                                                            
                                      
                                                  
                                                  
                                           
                                 
                                                         
                                                
                                     
                                                                          
                                                                                                
                                                                 
                                                                  
                                                                                 
                                                            
                                                               
                                               
    const fromDiscardZone = state.zones[card.zone]?.kind === 'discard'
    const afterGrant = fromDiscardZone
      ? consumePlayFromDiscardGrant(res.state, action.player, card.defId)
      : res.state
    const afterSpellGrants = spec.kind === 'spell'
      ? consumeNextSpellEcho(consumeNextSpellDiscount(afterGrant, action.player), action.player)
      : afterGrant
                                                       
                                                                  
    const afterPlay = consumeNextCardDiscount(afterSpellGrants, action.player)

    if (this.window) {
      this.duelPasses = null                                
                                                                  
                                         
      this.window = { kind: 'decision', state: afterPlay, player: this.window.player }
      const stepped = stepAfterDecision(this.window, { kind: 'play', items: [res.item] }, this.rdeps)
      if (spec.kind === 'spell') {
                                                     
        const base = noteMaxSpellMana(stepped.state, action.player, totalCost.mana ?? 0)
        const withSignal = landAndEnqueueTriggers(base, [...altPayEvents, ...bonusPayEvents, ...echoPayEvents, { kind: 'playSpell', player: action.player, cardOid: action.cardOid as ObjId, chainCardOid: (res.item as { cardOid?: ObjId }).cardOid, defId: card.defId, fromZoneKind: 'hand', manaPaid: totalCost.mana ?? 0, ...(action.target !== undefined ? { target: action.target } : {}) }, ...targetedSignals(action.player, action.target, 'spell', action.cardOid, base)], this.deps.getTriggers, action.player, this.rdeps)
        this.window = null
        this.choice = null
        this.advance(advanceFepr({ ...withSignal, priority: null, feprPasses: 0 }, this.rdeps))
      } else {
        this.advance(stepped)
      }
    } else {
                                                             
      let s: GameState = { ...afterPlay, chain: addItems(afterPlay.chain, [res.item]), priority: null, feprPasses: 0 }
      if (spec.kind === 'spell') {
        const base = noteMaxSpellMana(s, action.player, totalCost.mana ?? 0)
        s = landAndEnqueueTriggers(base, [...altPayEvents, ...bonusPayEvents, ...echoPayEvents, { kind: 'playSpell', player: action.player, cardOid: action.cardOid as ObjId, chainCardOid: (res.item as { cardOid?: ObjId }).cardOid, defId: card.defId, fromZoneKind: 'hand', manaPaid: totalCost.mana ?? 0, ...(action.target !== undefined ? { target: action.target } : {}) }, ...targetedSignals(action.player, action.target, 'spell', action.cardOid, base)], this.deps.getTriggers, action.player, this.rdeps)
      }
      this.advance(advanceFepr(s, this.rdeps))
    }
  }

     
                                                                             
                                                                     
                                 
    
                                                                        
                                                 
                                                                                          
                                                                
                                                                         
                                                            
     
  private drainEmptyConfirmAsk(step: FeprStep, iter: number): FeprStep {
    if (step.kind !== 'choice') return step
    const req = step.request
    if (req.stage !== 'confirm' || req.candidates.length > 0) return step
    if (iter >= GATING_SKIP_ITERATION_CAP) {
      throw new Error(`★1815 确认期空候选跳过在 ${GATING_SKIP_ITERATION_CAP} 轮内未收敛(键 ${req.key}):卡似乎在恒返回同一空问`)
    }
    const next = advanceFepr(submitChoice(step.state, req.key, SKIPPED_BY_757), this.rdeps)
    return this.drainEmptyConfirmAsk(next, iter + 1)
  }

                                                                            
  private advance(step: FeprStep): void {
                                         
                                                                                           
                                                                                   
                                                          
                                                       
                                                
                                                             
                                                                     
                                                                  
                                                        
    step = this.filterDeadConfirmCandidates(step)
    step = this.drainEmptyConfirmAsk(step, 0)
    this.window = step.kind === 'decision' ? step : null
    this.choice = step.kind === 'choice' ? step : null
    if (step.kind === 'done' && this.pendingTurnEnd) {
                                     
      const p2 = this.pendingTurnEnd
      this.pendingTurnEnd = null
      this.state = step.state
      this.finishEndTurn(p2)
      return
    }
    if (step.kind === 'done' && this.pendingMoveContest) {
                                           
      const { player, to, preOwned, wasOpen } = this.pendingMoveContest
      this.pendingMoveContest = null
      this.state = step.state
      if (!this.maybeStartCombat(player) && !preOwned) this.startNonCombatDuel(player, to, wasOpen)
      this.consumePendingContests()                                          
      return
    }
                                       
                                                      
                                                        
                                                                 
                                                
                                                     
                                                      
                                            
                                               
                                                               
                                                   
    if (step.kind === 'done' && this.pendingNonCombatDuel && this.duelPlayOpener !== null
      && step.state.spellDuelActive && step.state.chain.length === 0) {
      const opener = this.duelPlayOpener
      this.duelPlayOpener = null
      const ps = step.state.players
                                                          
                                                              
                                                      
                                               
                                                                
                                                   
                                                                  
                                                                   
                                                        
      const base = step.state.focus ?? opener
      const next = ps[(ps.indexOf(base) + 1) % ps.length]
      if (next !== undefined) {
        this.state = { ...step.state, focus: next, priority: next, feprPasses: 0 }
        this.duelPasses = 0                                    
        this.window = { kind: 'decision', state: this.state, player: next }
        return
      }
    }
    if (step.kind === 'done' && this.pendingNonCombatDuel) {
                                                  
      const { battlefield, contester, wasOpen } = this.pendingNonCombatDuel
      this.pendingNonCombatDuel = null
      let lockDrawFor: PlayerId | null = null
      let lockDrawHandBefore = 0
      const closed0: GameState = { ...step.state, spellDuelActive: false, duelBattlefield: undefined, focus: null, priority: null, feprPasses: 0 }
                                                      
                                                    
                                                      
      const survivor = soleUnitControllerAt(closed0, battlefield)
      const priorCtrl = closed0.battlefieldControl?.[battlefield]
      const closed: GameState = survivor === null ? closed0 : writeControl(closed0, battlefield, survivor)
                                                                  
                                                              
                                                           
                                                 
                                                              
                                                                              
                                       
                                                    
                                                                                
                                                  
                                                                          
      const established = survivor !== null && priorCtrl !== survivor
                                                                    
                                                                   
                                                                  
                                          
                                                                           
                                                    
                                                                 
                                                                          
                                                                          
                                                                           
      const scorer = survivor ?? contester                                               
      const cq = established
        ? attemptConquer(closed, scorer, battlefield, this.rdeps, {
            ...this.scoringHooksBase(),
            drawCard: (s2, p2) => {
              lockDrawFor = p2
              lockDrawHandBefore = s2.zones[`hand:${p2}`]?.contents.length ?? 0
              return drawCard(s2, p2, this.rdeps)                                        
            },
          })
        : { state: closed, result: 'noEstablish' as const, signal: false }
      this.state = cq.state
      if (lockDrawFor) this.noteDraw(this.state, lockDrawFor, lockDrawHandBefore)
      this.journal.note(this.state.turn, {
        kind: 'duelEnd', player: contester, battlefield,
        ...(cq.result === 'scored' ? { conquered: scorer } : {}),
        result: cq.result,
      })
      if (cq.signal) {
                                                       
        const conquerTimesA = Math.max(1, this.deps.conquerRepeats?.(this.state, scorer, battlefield) ?? 1)
        const conquerEvsA: import('../loop/events').GameEvent[] = []
                                                                                                  
        const wasUncontrolledA = wasOpen === true || priorCtrl === null
        for (let n = 1; n <= conquerTimesA; n++) conquerEvsA.push({ kind: 'conquer', player: scorer, battlefield, nth: n, ...(wasOpen === true ? { wasOpen: true } : {}), ...(wasUncontrolledA ? { wasUncontrolled: true } : {}) })
        const landed = landAndEnqueueTriggers(this.state, conquerEvsA, this.deps.getTriggers, scorer, this.rdeps)
        this.advance(advanceFepr({ ...landed, priority: null, feprPasses: 0 }, this.rdeps))
      }
      this.consumePendingContests()                                       
      return
    }
                                                          
                                
                                                             
                                                          
                                                    
                                               
                                                              
                                                               
                                                          
                                                        
                                                      
                                                                        
                                      
                                                        
                                                          
                                                  
                                                                             
                                                      
                                        
                                                             
                             
                                                              
                                                
                                                           
    if (step.kind === 'done' && this.pendingCombat && this.duelPlayOpener !== null
      && step.state.spellDuelActive && step.state.chain.length === 0) {
      const opener = this.duelPlayOpener
      this.duelPlayOpener = null
      const ps = step.state.players
      const base = step.state.focus ?? opener
      const next = ps[(ps.indexOf(base) + 1) % ps.length]
      if (next !== undefined) {
        this.state = { ...step.state, focus: next, priority: next, feprPasses: 0 }
        this.duelPasses = 0                                    
        this.window = { kind: 'decision', state: this.state, player: next }
        return
      }
    }
    if (step.kind === 'done' && this.pendingCombat) {
                                                   
      const { battlefield, attacker, defender } = this.pendingCombat
      const before = step.state
                                                               
                                                    
                                                                    
                                                       
                                                             
                                                            
                                            
                                             
                                                           
      const ask = pendingCombatDamageOrder(before, battlefield, attacker, defender, this.rdeps)
      if (ask) {
        this.pendingDamageOrder = ask
        this.state = before            
        return
      }
      let combat = runCombatDamageAndResolve(before, battlefield, attacker, defender, this.rdeps)
      this.pendingCombat = null
      this.pendingDamageOrder = null
                                                
                                        
      this.roleLedger = emptyLedger()
      this.pendingRoleSignals = []
                                                      
                                          
                                              
                                               
                                                              
                                       
                                                                  
      if (combat.deaths.length > 0) {
        const landed = landAndEnqueueTriggers(combat.state, combat.deaths, this.deps.getTriggers, attacker, this.rdeps)
        combat = { ...combat, state: landed }
      }
                                               
                                            
                                                   
      {
        const ev = {
          kind: 'battleEnd' as const,
          battlefield,
          attacker,
          defender,
          outcome: combat.outcome,
          participants: combat.participants,
        }
        const landed = landAndEnqueueTriggers(combat.state, [ev], this.deps.getTriggers, attacker, this.rdeps)
        combat = { ...combat, state: landed }
      }
                                                     
      let lockDrawFor: PlayerId | null = null
      let lockDrawHandBefore = 0
      const cq = resolveConquer(combat.state, combat.conquer, this.rdeps, {
        ...this.scoringHooksBase(),
        drawCard: (s, p) => {
          lockDrawFor = p
          lockDrawHandBefore = s.zones[`hand:${p}`]?.contents.length ?? 0
          return drawCard(s, p, this.rdeps)                   
        },
      })
      const after = cq.state
                                                                 
                                                                  
      const scoredConq = cq.result === 'scored' ? (combat.conquer?.player ?? null) : null
      const summary = summarizeCombat(before, after, battlefield, attacker, defender, combat.outcome, scoredConq)
      this.state = { ...after, lastCombat: summary }
      if (lockDrawFor) this.noteDraw(this.state, lockDrawFor, lockDrawHandBefore)                
      this.journal.note(this.state.turn, {
        kind: 'combatEnd', player: attacker, battlefield,
        outcome: summary.outcome,
        ...(scoredConq ? { conquered: scoredConq } : {}),
                                        
        ...(combat.conquer && cq.result === 'alreadyScored' ? { note: '本回合已在此处得过分,不再重复计分(§470)' } : {}),
        ...(cq.result === 'drawInstead' ? { note: '你已达胜利分-1,此时征服不计分、改为抽一张牌(§471.1.b.1)' } : {}),
        attackerMight: summary.attackerMight, defenderMight: summary.defenderMight,
      })
      if (cq.signal && combat.conquer) {
                                                                                
                                                                  
                                                          
        const conquerTimesB = Math.max(1, this.deps.conquerRepeats?.(this.state, combat.conquer.player, battlefield) ?? 1)
        const conquerEvsB: import('../loop/events').GameEvent[] = []
                                                                                                                       
        for (let n = 1; n <= conquerTimesB; n++) conquerEvsB.push({ kind: 'conquer', player: combat.conquer.player, battlefield, nth: n, ...(combat.conquer.wasUncontrolled ? { wasUncontrolled: true } : {}) })
        const landed = landAndEnqueueTriggers(this.state, conquerEvsB, this.deps.getTriggers, combat.conquer.player, this.rdeps)
        this.advance(advanceFepr({ ...landed, priority: null, feprPasses: 0 }, this.rdeps))
      } else if (this.state.chain.some((it) => it.status === 'pending')) {
                                                                                        
                                                                  
                                                                           
                                                                        
        this.advance(advanceFepr({ ...this.state, priority: null, feprPasses: 0 }, this.rdeps))
      }
      this.consumePendingContests()                                          
      return
    }
    if (step.kind === 'done' && this.pendingTurnStart) {
      const pts = this.pendingTurnStart
      if (pts.stage === 'start') {
                                                              
        let s = step.state
                                                                    
                                                                 
                                                               
                                                              
                                                          
        s = runCleanupToFixpoint(s, this.rdeps.cleanupHooks ?? {})
        const holdEvents: import('../loop/events').GameEvent[] = []
                                                                      
                                                           
                                                                                   
                                      
        let holdDrawHandBefore = -1
        for (const bf of controlledBattlefields(s, pts.player)) {
          const r = attemptHold(s, pts.player, bf, this.rdeps, {
            ...this.scoringHooksBase(),
            drawCard: (s2, p2) => {
              if (holdDrawHandBefore < 0) holdDrawHandBefore = s2.zones[`hand:${p2}`]?.contents.length ?? 0
              return drawCard(s2, p2, this.rdeps)                   
            },
          })
          s = r.state
          if (r.signal) {
                                                                      
                                               
            const times = Math.max(1, this.deps.holdRepeats?.(s, pts.player, bf) ?? 1)
            for (let n = 1; n <= times; n++) holdEvents.push({ kind: 'hold', player: pts.player, battlefield: bf, nth: n })
          }
        }
        if (holdDrawHandBefore >= 0) this.noteDraw(s, pts.player, holdDrawHandBefore)                     
        this.pendingTurnStart = { player: pts.player, stage: 'scoring' }
        const landed = landAndEnqueueTriggers(s, holdEvents, this.deps.getTriggers, pts.player, this.rdeps)
        this.advance(advanceFepr({ ...landed, priority: null, feprPasses: 0 }, this.rdeps))
        return
      }
                                                       
      this.pendingTurnStart = null
      const rest = this.finishTurnRest(step.state)
                                             
                                                             
                                                                                       
                                                                             
                                                                         
                                                                                 
                                                                                                   
                                                                 
                                                                          
                                                                                          
                                                                  
                                                         
                                                                 
                                                                    
      const mained = landAndEnqueueTriggers(
        rest, [{ kind: 'mainPhaseStart', player: rest.activePlayer }],
        this.deps.getTriggers, rest.activePlayer, this.rdeps,
      )
      this.advance(advanceFepr({ ...mained, priority: null, feprPasses: 0 }, this.rdeps))
      return
    }
    this.state = step.state
    this.consumePendingContests()
  }

     
                                                  
                                                               
                                             
                                                                        
                                    
                                                    
                                                             
                                       
     
     
                                                       
                                                        
                                            
                                                 
                                         
                                   
     
  private contestKindOf(c: PendingContest): 'evaporate' | 'combat' | 'duel' {
    const bf = this.state.zones[c.battlefield]
    if (bf?.kind !== 'battlefield') return 'evaporate'
    const unitsOf = (mineSide: boolean): boolean => (bf.contents ?? []).some((oid) => {
      const o = this.state.objects[oid]
      return isUnit(o) && (o!.controller === c.causedBy) === mineSide
    })
    if (!unitsOf(true)) return 'evaporate'
    if (unitsOf(false)) return 'combat'
                                          
    if (this.state.battlefieldControl !== undefined
      && controlsBattlefield(this.state, c.causedBy, c.battlefield as string)) return 'evaporate'
    return 'duel'
  }

  private consumePendingContests(): void {
    if (this.window || this.choice || this.pendingCombat || this.pendingNonCombatDuel
      || this.pendingMoveContest || this.pendingTurnEnd || this.pendingTurnStart
      || this.state.spellDuelActive || this.state.winner) return
    const q = this.state.pendingContests ?? []
    if (q.length === 0) return
                                                              
                                                         
                                                             
                                                           
                                                       
                                                                           
                                                               
                                                      
                                                                 
                           
    const live = q.filter((c) => this.contestKindOf(c) !== 'evaporate')
    let picked = live[0]
    if (live.length >= 2) {
      const answered = this.state.ruleChoices[CONTEST_ORDER_KEY]
      const hit = answered === undefined ? undefined : live.find((c) => String(c.battlefield) === answered)
      if (hit) {
        picked = hit
                                           
        const rest = { ...this.state.ruleChoices }
        delete rest[CONTEST_ORDER_KEY]
        this.state = { ...this.state, ruleChoices: rest }
      } else {
                                                   
        this.pendingContestOrder = {
          key: CONTEST_ORDER_KEY,
          player: this.state.activePlayer, // §323.12/§461.1 都写明是【回合玩家】
          kind: live.some((c) => this.contestKindOf(c) === 'combat') ? 'combat' : 'duel',
          candidates: live.map((c) => ({
            battlefield: String(c.battlefield),
            label: this.deps.battlefieldName?.(this.state, String(c.battlefield)) ?? String(c.battlefield),
          })),
        }
        return
      }
    }
    if (picked === undefined) { this.state = { ...this.state, pendingContests: [] }; return }       
    const head = picked
    this.state = { ...this.state, pendingContests: q.filter((c) => c !== head) }
    const bf = this.state.zones[head.battlefield]
    const unitsOf = (mineSide: boolean): boolean => (bf?.contents ?? []).some((oid) => {
      const o = this.state.objects[oid]
      return isUnit(o) && (o!.controller === head.causedBy) === mineSide
    })
    if (bf?.kind !== 'battlefield' || !unitsOf(true)) { this.consumePendingContests(); return }               
    if (unitsOf(false)) { this.attack(head.causedBy, head.battlefield as string); return }             
                                                          
                                                                   
                                                      
                                                               
                                                      
                                                        
    if (this.state.battlefieldControl !== undefined
      && controlsBattlefield(this.state, head.causedBy, head.battlefield as string)) {
      this.consumePendingContests()                              
      return
    }
    this.startNonCombatDuel(head.causedBy, head.battlefield as string, head.wasOpen === true)
  }

     
                                             
                                        
     
  private noteDraw(after: GameState, player: PlayerId, handSizeBefore: number): void {
    const hand = after.zones[`hand:${player}`]?.contents ?? []
    const drawn = hand.slice(handSizeBefore)
    if (drawn.length === 0) return
    this.journal.note(after.turn, { kind: 'draw', player, amount: drawn.length })
    const others = after.players.filter((p) => p !== player)
    for (const oid of drawn) {
      this.journal.note(after.turn, {
        kind: 'zoneChange', player, oid, defId: after.objects[oid]?.defId,
        zoneFrom: `mainDeck:${player}`, zoneTo: `hand:${player}`, hiddenFrom: others,
      })
    }
  }

                                                    
  private finishTurnRest(state: GameState): GameState {
    const next = state.activePlayer
    let s = state
    const extra = s.extraRunesFirstSummon?.[next] ?? 0
                                                            
                                                
    const cap = this.deps.summonRuneCap?.(s)
    const amount = cap === undefined ? 2 + extra : Math.min(2 + extra, cap)
    s = recallRunes({ ...s, phase: 'summon' }, next, amount)
    this.journal.note(s.turn, { kind: 'summonRune', player: next, amount })                  
    if (extra > 0) {
      const { [next]: _used, ...rest } = s.extraRunesFirstSummon!
      s = { ...s, extraRunesFirstSummon: rest }
    }
    const handBefore = s.zones[`hand:${next}`]?.contents.length ?? 0
                                            
    if (this.deps.skipDrawPhase?.(s, next) === true) {
      s = { ...s, phase: 'draw' }
    } else {
      s = drawCard({ ...s, phase: 'draw' }, next, this.rdeps)                                         
      this.noteDraw(s, next, handBefore)
    }
    s = refreshRunePool({ ...s, phase: 'main' }, next)                         
    return s
  }

  private endTurn(player: PlayerId): void {
                                                  
                                                 
                                     
    const ended = landAndEnqueueTriggers(
      { ...this.state, phase: 'ending' },
      [{ kind: 'endOfTurn', player }],
      this.deps.getTriggers, player, this.rdeps,
    )
    if (ended.chain.length > 0) {
      this.pendingTurnEnd = player
      this.advance(advanceFepr(ended, this.rdeps))
      return
    }
    this.state = ended
    this.finishEndTurn(player)
  }

                                                          
  private finishEndTurn(player: PlayerId): void {
    let s = this.state
                                                       
    const beforeExpire = recomputeContinuous(s)
    s = runExpirationStep(beforeExpire, expireThisTurnEffects)                 
                                                              
                                                
                                                      
    const crossedOnExpire = collectMightCrossed(beforeExpire, s)
    if (crossedOnExpire.length > 0) s = landAndEnqueueTriggers(s, crossedOnExpire, this.deps.getTriggers, player, this.rdeps)
                                                
    const objects: Record<string, typeof s.objects[string]> = {}
    let touched = false
    for (const [k, o] of Object.entries(s.objects)) {
      if (o.status.standbyFresh === true) { objects[k] = { ...o, status: { ...o.status, standbyFresh: false } }; touched = true }
      else objects[k] = o
    }
    if (touched) s = { ...s, objects }
                                                    
                                                                 
    for (const k of TURN_END_LEDGER_LIST_KEYS) {
      if (s[k]?.length) s = { ...s, [k]: [] }
    }
    for (const k of TURN_END_LEDGER_RECORD_KEYS) {
      if (s[k]) s = { ...s, [k]: {} }
    }
                                                                          
                                                                             
                                                                       
                                          
    const handed = advanceTurnQueue(s, player)
    const next = handed.next
    s = resetTurnLedgers({ ...handed.state, activePlayer: next, priority: next, phase: 'awaken', turn: s.turn + 1 })
    s = runAwakenPhase(s)                           
    s = { ...s, phase: 'start' }
                                               
    if (this.deps.startStepHook) s = this.deps.startStepHook(s, next)
    if (s.winner) { this.state = s; this.window = null; return }
                                                      
                                                           
                                                              
                                                                      
                                                 
                                                                       
                                         
                                                                  
                                                                          
                                                          
    this.pendingTurnStart = { player: next, stage: 'start' }
    this.window = null
    this.choice = null
                                                         
                                                                     
    const startTriggers: typeof this.deps.getTriggers = (st) => [...this.deps.getTriggers(st), ...ephemeralTriggers(st, next)]
    const started = landAndEnqueueTriggers(s, [{ kind: 'startPhase', player: next }], startTriggers, next, this.rdeps)
    this.advance(advanceFepr({ ...started, priority: null, feprPasses: 0 }, this.rdeps))
  }
}

   
                                                     
                                                   
                                         
                                                         
   
export function standardMoveAllowed(state: GameState, u: GameObject, dest: string, player: PlayerId): boolean {
                                                                                   
                                                                       
                                                 
                                                 
                                                       
                                                     
                                                             
                                                               
                                                      
  if (moveRestricted(state, u, dest, player)) return false
  const fromKind = state.zones[u.zone]?.kind
  const toKind = state.zones[dest as ZoneId]?.kind
  if (fromKind === 'base') return toKind === 'battlefield'                                   
  if (fromKind === 'battlefield') {
    if (toKind === 'base') return dest === `base:${player}`                      
    if (toKind === 'battlefield') {
                                                      
                                                                          
                                                          
                                
      if (state.battlefieldCards?.[dest]?.defId === 'token:男爵巢穴') return true
      const kws = currentKeywords(u)
      return kws.includes('游走')            
    }
  }
  return false
}
