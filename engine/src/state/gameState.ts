                               
                                                        

import type { DeathSnapshot } from '../keywords/lastRites'
import type { ObjId, PlayerId, ZoneId } from './ids'
import { asZoneId } from './ids'
import type { GameObject } from './object'
import type { Cost } from './runePool'
import type { ChainItem } from '../loop/chain'
import type { StaticEffect } from '../effects/continuousView'
import type { TurnShieldMarks } from '../effects/turnShields'
import type { DelayedTrigger } from '../effects/delayedTriggers'
import type { GameEvent } from '../loop/events'

   
                                                                      
                                                                     
   
export interface PendingTargetSignalBatch {
                                             
  readonly stage: 'confirm' | 'resolve'
                                      
  readonly controller: PlayerId
  readonly events: readonly GameEvent[]
}

   
                                           
                                    
                                                
                                       
                                 
   
export interface TargetSourceTally {
  readonly spell: number
  readonly unitAbility: number
  readonly otherAbility: number
}
import type { VictoryCondition } from '../scoring/altVictory'
import { emptyRunePool, type RunePool } from './runePool'
import {
  NON_FIELDED_KINDS,
  STANDBY_DEFAULT_CAPACITY,
  type Zone,
  type ZoneKind,
} from './zones'

   
                                           
                                                                     
                                             
   
export type Phase = 'awaken' | 'start' | 'summon' | 'draw' | 'main' | 'ending'

                                          
export interface VisionGrant {
                                                  
  readonly cards: readonly string[]
                                                       
  readonly faceDownOf: readonly string[]
}

                                                                             
export type ReplacementSignal =
  | { readonly kind: 'banished'; readonly card: ObjId; readonly player: PlayerId; readonly defId: string; readonly from?: ZoneId }
  | { readonly kind: 'destroyed'; readonly card: ObjId; readonly player: PlayerId; readonly defId: string; readonly victim: DeathSnapshot }

export interface GameState {
  readonly players: readonly PlayerId[]
              
  readonly activePlayer: PlayerId
  readonly phase: Phase
                          
  readonly zones: Readonly<Record<string, Zone>>
                           
  readonly objects: Readonly<Record<string, GameObject>>
                
  readonly runePools: Readonly<Record<string, RunePool>>
                                                      
  readonly scores: Readonly<Record<string, number>>
     
                                                            
                                          
                       
     
  readonly experience: Readonly<Record<string, number>>
                          
  readonly winTarget: number
                                                        
  readonly turn: number
     
                                             
                                         
                                                    
                               
                                            
     
  readonly turnsTaken: Readonly<Record<string, number>>
     
                                                       
                                                                         
                                                             
                                           
     
  readonly gainedExperienceThisTurn?: Readonly<Record<string, true>>
     
                                                 
                                                                           
                                                                  
                                                            
                                         
     
  readonly discardedThisTurn?: Readonly<Record<string, true>>
     
                                                        
                                           
                                                           
                                                                  
                                     
     
  readonly playedArmamentThisTurn?: Readonly<Record<string, true>>

     
                                       
                                              
                                                                                       
                                                                       
                                     
     
  readonly playedEquipmentThisTurn?: Readonly<Record<string, true>>
     
                                                            
                                                      
    
                                                
                                                  
                                                 
                                       
                                         
                                                                             
                                          
     
  readonly firstEquipPlayedThisTurn?: Readonly<Record<string, string>>
     
                                         
                                                           
    
                                                          
                              
                                                                  
                                                         
                                              
                                                    
                                                         
                                                               
                                      
     
  readonly attachedThisTurn?: Readonly<Record<string, true>>
     
                                                           
                                               
    
                                                     
                                                  
                                          
                                                        
                                                                     
                                                      
                                           
                                                               
                   
                                                       
     
  readonly maxExcessDamageThisTurn?: Readonly<Record<string, number>>
     
                                                                   
                                                       
                                                            
                                                                                   
     
  readonly pendingReplacementSignals?: readonly ReplacementSignal[]
     
                                                               
                                              
                                                                                           
                                                               
                                                                          
                                                      
                                                                           
     
