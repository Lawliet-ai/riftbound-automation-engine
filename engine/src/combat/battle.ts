                                                                      
                                                          
                                                                                    

import type { GameState } from '../state/gameState'
import type { PlayerId, ObjId, ZoneId } from '../state/ids'
import type { GameObject } from '../state/object'
import { effectiveMight } from '../state/might'
import { moveObjectInState } from '../state/mutations'
import { applyEvents, destroyedEventsFrom, noteDestroyedLedgers, type ReduceDeps } from '../loop/reduce'
import { runCleanupToFixpoint, takeDestroyed } from '../loop/cleanup'
import { assignDamage, pendingDamageOrder, damageOrderKey, parseDamageOrder, type DamageTarget, type DamageOrderAsk } from './damageAssign'
import { isUnit } from '../state/cardTypes'
import { removeMisplacedStandby } from '../state/recall'
import { writeControl, loseUncontrolledBattlefields, controlMap } from '../state/battlefieldControl'
import { assignBattleRoles, canDealCombatDamage, type BattleContext } from './battleRoles'
import { recomputeContinuous } from '../effects/continuousView'
import type { GameEvent } from '../loop/events'
import { turnShieldsOf } from '../effects/turnShields'
import { currentKeywords } from '../state/object'                           

export type CombatOutcome = 'attackerWins' | 'defenderWins' | 'noResult'

export interface CombatResult {
  readonly state: GameState
  readonly outcome: CombatOutcome
                                                   
  readonly conquer: { readonly player: PlayerId; readonly battlefield: string; readonly wasUncontrolled?: boolean } | null
     
                                      
                                            
                                     
     
  readonly participants: readonly ObjId[]
     
                                                        
                                                    
                                                         
                                                      
                                        
     
  readonly deaths: readonly GameEvent[]
}

function unitsOf(state: GameState, bf: string, player: PlayerId): GameObject[] {
  const z = state.zones[bf as ZoneId]
  if (!z) return []
                                                        
                                                          
                                                        
  return z.contents
    .map((oid) => state.objects[oid])
    .filter((o): o is GameObject => !!o && o.controller === player && isUnit(o))
}

function keywordsOf(o: GameObject): readonly string[] {
  return currentKeywords(o)
}

   
                                                       
                                                             
                                                          
   
export function lethalNeededOf(raw: number, absorb: number, doubled: boolean): number {
  if (doubled && absorb === 0) return Math.max(1, Math.ceil(raw / 2))
  return raw + absorb
}

   
                                                        
                                                       
                                              
   
export function toTargets(
  units: readonly GameObject[],
  ignoreBarrier = false,
  immuneAt?: (oid: ObjId) => boolean,
     
                                                            
                                         
                                                              
                                          
                                              
                                                                              
                                                               
                                                               
                                                        
     
  absorbAt?: (oid: ObjId) => number,
     
                                                                  
                                                              
                                                                      
                                                                           
                 
                                                                   
     
  doubleAt?: (oid: ObjId) => boolean,
): DamageTarget[] {
  return units.map((o) => ({
    oid: o.oid,
                                                                    
    lethalNeeded: lethalNeededOf(Math.max(1, effectiveMight(o).reference - o.damage), absorbAt?.(o.oid) ?? 0, doubleAt?.(o.oid) === true),
    barrier: !ignoreBarrier && keywordsOf(o).includes('壁垒'),
    backline: keywordsOf(o).includes('后排'),
                                                      
                                   
    immune: immuneAt?.(o.oid) === true,
  }))
}

