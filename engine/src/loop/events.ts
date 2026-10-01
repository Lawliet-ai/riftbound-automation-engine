                                              
                                                   

import { freshOid, type GameState, type TargetSourceTally } from '../state/gameState'
import { exhaustKey, typesDeclared } from '../state/exhaust'               
import { noteDamageBlame, pushDeathSnapshots, pushDestroyed } from './cleanup'
import { collectLastRites, fillPostDeathOids, snapshotOnDeath, type DeathSnapshot } from '../keywords/lastRites'
import { makeRng, shuffle } from '../util/rng'
import { isRune, isUnit, isEquipment, isToken, isTokenDefId } from '../state/cardTypes'
import { isFieldedKind, STANDBY_DEFAULT_CAPACITY, zoneCategory } from '../state/zones'                     
import { markTurnShieldInState, type TurnShieldMarks } from '../effects/turnShields'
import { addDelayedTriggerInState, clearDelayedTriggerInState, type DelayedTrigger } from '../effects/delayedTriggers'
import { grantAllUnitsEnterReadyInState, grantNextUnitReadyInState, consumeNextUnitReadyInState } from '../effects/nextUnitReady'
import { grantExtraTurn } from '../state/turnQueue'
import type { GameObject } from '../state/object'
import type { ObjId, PlayerId, ZoneId } from '../state/ids'
import { moveObjectInState, spawnToken, type TokenSpec } from '../state/mutations'
import { attachCard, detachCard } from '../state/attach'
import { banishInState } from '../actions/banish'
import { applyStunInState } from '../keywords/stun'
import { consumeBuffInState, grantBuffInState } from '../keywords/buff'
import { empower as empowerInState, disempower as disempowerInState } from '../keywords/empower'
import { burn as burnCards } from '../keywords/burn'
import { burnOut } from '../scoring/burnout'                          
import type { ReduceDeps } from './reduce'                                                                
import { negate } from '../keywords/negate'
import { insight, recycleObjects } from '../keywords/insight'
import { seizeAndRechoose } from '../keywords/seize'
import { addCosts, type Cost } from '../state/runePool'                                  
import { payFromState, recallRunes } from '../game/economy'
import { recallToBase } from '../state/recall'
import { spendExperience } from '../keywords/level'
import { addItems, type ChainItem } from './chain'
import { liveTargetOids } from './chainTargets'                                                                            
import type { StaticEffect } from '../effects/continuousView'
import { nextEffectTimestamp } from '../effects/effectTimestamp'               
import { effectiveMight } from '../state/might'                            
import { noteCardConfirmed } from '../keywords/rally'

export type EventKind =
  | 'spellResolved'                                                
  | 'pumpIfDestroyed'        
  | 'markExileOnLeave'        
  | 'exiledOnLeave'              
  | 'mightCrossed'                          
  | 'viewed'                                                                 
  | 'clearBanishLedger'        
  | 'addBattlefieldZone'        
  | 'replaceBattlefieldCard'        
  | 'buffBonus'        
  | 'damage'
  | 'destroy'
  | 'destroyed'                                               
  | 'recycled'                                                                 
  | 'banished'                                                           
  | 'markTurnShield'                                   
  | 'standbyPlaced'                                                     
  | 'declare'                                           
  | 'delayedTrigger'                                      
  | 'markNextUnitReady'                                        
  | 'markAllUnitsEnterReady'                                            
  | 'targeted'                                                              
  | 'runeRecycled'                                                            
  | 'zoneChange'
  | 'gainPoint'
  | 'extraTurn'                                             
  | 'statusChange'
  | 'draw'
  | 'stun'
  | 'addEffect'
  | 'playUnit'
  | 'defend'
  | 'negate'
  | 'insight'
  | 'grantVision'                                                    
  | 'seize'
  | 'spend'
  | 'spawnToken'
  | 'enqueueItem'
  | 'startPhase'
  | 'winGame'
  | 'summonRune'
  | 'freeStandby'
  | 'gearManaFree'
  | 'removeDamage'
  | 'playSpellFromZone'
  | 'revealed'
  | 'banPlayCards'
  | 'banPlaySpells'                                     
  | 'grantNextSpellDiscount'
  | 'grantNextCardDiscount'                                    
  | 'grantNextSpellEcho'
  | 'noteChosenMode'
  | 'grantPlayFromDiscard'
  | 'raiseUnitPlayCost'
  | 'activateAbility'                                               
  | 'mainPhaseStart'                                                           
  | 'changeController'
  | 'recall'
  | 'grantNextSpellDamage'
  | 'hold'
  | 'playSpell'
  | 'grantEnergyNextMain'
  | 'duelStart'
  | 'battleEnd'
  | 'gainResource'
  | 'recycle'
  | 'attach'
  | 'detach'
  | 'banish'
  | 'playFree'
  | 'conquer'
  | 'unitMoved'
  | 'attack'
  | 'grantBuff'
  | 'consumeBuff'
  | 'empower'
  | 'disempower'
  | 'burn'
  | 'endOfTurn'

                                                  
interface EventBase {
                                    
  readonly exempt?: boolean
}
export interface DamageEvent extends EventBase {
  readonly kind: 'damage'
  readonly target: ObjId
  readonly amount: number
  readonly source?: ObjId
     
                                                         
                                          
                                                            
     
  readonly sourcePlayer?: PlayerId
     
                                                           
                                                   
                                                  
                                                        
                   
                                                               
                                                  
                                                        
                                                  
                                                   
                                                                          
                                                            
                                         
                                                   
                                               
                               
     
  readonly combat?: true
}
export interface DestroyEvent extends EventBase {
  readonly kind: 'destroy'
  readonly target: ObjId
                                                   
  readonly source?: ObjId
                                                      
  readonly sourcePlayer?: PlayerId
     
                                              
                                                      
                                                              
                                         
     
  readonly sourceCardId?: string
}
   
                                           
  
                                                                     
                                             
                                                               
                                                        
                                                          
                                                                 
                                           
                                                                    
                                        
                                                                
                                                                         
                                                                               
                                                   
                                                                      
                                            
                                                      
  
                              
                                                        
                                                                   
                                               
                                                     
   
export interface DestroyedEvent extends EventBase {
  readonly kind: 'destroyed'
  readonly victim: DeathSnapshot
  readonly responsible?: readonly PlayerId[]
     
                                          
                                                  
                                                    
                                                         
     
  readonly byCards?: readonly string[]
}
   
                                         
                                         
                                             
                                                     
                                       
   
export interface ZoneChangeEvent extends EventBase {
  readonly kind: 'zoneChange'
                                                                                    
  readonly landedOid?: ObjId
  readonly obj: ObjId
  readonly to: ZoneId
                                                      
  readonly from?: ZoneId
                                                                  
                                                               
  readonly defId?: string
     
                                                 
                                                         
                                                       
                                  
     
  readonly placement?: 'top' | 'bottom'
     
                                                              
                                                                              
                                                 
     
  readonly entry?: true
}
export interface GainPointEvent extends EventBase {
  readonly kind: 'gainPoint'
  readonly player: PlayerId
  readonly amount: number
}
export interface StatusChangeEvent extends EventBase {
  readonly kind: 'statusChange'
  readonly target: ObjId
  readonly key: string
  readonly value: boolean
}
                                               
export interface StunEvent extends EventBase {
  readonly kind: 'stun'
  readonly target: ObjId
}
                                          
export interface AddEffectEvent extends EventBase {
  readonly kind: 'addEffect'
  readonly effect: Omit<StaticEffect, 'timestamp'>
}
   
                                                         
                                                          
                                                
                                                            
                                                    
                                                                  
                             
                                                                       
   
export interface ActivateAbilityEvent extends EventBase {
  readonly kind: 'activateAbility'
  readonly source: ObjId
  readonly player: PlayerId
                                           
  readonly abilityKey?: string
     
                                                             
                                                 
                                                
     
  readonly baseCostMana?: number
}

                                             
export interface PlayUnitEvent extends EventBase {
  readonly kind: 'playUnit'
  readonly unit: ObjId
  readonly player: PlayerId
                                                 
  readonly fromStandby?: boolean
     
                                                                      
                                              
                                                           
     
  readonly fromZoneKind?: string
     
                                                                                                    
                                                                                          
                                                                              
     
  readonly bonusChoice?: string
     
                                        
    
                                                             
                                                              
                                                      
                                       
                                                  
                                         
     
  readonly at?: string
     
                                                                
                                                       
                                                             
                              
                                                      
                                                                                                           
                                        
                                                                  
                                                                       
                                                                
                                                                
                                                  
                                                                           
                                            
                                                                       
                                                                                
                                            
                                                                   
                                           
                                                                                        
                                                                            
                                                                                              
                                                              
                                                                     
                                                                        
                                                                                               
                                                                       
                                                                       
                                                                       
                                                               
                                                                     
                                                              
                                                    
                                                                                 
     
  readonly bonus?: boolean
     
                                                  
    
                                                          
                                                    
                                              
                        
    
                                                  
                                                    
                                                               
                                                          
                                                
     
  readonly play?: {
                                        
    readonly card: ObjId
                                                      
    readonly to: ZoneId
                                            
    readonly cost: Cost
                                                           
    readonly readyOnEntry?: boolean
       
                                                              
                                                            
                                            
       
    readonly by?: ObjId
       
                                                                                   
                                                                         
                                                                           
                                                                           
                                                                                            
                                                                                  
                                                                                                                                   
                                                                                                         
       
    readonly bonus?: boolean
    readonly bonusChoice?: string
    readonly extraCost?: Cost
  }
}
                                                    
