                                                                  
                                                                            
                                                                                   

import { MINION } from './reprint-batch'
import type { Trigger } from '../../src/dsl/trigger'
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import { addCosts, type Cost } from '../../src/state/runePool'                                                                             
import type { GameEvent } from '../../src/loop/events'
import type { CostMod } from '../../src/game/costPipeline'
import { CARD_CATEGORIES, INDICATOR_DEFIDS } from '../cardCategories'
import { makeOgn292Trigger } from './spell-target-signal'
import { makeObeliskTrigger, makeGloryArenaTrigger } from './longtail-11'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { asZoneId } from '../../src/state/ids'
import { isEquipment } from '../../src/state/cardTypes'
import { attachedTo } from '../../src/state/attach'
import { makeBackAlleyBarTrigger } from './longtail-31'
import { makeGrandPlazaTrigger } from './longtail-34'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import type { ChoiceRequest } from '../../src/loop/chain'        
import { isUnit } from '../../src/state/cardTypes'
import { delayedTriggerId } from '../../src/effects/delayedTriggers'
import { canPayFromState, couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import { SAND_SOLDIER_TOKEN } from './token-spells'
import { returnToOwnerHand } from './enter-triggers-batch'
import { IS_HERO_UNIT } from '../heroTags'
import { compileEffect, effectHasHaste, effectHasteChoice, type CostSpec, type EffectCtx, type EffectSpec, type Op } from '../../src/dsl/effectSpec'                 
import { insightRecycleChoice, insightRecycled } from '../../src/keywords/insightChoice'
import { GOLD_TOKEN } from './gear-triggers'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { resolveSelector, type Selector } from '../../src/dsl/selector'
import { buffCount } from '../../src/keywords/buff'
import { controlledBattlefields, controlMap } from '../../src/state/battlefieldControl'
import { GRASS_BF_DEFID } from './UNL-195'                        
import { excessOf } from './excess-conquer'                  
import { WAR_HAWK_TOKEN } from './reprint-batch'                               
import { spawnTokenHasteChoice, spawnTokenHasteResolve, tokenHasteCost } from './spawn-token-haste'                                             
import { hasteKeyOf } from './haste-key'                                                       

const NO_SOURCE = null                  

                                                                   
                                                
                            
  
                          
                                           
                             
                                  
                                                 
                                                            
  
                                                              
                                                                
export const OGN_291_CARD_EFFECT =
  '当你征服此处时，查看主牌堆顶部的两张牌。你可以选择从这两张牌中回收任意数量的卡牌，并将其余的卡牌按任意顺序放回原处。'

const CANDLE_LOOK = 2            
const CANDLE_PREFIX = 'rec'                               

                                  
export function makeCandleTempleTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'insight',
      count: CANDLE_LOOK,
                                                   
      recycle: (ctx) => insightRecycled(ctx.chosen, CANDLE_PREFIX),
    }],
  })
  const itemId = `trig:OGN-291:${bfZoneId}:${controller}`
                                                                   
                                                                         
                                                         
  const ask = insightRecycleChoice({
    itemId, controller, look: CANDLE_LOOK, prefix: CANDLE_PREFIX,
    prompt: '烛光圣殿:从顶两张里选要回收的(可以一张都不选)',
    doneLabel: '够了,其余放回顶部',
  })
  return compileTrigger({
    id: `OGN-291:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'OGN-291',
    event: 'conquer', by: 'you',
                                                      
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    nextChoice: (state, _ev, chosen) => ask(state, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

                                                                
                                        
                                                      
                                                           
                                                                
  
                                              
                                                                                      
                                                  
                                                                
                                                                                   
                                                          
                                                                 
export const OGN_289_CARD_EFFECT =
  '当你征服此处时，选择最多两枚符文，并在本回合结束时，让它们变为活跃状态。'

                                                                  
export const OGN_289_MAX_RUNES = 2
const PEAK_PREFIX = 'peakRune'                    

                                    
export function peakRuneCandidates(state: GameState): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) => o.defId.startsWith('rune:') && state.zones[o.zone]?.kind === 'base')
    .map((o) => o.oid)
    .sort()
}

                                                 
export function makeMountainPeakTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const itemId = `trig:OGN-289:${bfZoneId}:${controller}`
  const ask = multiSelectChoice({
    itemId, controller, prefix: PEAK_PREFIX,
    prompt: '巨神峰之巅:选最多两枚符文(本回合结束时让它们变为活跃)',
    doneLabel: '够了,不再选',
    max: OGN_289_MAX_RUNES,
    candidates: (state) => peakRuneCandidates(state)
      .map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}@${state.objects[oid]?.zone ?? '?'}` })),
                                                                 
                                                               
                                                     
    isTarget: true,
  })
  return compileTrigger({
    id: `OGN-289:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'OGN-289',
    event: 'conquer', by: 'you',
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    nextChoice: (state, _ev, chosen) => ask(state, chosen),
    effect: (state, _ev, chosen): readonly GameEvent[] => {
                                              
      const alive = peakRuneCandidates(state)
      const picked = (multiSelectPicked(chosen ?? {}, PEAK_PREFIX) as readonly ObjId[])
        .filter((oid) => alive.includes(oid))
      if (picked.length === 0) return []                          
      return [{
        kind: 'delayedTrigger',
        add: {
                                                               
          id: delayedTriggerId('readyRunesAtTurnEnd', 'OGN-289', undefined, `${bfZoneId}:${controller}`),
          controller, sourceDefId: 'OGN-289',
          kind: 'readyRunesAtTurnEnd', targets: picked,
        },
      } as GameEvent]
    },
  }, NO_SOURCE, controller)
}

export const OGN_289: Card = {
  id: 'OGN-289', cardNo: 'OGN·289/298', name: '巨神峰之巅', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '征服此处时选最多两枚符文,本回合结束时让它们活跃(EXTRA_BF_TRIGGER_FACTORIES)' }],
}


                                                                 
                                                      
                                
  
                                                   
                                                                                    
                                  
                                              
                                                            
                                             
                                             
  
                                             
                                                 
                                                                            
                                                              
export const UNL_205_CARD_EFFECT =
  '当一名玩家打出法术时，该玩家可以选择让自己在此处控制的一名单位在本回合内S+1。'
                            
export const UNL_205_BONUS = 1

export function makeAbandonedHallTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'addMight', target: { ref: 'chosen', key: 'boost' },
      delta: UNL_205_BONUS, duration: 'thisTurn', id: `UNL-205:${bfZoneId}:${controller}`,
    }],
  })
  return compileTrigger({
    id: `UNL-205:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-205',
                                                           
                                                         
                                                                                 
                                                                
    event: 'spellResolved',
    by: 'any', // 「**一名**玩家」——谁打法术都算
                                           
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
    mayChoose: true, // 「可以选择」(㊵)
    choose: {
      key: 'boost',
      prompt: '废弃大厅:让自己在此处的一名单位本回合内战力+1',
                                                    
      selector: {
        type: 'unit', controller: 'you', isTarget: true,
        filter: (o) => (o.zone as string) === bfZoneId,
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

export const UNL_205: Card = {
  id: 'UNL-205', cardNo: 'UNL-205/219', name: '废弃大厅', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '任一玩家打出法术时该玩家可让自己在此处的一名单位本回合[S]+1(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

                                                                
                                                                              
                                                   
                                
  
                                                   
                                                    
                                                       
                                                
                                                     
                                                       
  
                                                                      
                                                                                     
                                                                    
                                                            
                                                       
  
                                                           
                                                                       
                                                   
                                                     
                                                       
  
                                                                   
                                                           
                                  
                                                                             
                                                                 
export const UNL_218_CARD_EFFECT =
  '当一名玩家在此处打出一名单位时，该玩家可以选择支付{{1}}，以此给予该单位{{增益}}。（未拥有增益的单位获得一个{{S}}+1增益。）'
                             
export const UNL_218_COST_MANA = 1

export function makeIdolValleyTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
    cost: { resource: { mana: UNL_218_COST_MANA } }, // 「支付{1}」——**法力**不是符能
    then: [{ op: 'grantBuff', target: { ref: 'eventSubject' } }], // 「给予**该单位**增益」
  })
  return compileTrigger({
    id: `UNL-218:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-218',
    event: 'playUnit',
    by: 'any', // 「**一名**玩家」——双方在此处打单位都算
    when: [
                                          
      { kind: 'eventPlayerIs', side: 'you' },
                                                                                      
                                                                          
                                                                            
                                                          
                                                   
      { kind: 'custom', test: (ev): boolean => (ev as { at?: string }).at === bfZoneId },
    ],
    mayChoose: true, // 「可以选择」(㊵)
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

export const UNL_218: Card = {
  id: 'UNL-218', cardNo: 'UNL-218/219', name: '偶像谷', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '任一玩家在此处打出单位时该玩家可付{1}给该单位增益(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

                                                                
                                         
                                       
  
                                          
                                                                                    
                                                                    
                                            
                                              
                                         
                              
export const UNL_219_CARD_EFFECT = '当你据守此处时，你的非指示物单位在本回合内的打出费用增加{{1}}。'

                             
export const UNL_219_RAISE = 1

                              
export function makeHaeliaVaultTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-219:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-219',
    event: 'hold', by: 'you',
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    effect: (): readonly GameEvent[] =>
      [{ kind: 'raiseUnitPlayCost', player: controller, amount: UNL_219_RAISE } as GameEvent],
  }, NO_SOURCE, controller)
}

   
                                                
                                                
                                                              
   
export function haeliaVaultCostMods(
  state: GameState, player: PlayerId, defId: string,
): readonly CostMod[] {
  const up = state.unitPlayCostUpThisTurn?.[player] ?? 0
  if (up <= 0) return []
                                                         
  if (CARD_CATEGORIES[defId] !== 'unit') return []
                                            
                                                               
                                                                     
                                                              
                                         
  if (INDICATOR_DEFIDS.has(defId)) return []
  return [{ kind: 'increase', part: 'mana', mana: up, source: 'UNL-219 海力亚秘库' }]
}

                                                                   
                                             
                           
  
                                                     
                                           
                                                                      
                                                  
                                                 
                                                           
                                                                              
  
                                      
                                                
                                                     
                                      
                                                           
                                                                   
export const OGN_286_CARD_EFFECT = '当你据守此处时，激活此处所有单位的征服效果。'

                                    
export const CONQUER_MIRROR_BF_DEFIDS: readonly string[] = ['OGN-286']

   
                                    
                                                             
                                         
   
export function conquerMirrorUnits(state: GameState): readonly ObjId[] {
  const zones = Object.entries(state.battlefieldCards ?? {})
    .filter(([, bc]) => CONQUER_MIRROR_BF_DEFIDS.includes(bc.defId))
    .map(([zid]) => zid)
  if (zones.length === 0) return []
  return Object.values(state.objects)
    .filter((o) => zones.includes(o.zone as string) && isUnit(o))
    .map((o) => o.oid)
}

export const OGN_286: Card = {
  id: 'OGN-286', cardNo: 'OGN·286/298', name: '清算人竞技场', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守此处时激活此处所有单位的征服效果(conquerMirrorUnits + 单向互映)' }],
}

                                                                    
                                             
                                   
  
                                                    
                                                              
                                                            
                                                                          
                                              
                                                              
  
                 
                                              
                                              
                                                 
                                                   
                                                                
export const VEN_166_CARD_EFFECT = '当战斗在此处开始时，进攻方和防守方各{{获得}}{{1}}。'

                              
export const VEN_166_MANA = 1

export function makeAshenThresholdTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-166:${bfZoneId}:${controller}`, rawId: true, sourceDefId: 'VEN-166',
    event: 'duelStart', by: 'any',
    when: [
      { kind: 'eventAtBattlefield', zone: bfZoneId }, // ②「此处」
                                                
      { kind: 'custom', test: (ev) => ev.kind === 'duelStart' && ev.combat === true && ev.attacker === controller },
    ],
    effect: (_state, ev): readonly GameEvent[] => {
      if (ev.kind !== 'duelStart' || ev.attacker === undefined || ev.defender === undefined) return []
                         
      return [
        { kind: 'gainResource', player: ev.attacker, mana: VEN_166_MANA } as GameEvent,
        { kind: 'gainResource', player: ev.defender, mana: VEN_166_MANA } as GameEvent,
      ]
    },
  }, NO_SOURCE, controller)
}

export const VEN_166: Card = {
  id: 'VEN-166', cardNo: 'VEN·166', name: '灰亡阈门', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '战斗在此处开始时攻防双方各获得{1}(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

                                                            
                                                 
                                                    
                                                      
                                                                                
                                                   
                                                      
export const SFD_214_CARD_EFFECT = '当你据守此处时，你可以选择支付{{A}}{{A}}{{A}}{{A}}，以此额外获得1分。'
                                                      
export const SFD_214_PIPS = 4
   
                                                                                    
                                                              
                                                  
                                                             
                                                                
                                                           
                                                             
                                          
                                                                      
                                                   
                                                       
                                                     
   
export const SFD_214_COST: Cost = { mana: 0, pips: Array.from({ length: SFD_214_PIPS }, () => []) }
export const SFD_214_POINTS = 1
export function makeEnergyHubTrigger(bfZoneId: string, controller: PlayerId): Trigger {
                                                         
                                                             
                                                           
                                                                    
                                                        
                                                       
                                                              
                                                              
                                                                    
                                     
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (): readonly GameEvent[] =>
        [{ kind: 'gainPoint', player: controller, amount: SFD_214_POINTS } as GameEvent],
    }],
  })
  return compileTrigger({
    id: `SFD-214:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'SFD-214',
    event: 'hold', by: 'you',
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' },
    {
                                                               
                                                       
                                                                     
                                                          
                                                                                       
                                                          
                                                                              
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean =>
        couldPayWithReactionGains(state, controller, SFD_214_COST),
    }],
    mayChoose: true, // ★1493【§383.3.a】开头那一问搬到**确认阶段**
                                                                   
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, SFD_214_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid: null, controller, ev, chosen: chosen ?? {} }),
  }, null, controller)
}
                                                            
                                                 
                                              
                                                                    
                                                          
export const UNL_216_CARD_EFFECT = '当你据守此处时，在本回合内，你的下一个法术获得等同于其基础费用的{{回响}}。'
export function makeAcademyTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-216:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-216',
    event: 'hold', by: 'you',
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    effect: (): readonly GameEvent[] =>
      [{ kind: 'grantNextSpellEcho', player: controller } as GameEvent],
  }, null, controller)
}
                                                            
                                                 
                                                    
                    
                                                                 
                                                   
                                       
                                                                    
export const OGN_281_CARD_EFFECT = '当你据守此处时，如果你的英雄区域已无英雄单位牌，则可以选择让该英雄从废牌堆中返回英雄区域。'

                                    
export function heroInMyDiscard(state: GameState, player: PlayerId): readonly string[] {
  return (state.zones[`discard:${player}`]?.contents ?? [])
    .filter((oid) => {
      const d = state.objects[oid]?.defId
      return d !== undefined && IS_HERO_UNIT[d] === true
    })
    .map((oid) => oid as string)
}

export function makeSanctifiedTombTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-281:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'OGN-281',
    event: 'hold', by: 'you',
    mayChoose: true, // 「可以选择」紧跟时机从句(§383.3.a)
    when: [
      { kind: 'eventAtBattlefield', zone: bfZoneId },
      { kind: 'eventPlayerIs', side: 'you' },
                                             
      { kind: 'custom', test: (_ev, state) => (state.zones[`heroZone:${controller}`]?.contents ?? []).length === 0 },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['hero'] !== undefined) return null
      const cands = heroInMyDiscard(state, controller)
      if (cands.length === 0) return null                            
      return { itemId: `OGN-281:${bfZoneId}:${controller}`, controller, key: 'hero',
        prompt: '圣化之墓:让英雄从废牌堆返回英雄区域',
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 回英雄区` })),
                                                                  
                                                                        
                                                                
        isTarget: true }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const hero = chosen?.['hero']
      if (hero === undefined || !state.objects[hero as ObjId]) return []
      return [{ kind: 'zoneChange', obj: hero as ObjId, to: `heroZone:${controller}` } as GameEvent]
    },
  }, null, controller)
}
export const OGN_281: Card = {
  id: 'OGN-281', cardNo: 'OGN·281/298', name: '圣化之墓', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守此处且英雄区空→可让英雄从废牌堆回英雄区(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

                                                            
                                                 
                                                      
                                           
                                                                               
                                                
                                                              
                                                                      
                                                                               
                                                        
export const SFD_221_CARD_EFFECT = '当你征服此处时，你可以选择让一件友方装备变为活跃状态。如果它是一件武装，则你可以选择将其卸除。'

                                                       
export function myGearOnField221(state: GameState, controller: PlayerId): readonly string[] {
  return Object.values(state.objects)
    .filter((o) => {
      const zk = state.zones[o.zone]?.kind
      return isEquipment(o) && o.controller === controller && (zk === 'base' || zk === 'battlefield')
    })
    .map((o) => o.oid as string)
}

export function makeMoonveilAltarTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-221:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'SFD-221',
    event: 'conquer', by: 'you',
    mayChoose: true, // 「可以选择」紧跟时机从句(§383.3.a,tomb448 同款)
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['gear'] === undefined) {
        const cands = myGearOnField221(state, controller)
        if (cands.length === 0) return null                     
        return { itemId: `trig:SFD-221:${bfZoneId}:${controller}`, controller, key: 'gear',
          prompt: '月帷祭坛:让哪件友方装备变为活跃状态?',
          candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 变活跃` })),
                                                                               
                                              
          isTarget: true }
      }
                                                   
      const g = state.objects[chosen['gear'] as ObjId]
      if (chosen['detach'] === undefined && g !== undefined && attachedTo(g) !== undefined) {
        return { itemId: `trig:SFD-221:${bfZoneId}:${controller}`, controller, key: 'detach',
          prompt: '月帷祭坛:它是一件武装 —— 是否将其卸除?',
          candidates: [{ id: 'yes', label: '卸除' }, { id: 'no', label: '保持贴附' }] }
      }
      return null
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const gear = chosen?.['gear']
      if (gear === undefined || !state.objects[gear as ObjId]) return []             
      const out: GameEvent[] = [{ kind: 'statusChange', target: gear as ObjId, key: 'tapped', value: false } as GameEvent]
                                                          
      if (chosen?.['detach'] === 'yes' && attachedTo(state.objects[gear as ObjId]) !== undefined) {
        out.push({ kind: 'detach', obj: gear as ObjId } as GameEvent)
      }
      return out
    },
  }, null, controller)
}
export const SFD_221: Card = {
  id: 'SFD-221', cardNo: 'SFD·221/221', name: '月帷祭坛', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '征服此处→可让友方装备变活跃;若是武装可再卸除(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

                                                            
                                                 
                                                                         
                                                                      
                                                
                             
                                           
                                                           
                                                  
                                                                               
                                         
                                                                                                          
export const SFD_207_CARD_EFFECT = '当你征服此处时，你可以选择支付{{1}}并让你在此处控制的一名单位返回其所属的手牌。若如此做，则在此处打出一名2{{S}}的“黄沙士兵”。'
export const SFD_207_COST = 1
                                                                   
export const SFD_207_BASE_COST: Cost = { mana: SFD_207_COST }
                                           
export const SFD_207_HASTE_KEY = hasteKeyOf('SFD-207:soldier')

   
                   
                                                                                      
                                                                      
                                                   
                                                                           
                                                         
                                                                          
                                                      
   
export function myUnitsAt207(state: GameState, bfZoneId: string, controller: PlayerId): readonly string[] {
  return unitsAtBattlefield(state, bfZoneId)
    .filter((oid) => state.objects[oid]?.controller === controller)
    .map((oid) => oid as string)
}

export function makeEmperorAltarTrigger(bfZoneId: string, controller: PlayerId): Trigger {
                                                            
                                                        
                             
                                                                         
                                                      
                                                               
                                                                          
                                                           
                                                                   
                                                       
                                                    
                                                            
                                                             
                                                                                             
                                                                                                       
                                                                                                    
  const specFor = (haste: boolean): EffectSpec => ({
                                                       
                                                             
                                                                               
                                                     
    guard: (ctx) => ctx.chosen['unit'] !== undefined
      && ctx.state.objects[ctx.chosen['unit'] as ObjId] !== undefined,
    cost: { resource: haste ? addCosts(SFD_207_BASE_COST, tokenHasteCost()) : SFD_207_BASE_COST },
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const unit = ctx.chosen['unit']
        if (unit === undefined || !ctx.state.objects[unit as ObjId]) return []                     
        return [
          ...returnToOwnerHand(ctx.state, unit),
          { kind: 'spawnToken', spec: SAND_SOLDIER_TOKEN, zone: asZoneId(bfZoneId), owner: controller, ...(haste ? { ready: true } : {}) } as GameEvent,
        ]
      },
    }],
  })
  const effectPlain = compileEffect(specFor(false))
  const effectHaste = compileEffect(specFor(true))
  return compileTrigger({
    id: `SFD-207:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'SFD-207',
    event: 'conquer', by: 'you',
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' },
    {
                                                               
                                                       
                                                                     
                                                          
                                                                                       
                                                          
                                                                      
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean =>
        couldPayWithReactionGains(state, controller, { mana: SFD_207_COST }),
    },
    {
                                                  
                                                           
                                                   
                                                      
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean =>
        myUnitsAt207(state, bfZoneId, controller).length > 0,
    }],
    mayChoose: true, // ★1494【§383.3.a】开头那一问搬到**确认阶段**
    nextChoice: (state, _ev, chosen) => {
      if (chosen['unit'] === undefined) {
        const cands = myUnitsAt207(state, bfZoneId, controller)
        if (cands.length === 0) return null
        return { itemId: `trig:SFD-207:${bfZoneId}:${controller}`, controller, key: 'unit',
          prompt: '帝王神坛:让此处哪名单位返回其所属的手牌?',
          candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 返手` })) }
      }
                                                                                            
                                                  
      if (state.objects[chosen['unit'] as ObjId] === undefined) return null
      return spawnTokenHasteChoice(state, controller, SAND_SOLDIER_TOKEN, { itemId: `trig:SFD-207:${bfZoneId}:${controller}`, key: SFD_207_HASTE_KEY, label: '黄沙士兵' }, chosen, SFD_207_BASE_COST)
    },
    effect: (state, ev, chosen) => {
      const c = chosen ?? {}
                                                                                                   
      const x = spawnTokenHasteResolve(state, controller, SAND_SOLDIER_TOKEN, SFD_207_HASTE_KEY, c, SFD_207_BASE_COST)
      return (x.ready ? effectHaste : effectPlain)({ state, selfOid: null, controller, ev, chosen: c })
    },
  }, null, controller)
}
export const SFD_207: Card = {
  id: 'SFD-207', cardNo: 'SFD·207/221', name: '帝王神坛', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '征服此处可付{1}+此处我控单位返手→此处出2S黄沙士兵(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

export const UNL_216: Card = {
  id: 'UNL-216', cardNo: 'UNL-216/219', name: '皮城学院', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守此处→本回合你下一个法术获得等费[回响](EXTRA_BF_TRIGGER_FACTORIES)' }],
}

export const SFD_214: Card = {
  id: 'SFD-214', cardNo: 'SFD·214/221', name: '能量枢纽', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守此处可付{4}额外得1分(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

                                    
import { makeUnl215Trigger, UNL_215 } from './once-per-turn'
import { makeRavenbloomAcademyTrigger } from './SFD-215'                           


                                                                 
                                        
                                                  
                                                
  
                                  
                                                           
                                                                     
                                        
                                            
                                                  
                           
                                                                    
                                         
                                                         
export const UNL_212_DAMAGE = 1

                                    
export function unitsAtBattlefield(state: GameState, bfZoneId: string): ObjId[] {
  return (state.zones[bfZoneId as never]?.contents ?? [])
    .filter((oid) => isUnit(state.objects[oid]))
}

                                        
export function makeFrostKeepTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-212:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-212',
    event: 'startPhase',
    by: 'you',
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
                                   
    additionalCondition: (state) => unitsAtBattlefield(state, bfZoneId).length > 0,
    effect: (state): readonly GameEvent[] =>
      unitsAtBattlefield(state, bfZoneId).map((oid) => ({
        kind: 'damage', target: oid, amount: UNL_212_DAMAGE, sourcePlayer: controller,
      } as GameEvent)),
  }, NO_SOURCE, controller)
}

                                                              
                                                     
                                                    
                                 
  
                                                        
                                                   
                                                                      
                                                  
                                                                
                                                                  
                                                          
export const UNL_211_CARD_EFFECT =
  '若此战场受你控制，当你打出一张法术牌时，如果消耗了不低于{{4}}法力，则进行{{洞察}}。'

                                                
export const LIBRARY_MANA_MIN = 4
const LIBRARY_LOOK = 1                   
const LIBRARY_PREFIX = 'librec'

                                             
export function makeLostLibraryTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'insight', count: LIBRARY_LOOK,
      recycle: (ctx) => insightRecycled(ctx.chosen, LIBRARY_PREFIX),
    }],
  })
  const itemId = `trig:UNL-211:${bfZoneId}:${controller}`
  const ask = insightRecycleChoice({
    itemId, controller, look: LIBRARY_LOOK, prefix: LIBRARY_PREFIX,
    prompt: '失落书库:洞察——顶部一张牌,可选择将其回收',
    doneLabel: '不回收,放回顶部',
  })
  return compileTrigger({
    id: `UNL-211:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-211',
                                                                                 
                                                                     
                                                               
    event: 'spellResolved', by: 'you',
    when: [{
      kind: 'custom',
                                                          
      test: (ev, state) => ((ev as { manaPaid?: number }).manaPaid ?? -1) >= LIBRARY_MANA_MIN
        && controlMap(state)[bfZoneId] === controller,
    }],
    nextChoice: (state, _ev, chosen) => ask(state, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

export const UNL_211: Card = {
  id: 'UNL-211', cardNo: 'UNL-211/219', name: '失落书库', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '受控时你打出实付不低于4法力的法术 ⇒ 洞察(makeLostLibraryTrigger,manaPaid 通道)' }],
}


                                                                  
                                                       
                                                               
                                                    
                                                               
                                                             
const GRASS_BACK_PICK = 'grassBack'

                                                   
export function makeGrassSwapBackTrigger(bfZoneId: string, player: PlayerId, event: 'conquer' | 'hold'): Trigger {
  return compileTrigger({
    id: `grass-back-${event}:${bfZoneId}:${player}`, rawId: true, sourceDefId: GRASS_BF_DEFID,
    event, by: 'you',
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    nextChoice: (state, _ev, chosen) => {
      if (chosen[GRASS_BACK_PICK] !== undefined) return null
      const cur = state.battlefieldCards?.[bfZoneId]
                                   
      if (cur === undefined || cur.originalDefId === undefined) return null
      return {
        itemId: `trig:grass-back-${event}:${bfZoneId}:${player}`, controller: player, key: GRASS_BACK_PICK,
        prompt: '草丛:得分后可将其换回原战场',
        candidates: [
          { id: 'back', label: '换回原战场' },
          { id: 'keep', label: '保持草丛' }, // 「可」= 可选
        ],
      }
    },
    effect: (state, _ev, chosen) => {
      if (chosen?.[GRASS_BACK_PICK] !== 'back') return []
      const cur = state.battlefieldCards?.[bfZoneId]
      if (cur === undefined || cur.originalDefId === undefined) return []
                                                                        
      return [{ kind: 'replaceBattlefieldCard', zoneId: asZoneId(bfZoneId), defId: cur.originalDefId, owner: cur.owner } as GameEvent]
    },
  }, NO_SOURCE, player)
}


                                                                        
                                                 
                                                    
                  
                                                              
                                                                  
                                                                            
                                                      
export const UNL_217_CARD_EFFECT =
  '当你征服此处时，如果你给敌方单位分配了不低于3点的过量伤害，则打出一名1{{S}}“战鹰”，它拥有{{法盾}}。'

                                         
export const HUNTING_EXCESS_MIN = 3

                                  
export const UNL_217_HASTE_KEY = hasteKeyOf('UNL-217:hawk')

                                           
export function makeHuntingGroundsTrigger(bfZoneId: string, player: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-217:${bfZoneId}:${player}`, rawId: true, sourceDefId: 'UNL-217',
    event: 'conquer', by: 'you',
    when: [
      { kind: 'eventAtBattlefield', zone: bfZoneId },
      { kind: 'eventPlayerIs', side: 'you' },
      { kind: 'custom', test: (_ev, state): boolean => excessOf(state as GameState, player) >= HUNTING_EXCESS_MIN },
    ],
                                                        
    postChoice: (state, chosen) => spawnTokenHasteChoice(state, player, WAR_HAWK_TOKEN, { itemId: `trig:UNL-217:${bfZoneId}`, key: UNL_217_HASTE_KEY, label: '战鹰' }, chosen),
    effect: (state, _ev, chosen): readonly GameEvent[] => {
                                                                        
      const x = spawnTokenHasteResolve(state, player, WAR_HAWK_TOKEN, UNL_217_HASTE_KEY, chosen)                                                            
      return [
        ...x.pre,
        { kind: 'spawnToken', spec: WAR_HAWK_TOKEN, zone: asZoneId(`base:${player}`), owner: player, ...(x.ready ? { ready: true } : {}) } as GameEvent,
        // ★1258【缺陷 160】这里【不再】手写补发 `playUnit` —— ★1154 起产地 `reduce.ts tokenPlaySignal` 已按 spawnToken 前后差集派生
        //   (带 `at` 落点、doubler 落两枚就派两条);卡自己再补一条就是【双发】,「当你打出一名单位时」的听众按一名单位收两次钱、给两次收益。
      ]
    },
  }, NO_SOURCE, player)
}

export const UNL_217: Card = {
  id: 'UNL-217', cardNo: 'UNL-217/219', name: '捕猎场', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你征服此处+单次过量≥3⇒打出一名带法盾1[S]战鹰(EXTRA_BF_TRIGGER_FACTORIES)' }],
}

export const EXTRA_BF_TRIGGER_FACTORIES: Readonly<Record<string, (bfZoneId: string, player: PlayerId) => readonly Trigger[]>> = {
  'token:草丛': (bf, p) => [makeGrassSwapBackTrigger(bf, p, 'conquer'), makeGrassSwapBackTrigger(bf, p, 'hold')], // ★712 草丛:得分后可选换回原战场(originalDefId)
  'UNL-217': (bf, p) => [makeHuntingGroundsTrigger(bf, p)], // ★721 捕猎场:你征服此处+过量≥3⇒打出带法盾战鹰
  'OGN-291': (bf, p) => [makeCandleTempleTrigger(bf, p)],
  'UNL-205': (bf, p) => [makeAbandonedHallTrigger(bf, p)], // 废弃大厅(★546):任一玩家打法术→该玩家可让自己此处一名单位本回合+1
  'UNL-218': (bf, p) => [makeIdolValleyTrigger(bf, p)], // ★616 偶像谷:任一玩家在此处打单位→该玩家可付{1}给该单位增益
  'OGN-289': (bf, p) => [makeMountainPeakTrigger(bf, p)], // 巨神峰之巅(第289轮)
  'UNL-212': (bf, p) => [makeFrostKeepTrigger(bf, p)], // 冰霜要塞(第336轮)
  'UNL-219': (bf, p) => [makeHaeliaVaultTrigger(bf, p)], // 海力亚秘库(第290轮)
  'VEN-166': (bf, p) => [makeAshenThresholdTrigger(bf, p)], // 灰亡阈门(第300轮):战斗在此处开始→攻防双方各获得{1}
  'SFD-214': (bf, p) => [makeEnergyHubTrigger(bf, p)], // 能量枢纽(第442轮):据守可付{4}额外得1分
                                                                
  'SFD-215': (bf, p) => [makeRavenbloomAcademyTrigger(bf, p)],
  'UNL-216': (bf, p) => [makeAcademyTrigger(bf, p)], // 皮城学院(第447轮):据守→下一个法术等费回响
  'OGN-281': (bf, p) => [makeSanctifiedTombTrigger(bf, p)], // 圣化之墓(第448轮):据守且英雄区空→英雄回归
  'UNL-211': (bf, p) => [makeLostLibraryTrigger(bf, p)], // ★686 失落书库:受控+打出实付不低于4法力的法术→洞察
  'SFD-207': (bf, p) => [makeEmperorAltarTrigger(bf, p)], // 帝王神坛(第452轮):征服付{1}+返手→出黄沙士兵
  'SFD-221': (bf, p) => [makeMoonveilAltarTrigger(bf, p)], // 月帷祭坛(第453轮):征服→友方装备变活跃+武装可卸除
                                       
  'OGN-292': (bf, p) => [makeOgn292Trigger(bf as never, p)],
                   
  'OGN-275': (bf, p) => [makeUnityAltarTrigger(bf, p)],      // 团结圣坛
  'OGN-283': (bf, p) => [makeNoxianArenaTrigger(bf, p)],     // 纳沃利角斗场
  'OGN-298': (bf, p) => [makeZaunTrenchTrigger(bf, p)],      // 祖安地沟
  'SFD-220': (bf, p) => [makeTreasureHoardTrigger(bf, p)],   // 珍宝堆
  'SFD-210': (bf, p) => [makeLegendHallTrigger(bf, p)],      // 传奇殿堂
  'UNL-207': (bf, p) => [makeRehearsalHallTrigger(bf, p)],   // 业余排练厅
  'VEN-162': (bf, p) => [makeAncientDesertTrigger(bf, p)],   // 藏古之漠
  'OGN-282': (bf, p) => [makeCivicMarketTrigger(bf, p)],    // 军民市场
  'OGN-287': (bf, p) => [makeRuneBazaarTrigger(bf, p)],     // 符文集市
  'SFD-212': (bf, p) => [makeWastelandTrigger(bf, p)],      // 弃土荒漠
  'SFD-217': (bf, p) => [makeSummitOutpostTrigger(bf, p)],  // 群峰哨站
  'SFD-218': (bf, p) => [makeBoneyardTrigger(bf, p)],       // 巨兽坟场
  'SFD-219': (bf, p) => [makeManaVeinTrigger(bf, p)],       // 符能矿脉
  'OGN-285': (bf, p) => [makeRaiderLaneTrigger(bf, p)],      // 劫掠船巷(第151轮)
                                            
  'OGN-284': (bf, p) => [makeObeliskTrigger(bf, p)],         // 力量方尖碑:额外召出一枚符文
  'OGN-290': (bf, p) => [makeGloryArenaTrigger(bf, p)],      // 荣耀竞技场:获得1分
                                                                   
  'OGN-277': (bf, p) => [makeBackAlleyBarTrigger(bf, p)],     // 后巷酒吧
  'OGN-293': (bf, p) => [makeGrandPlazaTrigger(bf, p)],       // 宏伟广场(第194轮):据守+此处≥7名我的单位 → 直接获胜
                                                 
                                                    
  'UNL-215': (bf, p) => [makeUnl215Trigger(bf, p)],
}

                                                    

                                                                          
                    
  
                                            
                                              
                                                                     
  
                           
                                              
                                                                                 
                                     
                                                                          

                                
export function hereTrigger(
  defId: string,
                                                              
  timing: 'conquer' | 'hold' | 'defend',
  bfZoneId: string,
  controller: PlayerId,
  spec: {
    readonly mayChoose?: boolean
    readonly choose?: { key: string; prompt: string; selector: Selector }
    readonly postChoice?: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null                                    
    readonly cost?: CostSpec
                                                                                                            
                                                                                                       
    readonly baseCost?: Cost
                                                                                           
                                                                                                  
                                                                                           
    readonly additionalCondition?: (state: GameState) => boolean
    readonly guard?: (ctx: EffectCtx) => boolean
    readonly then: readonly Op[]
  },
): Trigger {
  const effSpec: EffectSpec = {
    then: spec.then,
    ...(spec.cost ? { cost: spec.cost } : {}),
    ...(spec.guard ? { guard: spec.guard } : {}),
  }
  const baseCost = spec.baseCost
  const effect = compileEffect(effSpec)
  const haste = effectHasHaste(effSpec)                                                                             
  return compileTrigger({
    id: `${defId}:${bfZoneId}:${controller}`, rawId: true, sourceDefId: defId,
    event: timing, by: 'you',
    ...(spec.mayChoose ? { mayChoose: true } : {}),
                                                                                 
    ...(baseCost ? { basePerform: (state: GameState): GameState | null => { const paid = payFromState(state, controller, baseCost); return paid.ok ? paid.state : null } } : {}),
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    ...(spec.additionalCondition ? { additionalCondition: spec.additionalCondition } : {}), // ★1586 §383.2.a.1
    ...(spec.choose ? { choose: spec.choose } : {}),
    ...(spec.postChoice !== undefined || haste
      ? { postChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null =>
          spec.postChoice?.(state, chosen) ?? (haste ? effectHasteChoice(effSpec, state, controller, chosen) : null) }
      : {}), // ★749 透传;★1398 DSL 急速钩接在其后
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

                                                                    
                                     
                                       
                                                
export const OGN_275_CARD_EFFECT = '当你据守此处时，打出一名1S的“随从”到你的基地。'
                                       
export const OGN_275_HASTE_KEY = hasteKeyOf('OGN-275:minion')
export function makeUnityAltarTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('OGN-275', 'hold', bf, controller, {
    then: [{
      op: 'spawnToken',
      spec: MINION, // ㊼ 第314轮收口
      zone: (ctx) => `base:${ctx.controller}`,
      haste: { key: OGN_275_HASTE_KEY, label: '随从' }, // ★1398 缺陷 176 B4 · DSL 钩(样板:hereTrigger 壳)
    }],
  })
}

                                                                  
                            
                                              
                             
export const OGN_283_CARD_EFFECT = '当你据守此处时，给予此处的一名单位增益。'
export function makeNoxianArenaTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('OGN-283', 'hold', bf, controller, {
    choose: {
      key: 'unit', prompt: '纳沃利角斗场:给予此处的一名单位增益',
      selector: { type: 'unit', zone: 'battlefield', atEventBattlefield: true, isTarget: true },
    },
    then: [{ op: 'grantBuff', target: { ref: 'chosen', key: 'unit' } }],
  })
}

                                                                    
                              
                                                        
                                
export const OGN_298_CARD_EFFECT = '当你征服此处时，弃置一张手牌，然后抽一张牌。'
export function makeZaunTrenchTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('OGN-298', 'conquer', bf, controller, {
    choose: {
      key: 'card', prompt: '祖安地沟:弃置一张手牌', // 手牌是非公开区 ⇒ 不标 isTarget
      selector: { type: 'any', zone: 'hand', owner: 'you' },
    },
    then: [
      { op: 'moveTo', target: { ref: 'chosen', key: 'card' }, zone: (ctx) => `discard:${ctx.controller}` },
      { op: 'draw', count: 1 },
    ],
  })
}

                                                                     
                                                
                                            
                                                                                                          
                                                       
export const SFD_220_CARD_EFFECT = '当你征服此处时，你可以选择支付{{1}}，以此打出一个休眠的“金币”装备指示物。'
                                       
export const SFD_220_COST = { mana: 1 } as const
export function makeTreasureHoardTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-220', 'conquer', bf, controller, {
    mayChoose: true, // §383.3.a 开头「你可以选择」
    baseCost: SFD_220_COST, // ★1585:原 `cost: { resource: { mana: 1 } }`,搬到确认阶段
    then: [{ op: 'spawnToken', spec: GOLD_TOKEN, zone: (ctx) => `base:${ctx.controller}`, dormant: true }],
  })
}

                                                                    
                                           
                                               
                                                   
export const SFD_210_CARD_EFFECT = '当你征服此处时，你可以选择支付{{1}}，以此让你的传奇变为活跃状态。'
                                       
export const SFD_210_COST = { mana: 1 } as const
export function makeLegendHallTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-210', 'conquer', bf, controller, {
    mayChoose: true,
    baseCost: SFD_210_COST, // ★1585:原 `cost: { resource: { mana: 1 } }`,搬到确认阶段(§383.3.b);传奇选谁仍在结算期问
    choose: {
      key: 'legend', prompt: '传奇殿堂:让你的传奇变为活跃状态',
      selector: { type: 'legend', fielded: true, controller: 'you', isTarget: true },
    },
    then: [{ op: 'setStatus', target: { ref: 'chosen', key: 'legend' }, key: 'dormant', value: false }],
  })
}

                                                                   
                                     
                                                          
                                                
                                     
export const UNL_207_CARD_EFFECT = '当你据守此处时，你可以选择将战场上的一名单位移动到其基地。'
export function makeRehearsalHallTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('UNL-207', 'hold', bf, controller, {
    mayChoose: true,
    choose: {
      key: 'unit', prompt: '业余排练厅:把战场上的一名单位赶回其基地',
      selector: { type: 'unit', zone: 'battlefield', isTarget: true },
    },
    then: [{ op: 'moveToOwnBase', target: { ref: 'chosen', key: 'unit' } }],
  })
}

                                                                    
                                                     
                                           
                              
export const VEN_162_CARD_EFFECT =
  '当你征服此处时，如果你控制的符文数量不多于四枚，则你可以选择支付{{1}}，以此抽一张牌。'
export function makeAncientDesertTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('VEN-162', 'conquer', bf, controller, {
    mayChoose: true,
    cost: { resource: { mana: 1 } },
    guard: (ctx) => resolveSelector(
      ctx.state, { type: 'rune', fielded: true, controller: 'you' }, ctx.controller).length <= 4,
    then: [{ op: 'draw', count: 1 }],
  })
}

   
                     
                                           
                                                      
                                                           
                   
   
export const EXTRA_BF_DEFIDS: readonly string[] = Object.keys(EXTRA_BF_TRIGGER_FACTORIES)

                                                                          
                             
                                            
                                                                 
                               
                                                                          

                                                                    
                                   
                                                   
                                                          
                                             
                                                     
export const OGN_282_CARD_EFFECT = '当你征服此处时，你可以选择消耗一个增益，以此抽一张牌。'
export function makeCivicMarketTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('OGN-282', 'conquer', bf, controller, {
    mayChoose: true, // §383.3.a 开头「你可以选择」
    choose: {
      key: 'buffSrc', prompt: '军民市场:消耗一个增益,换抽一张牌',
      selector: { type: 'unit', fielded: true, controller: 'you', isTarget: true, filter: (o) => buffCount(o) > 0 },
    },
    guard: (ctx) => {
      const c = ctx.chosen['buffSrc']
      if (!c || c === 'skip') return false                                 
      return buffCount(ctx.state.objects[c as ObjId]) > 0
    },
    then: [
      { op: 'consumeBuff', target: { ref: 'chosen', key: 'buffSrc' }, by: { ref: 'controller' } }, // 费用在前
      { op: 'draw', count: 1 },                                                                     // 收益在后
    ],
  })
}

                                                                    
                         
                 
                                                       
                                                                   
                                                               
                                                                  
                                                         
                                                           
                                                    
                               
                                                    
                                                                          
                                                              
                                                         
                                                            
                                                    
                                                      
                                                                
                                                  
                               
                                                    
export const OGN_287_CARD_EFFECT = '当你征服此处时，你必须回收一枚你的符文。（此行动不会做出任何选择。）'
export function makeRuneBazaarTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('OGN-287', 'conquer', bf, controller, {
    choose: {
      key: 'rune', prompt: '符文集市:回收一枚你的符文',
                                                         
      selector: { type: 'rune', fielded: true, controller: 'you' }                                                   
    },
    then: [{
      op: 'custom',
      emit: (ctx) => {
        const r = ctx.chosen['rune']
                                                            
                                                          
        return r && r !== 'skip' ? [{ kind: 'recycle' as const, player: ctx.controller, objs: [r as ObjId] }] : []
      },
    }],
  })
}

                                                                    
                                 
                                                    
                                           
export const SFD_212_CARD_EFFECT = '当你征服此处时，将你主牌堆顶部的两张牌放入废牌堆。'
export function makeWastelandTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-212', 'conquer', bf, controller, {
    then: [{
      op: 'forEach',
      selector: { type: 'any', zone: 'mainDeck', owner: 'you', topOfDeck: 2 },
      then: [{ op: 'moveTo', target: { ref: 'each' }, zone: (ctx) => `discard:${ctx.controller}` }],
    }],
  })
}

                                                                    
                                     
                                        
                                                      
export const SFD_217_CARD_EFFECT = '当你征服此处时，你和盟友每控制一处其他战场，你便抽一张牌。'
export function makeSummitOutpostTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-217', 'conquer', bf, controller, {
    then: [{
      op: 'draw',
      count: (ctx) => controlledBattlefields(ctx.state, ctx.controller).filter((z) => z !== bf).length,
    }],
  })
}

                                                                    
                                                    
                                                  
                                 
                                       
                                                                               
                                                             
                                                             
                                                                                
                                                  
                                                                                    
                                                               
                                                                                         
export const SFD_218_CARD_EFFECT =
  '当你以强力单位征服此处时，你可以选择支付{{1}}来抽一张牌。'
                                       
export const SFD_218_COST = { mana: 1 } as const
                                                                                  
export function conqueredHereWithStrong(state: GameState, bf: string, controller: PlayerId): boolean {
  return resolveSelector(state, { type: 'unit', zone: 'battlefield', controller: 'you', minMight: 5 }, controller)
    .some((oid) => state.objects[oid]?.zone === bf)
}
export function makeBoneyardTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-218', 'conquer', bf, controller, {
    mayChoose: true,
    baseCost: SFD_218_COST, // ★1586:原 `cost: { resource: { mana: 1 } }`(结算期)
    additionalCondition: (state) => conqueredHereWithStrong(state, bf, controller), // ★1586:原 `guard`(结算期复验,读 atEventBattlefield 不分敌我)
    then: [{ op: 'draw', count: 1 }],
  })
}

                                                                    
                              
                                                  
                                                                    
                                                  
                                 
export const SFD_219_CARD_EFFECT = '当你据守此处时，每名玩家召出一枚休眠的符文。'
export function makeManaVeinTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('SFD-219', 'hold', bf, controller, {
    then: [{
      op: 'custom',
      emit: (ctx) => ctx.state.players.map((p) => ({
        kind: 'summonRune' as const, player: p, count: 1, dormant: true,
      })),
    }],
  })
}

                                                               
                                     
                                                      
                                                  
                                                                    
                                                                           
export const OGN_285_CARD_EFFECT = '当你防守此处时，你可以选择将此处的一名友方单位移动到基地。'
export function makeRaiderLaneTrigger(bf: string, controller: PlayerId): Trigger {
  return hereTrigger('OGN-285', 'defend', bf, controller, {
    mayChoose: true, // §383.3.a 开头「你可以选择」
    choose: {
      key: 'unit', prompt: '劫掠船巷:把此处的一名友方单位移动到基地',
      selector: { type: 'unit', zone: 'battlefield', atEventBattlefield: true, controller: 'you', isTarget: true },
    },
    then: [{ op: 'moveToOwnBase', target: { ref: 'chosen', key: 'unit' } }],
  })
}
