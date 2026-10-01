                                                                
  
                                                                           
                                                              
                                  
                                                                 
  
                                   
                                                                   
                                                                        
                                        
                                                                                         
                                           
  
                                          
                                                     
                                                              
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import { resolveImplDefId } from '../variantAlias'                                  
import { lastRitesTextDefId } from '../../src/keywords/lastRites'                     
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { DeathSnapshot } from '../../src/keywords/lastRites'
import { enemyUnitsOnField } from './enemy-move'
import { ghostMotherCandidates, ghostMotherCost, unitDestinations, handPlayCandidates, soulEaterCost, playFromEffectChoice, optionalExtraResolve, playUnitExtras, unitDestinationResolve } from './play-from-deck'                                                  
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'
import { opponentsOf } from './OGN-156'
import { playBannedFor } from './longtail-12'                                                                               
import { unitLastRitesHasteChoice } from './last-rites-units'                                                                                                      

                                                                          
                          
  
                                                            
                                                         
                                                           
                                                
                                                          
                                                  
                                             
                                                                      
export const OGN_178_DISCARD = 2
                                               
export const OGN_178_KEYS: readonly string[] = ['lr178d1', 'lr178d2']

                                
export function lastRitesDiscardCandidates(
  state: GameState, player: PlayerId, chosen: Readonly<Record<string, string>>,
): readonly ObjId[] {
  const taken = new Set(OGN_178_KEYS.map((k) => chosen[k]).filter((x): x is string => x !== undefined))
  const hand = state.zones[`hand:${player}` as ZoneId]?.contents ?? []
  return hand.filter((oid) => !taken.has(oid as string))
}

                                                                         
                           
  
                                                             
                                               
                                           
export const UNL_067_DAMAGE = 4
export const UNL_067_KEY = 'lr067target'

                            
const CHOICE_ROWS: Readonly<Record<string, (snap: DeathSnapshot, itemId: string, state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null>> = {
  'OGN-178': (snap, itemId, state, chosen) => {
    for (const key of OGN_178_KEYS) {
      if (chosen[key] !== undefined) continue
      const cands = lastRitesDiscardCandidates(state, snap.controller, chosen)
      if (cands.length === 0) return null                      
      return {
        itemId,
        controller: snap.controller,
        key,
        prompt: `卧底特工:弃置手牌(第 ${OGN_178_KEYS.indexOf(key) + 1} / ${OGN_178_DISCARD} 张)`,
        candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
      }
    }
    return null
  },
  'SFD-165': (snap, itemId, state, chosen) => {
    const base = { itemId, controller: snap.controller }
                                   
    if (chosen[SFD_165_PICK] === undefined) {
      const cands = ghostMotherCandidates(state, snap.controller)
        .filter((oid) => unitDestinations(state, snap.controller, undefined, state.objects[oid as ObjId]?.defId).length > 0)                      
      if (cands.length === 0) return null                              
      return {
        ...base, key: SFD_165_PICK,
        prompt: '戈拉斯克调酒师:从废牌堆免费打出一名单位?(费用不高于3且符能不超过1)',
                                                                                
        isTarget: true,
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
          { id: SFD_165_SKIP, label: '不打出' },
        ],
      }
    }
                                                                                                          
                                                                                                           
    const pick = chosen[SFD_165_PICK]
    if (pick === undefined || pick === SFD_165_SKIP) return null
    const pickDefId = state.objects[pick as ObjId]?.defId ?? ''
    return playFromEffectChoice(state, snap.controller, pickDefId, { ...base, key: SFD_165_TO, prompt: '戈拉斯克调酒师:把它打出到哪里?' }, chosen, ghostMotherCost())
  },
  'UNL-179': (snap, itemId, state, chosen) => {
    const picked = chosen[UNL_179_PICK]
    if (picked !== undefined) {
                                                                                                         
                                                                                                          
                                                                                                       
                                                        
      const pickDefId = state.objects[picked as ObjId]?.defId ?? ''
      return playFromEffectChoice(state, snap.controller, pickDefId, {
        itemId, controller: snap.controller, key: UNL_179_TO, prompt: '峡谷先锋:打出到你的基地',
      }, { ...chosen, [UNL_179_TO]: `base:${snap.controller}` }, soulEaterCost(pickDefId))
    }
                                                                                      
                                                                                 
    const cands = handPlayCandidates(state, snap.controller)
      .filter((oid) => !playBannedFor(state, snap.controller, state.objects[oid]?.defId ?? '', `base:${snap.controller}`, oid as string))
    if (cands.length === 0) return null                                 
    return {
      itemId, controller: snap.controller, key: UNL_179_PICK,
      prompt: '峡谷先锋:从手牌打出一名单位到你的基地(免法力费用,符能照付)',
      candidates: cands.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
    }
  },
                                                              
  'UNL-062': (snap, itemId, state, chosen) => insightRecycleChoice({
    itemId, controller: snap.controller, look: UNL_062_LOOK, prefix: UNL_062_PREFIX,
    prompt: '戏精远见家·洞察2:从顶两张里选要回收的(可以一张都不选)',
  })(state, chosen),
                                             
                                      
  'UNL-053': (snap, itemId, state, chosen) => {
    if (chosen[UNL_053_FOE] !== undefined) return null
    const foes = opponentsOf(state, snap.controller)
    if (foes.length === 0) return null                    
    return {
      itemId, controller: snap.controller, key: UNL_053_FOE,
      prompt: '迅捷蟹:选择一名对手(展示其手牌,本回合可查看其待命的正面朝下卡牌)',
                                                                  
                                                                            
                                         
      isTarget: true,
      candidates: foes.map((p) => ({ id: p, label: p })),
    }
  },
  'UNL-067': (snap, itemId, state, chosen) => {
    if (chosen[UNL_067_KEY] !== undefined) return null
    const foes = enemyUnitsOnField(state, snap.controller)
    if (foes.length === 0) return null                  
    return {
      itemId,
      controller: snap.controller,
      key: UNL_067_KEY,
      prompt: `破败大鲨炮:对一名敌方单位造成 ${UNL_067_DAMAGE} 点伤害`,
      isTarget: true, // ★1777 §355.7:卡文(上游 UNL-067)「{{绝念>}} 对**一名敌方单位**造成4点伤害」是效果的对象
      candidates: foes.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
    }
  },
}

                                                                     
                                                           
  
                                                    
                                             
                                                                                       
                                         
                                                 
                                                                   
                                    
                                                          
                                                     
                                                                         
                                                        
  
                                
                                                                               
                                                        
                                                                  
                                                                   
                                                            
                                                                  
                                                           
export const UNL_179_PICK = 'lr179pick'
                                                                                                   