export interface StartPhaseEvent extends EventBase {
  readonly kind: 'startPhase'
  readonly player: PlayerId
}
   
                                                        
                                                              
                                                       
                                                               
                                   
   
export interface MainPhaseStartEvent extends EventBase {
  readonly kind: 'mainPhaseStart'
  readonly player: PlayerId
}
   
                                           
                                                      
                                                                     
   
export interface ExtraTurnEvent extends EventBase {
  readonly kind: 'extraTurn'
  readonly player: PlayerId
}
                                              
export interface WinGameEvent extends EventBase {
  readonly kind: 'winGame'
  readonly player: PlayerId
}
   
                                                                         
                                                                    
   
export interface RecycleEvent extends EventBase {
  readonly kind: 'recycle'
  readonly player: PlayerId
  readonly objs: readonly ObjId[]
}
                                                     
export interface GainResourceEvent extends EventBase {
  readonly kind: 'gainResource'
  readonly player: PlayerId
  readonly mana?: number
                               
  readonly duelMana?: number
  readonly energy?: Readonly<Record<string, number>>
                                                    
  readonly experience?: number
                                                     
  readonly restricted?: { readonly mana: number; readonly energy: Readonly<Record<string, number>>; readonly purposes: readonly string[] }
}
                                           
export interface DuelStartEvent extends EventBase {
  readonly kind: 'duelStart'
  readonly battlefield: string
     
                          
                                                    
                                                    
                                                           
                                         
                                                
     
  readonly combat?: boolean
                                      
  readonly attacker?: PlayerId
  readonly defender?: PlayerId
}
                                                            
                                                        
                                                                       
                                                          
export interface BuffBonusEvent extends EventBase {
  readonly kind: 'buffBonus'
  readonly player: PlayerId
  readonly delta: number
}
export interface GrantRecursionEvent extends EventBase {
  readonly kind: 'grantRecursion'
  readonly card: ObjId
  readonly cost: Cost
}
                                                         
                                                                  
export interface GrantNextUnitReadyBuffEvent extends EventBase {
  readonly kind: 'grantNextUnitReadyBuff'
  readonly player: PlayerId
}
export interface GrantEnergyNextMainEvent extends EventBase {
  readonly kind: 'grantEnergyNextMain'
  readonly player: PlayerId
  readonly energy: Readonly<Record<string, number>>
}
   
                                   
  
                                                             
                                                    
                                                      
                                    
                                                                        
                              
   
export interface StandbyPlacedEvent extends EventBase {
  readonly kind: 'standbyPlaced'
  readonly player: PlayerId
                                                  
  readonly card: ObjId
                     
  readonly battlefield: string
}

                                                  
   
                                                                      
                                         
                                                                           
                                             
                                            
                           
                                                      
                        
                                                    
   
export interface SpellResolvedEvent extends EventBase {
  readonly kind: 'spellResolved'
  readonly player: PlayerId
  readonly cardOid?: ObjId
  readonly defId?: string
     
                                                                              
                                                         
     
  readonly manaPaid?: number
}
export interface PlaySpellEvent extends EventBase {
  readonly kind: 'playSpell'
                                                     
                                           
                                                                           
                                             
                                             
                                            
                                      
                                                            
                             
  readonly player: PlayerId
  readonly cardOid: ObjId
                                                                       
  readonly fromZoneKind?: string
     
                                                      
                                                       
                                                   
                                                                          
                                                      
     
  readonly manaPaid?: number
     
                                                                  
                                                           
                                                       
                                                               
     
  readonly chainCardOid?: ObjId
     
                                               
                                                                
                                                                
     
  readonly target?: string
     
                         
                                                         
                                                                          
                                                    
                                                       
                                                                
     
  readonly defId?: string
     
                                           
                                           
                                                      
                                                                
     
  readonly fromStandby?: boolean
}
   
                                                                 
                                                                 
                                       
   
export interface UnitMovedEvent extends EventBase {
  readonly kind: 'unitMoved'
  readonly unit: ObjId
  readonly player: PlayerId
  readonly from: ZoneId
  readonly to: ZoneId
}
                                                           
export interface EndOfTurnEvent extends EventBase {
  readonly kind: 'endOfTurn'
  readonly player: PlayerId
}
                                                        
                                                                 
export interface GrantConquerReturnEvent extends EventBase {
  readonly kind: 'grantConquerReturn'
  readonly unit: ObjId
}
export interface GrantBuffEvent extends EventBase {
  readonly kind: 'grantBuff'
  readonly target: ObjId
}
   
                             
                                                 
                          
   
export interface ConsumeBuffEvent extends EventBase {
  readonly kind: 'consumeBuff'
  readonly target: ObjId
                                       
  readonly by?: PlayerId
}

   
                       
                                                    
                                                  
                                                      
                                                         
   
export interface EmpowerEvent extends EventBase {
  readonly kind: 'empower'
  readonly target: ObjId
}
export interface DisempowerEvent extends EventBase {
  readonly kind: 'disempower'
  readonly target: ObjId
}

   
                                          
                                                  
                                              
                                             
                                           
   
export interface BurnEvent extends EventBase {
  readonly kind: 'burn'
  readonly player: PlayerId
  readonly count: number
}

                                                                       
export interface ConquerEvent extends EventBase {
  readonly kind: 'conquer'
  readonly player: PlayerId
  readonly battlefield: string
     
                                                         
                                                        
                                                        
     
  readonly wasOpen?: boolean
     
                                                                 
                                                                                     
                                                                                                                  
                                                                                              
     
  readonly wasUncontrolled?: boolean
                                                                     
  readonly nth?: number
}
                                                                                    
export interface HoldEvent extends EventBase {
  readonly kind: 'hold'
  readonly player: PlayerId
  readonly battlefield: string
                                                             
  readonly nth?: number
}
                                         
export interface FreeStandbyEvent extends EventBase {
  readonly kind: 'freeStandby'
  readonly player: PlayerId
}
                                                        
export const GEAR_MANA_FREE_MAX = 7
   
                                                               
                                                                         
                                                            
                                                      
   
export interface GearManaFreeEvent extends EventBase {
  readonly kind: 'gearManaFree'
  readonly player: PlayerId
}
   
                                  
                                                     
                                                          
                                                        
   
export interface BanPlayCardsEvent extends EventBase {
  readonly kind: 'banPlayCards'
  readonly player: PlayerId
}

   
                                                          
                                           
                                        
   
export interface BanPlaySpellsEvent extends EventBase {
  readonly kind: 'banPlaySpells'
  readonly player: PlayerId
}

   
                                        
                                              
   
                                                                           
export interface GrantNextSpellDamageEvent extends EventBase {
  readonly kind: 'grantNextSpellDamage'
  readonly player: PlayerId
}
export interface GrantNextSpellDiscountEvent extends EventBase {
  readonly kind: 'grantNextSpellDiscount'
  readonly player: PlayerId
  readonly mana: number
}
   
                                                        
                                                                   
                                                  
                                                    
   
export interface GrantNextCardDiscountEvent extends EventBase {
  readonly kind: 'grantNextCardDiscount'
  readonly player: PlayerId
}
   
                                                  
                                                                     
                                                       
   
export interface GrantNextSpellEchoEvent extends EventBase {
  readonly kind: 'grantNextSpellEcho'
  readonly player: PlayerId
}
   
                                                          
                                                                
                                                                   
                                                                      
   
export interface NoteChosenModeEvent extends EventBase {
  readonly kind: 'noteChosenMode'
  readonly player: PlayerId
  readonly ledgerKey: string
  readonly mode: string
}
   
                                                          
                                                  
                                                                     
                                       
                                                      
   
   
                                                            
                                                          
   
   
                                                              
                                        
   
export interface RaiseUnitPlayCostEvent extends EventBase {
  readonly kind: 'raiseUnitPlayCost'
  readonly player: PlayerId
  readonly amount: number
}
   
                                               
                                                                     
                                                            
                             
   
export interface NegateSpellDamageEvent extends EventBase {
  readonly kind: 'negateSpellDamage'
}
export interface GrantPlayFromDiscardEvent extends EventBase {
  readonly kind: 'grantPlayFromDiscard'
  readonly player: PlayerId
  readonly defId: string
}
export interface ChangeControllerEvent extends EventBase {
  readonly kind: 'changeController'
  readonly target: ObjId
  readonly player: PlayerId
}
   
                                    
                                                                           
                                                           
                                                                       
                                                  
   