function sumMight(units: readonly GameObject[]): number {
                                   
                                                   
                                          
                                                               
  return units.reduce(
    (acc, o) => acc + (o.status.stunned || !canDealCombatDamage(o) ? 0 : effectiveMight(o).reference),
    0,
  )
}

                                    
const cleanupHooks = { referenceMight: (_s: GameState, o: GameObject) => effectiveMight(o).reference }

                                                         
function combatCleanupHooks(ctx: BattleContext): typeof cleanupHooks & {
  assignBattleRoles: (s: GameState) => GameState
  loseUncontrolledBattlefields: (s: GameState) => GameState
  recallAndRemoveMisplaced: (s: GameState) => GameState
} {
  return {
    ...cleanupHooks,
    assignBattleRoles: (s: GameState) => assignBattleRoles(s, ctx),
                                                        
                                                                         
                                                                
    loseUncontrolledBattlefields: (s: GameState) => loseUncontrolledBattlefields(s, ctx.battlefield as string),
                                                
                                                               
                                                      
                                                            
    recallAndRemoveMisplaced: (s: GameState) => removeMisplacedStandby(s, (st, bf) => controlMap(st)[bf] ?? null),
  }
}

   
                                                               
                            
   
   
                                                                 
                                                                
                                                                       
   
export function openCombat(
  state: GameState,
  battlefield: string,
  attacker: PlayerId,
): { state: GameState; defendEvents: readonly GameEvent[]; defender: PlayerId } {
  const defender = state.players.find((p) => p !== attacker)
  if (!defender) throw new Error('需要防守方')
                                                                              
  let s: GameState = { ...state, spellDuelActive: true, duelBattlefield: battlefield, focus: attacker, priority: attacker }                   
                                                             
                              
  s = assignBattleRoles(s, { battlefield: battlefield as ZoneId, attacker })
                                                
                                                                    
  s = recomputeContinuous(s)
  const defUnits = unitsOf(s, battlefield, defender)
  const atkUnits = unitsOf(s, battlefield, attacker)
                                                          
                                        
                                                                
                                                                   
                                                                
                                                                  
                                                                        
                                                        
                                          
  const defendEvents: GameEvent[] = [
    { kind: 'duelStart', battlefield, combat: true, attacker, defender }, // ★第300轮:这一支【是战斗】
                                                 
                                                     
                                                    
                                                              
                                                          
                                          
                                                                      
                                                            
    ...(atkUnits.length > 0
      ? [{ kind: 'attack', player: attacker, battlefield, responsible: [attacker] } as GameEvent] : []),
                                           
                                                            
                                                                   
                                                                          
    ...atkUnits.map((u): GameEvent => ({ kind: 'attack', unit: u.oid, battlefield, responsible: [attacker] } as GameEvent)),
                                                             
    ...(defUnits.length > 0
      ? [{ kind: 'defend', player: defender, battlefield, responsible: [defender] } as GameEvent] : []),
                                      
    ...defUnits.map((u): GameEvent => ({ kind: 'defend', unit: u.oid, battlefield, responsible: [defender] } as GameEvent)),
  ]
  return { state: s, defendEvents, defender }
}

   
                                                        
                                        
   

                                                           
export interface CombatDamageOrderAsk extends DamageOrderAsk {
  readonly assigner: PlayerId
  readonly battlefield: string
  readonly key: string
}

   
                                                   
  
                                                                  
                                                
                                                          
                        
                                               
   
export function pendingCombatDamageOrder(
  state: GameState,
  battlefield: string,
  attacker: PlayerId,
  defender: PlayerId,
  deps: ReduceDeps = {},
): CombatDamageOrderAsk | null {
  const atkUnits = unitsOf(state, battlefield, attacker)
  const defUnits = unitsOf(state, battlefield, defender)
  if (atkUnits.length === 0 || defUnits.length === 0) return null                      
  const immuneAt = deps.combatImmuneAt ? (oid: ObjId): boolean => deps.combatImmuneAt!(state, oid) : undefined
                                                               
  const absorbAt = (oid: ObjId): number => turnShieldsOf(state, oid).absorb ?? 0
  const doubleAt = (oid: ObjId): boolean => turnShieldsOf(state, oid).doubleDamage === true                
  const sides = [
    { assigner: attacker, total: sumMight(atkUnits), victims: defUnits, ignores: deps.barrierIgnoredAt?.(state, attacker, battlefield) === true },
    { assigner: defender, total: sumMight(defUnits), victims: atkUnits, ignores: deps.barrierIgnoredAt?.(state, defender, battlefield) === true },
  ]
  for (const side of sides) {
    const key = damageOrderKey(battlefield, side.assigner)
    const ask = pendingDamageOrder(side.total, toTargets(side.victims, side.ignores, immuneAt, absorbAt, doubleAt), parseDamageOrder(state.ruleChoices[key]))
    if (ask) return { ...ask, assigner: side.assigner, battlefield, key }
  }
  return null
}

export function runCombatDamageAndResolve(
  state: GameState,
  battlefield: string,
  attacker: PlayerId,
  defender: PlayerId,
  deps: ReduceDeps = {},
): CombatResult {
  return damageAndResolve(state, battlefield, attacker, defender, deps)
}

