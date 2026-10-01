                          
  
                                                          
                                         
                               
  
                                                      
                                             
                                                  
                                             
                                         
import { setCardPassiveProvider, setBattlefieldPassiveProvider } from '../src/effects/cardPassives'
import { setExtraGrantsProvider } from '../src/effects/attachmentGrants'
import { setLastRitesRepeatsProvider } from '../src/keywords/lastRites'
import { setReactionGainProvider, setGrantedSpecProvider } from '../src/game/economy'
import { makeRng } from '../src/util/rng'
import {
  activeTriggers, handPlaySpecs, cardCost, cardKeywords, standbyAltCost, playSpecFor, activatedFor,
  cardKind, startStepHook, holdRepeats, conquerRepeats, lastRitesRepeats, scoringBonus, replaceDestroy, replaceDestroyCandidates,
  extraLethal, lastRitesEffect, lastRitesChoice, lastRitesBasePerform, costModsFor, abilityCostModsFor,
  cardDomains, entryReadyFor, entryDormantFor, replacementShieldsFor, cardPassives, bfCardPassives,
  battlefieldName,
  scoreBlockedAt, scoreBlockedAnywhere, playBannedFor, playBonusFor, summonRuneCapFor, extraPlayZonesFor, extraPlaySourcesFor,
  isArmamentDef, isPlainEquipmentDef, isPlainUnitDef, tokenEntersReadyFor, tokenSpawnDoublerFor,
  skipDrawPhaseFor, barrierIgnoredAt, combatImmuneAt, echoDiscountFor, deflectWaivedAt, deflectWaivedForCard, extraAmbushZonesFor,
  extraGrants, grantedSpec, scoreDrawInsteadAt, hasteGrantedBy, standardMoveSurchargeFor,
} from './registry'

let installed = false

   
                                             
                                   
   
export function installProviders(): void {
  if (installed) return
  installed = true
  setCardPassiveProvider(cardPassives)
  setExtraGrantsProvider(extraGrants)
  setLastRitesRepeatsProvider(lastRitesRepeats)
  setBattlefieldPassiveProvider(bfCardPassives)
                                                               
                                                                                 
                                                             
                                                                                       
  setReactionGainProvider(activatedFor)
                                                     
                                                                      
                                                                   
                                                                            
  setGrantedSpecProvider(grantedSpec)
}

                                         
export const DEMO_DEPS = { getTriggers: activeTriggers, handPlaySpecs }

   
                                             
                              
   
export function makeGameDeps(seed: number): ReturnType<typeof buildDeps> {
  return buildDeps(seed)
}

function buildDeps(seed: number) {
  return {
    ...DEMO_DEPS,
    cardCost, cardKeywords, standbyAltCost, playSpecFor, activatedFor, grantedSpec, cardKind,
    startStepHook, holdRepeats, conquerRepeats, scoringBonus, replaceDestroy, replaceDestroyCandidates, extraLethal,
    lastRitesEffect, lastRitesChoice, lastRitesBasePerform,
                                                                           
                                                        
    costModsFor, abilityCostModsFor, cardDomains, entryReadyFor, entryDormantFor, replacementShields: replacementShieldsFor,
    battlefieldName, // ★1118 §323.12 选场那一问的 label(引擎不认具体战场牌)
    scoreBlocked: scoreBlockedAt,
    scoreBlockedAnywhere, // ★1112 缺陷 89:玩家级「无法得分」禁令下沉到 gainPoint(燃尽送的分也归它管)
    scoreDrawInstead: scoreDrawInsteadAt,
    playBanned: playBannedFor,
    playBonusFor,
    summonRuneCap: summonRuneCapFor,
    extraPlayZones: extraPlayZonesFor,
    extraPlaySources: extraPlaySourcesFor,
    isArmament: isArmamentDef,
    isPlainEquipment: isPlainEquipmentDef,
    isPlainUnit: isPlainUnitDef,
    tokenEntersReady: tokenEntersReadyFor,
    tokenSpawnDoublerFor,
    skipDrawPhase: skipDrawPhaseFor,
    barrierIgnoredAt, combatImmuneAt, echoDiscountFor, deflectWaivedAt, deflectWaivedForCard,
    extraAmbushZones: extraAmbushZonesFor,
    standardMoveSurcharge: standardMoveSurchargeFor, // ★1101 缺陷 72
    hasteGrantedBy,
    rng: makeRng((seed ^ 0x9e3779b9) >>> 0),
  }
}