export interface RecallEvent extends EventBase {
  readonly kind: 'recall'
  readonly target: ObjId
}

                                                        
export interface SummonRuneEvent extends EventBase {
  readonly kind: 'summonRune'
  readonly player: PlayerId
  readonly count: number
  readonly dormant?: boolean
}
                                    
export interface DrawEvent extends EventBase {
  readonly kind: 'draw'
  readonly player: PlayerId
  readonly count: number
}
   
                                                     
                                                                               
  
                                    
                                                   
                                                 
                                                 
                                                               
                                                     
                                
  
                                        
                                                          
                                                       
                           
                                                                    
                                                      
                                                            
                   
   
export interface DrawForDestroyVictimEvent extends EventBase {
  readonly kind: 'drawForDestroyVictim'
                                                         
  readonly victim: ObjId
                                                   
  readonly player: PlayerId
  readonly count: number
                                                   
  readonly victimOwner: PlayerId
                                             
  readonly victimDefId: string
     
                                                                       
    
                                                                     
                                                               
                                                      
                                        
     
  readonly destroyWasReplaced?: true
}

   
                                                    
                                                         
                                                              
                                                      
                                                            
   
export interface PumpIfDestroyedEvent extends EventBase {
  readonly kind: 'pumpIfDestroyed'
  readonly victim: ObjId
  readonly victimOwner: PlayerId
  readonly victimDefId: string
     
                                                                       
    
                                                                     
                                                               
                                                      
                                        
     
  readonly destroyWasReplaced?: true
                               
  readonly beneficiary: ObjId
                                                    
  readonly effectId: string
                                
  readonly delta: number
}

   
                                                        
                                                            
                                                     
   
export interface MarkExileOnLeaveEvent extends EventBase {
  readonly kind: 'markExileOnLeave'
  readonly cardOid: ObjId
  readonly by: ObjId
}

   
                                                           
                                                  
   
   
                                                
                                                             
                                                                
                                                                
   
export interface MightCrossedEvent extends EventBase {
  readonly kind: 'mightCrossed'
  readonly unit: ObjId
  readonly controller: PlayerId
  readonly from: number
  readonly to: number
}
export interface ExiledOnLeaveEvent extends EventBase {
  readonly kind: 'exiledOnLeave'
  readonly by: ObjId
  readonly player: PlayerId
}

                                           
export interface ClearBanishLedgerEvent extends EventBase {
  readonly kind: 'clearBanishLedger'
  readonly by: ObjId
}

   
                                                      
                                                              
                                                           
                                                          
                                                    
   
export interface AddBattlefieldZoneEvent extends EventBase {
  readonly kind: 'addBattlefieldZone'
  readonly zoneId: ZoneId
                                                
  readonly defId: string
  readonly owner: PlayerId
}

   
                                                              
                                                 
                                                               
                                               
                                                  
   
export interface ReplaceBattlefieldCardEvent extends EventBase {
  readonly kind: 'replaceBattlefieldCard'
  readonly zoneId: ZoneId
  readonly defId: string
  readonly owner: PlayerId
}
   
                                                          
                      
                                           
                                                                     
   
export interface DefendEvent extends EventBase {
  readonly kind: 'defend'
                                                               
  readonly responsible?: readonly PlayerId[]
  readonly unit?: ObjId
  readonly player?: PlayerId
                                
  readonly battlefield?: string
}
   
                                           
                                           
                                                 
                                                                
   
export interface AttackEvent extends EventBase {
  readonly kind: 'attack'
                                                
                                                     
                                                                         
  readonly responsible?: readonly PlayerId[]
  readonly unit?: ObjId
  readonly player?: PlayerId
  readonly battlefield?: string
}
                                                                     
export interface NegateEvent extends EventBase {
  readonly kind: 'negate'
  readonly target: string
  readonly returnToHand?: boolean
}
   
                                                     
                                                       
                                                       
                                                                  
                                                           
                    
                         
                                                                         
                                                                        
   
   
                                                               
                                                           
                                                                             
                                                       
                            
                                                     
   
   
                             
                                                        
                                                              
                                                          
                                                        
   
export interface TargetedEvent extends EventBase {
  readonly kind: 'targeted'
  readonly chooser: PlayerId
  readonly target: ObjId
  readonly sourceKind: 'spell' | 'ability'
     
                                               
                                                                  
                                                    
     
  readonly sourceOid?: ObjId
}
export interface RuneRecycledEvent extends EventBase {
  readonly kind: 'runeRecycled'
  readonly player: PlayerId
}
export interface RecycledEvent extends EventBase {
  readonly kind: 'recycled'
  readonly player: PlayerId
                                 
  readonly count: number
}
   
                                                                 
                                                
                                                                        
                                            
   
   
                                      
                                                     
                                                                
   
   
                                                             
                                        
   
                                        
export interface MarkNextUnitReadyEvent extends EventBase {
  readonly kind: 'markNextUnitReady'
  readonly player: PlayerId
}

   
                                              
                                              
   
export interface MarkAllUnitsEnterReadyEvent extends EventBase {
  readonly kind: 'markAllUnitsEnterReady'
  readonly player: PlayerId
}

export interface DelayedTriggerEvent extends EventBase {
  readonly kind: 'delayedTrigger'
  readonly add?: DelayedTrigger
  readonly clear?: string
}

export interface MarkTurnShieldEvent extends EventBase {
  readonly kind: 'markTurnShield'
  readonly target: ObjId
  readonly mark: TurnShieldMarks
}
   
                                               
                                                                                      
                                                                
                             
   
export interface DeclareEvent extends EventBase {
  readonly kind: 'declare'
                           
  readonly target: ObjId
                                    
  readonly key: string
                             
  readonly value: string
}
export interface BanishedEvent extends EventBase {
  readonly kind: 'banished'
                                 
  readonly player: PlayerId
                                          
  readonly card: ObjId
  readonly defId: string
     
                                           
                                                     
                                             
                                                                   
                                                                  
     
  readonly from?: ZoneId
}
                                                                                  
export interface InsightEvent extends EventBase {
  readonly kind: 'insight'
  readonly player: PlayerId
  readonly count: number
  readonly recycleAll?: boolean
     
                                           
                                                           
                                                    
                                                   
     
  readonly recycle?: readonly ObjId[]
}
   
                                          
  
                                
                                         
                                                     
                                               
   
export interface GrantVisionEvent extends EventBase {
  readonly kind: 'grantVision'
                       
  readonly viewer: PlayerId
  readonly cards?: readonly ObjId[]
  readonly faceDownOf?: readonly PlayerId[]
}
   
                                        
                                 
                                                        
                                                 
                                              
   
export interface BattleEndEvent extends EventBase {
  readonly kind: 'battleEnd'
  readonly battlefield: string
  readonly attacker: PlayerId
  readonly defender: PlayerId
                                     
  readonly outcome: 'attackerWins' | 'defenderWins' | 'noResult'
  readonly participants: readonly ObjId[]
}
                                                                                      
export interface SeizeEvent extends EventBase {
  readonly kind: 'seize'
  readonly target: string          
  readonly newController: PlayerId
  readonly rechoiceTarget?: string                    
}
                                            
export interface SpendEvent extends EventBase {
  readonly kind: 'spend'
  readonly player: PlayerId
  readonly cost: Cost
     
                                        
                                             
                                                      
                                                           
                                          
     
  readonly experience?: number
}
                                                                     
export interface SpawnTokenEvent extends EventBase {
  readonly kind: 'spawnToken'
  readonly spec: TokenSpec
  readonly zone: ZoneId
  readonly owner: PlayerId
  readonly tag?: string
                                                                  
  readonly dormant?: boolean
                                                               
  readonly ready?: boolean
}
                                                       
export interface EnqueueItemEvent extends EventBase {
  readonly kind: 'enqueueItem'
  readonly item: ChainItem
}

   
                                                    
                                                         
                                                                              
                                      
                                                            
                                                    
                                                                        
   
   
                                                          
                                        
                                                                         
                            
   
export interface ViewedEvent extends EventBase {
  readonly kind: 'viewed'
                                             
  readonly player: PlayerId
  readonly cards: readonly ObjId[]
}

export interface RevealedEvent extends EventBase {
  readonly kind: 'revealed'
                                     
  readonly player: PlayerId
  readonly cards: readonly ObjId[]
}

let revealedHook: ((state: GameState, ev: RevealedEvent) => GameState) | null = null
                                               
export function setRevealedHook(h: (state: GameState, ev: RevealedEvent) => GameState): void {
  revealedHook = h
}

   
                                                            
                                                      
                                                    
                                                               
                                                                            
   
export interface PlaySpellFromZoneEvent extends EventBase {
  readonly kind: 'playSpellFromZone'
  readonly player: PlayerId
                            
  readonly card: ObjId
                                 
  readonly freeMana?: boolean
                                                                      
  readonly freeAll?: boolean
                                                                
  readonly recycleOnLeave?: boolean
                                       
  readonly target?: string
}
   
                                            
                                                             
                                                                  
   
export interface RemoveDamageEvent extends EventBase {
  readonly kind: 'removeDamage'
  readonly target: ObjId
}
                                       
export interface AttachEvent extends EventBase {
  readonly kind: 'attach'
                      