export const UNL_179_TO = 'lr179to'

                                                                        
                                                     
                        
  
                                              
                                                    
                                            
                                                                                            
                                                
                                          
                                                                 
                                                                        
                                                      
  
                                
                                             
                                                               
                                
                                                 
                                                  
                                                        
                                       
                                                         
                                             
                                          
export const UNL_053_FOE = 'lr053foe'
                            
export const UNL_053_EXP = 1

export const UNL_062_LOOK = 2               
                                                                    
export const UNL_062_PREFIX = 'lr062rec'

export const SFD_165_PICK = 'lr165pick'
export const SFD_165_TO = 'lr165to'
export const SFD_165_SKIP = 'skip'

                         
const EFFECT_ROWS: Readonly<Record<string, (snap: DeathSnapshot, chosen: Readonly<Record<string, string>>, state?: GameState) => readonly GameEvent[]>> = {
  'OGN-178': (snap, chosen) => {
    const picked = OGN_178_KEYS.map((k) => chosen[k]).filter((x): x is string => x !== undefined)
                              
    const discards = picked.map((oid): GameEvent => ({
      kind: 'zoneChange', obj: oid as ObjId, to: `discard:${snap.controller}` as ZoneId,
    } as GameEvent))
                                                  
    return [...discards, { kind: 'draw', player: snap.controller, count: OGN_178_DISCARD } as GameEvent]
  },
  'SFD-165': (snap, chosen, state) => {
    const pick = chosen[SFD_165_PICK]
                                         
                                              
                                                         
                                                  
    if (pick === undefined || pick === SFD_165_SKIP) return []
                                                     
                                                           
    if (state === undefined) return []
    if (!ghostMotherCandidates(state, snap.controller).includes(pick as ObjId)) return []
                                                                                                     
    const defId = state.objects[pick as ObjId]?.defId ?? ''
    const cost = ghostMotherCost()
    const x = optionalExtraResolve(state, snap.controller, defId, SFD_165_TO, chosen, cost)
    const dest = unitDestinationResolve(state, snap.controller, defId, chosen[SFD_165_TO], x.grant)
    if (dest === undefined) return []
    return [...x.preRest, {
      kind: 'playUnit',
      unit: pick as ObjId, // 会被 §419.3 分支重写成落地后的新 oid
      player: snap.controller,
      play: { card: pick as ObjId, to: dest, cost, ...playUnitExtras(x) },
    } as GameEvent, ...x.post]
  },
  'UNL-179': (snap, chosen, state) => {
    const pick = chosen[UNL_179_PICK]
    if (pick === undefined) return []
                                                   
    if (state === undefined) return []
    if (!handPlayCandidates(state, snap.controller).includes(pick as ObjId)) return []
    const defId = state.objects[pick as ObjId]?.defId
    if (defId === undefined) return []
    if (playBannedFor(state, snap.controller, defId, `base:${snap.controller}`, pick)) return []                                 
                                                                                                                
                                                                                                  
    const cost = soulEaterCost(defId)
    const x = optionalExtraResolve(state, snap.controller, defId, UNL_179_TO, chosen, cost)
    return [...x.preRest, {
      kind: 'playUnit',
      unit: pick as ObjId,
      player: snap.controller,
                                                             
      play: { card: pick as ObjId, to: `base:${snap.controller}` as ZoneId, cost, ...playUnitExtras(x) },
    } as GameEvent, ...x.post]
  },
  'UNL-053': (snap, chosen, state) => {
                                                         
    const exp = {
      kind: 'gainResource', player: snap.controller, experience: UNL_053_EXP,
    } as GameEvent
    const foe = chosen[UNL_053_FOE]
    if (foe === undefined) return [exp]
                                           
    if (state === undefined) return [exp]
    if (!opponentsOf(state, snap.controller).includes(foe)) return [exp]
                                            
                                             
    const hand = state.zones[`hand:${foe}` as ZoneId]?.contents ?? []
    return [
      {
        kind: 'grantVision', viewer: snap.controller,
        cards: hand,
                                                               
                                                 
        faceDownOf: [foe as PlayerId],
      } as GameEvent,
      exp,
    ]
  },
  'UNL-062': (snap, chosen) => [{
                                                    
                                                                    
                                                         
                                                             
                                                         
    kind: 'insight', player: snap.controller, count: UNL_062_LOOK,
    recycle: insightRecycled(chosen, UNL_062_PREFIX),
  } as GameEvent],
  'UNL-067': (snap, chosen) => {
    const target = chosen[UNL_067_KEY]
                                                    
                                      
                                                       
                                                       
    return target === undefined
      ? []
      : [{
          kind: 'damage', target: target as ObjId, amount: UNL_067_DAMAGE,
          sourcePlayer: snap.controller,
        } as GameEvent]
  },
}

                       
export const LAST_RITES_CHOICE_DEFIDS: readonly string[] = Object.keys(CHOICE_ROWS).sort()

                                                                                             
export function lastRitesChoiceOf(
  snapshot: DeathSnapshot, itemId: string, state: GameState, chosen: Readonly<Record<string, string>>,
): ChoiceRequest | null {
                                                           
                                                  
                                                                              
                                                                   
  const tid4 = lastRitesTextDefId(snapshot)
  const row = tid4 === undefined ? undefined : CHOICE_ROWS[resolveImplDefId(tid4, (x) => x in CHOICE_ROWS)]
                                                                                                                                             
                                                                                               
  return row === undefined ? unitLastRitesHasteChoice(snapshot, itemId, state, chosen) : row(snapshot, itemId, state, chosen)
}

   
                           
                                                    
                                                            
   
export function lastRitesChoiceEffect(
  snap: { readonly defId?: string; readonly copiedDefId?: string; readonly controller: PlayerId }, // ★1216 第四份影子结构:也要带规则文本身份
  chosen?: Readonly<Record<string, string>>,
  state?: GameState,
): readonly GameEvent[] {
                                                               
                                      
  const tid5 = lastRitesTextDefId(snap)
  const row = tid5 === undefined
    ? undefined
    : EFFECT_ROWS[resolveImplDefId(tid5, (x) => x in EFFECT_ROWS)]
  if (row === undefined || chosen === undefined) return []
  return row(snap as DeathSnapshot, chosen, state)
}

                                                                            
import type { Card } from '../../src/dsl/card'
import { LAST_RITES } from '../../src/keywords/lastRites'