export function runCombat(
  state: GameState,
  battlefield: string,
  attacker: PlayerId,
  deps: ReduceDeps = {},
): CombatResult {
  const defender = state.players.find((p) => p !== attacker)
  if (!defender) throw new Error('需要防守方')

                                                                  
  let s: GameState = openCombat(state, battlefield, attacker).state

                                          
  return damageAndResolve(s, battlefield, attacker, defender, deps)
}

                                                                          
function damageAndResolve(
  state: GameState,
  battlefield: string,
  attacker: PlayerId,
  defender: PlayerId,
  deps: ReduceDeps,
): CombatResult {
  let s = state
  const deaths: GameEvent[] = []
  const atkUnits = unitsOf(s, battlefield, attacker)
  const defUnits = unitsOf(s, battlefield, defender)
                                       
                                                     
  const participants = [...atkUnits, ...defUnits].map((u) => u.oid)
  if (atkUnits.length > 0 && defUnits.length > 0) {
                                             
                                                  
                                                    
    const atkIgnores = deps.barrierIgnoredAt?.(s, attacker, battlefield) === true
    const defIgnores = deps.barrierIgnoredAt?.(s, defender, battlefield) === true
    const immuneAt = deps.combatImmuneAt ? (oid: ObjId): boolean => deps.combatImmuneAt!(s, oid) : undefined
    const absorbAt = (oid: ObjId): number => turnShieldsOf(s, oid).absorb ?? 0                         
    const doubleAt = (oid: ObjId): boolean => turnShieldsOf(s, oid).doubleDamage === true                           
                                                                           
                                                          
                                           
    const atkKey = damageOrderKey(battlefield, attacker)
    const defKey = damageOrderKey(battlefield, defender)
    const atkOrder = parseDamageOrder(s.ruleChoices[atkKey])
    const defOrder = parseDamageOrder(s.ruleChoices[defKey])
                                 
                                                                         
                                                          
                                                     
                                                        
                                                 
    if (s.ruleChoices[atkKey] !== undefined || s.ruleChoices[defKey] !== undefined) {
      const rest = { ...s.ruleChoices }
      delete rest[atkKey]
      delete rest[defKey]
      s = { ...s, ruleChoices: rest }
    }
    const atkAssign = assignDamage(sumMight(atkUnits), toTargets(defUnits, atkIgnores, immuneAt, absorbAt, doubleAt), atkOrder)             
    const defAssign = assignDamage(sumMight(defUnits), toTargets(atkUnits, defIgnores, immuneAt, absorbAt, doubleAt), defOrder)             
                             
    const damageEvents: GameEvent[] = []
                                                            
                                        
                                                               
                                            
    for (const [oid, amt] of atkAssign) {
                                                              
      damageEvents.push({ kind: 'damage', target: oid as ObjId, amount: amt, sourcePlayer: attacker, combat: true })
    }
    for (const [oid, amt] of defAssign) {
      damageEvents.push({ kind: 'damage', target: oid as ObjId, amount: amt, sourcePlayer: defender, combat: true })
    }
    const dealt = applyEvents(s, damageEvents, deps)
    s = dealt.state
    deaths.push(...dealt.events.filter((e) => e.kind === 'destroyed'))
  }
  s = { ...s, spellDuelActive: false, duelBattlefield: undefined, focus: null }                             

                     
                                                     
                                              
  s = runCleanupToFixpoint(s, combatCleanupHooks({ battlefield: battlefield as ZoneId, attacker }))                 
                                                           
                                                          
  const cleanupDeaths = destroyedEventsFrom(takeDestroyed())
  deaths.push(...cleanupDeaths)
                                                     
                                                   
  s = noteDestroyedLedgers(s, cleanupDeaths)
                            
  s = { ...s, objects: Object.fromEntries(Object.entries(s.objects).map(([id, o]) => [id, o.damage ? (({ damagedBy: _db, ...rest }) => ({ ...rest, damage: 0 }))(o) : o])) }                       
                                          
  const defAfter = unitsOf(s, battlefield, defender)
  const atkAfter = unitsOf(s, battlefield, attacker)
  let recalled = false
  if (defAfter.length > 0 && atkAfter.length > 0) {
    for (const u of atkAfter) s = moveObjectInState(s, u.oid, `base:${attacker}` as ZoneId)              
    recalled = true
  }

                  
  const defFinal = unitsOf(s, battlefield, defender)
  const atkFinal = unitsOf(s, battlefield, attacker)
  let outcome: CombatOutcome
  if (recalled || (defFinal.length > 0 && atkFinal.length > 0) || (defFinal.length === 0 && atkFinal.length === 0)) {
    outcome = 'noResult'            
  } else if (atkFinal.length > 0) {
    outcome = 'attackerWins'
  } else {
    outcome = 'defenderWins'
  }

                                                         
                                                             
                                                                
  s = assignBattleRoles(s, null)
  s = { ...s, continuousEffects: s.continuousEffects.filter((e) => e.duration !== 'thisCombat') }            
                                                              
  s = recomputeContinuous(s)

                                                   
  let conquer: CombatResult['conquer'] = null
  if (outcome !== 'noResult') {
    const winnerUnits = atkFinal.length > 0 ? attacker : defender
                                                                  
                                                          
                                                   
                                                         
                                                          
                                                             
                                                               
    const priorCtrl = s.battlefieldControl?.[battlefield]
                                                                                            
                                                                         
    conquer = priorCtrl === winnerUnits ? null : { player: winnerUnits, battlefield, ...(priorCtrl === null ? { wasUncontrolled: true } : {}) }            
    s = writeControl(s, battlefield, winnerUnits)                               
  } else if (!recalled && defFinal.length === 0 && atkFinal.length === 0) {
                                                     
                                                               
                                                            
    s = writeControl(s, battlefield, null)
  }

  return { state: s, outcome, conquer, participants, deaths }               
}