  readonly obj: ObjId
                                
  readonly to: ObjId
     
                                                    
                                                  
                                                                         
                                                                   
                                                                             
                                                      
                                                          
                                                   
                                       
     
  readonly player?: PlayerId
}
   
                                             
                                                        
   
export interface BanishEvent extends EventBase {
  readonly kind: 'banish'
  readonly target: ObjId
     
                                                  
                                            
     
  readonly by?: ObjId
     
                                                      
                                             
                                                     
                               
                                                        
     
  readonly scheduleReturn?: { readonly sourceDefId: string; readonly controller: PlayerId; readonly watch: PlayerId }
}

   
                                   
                                        
  
                                               
                                              
                                                        
                                  
   
export interface PlayFreeEvent extends EventBase {
  readonly kind: 'playFree'
  readonly obj: ObjId
  readonly player: PlayerId
                      
  readonly to?: ZoneId
                                                    
  readonly ready?: boolean
     
                                                                                     
                                                                                                           
                                                                
                                                                       
     
  readonly bonus?: boolean
                                                                                                           
  readonly bonusChoice?: string
     
                                                                     
                                                  
                   
     
  readonly tag?: string
}

                                                
export interface DetachEvent extends EventBase {
  readonly kind: 'detach'
  readonly obj: ObjId
}

   
                                                                                  
   
export interface LandDeps {
     
                                                               
                                              
                                                                
                                                                        
                                         
                                                                  
                                                   
                                            
     
  readonly onEvent?: (ev: GameEvent, before: GameState) => void
                                                                
  readonly scoreBlockedAnywhere?: (state: GameState, player: PlayerId) => boolean
                                                                           
                                                                       
  readonly playBanned?: (state: GameState, player: PlayerId, defId: string, to: string, oid?: string) => boolean
  readonly tokenEntersReady?: (state: GameState, owner: PlayerId) => boolean
     
                                                                              
                                                                        
                                                                                  
                                                                                         
                                                                        
     
  readonly unitEntersReady?: (state: GameState, player: PlayerId, defId: string, to: string, oid: string) => boolean
                                                          
                                                                         
                                                                         
                                                                                               
                                                                                        
                                                       
                                                                              
  readonly tokenSpawnDoublerFor?: (state: GameState, ev: SpawnTokenEvent) => ObjId | undefined
     
                                                                 
                                                      
                                                               
                           
     
  readonly isArmament?: (defId: string) => boolean
     
                                                                             
                                                                           
                                                          
                                             
     
  readonly isPlainEquipment?: (defId: string) => boolean
                                                                 
  readonly isPlainUnit?: (defId: string) => boolean
}

export type GameEvent =
  | StandbyPlacedEvent        
  | GrantVisionEvent
  | BattleEndEvent
  | DestroyedEvent
  | DamageEvent
  | AttachEvent
  | DetachEvent
  | BanishEvent
  | DeclareEvent
  | BanishedEvent
  | MarkTurnShieldEvent
  | DelayedTriggerEvent
  | MarkNextUnitReadyEvent
  | MarkAllUnitsEnterReadyEvent
  | PlayFreeEvent
  | ConquerEvent
  | UnitMovedEvent
  | AttackEvent
  | GrantBuffEvent
  | GrantConquerReturnEvent
  | ConsumeBuffEvent
  | EmpowerEvent
  | DisempowerEvent
  | BurnEvent
  | EndOfTurnEvent
  | DrawEvent
  | DrawForDestroyVictimEvent
  | PumpIfDestroyedEvent        
  | MarkExileOnLeaveEvent        
  | ExiledOnLeaveEvent | MightCrossedEvent | ViewedEvent                   
  | ClearBanishLedgerEvent        
  | AddBattlefieldZoneEvent        
  | ReplaceBattlefieldCardEvent        
  | SpellResolvedEvent
  | SummonRuneEvent
  | FreeStandbyEvent
  | GearManaFreeEvent
  | RemoveDamageEvent
  | PlaySpellFromZoneEvent
  | RevealedEvent
  | BanPlayCardsEvent
  | BanPlaySpellsEvent
  | GrantNextSpellDiscountEvent
  | GrantNextCardDiscountEvent             
  | GrantNextSpellEchoEvent
  | NoteChosenModeEvent
  | GrantPlayFromDiscardEvent
  | RaiseUnitPlayCostEvent
  | NegateSpellDamageEvent
  | ChangeControllerEvent
  | RecallEvent
  | GrantNextSpellDamageEvent
  | HoldEvent
  | PlaySpellEvent
  | GrantEnergyNextMainEvent
  | GrantNextUnitReadyBuffEvent
  | BuffBonusEvent        
  | GrantRecursionEvent
  | DuelStartEvent
  | GainResourceEvent
  | RecycleEvent
  | StartPhaseEvent
  | WinGameEvent
  | DestroyEvent
  | ZoneChangeEvent
  | GainPointEvent
  | StatusChangeEvent
  | StunEvent
  | AddEffectEvent
  | PlayUnitEvent
  | ActivateAbilityEvent
  | MainPhaseStartEvent
  | ExtraTurnEvent
  | DefendEvent
  | NegateEvent
  | InsightEvent
  | RecycledEvent
  | RuneRecycledEvent
  | TargetedEvent
  | SeizeEvent
  | SpendEvent
  | SpawnTokenEvent
  | EnqueueItemEvent

                             
export function isExemptEvent(ev: GameEvent): boolean {
  return ev.exempt === true
}

                                                                                   
const DRAW_LOOP_CAP = 64

                                                                                        
function drawOne(state: GameState, player: PlayerId): GameState {
  const deck = state.zones[`mainDeck:${player}` as ZoneId]
  const top = deck?.contents[deck.contents.length - 1]
  if (!top) return state
  return moveObjectInState(state, top, `hand:${player}` as ZoneId)
}

   
                                    
                                                                
   
   
                                                     
                                          
  
                                            
                               
                                                           
                                                      
  
                                                                                 
                                                           
                                                           
                                                             
                                           
                                                                 
                  
                                                                    
   
export function consumeNextUnitReadyBuff(state: GameState, player: PlayerId, oid: ObjId): GameState {
  const played = state.objects[oid]
  if (played === undefined) return state
  if ((state.nextUnitReadyBuffThisTurn?.[player] ?? 0) <= 0) return state
                                                                                               
                                                                                
                                                              
                                                                                                               
  if (!isUnit(played)) return state
  const st = { ...played.status }
  delete (st as { dormant?: boolean }).dormant
  const next = {
    ...state,
    objects: { ...state.objects, [oid]: { ...played, status: st } },
    nextUnitReadyBuffThisTurn: { ...state.nextUnitReadyBuffThisTurn, [player]: 0 },
  }
  return grantBuffInState(next, oid)
}

   
                                                              
  
                                           
                               
                                                                 
                                              
                                                         
                                         
  
                                                                  
                                                     
                                                                          
                                                                 
                                                                                    
                                                                                             
                                                
                                                              
                                         
   
export function notePlayLedgers(
  state: GameState, player: PlayerId, oid: ObjId, defId: string, deps?: LandDeps,
): GameState {
  const armed = deps?.isArmament?.(defId) === true
  const geared = deps?.isPlainEquipment?.(defId) === true
  const united = deps?.isPlainUnit?.(defId) === true
  if (!armed && !geared && !united) return state
  return {
    ...state,
    playedCardCountThisTurn: {
      ...state.playedCardCountThisTurn,
      [player]: (state.playedCardCountThisTurn?.[player] ?? 0) + 1,
    },
    ...(armed ? { playedArmamentThisTurn: { ...state.playedArmamentThisTurn, [player]: true as const } } : {}),
    ...(geared ? { playedEquipmentThisTurn: { ...state.playedEquipmentThisTurn, [player]: true as const } } : {}),
                                 
    ...(geared && state.firstEquipPlayedThisTurn?.[player] === undefined
      ? { firstEquipPlayedThisTurn: { ...state.firstEquipPlayedThisTurn, [player]: oid as string } }
      : {}),
    ...(united ? { playedUnitThisTurn: { ...state.playedUnitThisTurn, [player]: true as const } } : {}),
  }
}

   
                                                                     
                                     
  
                                                     
                                                                          
                                                    
                                                   
                                                                            
                                                                 
                                                       
  
                                                                
                                                         
                                                         
                                                
  
                                                             
                             
   