export const OGN_178_CARD_EFFECT = '{{绝念}}—弃置两张手牌，然后抽两张牌。（当我被摧毁后，发动此效果。）'
export const UNL_067_CARD_EFFECT = '{{绝念>}} 对一名敌方单位造成4点伤害。（当我被摧毁后，发动此效果。）'

export const OGN_178: Card = {
  id: 'OGN-178', cardNo: 'OGN·178/298', name: '卧底特工', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]弃两张然后抽两张(LAST_RITES_CHOICE)' }],
}
export const UNL_067: Card = {
  id: 'UNL-067', cardNo: 'UNL-067/219', name: '破败大鲨炮', category: 'unit',
  domains: ['blue'], energy: 6, power: 6, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]对一名敌方单位造成4点伤害(LAST_RITES_CHOICE)' }],
}
                                                                             
export const SFD_165_CARD_EFFECT = '{{绝念}} — 你可以选择从你的废牌堆中打出一名费用不高于{{3}}且不高于{{A}}的单位，无视其费用。（当我被摧毁后，发动此效果。）'

export const SFD_165: Card = {
  id: 'SFD-165', cardNo: 'SFD·165/221', name: '戈拉斯克调酒师', category: 'unit',
  domains: ['yellow'], energy: 5, power: 5, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]可从废牌堆免费打出一名费用≤3且符能≤1的单位(LAST_RITES_CHOICE)' }],
}

                                                                             
export const UNL_062_CARD_EFFECT =
  '{{绝念>}} {{洞察2}}。（当我被摧毁时，查看主牌堆顶部的两张牌。你可以将其中任意卡牌回收，并将其余的卡牌按任意顺序放回原处。）'

export const UNL_062: Card = {
  id: 'UNL-062', cardNo: 'UNL-062/219', name: '戏精远见家', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[绝念]洞察2(LAST_RITES_CHOICE + insightRecycleChoice)' }],
}

export const LAST_RITES_CHOICE_CARDS: readonly Card[] = [OGN_178, UNL_067, SFD_165, UNL_062]