  readonly pendingScoreSignals?: readonly { readonly player: PlayerId; readonly amount: number }[]
     
                                                                     
                                                                         
                                                                           
                                                      
                                                                                    
                                                    
                                                                  
     
  readonly pendingTargetSignals?: readonly PendingTargetSignalBatch[]
     
                                                             
                                                         
                                                     
                                                 
     
  readonly playedUnitThisTurn?: Readonly<Record<string, true>>
     
                                     
                                                           
     
  readonly playedSpellThisTurn?: Readonly<Record<string, true>>
     
                                                           
    
                                                  
                                                    
                                              
                                      
                                                          
                                                      
                                                      
                                                   
                    
                                                    
                          
                                                          
                                                            
     
  readonly playedSpellCountThisTurn?: Readonly<Record<string, number>>
     
                                                       
    
                                                         
                                                       
                                                         
                                             
                                        
                                                                       
                                          
                                                      
                                                                   
     
  readonly playedCardCountThisTurn?: Readonly<Record<string, number>>
     
                                          
                                                              
    
                                                   
                                                           
                                                             
                                           
                                                   
                                                            
    
                                                        
                                                     
     
  readonly visionThisTurn?: Readonly<Record<string, VisionGrant>>
     
                                        
                                            
                                              
                                                                      
                                                                 
                                          
                                                                               
                                                                
     
  readonly movesThisTurn?: Readonly<Record<string, number>>
     
                                            
                                             
                                                               
                           
                                                                        
                                                                                                                                 
                                                 
                                                                   
     
  readonly conqueredBattlefieldsThisTurn?: Readonly<Record<string, readonly string[]>>
     
                                                     
                                                     
                                                                      
                                                      
     
  readonly extraTurns?: readonly PlayerId[]
     
                                                   
                                                                 
                                                                  
     
  readonly turnAnchor?: PlayerId
                                                         
  readonly concededBy?: PlayerId
                                                    
  readonly scoredBattlefieldsThisTurn: Readonly<Record<string, readonly string[]>>
     
                                                       
                                                                      
                                                   
                                                               
     
  readonly scoringTriggeredThisTurn: Readonly<Record<string, readonly string[]>>
     
                                           
                                                      
                                                   
     
  readonly unitsConqueredThisTurn: readonly ObjId[]
     
                                                   
                                
     
  readonly confirmedThisTurn: Readonly<Record<string, number>>
     
                                                                     
                                                                 
     
  readonly abilityFiredThisTurn?: Readonly<Record<string, true>>
     
                                             
                                          
                                                            
                                                      
     
  readonly enemyTargetedThisTurn?: Readonly<Record<string, TargetSourceTally>>
     
                                                        
                                                        
                                                            
     
  readonly chosenEnemyUnitThisTurn?: Readonly<Record<string, boolean>>
     
                                                       
                                                                            
                                                                     
                                                
     
  readonly drawnThisTurn?: Readonly<Record<string, number>>
     
                                                 
                                                                
                                                           
                                                                
                                                             
                                                
                                                          
     
  readonly damagedThisTurn?: Readonly<Record<string, true>>
     
                                                 
                                                                      
                                                           
                                                            
                                                                        
     
  readonly turnShields?: Readonly<Record<string, TurnShieldMarks>>
     
                                        
                                                     
                                                                                
                                                                            
     
  readonly delayedTriggers?: readonly DelayedTrigger[]
     
                                                    
                                              
                                                              
                                                                                   
     
  readonly nextUnitReady?: Readonly<Record<string, true>>
     
                                                         
                                             
                                         
                                        
                                   
                                            
                                                                           
                                                         
                                                          
                                                             
     
  readonly unitsEnterReadyThisTurn?: Readonly<Record<string, true>>
                                                            
                                                       
  readonly victoryConditions: readonly VictoryCondition[]
                                             
  readonly winner: PlayerId | null
                                                       
  readonly chain: readonly ChainItem[]
                                             
  readonly priority: PlayerId | null
                                                  