export function noteTargetedLedger(
  state: GameState,
  ev: { readonly chooser: PlayerId; readonly target: ObjId; readonly sourceKind: 'spell' | 'ability'; readonly sourceOid?: ObjId },
): GameState {
                                                      
                                               
                                                 
                                                     
                                      
  const t = state.objects[ev.target]
  if (!t || t.controller === ev.chooser) return state          
  if (!isUnit(t) && !isEquipment(t)) return state                 
                                                 
                                                              
  const src = ev.sourceOid !== undefined ? state.objects[ev.sourceOid] : undefined
  const bucket: keyof TargetSourceTally = ev.sourceKind === 'spell'
    ? 'spell'
    : (src !== undefined && isUnit(src) ? 'unitAbility' : 'otherAbility')
  const led = state.enemyTargetedThisTurn ?? {}
  const cur = led[ev.chooser] ?? { spell: 0, unitAbility: 0, otherAbility: 0 }
  const next: TargetSourceTally = { ...cur, [bucket]: cur[bucket] + 1 }
                                                               
                                                    
  const unitFlag = isUnit(t)
    ? { chosenEnemyUnitThisTurn: { ...(state.chosenEnemyUnitThisTurn ?? {}), [ev.chooser as string]: true } }
    : {}
  return { ...state, enemyTargetedThisTurn: { ...led, [ev.chooser]: next }, ...unitFlag }
}