  readonly focus: PlayerId | null
                                                           
  readonly spellDuelActive: boolean
     
                                                  
                                                                       
                                                                       
                                                                            
                                                    
                                                 
     
  readonly duelBattlefield?: string
                                                                             
  readonly continuousEffects: readonly StaticEffect[]
                                                       
  readonly nextOid: number
                                                                                     
  readonly feprPasses: number
                                                                           
  readonly resolveChoices: Readonly<Record<string, string>>
     
                                 
    
                                                    
                                                                
                                               
                                  
    
                                                  
                                                   
                                                                    
                                                
                                           
    
                                         
                                    
                                                       
                                                   
                                                 
                                                     
     
  readonly ruleChoices: Readonly<Record<string, string>>
                                                                                    
  readonly extraRunesFirstSummon?: Readonly<Record<string, number>>
                                                 
  readonly mulliganQueue?: readonly PlayerId[]
                                                                                                  
  readonly battlefieldCards?: Readonly<Record<string, { readonly defId: string; readonly owner: PlayerId; readonly originalDefId?: string }>>
                                                          
                                                  
                                      
  readonly freeStandbyThisTurn?: readonly PlayerId[]
     
                                                          
                                                           
                                                                       
     
  readonly gearManaFreeThisTurn?: Readonly<Record<string, number>>
     
                                                    
    
                    
                                                  
                                       
                        
                                               
                                         
                                                    
     
  readonly cannotPlayCardsThisTurn?: readonly PlayerId[]
     
                                                       
                        
                               
                                                                
                                         
                                      
                                               
                                                               
                                                               
                                                
     
  readonly cannotPlaySpellsThisTurn?: readonly PlayerId[]
     
                                                      
                          
    
                                       
                                                                             
                                 
                                                
                                            
                                         
     
  readonly nextSpellDiscountThisTurn?: Readonly<Record<string, number>>
     
                                                                    
                                                
    
                         
                                                                                   
                                                                             
                                                                         
                                                                 
                                             
                                                            
                              
                                                     
     
  readonly nextCardDiscountThisTurn?: Readonly<Record<string, number>>
     
                                                          
                                                
                                                   
                                                        
                                                        
                               
     
  readonly nextSpellEchoThisTurn?: Readonly<Record<string, number>>
     
                                               
                                                                    
                                
                                                                   
                                                               
                                
     
  readonly nextUnitReadyBuffThisTurn?: Readonly<Record<string, number>>
     
                                         
                                                         
                                         
                                                              
                                                           
     
  readonly grantedRecursionThisTurn?: Readonly<Record<string, Cost>>
                                                       
                                                                                 
  readonly grantedConquerReturnThisTurn?: Readonly<Record<string, true>>
                                                              
                                                  
  readonly maxSpellManaThisTurn?: Readonly<Record<string, number>>
     
                                                   
                                                                               
                                                       
                                      
                                       
                                                    
                                      
     
  readonly chosenModesThisTurn?: Readonly<Record<string, readonly string[]>>
     
                                                     
                                                                     
                                                              
                                                           
                                     
                                                           
                                                         
                                              
     
  readonly pendingContests?: readonly PendingContest[]
     
                                           
                                          
                                                           
                      
                                             
                           
                                                                         
                                                                 
                                                                     
                                
     
  readonly battlefieldControl?: Readonly<Record<string, PlayerId | null>>
     
                                                             
                                   
                                                               
                                    
                                                         
                                                    
                                                     
     
  readonly playFromDiscardGrants?: Readonly<Record<string, Readonly<Record<string, number>>>>
     
                                                          
                                  
                                                        
                                 
                                               
                                                   
                                          
     
  readonly unitPlayCostUpThisTurn?: Readonly<Record<string, number>>
     
                                                    
                                                       
                                                                     
                                                   
                                                               
                                                 
     
  readonly holdsThisTurn?: Readonly<Record<string, number>>
     
                                                         
                                                     
                                                             
                                                  
                                                   
                                                 
     
  readonly pipsPaidThisTurn?: Readonly<Record<string, number>>
     
                                             
                                                                
                                               
                                                               
                                     
     
  readonly activatedThisTurn?: Readonly<Record<string, true>>
     
                                                  
                                                               
                                       
                                                            
                                                              
     
  readonly buffBonusThisTurn?: Readonly<Record<string, number>>
     
                                             
                                              
                                                     
                                          
                                                                            
                                                                              
     
  readonly spellDamageNegatedThisTurn?: true
     
                                                         
                                   
                 
                                                        
                                                           
                               
                                           
                                                     
                                                       
                                                                                     
                                                               
                                                                   
     
  readonly allyDiedInStartPhaseThisTurn?: Readonly<Record<string, true>>
     
                                                               
                                         
                                                                                          
                                                    
                                                    
                 
                                                 
                                            
                                                     
                                           
                                                                                  
                                                                                 
                                                             
                                                            
                                                                   
     
  readonly unitDestroyedThisTurn?: Readonly<Record<string, true>>
     
                                              
                                                              
                                              
                                                      
                             
                                                                             
                                                                     
                     
                                                                   
                                             
     
  readonly spellDamageBonus?: Readonly<Record<string, { readonly pending: number; readonly armed?: string }>>
                                                                    
  readonly pendingMainPhaseEnergy?: Readonly<Record<string, Readonly<Record<string, number>>>>
                                                         
  readonly lastCombat?: CombatSummary
     
                                              
                                                      
                                                         
                                              
     
  readonly banishLedger: Readonly<Record<string, readonly ObjId[]>>
     
                                                         
                                                        
                                                     
                                                     
                                                          
                                                                 
     
  readonly playLedger: Readonly<Record<string, readonly ObjId[]>>
     
                                                             
    
                                                                
                                           
                              
                                                             
                                                    
                                                        
                                     
     
  readonly delayedReturns?: readonly DelayedReturn[]
}

                                              
export interface DelayedReturn {
                                           
  readonly sourceDefId: string
                      
  readonly controller: PlayerId
                          
  readonly watch: PlayerId
                                        
  readonly card: ObjId
}

                                     
export interface CombatSummary {
  readonly battlefield: string
  readonly attacker: PlayerId
  readonly defender: PlayerId
                                             
  readonly attackerMight: number
  readonly defenderMight: number
  readonly units: readonly {
    readonly defId: string
    readonly side: 'attacker' | 'defender'
    readonly might: number
    readonly stunned: boolean
    readonly died: boolean
  }[]
                                         
  readonly outcome: 'attackerWins' | 'defenderWins' | 'noResult'
  readonly conquered: PlayerId | null
}

                                              
export function freshOid(state: GameState): { oid: ObjId; nextOid: number } {
  return { oid: `o${state.nextOid}` as ObjId, nextOid: state.nextOid + 1 }
}

function zoneKey(kind: ZoneKind, owner: PlayerId | null, index?: number): ZoneId {
  const ownerPart = owner ?? 'shared'
  return asZoneId(index === undefined ? `${kind}:${ownerPart}` : `${kind}:${ownerPart}:${index}`)
}

   
            
                                                                
                                                   
   
export function createInitialZones(
  players: readonly PlayerId[],
  battlefieldCount: number,
): Record<string, Zone> {
  const zones: Record<string, Zone> = {}
  const add = (z: Zone): void => {
    zones[z.id] = z
  }

                   
  add({ id: zoneKey('chain', null), kind: 'chain', owner: null, contents: [] })

                                     
  for (let i = 0; i < battlefieldCount; i++) {
    const bfId = zoneKey('battlefield', null, i)
    add({ id: bfId, kind: 'battlefield', owner: null, contents: [] })
    add({
      id: zoneKey('standby', null, i),
      kind: 'standby',
      owner: null,
      contents: [],
      parentBattlefield: bfId,
      capacity: STANDBY_DEFAULT_CAPACITY,
    })
  }

                                                          
  const perPlayerNonFielded = NON_FIELDED_KINDS.filter((k) => k !== 'chain')
  for (const p of players) {
    add({ id: zoneKey('base', p), kind: 'base', owner: p, contents: [] })
    add({ id: zoneKey('legend', p), kind: 'legend', owner: p, contents: [] })
    for (const kind of perPlayerNonFielded) {
      add({ id: zoneKey(kind, p), kind, owner: p, contents: [] })
    }
  }

  return zones
}

   
                               
                                                                   
   