export function landEvent(state: GameState, ev: GameEvent, deps?: LandDeps): GameState {
  switch (ev.kind) {
    case 'damage': {
      const o = state.objects[ev.target]
      if (!o) return state
                                                      
      const blamed = ev.sourcePlayer ?? (ev.source ? state.objects[ev.source]?.controller : undefined)
                                                           
                                                    
      const blameCard = ev.source === undefined ? undefined : state.objects[ev.source]?.defId
      if (blamed) noteDamageBlame(ev.target, blamed, blameCard)
                                                     
                                                              
      const led = ev.amount > 0 ? { ...(state.damagedThisTurn ?? {}), [ev.target as string]: true as const } : state.damagedThisTurn
                                                               
                                                      
                                                    
                                         
                                                        
                                                                             
      const excessLed = ((): GameState['maxExcessDamageThisTurn'] => {
        if (ev.amount <= 0 || blamed === undefined) return state.maxExcessDamageThisTurn
        if (o.controller === blamed) return state.maxExcessDamageThisTurn           
        const might = effectiveMight(o).reference
        const excess = Math.max(0, o.damage + ev.amount - might)
                                                                 
                                                                        
                                                 
                                                                     
        if (excess <= 0) return state.maxExcessDamageThisTurn
        const cur = state.maxExcessDamageThisTurn?.[blamed as string] ?? 0
        if (excess <= cur) return state.maxExcessDamageThisTurn
        return { ...state.maxExcessDamageThisTurn, [blamed as string]: excess }
      })()
                                                           
      const damagedBy = ev.amount > 0 && blamed !== undefined && !(o.damagedBy ?? []).includes(blamed as string)
        ? [...(o.damagedBy ?? []), blamed as string]
        : o.damagedBy
      return {
        ...state,
        objects: { ...state.objects, [ev.target]: { ...o, damage: o.damage + ev.amount, ...(damagedBy !== undefined ? { damagedBy } : {}) } },
        ...(led !== undefined ? { damagedThisTurn: led } : {}),
        ...(excessLed !== undefined ? { maxExcessDamageThisTurn: excessLed } : {}),
      }
    }
    case 'buffBonus': // ★692 OGN-053:本回合增益额外加成(第二十四本账,按玩家累加)
      return {
        ...state,
        buffBonusThisTurn: { ...state.buffBonusThisTurn, [ev.player as string]: (state.buffBonusThisTurn?.[ev.player as string] ?? 0) + ev.delta },
      }
    case 'grantRecursion': // ★第445轮 凯南:给废牌堆一张法术授予本回合[流转](第二十一本账,按 oid)
      return {
        ...state,
        grantedRecursionThisTurn: { ...state.grantedRecursionThisTurn, [ev.card]: ev.cost },
      }
    case 'grantNextUnitReadyBuff': // ★第443轮 娜美:授予「下一次打出单位 ready+buff」(第二十本账,额度累加)
      return {
        ...state,
        nextUnitReadyBuffThisTurn: {
          ...state.nextUnitReadyBuffThisTurn,
          [ev.player]: (state.nextUnitReadyBuffThisTurn?.[ev.player] ?? 0) + 1,
        },
      }
    case 'grantBuff':
      return grantBuffInState(state, ev.target)                           
    case 'grantConquerReturn':
      return { ...state, grantedConquerReturnThisTurn: { ...state.grantedConquerReturnThisTurn, [ev.unit]: true } }
    case 'consumeBuff':
      return consumeBuffInState(state, ev.target, ev.by)                                
    case 'empower':
      return empowerInState(state, ev.target)                            
    case 'disempower':
      return disempowerInState(state, ev.target)                        
    case 'burn':
                                            
                                                                           
      return burnCards(state, ev.player, ev.count, (deps ?? {}) as ReduceDeps)
    case 'attach': {
                                                    
      const attached = attachCard(state, ev.obj, ev.to)
                                      
                                                           
                                                    
      if (attached === state) return attached
      return { ...attached, attachedThisTurn: { ...attached.attachedThisTurn, [ev.obj]: true as const } }
    }
    case 'detach':
      return detachCard(state, ev.obj)
    case 'banish': {
                                                
      const owner = state.objects[ev.target]?.owner
      const exileId = owner === undefined ? undefined : (`exile:${owner}` as ZoneId)
      const before = exileId ? (state.zones[exileId]?.contents ?? []) : []
      const next = banishInState(state, ev.target, ev.by)
      if (!ev.scheduleReturn || !exileId) return next
                                                      
      const landed = (next.zones[exileId]?.contents ?? []).filter((id) => !before.includes(id))
      const card = landed[0]
      if (card === undefined) return next
      return {
        ...next,
        delayedReturns: [...(next.delayedReturns ?? []), { ...ev.scheduleReturn, card }],
      }
    }
    case 'playFree': {
      if (!state.objects[ev.obj]) return state
                                                                                               
                                                                                  
                                                                                              
                                                                                                
                                                          
      {
        const fo = state.objects[ev.obj]!
        if (typesDeclared(fo) && !isUnit(fo) && !isEquipment(fo)) return state
      }
      const to = ev.to ?? (`base:${ev.player}` as ZoneId)
                                                                                  
      if (deps?.playBanned?.(state, ev.player, state.objects[ev.obj]!.defId, to as string, ev.obj) === true) return state
      const before = state.zones[to]?.contents ?? []
      let s = moveObjectInState(state, ev.obj, to)
                                                  
      const landedOid = (s.zones[to]?.contents ?? []).find((id) => !before.includes(id))
      let o = landedOid ? s.objects[landedOid] : undefined
      if (o && o.controller !== ev.player) {
                                                                                                                  
                                                                 
        o = { ...o, controller: ev.player }
        s = { ...s, objects: { ...s.objects, [o.oid]: o } }
      }
      if (o && ev.tag !== undefined) { // ★694 落地标签(㊼ spawnToken tag 同款,进 counters)
        o = { ...o, counters: { ...o.counters, [ev.tag]: 1 } }
        s = { ...s, objects: { ...s.objects, [o.oid]: o } }
      }
      if (!o) return s
                                                         
                                                         
                                                            
                                                                                   
                                                                       
                                                              
                                             
                                                                
                                               
      s = notePlayLedgers(s, ev.player, o.oid, o.defId, deps)
                                                          
                                                                            
                                                                                           
                                                
      const isUnitHere = o.baseTypes?.includes('equipment') !== true
      const readyByGrant = isUnitHere && deps?.unitEntersReady?.(s, ev.player, o.defId, to as string, o.oid as string) === true
      if (!ev.ready && !readyByGrant && isUnitHere) {
        s = { ...s, objects: { ...s.objects, [o.oid]: { ...o, status: { ...o.status, dormant: true } } } }
      }
                                                                  
      if (isUnitHere) s = consumeNextUnitReadyInState(s, ev.player)
                                                                            
                                                                     
                                                               
                                                                           
                                                                
                                                     
                                                                       
                                                                    
                                                                          
                                                             
                                                        
      s = noteCardConfirmed(s, ev.player, o.oid)
      return consumeNextUnitReadyBuff(s, ev.player, o.oid)
    }
    case 'statusChange': {
      const o = state.objects[ev.target]
      if (!o) return state
                                                                            
                                                               
                                                      
                                                                                 
                                                           
      const key = (ev.key === 'tapped' || ev.key === 'dormant') && typesDeclared(o) ? exhaustKey(o) : ev.key                     
      if (((o.status as Record<string, unknown>)[key] ?? false) === (ev.value ?? false)) return state
      return {
        ...state,
        objects: {
          ...state.objects,
          [ev.target]: { ...o, status: { ...o.status, [key]: ev.value } },
        },
      }
    }
    case 'zoneChange': {
                                                                    
                                                                     
                                                                
                          
      if (!state.objects[ev.obj]) return state
                                                
                                                                          
                                                                   
                                                 
                                    
                                                                     
      const fromZone = state.zones[state.objects[ev.obj]?.zone ?? ('' as never)]
      const discarder = fromZone?.kind === 'hand' && state.zones[ev.to]?.kind === 'discard'
        ? fromZone.owner
        : null
      const base = discarder === null
        ? state
        : { ...state, discardedThisTurn: { ...state.discardedThisTurn, [discarder]: true as const } }
      const moved = moveObjectInState(base, ev.obj, ev.to)
      if (ev.placement !== 'bottom') return moved               
                                                                     
      const z = moved.zones[ev.to]
      if (!z || z.contents.length === 0) return moved
      const last = z.contents[z.contents.length - 1]!
      return {
        ...moved,
        zones: { ...moved.zones, [ev.to]: { ...z, contents: [last, ...z.contents.slice(0, -1)] } },
      }
    }
                                           
                                                         
    case 'drawForDestroyVictim': {
      const o = state.objects[ev.victim]
      const k = o ? state.zones[o.zone]?.kind : undefined
                                                           
                                     
      const stillFielded = o !== undefined && isFieldedKind(k)
                                                         
                                                  
                                                               
      const disc = state.zones[`discard:${ev.victimOwner}` as ZoneId]
      const last = disc?.contents[disc.contents.length - 1]
      const landedInDiscard = last !== undefined && state.objects[last]?.defId === ev.victimDefId
                                                          
                                                       
                                                                              
                                                           
                                        
                                                  
                                                                 
                                                                                   
                                                                            
                                                                    
                                                                     
      const tokenVanished = o === undefined && isTokenDefId(ev.victimDefId) && ev.destroyWasReplaced !== true
                                                       
                                     
      if (!stillFielded && !landedInDiscard && !tokenVanished) return state
                                                               
                                                            
      const drawEv = { kind: 'draw', player: ev.player, count: ev.count } as GameEvent
      deps?.onEvent?.(drawEv, state)
      return landEvent(state, drawEv, deps)
    }
                                                         
                                                         
    case 'pumpIfDestroyed': {
      const disc = state.zones[`discard:${ev.victimOwner}` as ZoneId]
      const last = disc?.contents[disc.contents.length - 1]
      const landedInDiscard = last !== undefined && state.objects[last]?.defId === ev.victimDefId
                                                                  
                                                             
                                            
                                                     
                                                       
                                                 
                                                            
                                            
                                                     
                                        
      const tokenVanished = state.objects[ev.victim] === undefined && isTokenDefId(ev.victimDefId) && ev.destroyWasReplaced !== true
      if (!landedInDiscard && !tokenVanished) return state
      return landEvent(state, {
        kind: 'addEffect',
        effect: {
          id: `${ev.effectId}:${ev.beneficiary as string}`, duration: 'thisTurn', fromPassive: false,
          predicate: (x: { readonly oid: ObjId }) => x.oid === ev.beneficiary,
          modification: { kind: 'addMight', delta: ev.delta },
        },
      } as GameEvent, deps)
    }
                                                                    
    case 'markExileOnLeave': {
      let hit = false
      const chain = state.chain.map((it) => {
        if (it.kind !== 'spell' || it.cardOid !== ev.cardOid) return it
        hit = true
        return { ...it, exileOnLeave: true, exileBy: ev.by }
      })
      return hit ? { ...state, chain } : state
    }
    case 'exiledOnLeave':
      return state                            
    case 'mightCrossed':
      return state                                          
    case 'viewed':
      return state                                        
    case 'clearBanishLedger': {
      if (!(ev.by in state.banishLedger)) return state
      const led = { ...state.banishLedger }
      delete led[ev.by as string]
      return { ...state, banishLedger: led }
    }
                                         
    case 'addBattlefieldZone': {
      if (state.zones[ev.zoneId]) return state
      const standbyId = (ev.zoneId as string).replace(/^battlefield:/, 'standby:') as ZoneId
      return {
        ...state,
        zones: {
          ...state.zones,
          [ev.zoneId]: { id: ev.zoneId, kind: 'battlefield', owner: null, contents: [] },
                                           
          [standbyId]: { id: standbyId, kind: 'standby', owner: null, contents: [], parentBattlefield: ev.zoneId, capacity: STANDBY_DEFAULT_CAPACITY },
        },
        battlefieldCards: { ...state.battlefieldCards, [ev.zoneId as string]: { defId: ev.defId, owner: ev.owner } },
      }
    }
                                             
    case 'replaceBattlefieldCard': {
      const cur = state.battlefieldCards?.[ev.zoneId as string]
      if (!cur) return state                      
      const original = cur.originalDefId ?? cur.defId                    
      const entry = ev.defId === original
        ? { defId: ev.defId, owner: ev.owner }                     
        : { defId: ev.defId, owner: ev.owner, originalDefId: original }
      return { ...state, battlefieldCards: { ...state.battlefieldCards, [ev.zoneId as string]: entry } }
    }
    case 'draw': {
                                 
                                                              
                                                               
                                                                               
                                                                                      
                                                           
                                                         
                                     
                                                                        
      let s = state
      let remaining = ev.count
                                                                 
      const before = s.zones[`hand:${ev.player}` as ZoneId]?.contents.length ?? 0
      for (let i = 0; i < DRAW_LOOP_CAP && remaining > 0; i++) {
        const available = s.zones[`mainDeck:${ev.player}` as ZoneId]?.contents.length ?? 0
        const k = Math.min(remaining, available)
        for (let n = 0; n < k; n++) s = drawOne(s, ev.player)                       
        remaining -= k
        if (remaining <= 0) break
                                                                                  
                                                                  
                                                  
        s = burnOut(s, ev.player, (deps ?? {}) as ReduceDeps)
        if (s.winner !== null) break                              
                                                              
        if ((s.zones[`mainDeck:${ev.player}` as ZoneId]?.contents.length ?? 0) === 0) break
      }
      const got = (s.zones[`hand:${ev.player}` as ZoneId]?.contents.length ?? 0) - before
      if (got <= 0) return s
      const led = s.drawnThisTurn ?? {}
      return { ...s, drawnThisTurn: { ...led, [ev.player]: (led[ev.player] ?? 0) + got } }
    }
    case 'destroy': {
      const o = state.objects[ev.target]
      if (!o) return state
      const discardId = `discard:${o.owner}` as ZoneId
                                                
                                              
                                                        
                                                                
                           
      const snaps = collectLastRites(state, [ev.target])
                                                      
      const dead = snapshotOnDeath(o, state)
      const before = state.zones[discardId]?.contents ?? []
      const moved = moveObjectInState(state, ev.target, discardId)
      const newOid = (moved.zones[discardId]?.contents ?? []).find((id) => !before.includes(id))
                                                          
      const culprit = ev.sourcePlayer ?? (ev.source ? state.objects[ev.source]?.controller : undefined)
                                                                       
                                                          
                                                            
                                               
      const culpritCard = ev.sourceCardId ?? (ev.source ? state.objects[ev.source]?.defId : undefined)
                                                                 
                                                           
      const tokenGone: ReadonlySet<string> | undefined = newOid === undefined && isToken(o) ? new Set([String(ev.target)]) : undefined
      pushDestroyed(fillPostDeathOids([dead], newOid ? { [ev.target]: newOid } : {}, tokenGone)
        .map((victim) => ({ victim, responsible: culprit ? [culprit] : [], ...(culpritCard ? { byCards: [culpritCard] } : {}) })))
      if (snaps.length > 0) {
                                                                  
        const landed = (moved.zones[discardId]?.contents ?? []).find((id) => !before.includes(id))
        pushDeathSnapshots(landed ? fillPostDeathOids(snaps, { [ev.target]: landed }) : fillPostDeathOids(snaps, {}, tokenGone))
      }
      return moved
    }
    case 'gainPoint': {
                                                                   
                                                        
                                                                
                                               
                                                                   
                         
                                                              
                                                                                
                                                              
      if (!isExemptEvent(ev) && deps?.scoreBlockedAnywhere?.(state, ev.player) === true) return state
      return {
        ...state,
        scores: { ...state.scores, [ev.player]: (state.scores[ev.player] ?? 0) + ev.amount },
      }
    }
    case 'stun':
      return applyStunInState(state, ev.target).state                    
    case 'addEffect': {
      const ts = nextEffectTimestamp(state.continuousEffects)                            
      return { ...state, continuousEffects: [...state.continuousEffects, { ...ev.effect, timestamp: ts }] }
    }
    case 'playUnit': {
                                                   
                                                       
                                               
      const played = state.objects[ev.unit]
      if (played === undefined) return state
                                                         
                                                              
                                                                 
                                                                   
                              
      state = consumeNextUnitReadyBuff(state, ev.player, ev.unit)
                                                                    
                                                              
      return notePlayLedgers(state, ev.player, ev.unit, played.defId, deps)
    }
    case 'activateAbility':
      return state                                         
    case 'mainPhaseStart':
      return state                                               
    case 'extraTurn':
                                                     
      return grantExtraTurn(state, ev.player)
    case 'destroyed':
                                                            
                                              
                                                                
                                                       
                                                                
                                                      
                                                                          
                                                        
                                                                             
      return state
    case 'summonRune': {
      const beforeLen = state.zones[`base:${ev.player}` as ZoneId]?.contents.length ?? 0
      let s = recallRunes(state, ev.player, ev.count)                                     
      if (ev.dormant) {
                                          
                                                                  
        const base = s.zones[`base:${ev.player}` as ZoneId]
        const added = base ? base.contents.slice(beforeLen) : []
        if (added.length > 0) {
          const objects = { ...s.objects }
          for (const oid of added) { const o = objects[oid]; if (o) objects[oid] = { ...o, status: { ...o.status, tapped: true } } }
          s = { ...s, objects }
        }
      }
      return s
    }
    case 'freeStandby':
      return { ...state, freeStandbyThisTurn: [...new Set([...(state.freeStandbyThisTurn ?? []), ev.player])] }
    case 'playSpellFromZone':
      return state                                                             
    case 'revealed':
                                                     
      return revealedHook ? revealedHook(state, ev) : state
    case 'removeDamage': {
      const o = state.objects[ev.target]
      if (!o || o.damage === 0) return state
      return { ...state, objects: { ...state.objects, [ev.target]: { ...o, damage: 0 } } }
    }
    case 'gearManaFree': {
                                                           
      const cur = state.gearManaFreeThisTurn ?? {}
      return { ...state, gearManaFreeThisTurn: { ...cur, [ev.player as string]: (cur[ev.player as string] ?? 0) + 1 } }
    }
    case 'banPlayCards':
      return { ...state, cannotPlayCardsThisTurn: [...new Set([...(state.cannotPlayCardsThisTurn ?? []), ev.player])] }
    case 'banPlaySpells':
                                                                  
      return { ...state, cannotPlaySpellsThisTurn: [...new Set([...(state.cannotPlaySpellsThisTurn ?? []), ev.player])] }
    case 'grantNextSpellDamage': {
      const cur = state.spellDamageBonus ?? {}
      const led = cur[ev.player] ?? { pending: 0 }
      return { ...state, spellDamageBonus: { ...cur, [ev.player]: { ...led, pending: led.pending + 1 } } }
    }
    case 'grantNextSpellDiscount': {
      const cur = state.nextSpellDiscountThisTurn ?? {}
      return { ...state, nextSpellDiscountThisTurn: { ...cur, [ev.player]: (cur[ev.player] ?? 0) + ev.mana } }
    }
    case 'grantNextCardDiscount': {
                                                   
      const cur = state.nextCardDiscountThisTurn ?? {}
      return { ...state, nextCardDiscountThisTurn: { ...cur, [ev.player]: (cur[ev.player] ?? 0) + 1 } }
    }
    case 'negateSpellDamage':
                                 
      return { ...state, spellDamageNegatedThisTurn: true as const }
    case 'raiseUnitPlayCost': {
      const cur = state.unitPlayCostUpThisTurn ?? {}
                                                
      return { ...state, unitPlayCostUpThisTurn: {
        ...cur, [ev.player]: (cur[ev.player] ?? 0) + ev.amount } }
    }
    case 'grantPlayFromDiscard': {
      const all = state.playFromDiscardGrants ?? {}
      const mine = all[ev.player] ?? {}
                                                      
      return { ...state, playFromDiscardGrants: {
        ...all, [ev.player]: { ...mine, [ev.defId]: (mine[ev.defId] ?? 0) + 1 } } }
    }
    case 'changeController': {
      const o = state.objects[ev.target]
      if (!o || o.controller === ev.player) return state                      
      return { ...state, objects: { ...state.objects, [ev.target]: { ...o, controller: ev.player } } }
    }
    case 'recall':
      return recallToBase(state, ev.target)
    case 'noteChosenMode': {
      const led = state.chosenModesThisTurn ?? {}
      const prev = led[ev.ledgerKey] ?? []
      if (prev.includes(ev.mode)) return state                   
      return { ...state, chosenModesThisTurn: { ...led, [ev.ledgerKey]: [...prev, ev.mode] } }
    }
    case 'grantNextSpellEcho': {
      const cur = state.nextSpellEchoThisTurn ?? {}
                                                              
                                                       
      return { ...state, nextSpellEchoThisTurn: { ...cur, [ev.player]: (cur[ev.player] ?? 0) + 1 } }
    }
    case 'unitMoved':
                                                           
                                                       
      return {
        ...state,
        movesThisTurn: {
          ...(state.movesThisTurn ?? {}),
          [ev.unit as string]: (state.movesThisTurn?.[ev.unit as string] ?? 0) + 1,
        },
      }
    case 'hold':
    case 'attack':
    case 'endOfTurn':
      return state                                
    case 'conquer': {
                                                        
                                                     
                                           
                                                        
                                           
      const prevBfs = state.conqueredBattlefieldsThisTurn ?? {}
      const mineBfs = prevBfs[ev.player as string] ?? []
      const withBf: GameState = mineBfs.includes(ev.battlefield) ? state : {
        ...state,
        conqueredBattlefieldsThisTurn: { ...prevBfs, [ev.player as string]: [...mineBfs, ev.battlefield] },
      }
      const z = withBf.zones[ev.battlefield]
      if (!z) return withBf
      const conquered = z.contents.filter((oid) => {
        const o = withBf.objects[oid]
        return !!o && o.controller === ev.player && !o.defId.startsWith('rune:') && !o.baseTypes?.includes('equipment')
      })
      if (conquered.length === 0) return withBf
      return { ...withBf, unitsConqueredThisTurn: [...new Set([...withBf.unitsConqueredThisTurn, ...conquered])] }
    }
                                                                 
                                                           
    case 'standbyPlaced':
      return state
    case 'playSpell': {
                                                            
                                                         
      const withSpellLedger: GameState = {
        ...state,
        playedSpellThisTurn: { ...state.playedSpellThisTurn, [ev.player]: true as const },
                                                              
        playedCardCountThisTurn: {
          ...state.playedCardCountThisTurn,
          [ev.player]: (state.playedCardCountThisTurn?.[ev.player] ?? 0) + 1,
        },
                                                               
                                                              
                                                            
        playedSpellCountThisTurn: {
          ...state.playedSpellCountThisTurn,
          [ev.player]: (state.playedSpellCountThisTurn?.[ev.player] ?? 0) + 1,
        },
      }
                                                    
      const led = withSpellLedger.spellDamageBonus?.[ev.player]
      if (!led || led.pending <= 0) return withSpellLedger
                                                                         
                                                              
                                                               
      return { ...withSpellLedger, spellDamageBonus: {
        ...withSpellLedger.spellDamageBonus,
        [ev.player]: { pending: led.pending - 1, armed: ((ev as { chainCardOid?: string }).chainCardOid ?? ev.cardOid) as string },
      } }
    }
    case 'duelStart':
      return state                 
    case 'recycle': {
                                                                              
                                                   
      return recycleObjects(state, ev.objs)
    }
    case 'gainResource': {
      const pool = state.runePools[ev.player] ?? { mana: 0, runes: {} }
      const runes = { ...pool.runes }
      for (const [d, n] of Object.entries(ev.energy ?? {})) runes[d] = (runes[d] ?? 0) + n
      const withPool = { ...state, runePools: { ...state.runePools, [ev.player]: {
        mana: pool.mana + (ev.mana ?? 0),
        duelMana: (pool.duelMana ?? 0) + (ev.duelMana ?? 0),
        runes,
                                                            
        ...(ev.restricted !== undefined || (pool.restricted?.length ?? 0) > 0
          ? { restricted: [...(pool.restricted ?? []), ...(ev.restricted !== undefined ? [ev.restricted] : [])] }
          : {}),
      } } }
                                                    
      if (!ev.experience) return withPool
      return {
        ...withPool,
        experience: { ...withPool.experience, [ev.player]: (withPool.experience[ev.player] ?? 0) + ev.experience },
                                                    
                                                                   
                                         
        gainedExperienceThisTurn: { ...withPool.gainedExperienceThisTurn, [ev.player]: true },
      }
    }
    case 'grantEnergyNextMain': {
      const cur = state.pendingMainPhaseEnergy?.[ev.player] ?? {}
      const merged = { ...cur }
      for (const [d, n] of Object.entries(ev.energy)) merged[d] = (merged[d] ?? 0) + n
      return { ...state, pendingMainPhaseEnergy: { ...state.pendingMainPhaseEnergy, [ev.player]: merged } }
    }
    case 'startPhase':
      return state                    
    case 'winGame':
      return state.winner ? state : { ...state, winner: ev.player }                       
    case 'defend':
      return state                          
    case 'negate':
      return negate(state, ev.target, { returnToHand: ev.returnToHand ?? false })                
    case 'battleEnd':
      return state                             
    case 'recycled':
      return state                          
    case 'banished':
      return state                                                  
    case 'markTurnShield':
      return markTurnShieldInState(state, ev.target, ev.mark)              
    case 'declare': {
                                                            
      const who = state.objects[ev.target]
      if (!who) return state
      return {
        ...state,
        objects: {
          ...state.objects,
          [ev.target]: { ...who, declared: { ...(who.declared ?? {}), [ev.key]: ev.value } },
        },
      }
    }
    case 'markNextUnitReady':
      return grantNextUnitReadyInState(state, ev.player)                
    case 'markAllUnitsEnterReady':
                                            
                                                                    
                                                                                
      return grantAllUnitsEnterReadyInState(state, ev.player)
    case 'delayedTrigger': {
                                              
      let s2 = ev.clear === undefined ? state : clearDelayedTriggerInState(state, ev.clear)
      if (ev.add) s2 = addDelayedTriggerInState(s2, ev.add)
      return s2
    }
    case 'spellResolved':
      return state                                             
    case 'runeRecycled':
      return state                   
    case 'targeted': {
                                                                       
                                                                                                          
      return noteTargetedLedger(state, ev)
    }
    case 'insight':
                                                                
      return insight(
        state,
        ev.player,
        ev.count,
        ev.recycleAll ? (top) => top : ev.recycle ? () => ev.recycle! : () => [],
      )                                   
    case 'grantVision': {
                                                    
      const led = state.visionThisTurn ?? {}
      const cur = led[ev.viewer as string] ?? { cards: [], faceDownOf: [] }
      const cards = [...new Set([...cur.cards, ...(ev.cards ?? []).map((o) => o as string)])]
      const faceDownOf = [...new Set([...cur.faceDownOf, ...(ev.faceDownOf ?? []).map((p) => p as string)])]
      return { ...state, visionThisTurn: { ...led, [ev.viewer as string]: { cards, faceDownOf } } }
    }
    case 'seize': {
      const rechoice = ev.rechoiceTarget ? { target: ev.rechoiceTarget as ObjId } : {}               
      const r = seizeAndRechoose(state, ev.target, ev.newController, rechoice)                   
                                                                    
                                                                                                  
                                                                                
                                                                       
                                                                                                         
                                                                                            
                                                                                                    
      if (r.retargeted && ev.rechoiceTarget !== undefined) {
        const seized = state.chain.find((i) => i.id === ev.target)
        let s = r.state
        for (const oid of liveTargetOids(state, ev.rechoiceTarget)) {
          s = noteTargetedLedger(s, {
            chooser: ev.newController, target: oid as ObjId, sourceKind: 'spell', sourceOid: seized?.cardOid,
          })
        }
        return s
      }
      return r.state
    }
    case 'spend': {
                                                       
                                                     
                                                                 
      const pay = payFromState(state, ev.player, ev.cost)                           
                                    
      return ev.experience ? spendExperience(pay.state, ev.player, ev.experience) : pay.state
    }
    case 'spawnToken': {
      let { state: s, oid } = spawnToken(state, ev.spec, ev.zone, ev.owner)              
      const isEquip = ev.spec.baseTypes?.includes('equipment') === true
      if (isEquip) {
                                             
        if (ev.dormant) {
          const o = s.objects[oid]!
          s = { ...s, objects: { ...s.objects, [oid]: { ...o, status: { ...o.status, tapped: true } } } }
        }
      } else if (!ev.ready && deps?.tokenEntersReady?.(state, ev.owner) !== true) {
                                                              
                                                
                                                                
                                                              
                                                                
                                                                      
                                        
                                                                    
                                                    
                                                                        
                                                 
                                                                
                                      
        const o = s.objects[oid]!
        s = { ...s, objects: { ...s.objects, [oid]: { ...o, status: { ...o.status, dormant: true } } } }
      }
      if (ev.tag) {
        const o = s.objects[oid]!
        s = { ...s, objects: { ...s.objects, [oid]: { ...o, counters: { ...o.counters, [ev.tag]: 1 } } } }        
      }
                                                          
                                                                   
                                                  
                                                                 
      s = consumeNextUnitReadyBuff(s, ev.owner, oid)
                                                      
                                                   
                                                                          
      const doubler = deps?.tokenSpawnDoublerFor?.(s, ev)
      if (doubler !== undefined) {
        s = { ...s, abilityFiredThisTurn: { ...(s.abilityFiredThisTurn ?? {}), [`${doubler}:tokenDouble`]: true } }
        s = landEvent(s, ev, deps)                                                
      }
      return s
    }
    case 'enqueueItem':
      return { ...state, chain: addItems(state.chain, [ev.item]) }                          
  }
}

   
                              
                                               
                                                                             
                                                        
   