export function createInitialState(
  players: readonly PlayerId[],
  battlefieldCount = 2,
): GameState {
  const first = players[0]
  if (first === undefined) throw new Error('至少需要一名玩家')
  const runePools: Record<string, RunePool> = {}
  const scores: Record<string, number> = {}
  const experience: Record<string, number> = {}
  for (const p of players) {
    runePools[p] = emptyRunePool()
    scores[p] = 0
    experience[p] = 0
  }
  return {
    players,
    activePlayer: first,
    phase: 'awaken',
    zones: createInitialZones(players, battlefieldCount),
    objects: {},
    runePools,
    scores,
    experience,
    winTarget: 8,
    turn: 1,
    turnsTaken: Object.fromEntries(players.map((p) => [p as string, p === first ? 1 : 0])),
    scoredBattlefieldsThisTurn: {},
    scoringTriggeredThisTurn: {},
    unitsConqueredThisTurn: [],
    confirmedThisTurn: {},
    victoryConditions: [],
    winner: null,
    chain: [],
    priority: null,
    focus: null,
    spellDuelActive: false,
    duelBattlefield: undefined, // ★与上一行严格成对(第七条闸逐处扫);建局时没有对决
    continuousEffects: [],
    banishLedger: {},
    playLedger: {},
    nextOid: 1,
    feprPasses: 0,
    resolveChoices: {},
    ruleChoices: {}, // ★1012 规则选择权待答表(独立于链,不随链结算清空)
  }
}

                                                          
export interface PendingContest {
  readonly battlefield: ZoneId
  readonly causedBy: PlayerId
  readonly wasOpen?: true
}

   
                                                               
                           
                                            
                                                                           
                                           
                                                
                                                 
   
                        
export const TURN_END_LEDGER_LIST_KEYS = [
  'freeStandbyThisTurn', // 游击战免费布置
  'cannotPlayCardsThisTurn', // §054 禁手只管【本回合】
  'cannotPlaySpellsThisTurn', // ★第374轮:法术专版
] as const satisfies readonly (keyof GameState)[]

                                                                       
export const TURN_END_LEDGER_RECORD_KEYS = [
  'nextSpellDiscountThisTurn', // 「本回合内下一个法术」的额度
  'nextCardDiscountThisTurn', // ★597 星界灵鹭:「本回合内下一张【卡牌】」的减费次数
  'playedCardCountThisTurn', // ★597 第二十四本:本回合打出过几张卡牌(判「首张」)
  'gearManaFreeThisTurn', // ★第421轮 杰斯:免装备法力费的许可
  'nextSpellEchoThisTurn', // 预时之门授予的回响
  'nextUnitReadyBuffThisTurn', // ★第443轮 娜美:「下一次打出单位」的授予
  'grantedRecursionThisTurn', // ★第445轮 凯南:临时[流转]授予
  'grantedConquerReturnThisTurn', // ★第456轮 冷酷追击:临时授予触发
  'maxSpellManaThisTurn', // ★第462轮 烬:单笔最大法术费
  'chosenModesThisTurn', // ★第487轮 厄斐琉斯族:「本回合内尚未选过的效果」(值是模式段清单)
  'chosenEnemyUnitThisTurn', // ★727 「本回合已选择过敌方单位」置旗(冰原饿狼)
  'spellDamageBonus', // 「下一个法术伤害+1」也是本回合的账(邪鸦魔典)
] as const satisfies readonly (keyof GameState)[]

                                                                
                                                                
                                

export function zonesByKind(state: GameState, kind: ZoneKind): Zone[] {
  return Object.values(state.zones).filter((z) => z.kind === kind)
}