export function eventTriggersCleanup(ev: GameEvent): boolean {
  switch (ev.kind) {
    case 'zoneChange':                   
    case 'destroy':             
    case 'statusChange':          
    case 'stun':               
    case 'damage':                      
    case 'gainPoint':                 
    case 'negate':                     
    case 'insight':                       
                                                              
                                                          
                       
                                                     
                                                     
                                                         
                                                      
                                                       
                                                    
                                 
                                                                       
                                                            
                                                                                  
                                                                    
                                                    
                                                                      
                                                              
                                                            
                                                             
                                                                    
                                                 
                                                                       
                                                    
                                                      
                                                
                                                               
                                                  
                                                                       
                                                 
                                                                         
                                                                                     
                                                                              
                                                                  
                                                                            
                                                           
                                                 
                                                                      
                                                    
                                                                                       
                                                      
                                                
                                                                     
                                                                                   
                                                                        
                                                                              
                                                               
             
                                                          
                                                       
                                                           
                                                         
                                                          
                                                       
                                                                                
                                                                                        
                                                                     
                                                                               
                                                               
                                                                                        
                                                         
                                                             
                                                                            
                                            
    case 'spend':                                                   
    case 'declare':                                      
    case 'recycle':                                         
    case 'summonRune':                                             
    case 'seize':                                              
                                                                  
                                                                         
                                                        
                                                                       
                                                                             
                                                    
                                                              
                                                           
                                                                 
                                                   
                                                      
    case 'changeController':                                          
    case 'spawnToken':                  
    case 'playUnit':                                                 
    case 'enqueueItem':                     
    case 'addEffect':                                          
    case 'grantBuff':                             
    case 'consumeBuff':                                          
                                                          
                                                                   
                                                                            
                                                          
                                                           
                                                  
                                                         
                                                                        
                                                              
                                                     
    case 'buffBonus':                                     
                                               
                                                                 
                                                                                               
                                                                                  
                                                              
                                                                
                                                              
                                             
                                                                  
                                                                    
                                              
    case 'replaceBattlefieldCard':                                        
    case 'empower':                                    
    case 'disempower':         
    case 'burn':                                            
    case 'unitMoved':                                             
                                                                             
                                                                                
                                                                     
                                                                            
                                     
                                                                                      
                      
                                                            
                                                
                                                         
                             
                                                     
                                                                               
                                                                           
                                                                                 
                                                
                                                                  
                                                     
                                                                      
                                                                  
                                             
                                   
    case 'standbyPlaced':                                                     
    case 'attach':                                       
    case 'detach':                                
    case 'banish':                                    
                                                         
                                                            
                                                                                  
                                                         
                                                    
                                            
                                                        
                                                                
                                                                  
                                                     
                                                                                
                                                                 
                                                               
                                                
    case 'pumpIfDestroyed':
    case 'playFree': // §319.6 进场 → 清理
      return true
    default:
      return false
  }
}

   
                                                         
  
                                                      
                                                 
  
                                        
                                                           
   
                                                                              
                                                          
export function performPlayFromZone(
  state: GameState,
  play: NonNullable<PlayUnitEvent['play']>,
  player: PlayerId,
  deps?: LandDeps, // ★1365【缺陷 174 第二条路】进场姿态要问 data 层 entryReadyFor(经 unitEntersReady 注入);不给 ⇒ 行为与接线前一致
): { readonly state: GameState; readonly fieldedOid: ObjId } | null {
  if (!state.objects[play.card]) return null                   
  if (!state.zones[play.to]) return null         
                                                            
                                                                                                   
  const due = play.extraCost !== undefined ? addCosts(play.cost, play.extraCost) : play.cost
  const pay = payFromState(state, player, due)                       
  if (!pay.ok) return null                         
  const { oid: fieldedOid } = freshOid(pay.state)                 
  let s = moveObjectInState(pay.state, play.card, play.to)
  const placed = s.objects[fieldedOid]
  if (!placed) return null
                                                 
                                                                                        
                                                                            
  const isUnitHere = placed.baseTypes?.includes('equipment') !== true
  const readyByGrant = isUnitHere && deps?.unitEntersReady?.(s, player, placed.defId, String(play.to), fieldedOid as string) === true
  if (!play.readyOnEntry && !readyByGrant) {
    s = { ...s, objects: { ...s.objects, [fieldedOid]: { ...placed, status: { ...placed.status, dormant: true } } } }
  }
  if (isUnitHere) s = consumeNextUnitReadyInState(s, player)
                                                         
                                                  
  if (play.by !== undefined) {
    const prev = s.playLedger[play.by as string] ?? []
    s = { ...s, playLedger: { ...s.playLedger, [play.by as string]: [...prev, fieldedOid] } }
  }
  return { state: s, fieldedOid }
}

   
                                                                 
                                                             
                                       
                                                            
                               
                                                                  
                                                           
                                                                             
                                                                      
                                                             
                                                         
                                                         
   
export function playedBy(state: GameState, by: ObjId): readonly ObjId[] {
  return (state.playLedger[by as string] ?? []).filter((oid) => {
    const o = state.objects[oid]
    if (o === undefined) return false
    const kind = state.zones[o.zone]?.kind
    return kind === 'battlefield' || kind === 'base'
  })
}
