                                        
  
                                                
                                            
                                     
  
                                             
                                             
                               
                                                        

import { hereOf } from './here-of'                            
import { SAND_SOLDIER_TOKEN } from './token-spells'
import { MINION, WAR_HAWK_TOKEN } from './reprint-batch'
import { topOfDeck } from '../../src/keywords/insight'
import { voidSproutChoice, voidSproutRecycleEvents, VOID_SPROUT_KEY } from './SFD-018'        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasHaste, effectHasteChoice, type Op, type EffectCtx, type EffectSpec } from '../../src/dsl/effectSpec'                 
import type { Selector } from '../../src/dsl/selector'
import type { Cost } from '../../src/state/runePool'
import { couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import { applyEvents } from '../../src/loop/reduce'
import { effectiveMight } from '../../src/state/might'
import { isEmpowered } from '../../src/keywords/empower'
import { GOLD_TOKEN } from './gear-triggers'
import { buffCount } from '../../src/keywords/buff'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { hasAnyCardTag, objectHasCardTag } from '../cardTagQuery'
import { ANIMAL_TAGS } from './animal-tags'
import { resolveSelector } from '../../src/dsl/selector'
import type { GameState } from '../../src/state/gameState'
import type { ChoiceRequest } from '../../src/loop/chain'                                   
import { hasteKeyOf } from './haste-key'                                     
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../cardCosts'                                                       
import { isToken } from '../../src/state/cardTypes'

                                          
function playTrigger(
  id: string,
  selfOid: ObjId,
  controller: PlayerId,
  spec: { readonly choose?: { key: string; prompt: string; selector: Selector }
        ; readonly then: readonly Op[]
        // 「如果…则…」这类前置条件(§359.3.e 结算时判):不满足就整条不执行
        ; readonly guard?: (ctx: EffectCtx) => boolean
        // ★1398 透传(★749 bfTrigger / hereTrigger 同款;rekSai679 记档翻正):问后追加问
        ; readonly postChoice?: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null },
): Trigger {
  const effSpec: EffectSpec = { then: spec.then, ...(spec.guard ? { guard: spec.guard } : {}) }
  const effect = compileEffect(effSpec)
                                                                                                                      
                                   
  const haste = effectHasHaste(effSpec)
  return compileTrigger({
    id,
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】时」——队友被打出不算
    ...(spec.choose ? { choose: spec.choose } : {}),
    ...(spec.postChoice !== undefined || haste
      ? { postChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null =>
          spec.postChoice?.(state, chosen) ?? (haste ? effectHasteChoice(effSpec, state, controller, chosen) : null) }
      : {}),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                              
                    
export const VEN_048_CARD_EFFECT = '当你打出我时，抽一张牌。'
export function makeCloudDrakeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('VEN-048-draw', selfOid, controller, { then: [{ op: 'draw', count: 1 }] })
}
export const VEN_048: Card = {
  id: 'VEN-048', cardNo: 'VEN·048', name: '云端亚龙', category: 'unit',
  domains: ['blue'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时抽一张(makeCloudDrakeTrigger)' }],
}

                                                              
                                       
                                                   
                                                          
                                                  
                                                               
                                                
                                                                  
                                                                               
                                                                              
                                                         
                                                                
                                                                 
                                                                                
export const OGN_051_CARD_EFFECT = '当你打出我时，眩晕一名单位。'
export function makeSunShieldTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-051-stun', selfOid, controller, {
    choose: { key: 'unit', prompt: '烈阳盾卫:眩晕一名单位', selector: { type: 'unit', fielded: true, isTarget: true } },
    then: [{ op: 'stun', target: { ref: 'chosen', key: 'unit' } }],
  })
}
export const OGN_051: Card = {
  id: 'OGN-051', cardNo: 'OGN·051/298', name: '烈阳盾卫', category: 'unit',
  domains: ['green'], energy: 3, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时眩晕一名单位(makeSunShieldTrigger)' }],
}

                                                              
                            
                                      
export const OGN_132_CARD_EFFECT = '当你打出我时，让另一名单位变为活跃状态。'
export function makeFirstMateTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-132-ready', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '大副:让另一名单位变为活跃状态',
      selector: { type: 'unit', fielded: true, excludeSelf: true, isTarget: true },
    },
    then: [{ op: 'setStatus', target: { ref: 'chosen', key: 'unit' }, key: 'dormant', value: false }],
  })
}
export const OGN_132: Card = {
  id: 'OGN-132', cardNo: 'OGN·132/298', name: '大副', category: 'unit',
  domains: ['orange'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让另一名单位变为活跃(makeFirstMateTrigger)' }],
}

                                                             
                                          
export const OGN_234_CARD_EFFECT = '当你打出我时，摧毁一名敌方单位。'
export function makeDragonKnightTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-234-destroy', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '龙骑兵:摧毁一名敌方单位',
      selector: { type: 'unit', fielded: true, controller: 'opponent', isTarget: true },
    },
                                                              
                                                      
    then: [{ op: 'destroy', target: { ref: 'chosen', key: 'unit' } }],
  })
}
export const OGN_234: Card = {
  id: 'OGN-234', cardNo: 'OGN·234/298', name: '龙骑兵', category: 'unit',
  domains: ['yellow'], energy: 8, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时摧毁一名敌方单位(makeDragonKnightTrigger)' }],
}

                                                                          
                                           
                                                           
                                                                          

                                          
function simpleTrigger(
  id: string,
  event: 'playUnit' | 'attack' | 'conquer' | 'hold',
  selfOid: ObjId,
  controller: PlayerId,
  spec: { readonly choose?: { key: string; prompt: string; selector: Selector }; readonly then: readonly Op[] },
): Trigger {
  const effect = compileEffect({ then: spec.then })
  return compileTrigger({
    id,
    event,
    by: 'you',
                                                    
                                                                   
    when: [event === 'conquer' || event === 'hold'
      ? { kind: 'selfAtEventBattlefield' }
      : { kind: 'subjectIsSelf' }],
    ...(spec.choose ? { choose: spec.choose } : {}),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                            
function buffMightThisTurn(id: string, delta: number): Op {
  return { op: 'addMight', target: { ref: 'chosen', key: 'unit' }, delta, duration: 'thisTurn', id }
}

                                                          
                                                 
export const OGN_082_CARD_EFFECT = '当你打出我时，让一名单位本回合内{{S}}+8。'
export function makeAzureGuardianTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('OGN-082-buff', 'playUnit', selfOid, controller, {
    choose: { key: 'unit', prompt: '苍炎守护者:让一名单位本回合内战力+8', selector: { type: 'unit', fielded: true, isTarget: true } },
    then: [buffMightThisTurn('OGN-082-buff', 8)],
  })
}
export const OGN_082: Card = {
  id: 'OGN-082', cardNo: 'OGN·082/298', name: '苍炎守护者', category: 'unit',
  domains: ['green'], energy: 8, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让一名单位本回合[S]+8(makeAzureGuardianTrigger)' }],
}

                                                              
                                           
export const VEN_026_CARD_EFFECT = '当你打出我时，给予一名单位在本回合内{{S}}+3。'
export function makeWarbandTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('VEN-026-buff', 'playUnit', selfOid, controller, {
    choose: { key: 'unit', prompt: '战地乐团:给予一名单位本回合战力+3', selector: { type: 'unit', fielded: true, isTarget: true } },
    then: [buffMightThisTurn('VEN-026-buff', 3)],
  })
}
export const VEN_026: Card = {
  id: 'VEN-026', cardNo: 'VEN·026', name: '战地乐团', category: 'unit',
  domains: ['green'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时给一名单位本回合[S]+3(makeWarbandTrigger)' }],
}

                                                         
                                 
export const OGN_092_CARD_EFFECT = '当你打出我时，对战场上的一名敌方单位造成6点伤害。'
export function makeSharkCannonTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('OGN-092-damage', 'playUnit', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '怒海大鲨炮:对战场上一名敌方单位造成6点伤害',
      selector: { type: 'unit', zone: 'battlefield', controller: 'opponent', isTarget: true },
    },
    then: [{ op: 'damage', target: { ref: 'chosen', key: 'unit' }, amount: 6 }],
  })
}
export const OGN_092: Card = {
  id: 'OGN-092', cardNo: 'OGN·092/298', name: '怒海大鲨炮', category: 'unit',
  domains: ['blue'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时对一名敌方单位造成6点伤害(makeSharkCannonTrigger)' }],
}

                                                               
                                  
                                                            
export const SFD_158_CARD_EFFECT = '当你打出我时，摧毁一名不高于3{{S}}的敌方单位。'
export function makeQuicksandTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('SFD-158-destroy', 'playUnit', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '流沙术士:摧毁一名战力不高于 3 的敌方单位',
      selector: { type: 'unit', fielded: true, controller: 'opponent', maxMight: 3, isTarget: true },
    },
    then: [{ op: 'destroy', target: { ref: 'chosen', key: 'unit' } }],
  })
}
export const SFD_158: Card = {
  id: 'SFD-158', cardNo: 'SFD·158/221', name: '流沙术士', category: 'unit',
  domains: ['yellow'], energy: 5, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时摧毁一名≤3[S]的敌方单位(makeQuicksandTrigger)' }],
}

                                                             
                                                           
export const OGN_136_CARD_EFFECT = '当你打出我时，给予另一名友方单位增益。'
export function makeArenaRookieTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('OGN-136-buff', 'playUnit', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '竞技场新人:给予另一名友方单位增益',
                                                  
                                                                
                                                   
                                                               
                                          
                                                                 
      selector: { type: 'unit', fielded: true, controller: 'you', excludeSelf: true, isTarget: true },
    },
    then: [{ op: 'grantBuff', target: { ref: 'chosen', key: 'unit' } }],
  })
}
export const OGN_136: Card = {
  id: 'OGN-136', cardNo: 'OGN·136/298', name: '竞技场新人', category: 'unit',
  domains: ['orange'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时给另一名友方单位增益(makeArenaRookieTrigger)' }],
}

                                                          
                               
                                                                     
                                                                         
export const OGN_130_CARD_EFFECT = '当我进攻时，对此处的一名敌方单位造成1点伤害。'
export function makeSharpshooterTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('OGN-130-damage', 'attack', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '神射海盗:对此处一名敌方单位造成1点伤害',
      selector: { type: 'unit', controller: 'opponent', zone: 'battlefield', atSelfZone: true, isTarget: true },
    },
    then: [{ op: 'damage', target: { ref: 'chosen', key: 'unit' }, amount: 1 }],
  })
}
export const OGN_130: Card = {
  id: 'OGN-130', cardNo: 'OGN·130/298', name: '神射海盗', category: 'unit',
  domains: ['orange'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时对此处一名敌方单位造成1点伤害(makeSharpshooterTrigger)' }],
}

                                                             
                             
export const VEN_020_CARD_EFFECT = '当我进攻时，让另一名友方单位变为活跃状态。'
export function makeTwilightDancerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('VEN-020-ready', 'attack', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '暮光狂舞者:让另一名友方单位变为活跃状态',
      selector: { type: 'unit', fielded: true, controller: 'you', excludeSelf: true, isTarget: true },
    },
    then: [{ op: 'setStatus', target: { ref: 'chosen', key: 'unit' }, key: 'dormant', value: false }],
  })
}
export const VEN_020: Card = {
  id: 'VEN-020', cardNo: 'VEN·020', name: '暮光狂舞者', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时让另一名友方单位变为活跃(makeTwilightDancerTrigger)' }],
}

                                                           
                                     
                                                                               
export const UNL_027_CARD_EFFECT = '当我征服一处战场时，让一名友方单位本回合内{{S}}+8。'
export function makeSkySingerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('UNL-027-buff', 'conquer', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '天声玄龙:让一名友方单位本回合战力+8',
      selector: { type: 'unit', fielded: true, controller: 'you', isTarget: true },
    },
    then: [buffMightThisTurn('UNL-027-buff', 8)],
  })
}
export const UNL_027: Card = {
  id: 'UNL-027', cardNo: 'UNL-027/219', name: '天声玄龙', category: 'unit',
  domains: ['red'], energy: 8, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '征服时让一名友方单位本回合[S]+8(makeSkySingerTrigger)' }],
}

                                                                          
                          
                                
                                                           
                                       
                                                                          

                                                               
                                                                             
                                  
                                              
                                
export const OGN_188_CARD_EFFECT = '当你打出我时，让另一名单位从战场上返回其所属的手牌。'
export function makeZaunBouncerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('OGN-188-bounce', 'playUnit', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '祖安保镖:让另一名单位从战场返回其所属的手牌',
      selector: { type: 'unit', zone: 'battlefield', excludeSelf: true, isTarget: true },
    },
    then: [{ op: 'bounceToOwnerHand', target: { ref: 'chosen', key: 'unit' } }],
  })
}
export const OGN_188: Card = {
  id: 'OGN-188', cardNo: 'OGN·188/298', name: '祖安保镖', category: 'unit',
                                                                             
  domains: ['purple'], energy: 4, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时把另一名单位弹回其所属手牌(makeZaunBouncerTrigger)' }],
}

                                                              
                               
                                                         
export const OGN_165_CARD_EFFECT = '当你打出我时，让一名单位从你的废牌堆返回手牌。'
export function makeSpiritHoundTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('OGN-165-recover', 'playUnit', selfOid, controller, {
    choose: {
      key: 'card', prompt: '牧灵犬:让一名单位从你的废牌堆返回手牌',
      selector: { type: 'unit', zone: 'discard', owner: 'you', isTarget: true }, // ★1769 §355.9.a 举例逐字:「从你的废牌堆中回收一名单位」即指定为目标(废牌堆是公开区 §355.10.a.1)
    },
    then: [{ op: 'bounceToOwnerHand', target: { ref: 'chosen', key: 'card' } }],
  })
}
export const OGN_165: Card = {
  id: 'OGN-165', cardNo: 'OGN·165/298', name: '牧灵犬', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时从废牌堆回收一名单位(makeSpiritHoundTrigger)' }],
}

                                                              
                               
export const SFD_061_CARD_EFFECT = '当你打出我时，让一件装备从你的废牌堆返回手牌。'
export function makeApprenticeEngineerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return simpleTrigger('SFD-061-recover', 'playUnit', selfOid, controller, {
    choose: {
      key: 'card', prompt: '见习工程师:让一件装备从你的废牌堆返回手牌',
      selector: { type: 'equipment', zone: 'discard', owner: 'you', isTarget: true }, // ★1769 同上
    },
    then: [{ op: 'bounceToOwnerHand', target: { ref: 'chosen', key: 'card' } }],
  })
}
export const SFD_061: Card = {
  id: 'SFD-061', cardNo: 'SFD·061/221', name: '见习工程师', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时从废牌堆回收一件装备(makeApprenticeEngineerTrigger)' }],
}

                                                                          
                                  
                                                        
                                                   
                                               
                      
  
                                                             
                                                                          

                                                            
export const OGN_164: Card = {
  id: 'OGN-164', cardNo: 'OGN·164/298', name: '瑟提', category: 'unit',
  domains: ['orange'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出/征服时给我增益;消耗我的增益换本回合战力(buff-consumers.ts)' }],
}

                                                         
export const OGN_230: Card = {
  id: 'OGN-230', cardNo: 'OGN·230/298', name: '阿不思·菲罗斯', category: 'unit',
  domains: ['yellow'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可消耗任意数量增益,每个召一枚休眠符文(buff-consumers.ts)' }],
}

   
                                          
                                              
                                             
                                                       
                                     
   
export const VEN_188: Card = {
  id: 'VEN-188', cardNo: 'VEN·188', name: '梅尔', category: 'unit',
  domains: ['purple'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '变为已强化时放逐一名≤3[S]敌方单位(VEN-110.ts)' }],
}

                                                                          
                          
                                                                     
                                  
                                                       
                                                                          

                                                             
                                            
                                                       
                                                                  
                                                                                        
                                                  
export const UNL_137_CARD_EFFECT = '当我进攻时，你可以选择支付{{1}}，将此处的一名敌方单位移动到其基地。'
                                                                     
export const UNL_137_COST: Cost = { mana: 1 }
export function makeSpookyPoroTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                
                                                 
                                                             
                                                              
                                                     
                                                                    
                                                                      
  const effect = compileEffect({
    then: [{ op: 'moveToOwnBase', target: { ref: 'chosen', key: 'unit' } }],
  })
  return compileTrigger({
    id: 'UNL-137-push', event: 'attack', by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'subjectIsSelf' },
                                                                
                                           
                                                              
                                                                       
                                                                     
                                                    
                                                               
      { kind: 'custom', test: (_ev, state) => couldPayWithReactionGains(state, controller, UNL_137_COST) },
    ],
    choose: {
      key: 'unit', prompt: '悚悚魄罗:支付 1 法力把此处一名敌方单位赶回基地',
      selector: { type: 'unit', controller: 'opponent', zone: 'battlefield', atSelfZone: true, isTarget: true },
    },
                                                                   
                                                                  
                                                                          
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, UNL_137_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_137: Card = {
  id: 'UNL-137', cardNo: 'UNL-137/219', name: '悚悚魄罗', category: 'unit',
  domains: ['purple'], energy: 2, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时可付{1}把此处敌方单位赶回基地(makeSpookyPoroTrigger)' }],
}

                                                             
                                        
                                             
                                                        
                                              
                                                          
export const SFD_128_CARD_EFFECT = '当我防守时，你可以选择摧毁我，以此将一名进攻方单位移动到其基地。'
export function makeSuperFanTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'moveToOwnBase', target: { ref: 'chosen', key: 'unit' } }, // 收益(费用已在确认阶段付掉)
    ],
  })
  return compileTrigger({
    id: 'SFD-128-push', event: 'defend', by: 'you',
    mayChoose: true,
                                                               
    basePerform: (state, _ev, deps) => state.objects[selfOid] === undefined ? null
      : applyEvents(state, [{ kind: 'destroy', target: selfOid } as GameEvent], deps ?? {}).state,
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】防守时」
    choose: {
      key: 'unit', prompt: '狂热粉丝:摧毁我,把一名进攻方单位赶回基地',
                                             
      selector: { type: 'unit', fielded: true, filter: (o) => o.status.attacking === true, isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_128: Card = {
  id: 'SFD-128', cardNo: 'SFD·128/221', name: '狂热粉丝', category: 'unit',
  domains: ['purple'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '防守时可摧毁自己把一名进攻方单位赶回基地(makeSuperFanTrigger)' }],
}

                                                            
                             
                                                      
                                                  
export const UNL_123_CARD_EFFECT = '当你打出我时，弃置一张手牌，然后抽一张牌。'
export function makeEverdarkLurkerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
                                              
      { op: 'moveTo', target: { ref: 'chosen', key: 'card' }, zone: (ctx) => `discard:${ctx.controller}` },
      { op: 'draw', count: 1 },
    ],
  })
  return compileTrigger({
    id: 'UNL-123-loot', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card', prompt: '永黯潜伏者:弃置一张手牌',
      selector: { type: 'any', zone: 'hand', owner: 'you' },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_123: Card = {
  id: 'UNL-123', cardNo: 'UNL-123/219', name: '永黯潜伏者', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时弃一张抽一张(makeEverdarkLurkerTrigger)' }],
}

                                                                          
                                   
  
                                    
                                     
                                      
                                    
                                                     
  
                                       
                                              
                                             
                                                                          

   
                                           
                                                               
                                 
   
export function takenReal(v: string | undefined): boolean {
  return v !== undefined && v !== 'skip'
}

   
                                                     
                                                 
                                                   
   
export const LOOK_TOP3_UNIT: Selector = { type: 'unit', zone: 'mainDeck', owner: 'you', topOfDeck: 3 }

   
                                      
                                                         
   
export function lookTakeRecycle(lookN: number, key: string, opts?: { readonly reveal?: boolean }): readonly Op[] {
                                                                  
                                                                                
                                                         
                                              
  const reveal = opts?.reveal !== false
                                                                   
                                                 
                                                 
  const sproutTaken = (ctx: EffectCtx): ObjId | undefined =>
    ctx.chosen[VOID_SPROUT_KEY] === 'recycle' ? topOfDeck(ctx.state, ctx.controller, 1)[0] : undefined
  return [
                                 
    { op: 'custom', emit: (ctx) => voidSproutRecycleEvents(ctx.state, ctx.controller, ctx.chosen) },
                                                          
                                                                   
                                                 
    { op: 'custom', emit: (ctx) => (reveal && takenReal(ctx.chosen[key])
      && ctx.chosen[key] !== (sproutTaken(ctx) as string | undefined)
                                                       
      && topOfDeck(ctx.state, ctx.controller, lookN).includes(ctx.chosen[key] as ObjId)
      ? [{ kind: 'revealed', player: ctx.controller, cards: [ctx.chosen[key] as ObjId] } as GameEvent]
      : []) },
                                                         
    { op: 'custom', emit: (ctx) => {
      const pick = ctx.chosen[key]
      if (!takenReal(pick)) return []
      if (pick === (sproutTaken(ctx) as string | undefined)) return []                   
      if (!topOfDeck(ctx.state, ctx.controller, lookN).includes(pick as ObjId)) return []          
      return [{ kind: 'zoneChange', obj: pick as ObjId, to: `hand:${ctx.controller}` } as GameEvent]
    } },
    {
      op: 'insight',
                                                      
                                                                         
                                                  
                                                 
      count: (ctx) => {
        const st = sproutTaken(ctx)
        const basis = st !== undefined ? lookN - 1 : lookN
        const took = takenReal(ctx.chosen[key]) && ctx.chosen[key] !== (st as string | undefined)
        return took ? basis - 1 : basis
      },
      recycleAll: true,
    },
  ]
}

                                                           
                                                   
                              
                                                        
export const UNL_064_CARD_EFFECT =
  '当你打出我时，查看你主牌堆顶部的四张牌。你可以选择从中展示一张法力费用不低于{{4}}的法术牌，并抽取该卡牌。回收其余的卡牌。'
export function makeFateWeaverTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: lookTakeRecycle(4, 'card') })
  return compileTrigger({
    id: 'UNL-064-look', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card', prompt: '命运编织者:从顶4张里取一张法力费≥4的法术牌',
      selector: {
        type: 'spell', zone: 'mainDeck', owner: 'you', topOfDeck: 4,
        filter: (o) => (CARD_COSTS[o.defId]?.mana ?? 0) >= 4,
      },
      optional: true, // 「你可以选择」⇒ 可以一张都不拿
    },
    postChoice: (state, chosen) => voidSproutChoice(state, controller, chosen), // ★749 兽苗前置
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_064: Card = {
  id: 'UNL-064', cardNo: 'UNL-064/219', name: '命运编织者', category: 'unit',
  domains: ['blue'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时查顶4张取一张≥4费法术,其余回收(makeFateWeaverTrigger)' }],
}

                                                                          
                                  
  
                                                 
                                         
                                                               
                                                                          

                           
function playOrHoldTriggers(
  defId: string, abilityKeyBase: string, selfOid: ObjId, controller: PlayerId,
  spec: { readonly choose: { key: string; prompt: string; selector: Selector; optional?: boolean }
        ; readonly then: readonly Op[] },
): readonly Trigger[] {
  const effect = compileEffect({ then: spec.then })
  const run: Trigger['effect'] = (state, ev, chosen) =>
    effect({ state, selfOid, controller, ev, chosen: chosen ?? {} })
  const abilityKey = `${abilityKeyBase}:${selfOid}`
  return [
    compileTrigger({
      id: `${abilityKey}:play`, rawId: true, sourceDefId: defId,
      event: 'playUnit', by: 'you', abilityKey,
      when: [{ kind: 'subjectIsSelf' }],
      choose: spec.choose, postChoice: (st, ch) => voidSproutChoice(st, controller, ch), effect: run, // ★749
    }, selfOid, controller),
    compileTrigger({
      id: `${abilityKey}:hold`, rawId: true, sourceDefId: defId,
      event: 'hold', by: 'you', abilityKey,
                                       
      when: [{ kind: 'selfAtEventBattlefield' }],
      choose: spec.choose, postChoice: (st, ch) => voidSproutChoice(st, controller, ch), effect: run, // ★749
    }, selfOid, controller),
  ]
}

                                                               
                                     
                                         
export const SFD_058_CARD_EFFECT =
  '当你打出我时，或当我据守一处战场时，查看主牌堆顶部的四张牌。你可以选择从中展示一件装备，并抽取该卡牌，然后回收其余卡牌。'
export function makeOrnnTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return playOrHoldTriggers('SFD-058', 'SFD-058:look', selfOid, controller, {
    choose: {
      key: 'card', prompt: '奥恩:从顶4张里取一件装备',
      selector: { type: 'equipment', zone: 'mainDeck', owner: 'you', topOfDeck: 4 },
      optional: true, // 「你可以选择」⇒ 可以一件都不拿
    },
    then: lookTakeRecycle(4, 'card'),
  })
}
export const SFD_058: Card = {
  id: 'SFD-058', cardNo: 'SFD·058/221', name: '奥恩', category: 'unit',
  domains: ['green'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出/据守时查顶4张取一件装备,其余回收(makeOrnnTriggers)' }],
}

                                                               
                                                    
                                                         
                                
                                              
                             
                                            
                                                       
                                                                
const IVERN_TAGS = ANIMAL_TAGS
   
                                            
                        
                                         
                                        
                                         
   
function ivernRevealedTagged(state: GameState, chosen: Readonly<Record<string, string>>): boolean {
  const taken = chosen['card']
  if (!takenReal(taken)) return false
  const defId = state.objects[taken as ObjId]?.defId             
  return !!defId && hasAnyCardTag(defId, IVERN_TAGS)
}
export const UNL_051_CARD_EFFECT =
  '当你打出我时，或当我据守一处战场时，查看你主牌堆顶部的三张牌。你可以选择从中展示一名单位，并抽取该卡牌。回收其余的卡牌。如果你展示了一名"鸟类"、"猫科"、"犬形"或"魄罗"属性单位，则进行一次:给予一名友方单位增益。'

                                                                            
const IVERN_BUFF_SELECTOR = { type: 'unit', fielded: true, controller: 'you', isTarget: true } as const
export function makeIvernTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const effect = compileEffect({
    then: [
      ...lookTakeRecycle(3, 'card'),
      {
                                    
        op: 'custom',
        emit: (ctx): readonly GameEvent[] => {
          if (!ivernRevealedTagged(ctx.state, ctx.chosen)) return []
          const buffTarget = ctx.chosen['buff']
          if (!buffTarget || buffTarget === 'skip') return []
                                                                                      
                                                  
          if (!resolveSelector(ctx.state, IVERN_BUFF_SELECTOR, ctx.controller).includes(buffTarget as ObjId)) return []
          return [{ kind: 'grantBuff', target: buffTarget as ObjId }]
        },
      },
    ],
  })
  const run: Trigger['effect'] = (state, ev, chosen) =>
    effect({ state, selfOid, controller, ev, chosen: chosen ?? {} })
                                                        
                                          
                                             
  const questions = [
    {
      key: 'card', prompt: '艾翁:从顶3张里取一名单位',
      selector: LOOK_TOP3_UNIT, // ★第362轮抽成共用常量(龙虎双雄 UNL-032 与艾翁读同一份口径)
      optional: true, // 「你可以选择」⇒ 多给一个"不选"
    },
    {
      key: 'buff', prompt: '艾翁:给予一名友方单位增益',
      selector: IVERN_BUFF_SELECTOR,
                                             
      when: ivernRevealedTagged,
    },
  ]
  const abilityKey = `UNL-051:look:${selfOid}`
  return [
    compileTrigger({
      id: `${abilityKey}:play`, rawId: true, sourceDefId: 'UNL-051',
      event: 'playUnit', by: 'you', abilityKey,
      when: [{ kind: 'subjectIsSelf' }],
      chooses: questions, postChoice: (st, ch) => voidSproutChoice(st, controller, ch), effect: run, // ★749
    }, selfOid, controller),
    compileTrigger({
      id: `${abilityKey}:hold`, rawId: true, sourceDefId: 'UNL-051',
      event: 'hold', by: 'you', abilityKey,
      when: [{ kind: 'selfAtEventBattlefield' }],
      chooses: questions, postChoice: (st, ch) => voidSproutChoice(st, controller, ch), effect: run, // ★749
    }, selfOid, controller),
  ]
}
export const UNL_051: Card = {
  id: 'UNL-051', cardNo: 'UNL-051/219', name: '艾翁', category: 'unit',
  domains: ['green'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出/据守时查顶3张取一名单位;若带特定标签则再给一名友方单位增益(makeIvernTriggers)' }],
}

                                                                          
                                         
                                                       
                                              
  
                                        
                                          
                                                   
                                 
                                          
                                            
                                                     
                                                   
                                                              
                                                         
                                                               
                                                 
                                          
                                                             
                                                                
                                                             
                                                                          

                                           
const FIELDED_UNITS_MINE: Selector = { type: 'unit', fielded: true, controller: 'you' }

                                                              
                     
export const UNL_092_CARD_EFFECT = '当你打出我时，获得1经验。'
export function makeExpGainTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('UNL-092:play', selfOid, controller, {
    then: [{ op: 'gainExperience', amount: 1 }], // §730.1 经验是资源不是物体(§731)
  })
}
export const UNL_092: Card = {
  id: 'UNL-092', cardNo: 'UNL-092/219', name: '德玛西亚使节', category: 'unit',
  domains: ['orange'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时获得1经验(makeExpGainTrigger)' }],
}

                                                                   
                                 
                                                           
                                            
export const UNL_157_CARD_EFFECT = '当你打出我时，场上每有一名友方单位，便获得1经验。'
export function makeExpPerUnitTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('UNL-157:play', selfOid, controller, {
    then: [{
      op: 'gainExperience',
      amount: (ctx) => resolveSelector(ctx.state, FIELDED_UNITS_MINE, ctx.controller).length,
    }],
  })
}
export const UNL_157: Card = {
  id: 'UNL-157', cardNo: 'UNL-157/219', name: '严厉军士', category: 'unit',
  domains: ['yellow'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时按场上友方单位数获得等量经验(makeExpPerUnitTrigger)' }],
}

                                                                    
                                    
                              
                                               
                              
export const OGN_038_CARD_EFFECT =
  '当你打出我时，你场上每有一名强力单位，就抽一张牌。（战力达到5或以上时，即为强力单位。）'
export function makeMightyDrawTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-038:play', selfOid, controller, {
    then: [{
      op: 'draw',
      count: (ctx) => resolveSelector(
        ctx.state, { ...FIELDED_UNITS_MINE, minMight: 5 }, ctx.controller).length,
    }],
  })
}
export const OGN_038: Card = {
  id: 'OGN-038', cardNo: 'OGN·038/298', name: '邪焰巨龙 卡德雷格林', category: 'unit',
  domains: ['red'], energy: 9, power: 9, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时按场上强力(≥5[M])友方单位数抽牌(makeMightyDrawTrigger)' }],
}

                                                                   
                                       
                                                    
                                   
export const UNL_097_CARD_EFFECT = '当你打出我时，如果你的其他单位的总计战力不低于5，则抽一张牌。'
export function makeTotalMightDrawTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const others = (ctx: EffectCtx): number =>
    resolveSelector(ctx.state, { ...FIELDED_UNITS_MINE, excludeSelf: true }, ctx.controller, { selfOid })
      .reduce((sum, oid) => {
        const u = ctx.state.objects[oid]
        return u ? sum + effectiveMight(u).reference : sum
      }, 0)
  return playTrigger('UNL-097:play', selfOid, controller, {
    guard: (ctx) => others(ctx) >= 5,
    then: [{ op: 'draw', count: 1 }],
  })
}
export const UNL_097: Card = {
  id: 'UNL-097', cardNo: 'UNL-097/219', name: '均衡门徒', category: 'unit',
  domains: ['orange'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时若其他单位总战力≥5则抽1(makeTotalMightDrawTrigger)' }],
}

                                                                    
                                    
                                                                 
                                                       
export const SFD_062_CARD_EFFECT = '当你打出我时，让另一名友方“机械”属性单位变为活跃状态。'
export function makeMechReadyTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('SFD-062:play', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '让另一名友方“机械”单位变为活跃',
      selector: {
        ...FIELDED_UNITS_MINE, excludeSelf: true, isTarget: true,
        filter: (o) => objectHasCardTag(o, '机械'), // ★第281轮:物件级(获得的标签也算)
      },
    },
    then: [{ op: 'setStatus', target: { ref: 'chosen', key: 'unit' }, key: 'dormant', value: false }],
  })
}
export const SFD_062: Card = {
  id: 'SFD-062', cardNo: 'SFD·062/221', name: '泡泡机', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让另一名友方机械单位变活跃(makeMechReadyTrigger)' }],
}

                                                                    
                                       
                                         
export const SFD_072_CARD_EFFECT = '当你打出我时，如果你控制着不少于两件装备，则让我变为活跃状态。'
export function makeTwoGearReadyTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('SFD-072:play', selfOid, controller, {
    guard: (ctx) => resolveSelector(
      ctx.state, { type: 'equipment', fielded: true, controller: 'you' }, ctx.controller).length >= 2,
    then: [{ op: 'setStatus', target: { ref: 'self' }, key: 'dormant', value: false }],
  })
}
export const SFD_072: Card = {
  id: 'SFD-072', cardNo: 'SFD·072/221', name: '滑板高手', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时若控制≥2件装备则自己变活跃(makeTwoGearReadyTrigger)' }],
}

                                                                    
                                 
                                                  
export const SFD_007_CARD_EFFECT = '当你打出我时，让一名单位本回合内获得游走。'
export function makeGrantRoamTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('SFD-007:play', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '让一名单位本回合内获得{{游走}}',
      selector: { type: 'unit', fielded: true, isTarget: true }, // 不限敌我
    },
    then: [{
      op: 'grantKeyword', target: { ref: 'chosen', key: 'unit' },
      keyword: '游走', duration: 'thisTurn', id: `SFD-007:roam:${selfOid}`,
    }],
  })
}
export const SFD_007: Card = {
  id: 'SFD-007', cardNo: 'SFD·007/221', name: '晶能阻断器', category: 'unit',
  domains: ['red'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让一名单位本回合获得游走(makeGrantRoamTrigger)' }],
}

                                                                    
                                             
                             
                                                
                                    
                                  
export const OGN_225_CARD_EFFECT =
  '当你打出我时，选择一名敌方单位，将其眩晕。如果它此前已被眩晕，则改为将其摧毁。'
export function makeStunOrKillTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-225:play', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '选择一名敌方单位:眩晕它(若已眩晕则改为摧毁)',
      selector: { type: 'unit', fielded: true, controller: 'opponent', isTarget: true },
    },
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const t = ctx.chosen['unit'] as ObjId | undefined
        if (!t) return []
        const o = ctx.state.objects[t]
        if (!o) return []                              
        return o.status.stunned === true
          ? [{ kind: 'destroy', target: t }]                  
          : [{ kind: 'stun', target: t }]
      },
    }],
  })
}
export const OGN_225: Card = {
  id: 'OGN-225', cardNo: 'OGN·225/298', name: '烈阳首领', category: 'unit',
  domains: ['yellow'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时眩晕一名敌方单位;若已眩晕则改为摧毁(makeStunOrKillTrigger)' }],
}

                                                                          
                                              
  
                      
                                                                     
                                                                  
                                        
  
                                                  
                                                      
                                                                          

                                                                 

                                                              
                                    
export const OGN_211_CARD_EFFECT = '当你打出我时，在此处额外打出一名1S的“随从”。'
                                       
export const OGN_211_HASTE_KEY = hasteKeyOf('OGN-211:minion')
export function makeWorkshopOwnerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-211:play', selfOid, controller, {
    then: [{
      op: 'spawnToken',
      spec: MINION, // ㊼ 第314轮收口:全仓 6 处内联合并到 `reprint-batch.ts` 的 MINION
      zone: hereOf,
      haste: { key: OGN_211_HASTE_KEY, label: '随从' }, // ★1398 缺陷 176 B4 · DSL 钩(样板:playTrigger 壳)
    }],
  })
}
export const OGN_211: Card = {
  id: 'OGN-211', cardNo: 'OGN·211/298', name: '忠实的工坊主', category: 'unit',
  domains: ['yellow'], energy: 3, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时在此处额外打出一名1[M]随从(makeWorkshopOwnerTrigger)' }],
}

                                                                
                                    
export const SFD_157_CARD_EFFECT = '当你打出我时，在此处打出一名2S的“黄沙士兵”。'
                                         
export const SFD_157_HASTE_KEY = hasteKeyOf('SFD-157:soldier')
export function makeRoyalGuardTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('SFD-157:play', selfOid, controller, {
    then: [{
      op: 'spawnToken',
      spec: SAND_SOLDIER_TOKEN, // ㊼ 第320轮收口:与 `token-spells.ts` 那份合并
      zone: hereOf,
      haste: { key: SFD_157_HASTE_KEY, label: '黄沙士兵' }, // ★1399 缺陷 176 B4 · DSL 钩
    }],
  })
}
export const SFD_157: Card = {
  id: 'SFD-157', cardNo: 'SFD·157/221', name: '皇家守卫', category: 'unit',
  domains: ['yellow'], energy: 4, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时在此处打出一名2[M]黄沙士兵(makeRoyalGuardTrigger)' }],
}

                                                                
                                            
                                                        
                                       
export const UNL_033_CARD_EFFECT = '当你打出我时，在此处打出一名1S的“战鹰”，它拥有法盾。'
                                       
export const UNL_033_HASTE_KEY = hasteKeyOf('UNL-033:hawk')
export function makeNaughtyHunterTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('UNL-033:play', selfOid, controller, {
    then: [{
      op: 'spawnToken',
      spec: WAR_HAWK_TOKEN,
      zone: hereOf,
      haste: { key: UNL_033_HASTE_KEY, label: '战鹰' }, // ★1399 缺陷 176 B4 · DSL 钩
    }],
  })
}
export const UNL_033: Card = {
  id: 'UNL-033', cardNo: 'UNL-033/219', name: '调皮猎手', category: 'unit',
  domains: ['green'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时在此处打出一名带法盾的1[M]战鹰(makeNaughtyHunterTrigger)' }],
}

                                                                
                                       
                                             
                                       
                                                                       
export const UNL_132_CARD_EFFECT = '当你打出我时，让所有不高于2S的单位返回其所属的手牌。'
export function makeLanternKrakenTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('UNL-132:play', selfOid, controller, {
    then: [{
      op: 'forEach',
                                                                     
                                                   
                                                                          
      selector: { type: 'unit', fielded: true, maxMight: 2 },
      then: [{ op: 'bounceToOwnerHand', target: { ref: 'each' } }],
    }],
  })
}
export const UNL_132: Card = {
  id: 'UNL-132', cardNo: 'UNL-132/219', name: '提灯海煞', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让所有≤2[M]的单位返回其所属手牌(makeLanternKrakenTrigger)' }],
}

                                                               
                                
                                                               
                                    
                             
export const OGS_018_CARD_EFFECT = '当你打出我时，对所有战场上的单位各造成3点伤害。'
export function makeTibbersTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGS-018:play', selfOid, controller, {
    then: [{
      op: 'forEach',
      selector: { type: 'unit', zone: 'battlefield' },
      then: [{ op: 'damage', target: { ref: 'each' }, amount: 3 }],
    }],
  })
}
export const OGS_018: Card = {
  id: 'OGS-018', cardNo: 'OGS·018/024', name: '提伯斯', category: 'unit',
  domains: ['red', 'purple'], energy: 8, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时对所有战场上的单位各造成3点伤害(makeTibbersTrigger)' }],
}

                                                                
                                  
                                                              
                                                
export const OGS_010_CARD_EFFECT = '当你打出我时，让一张法术牌从你的废牌堆返回你的手牌。'
export function makeAnnieTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGS-010:play', selfOid, controller, {
    choose: {
      key: 'card', prompt: '安妮:让一张法术牌从废牌堆返回手牌',
      selector: { type: 'spell', zone: 'discard', owner: 'you', isTarget: true },
    },
    then: [{
      op: 'moveTo', target: { ref: 'chosen', key: 'card' },
      zone: (ctx) => `hand:${ctx.controller}`,
    }],
  })
}
export const OGS_010: Card = {
  id: 'OGS-010', cardNo: 'OGS·010/024', name: '安妮', category: 'unit',
  domains: ['purple'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让一张法术从废牌堆返回手牌(makeAnnieTrigger)' }],
}

                                                                 
                                                      
                                                          
                      
export const UNL_167_CARD_EFFECT =
  '当你打出我时，让你废牌堆中的一名“鸟类”、“猫科”、“犬形”或“魄罗”属性单位返回你的手牌。'
export function makeStarHoundTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('UNL-167:play', selfOid, controller, {
    choose: {
      key: 'card', prompt: '星獒:让废牌堆中一名指定属性的单位返回手牌',
      selector: {
        type: 'unit', zone: 'discard', owner: 'you', isTarget: true,
        filter: (o) => hasAnyCardTag(o.defId, IVERN_TAGS),
      },
    },
    then: [{
      op: 'moveTo', target: { ref: 'chosen', key: 'card' },
      zone: (ctx) => `hand:${ctx.controller}`,
    }],
  })
}
export const UNL_167: Card = {
  id: 'UNL-167', cardNo: 'UNL-167/219', name: '星獒', category: 'unit',
  domains: ['yellow'], energy: 5, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让废牌堆中一名带指定标签的单位返回手牌(makeStarHoundTrigger)' }],
}

                                                                          
                                               
                                             
                                                                          

                                                               
                                           
                                                      
                                       
export const OGN_061_CARD_EFFECT =
  '当你打出我时，如果你场上拥有“魄罗”属性单位，则给予我增益并抽一张牌。'
export function makePoroShepherdTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-061:play', selfOid, controller, {
    guard: (ctx) => resolveSelector(
                                                 
      ctx.state, { type: 'unit', fielded: true, controller: 'you', filter: (o) => objectHasCardTag(o, '魄罗') },
      ctx.controller).length > 0,
    then: [
      { op: 'grantBuff', target: { ref: 'self' } },
      { op: 'draw', count: 1 },
    ],
  })
}
export const OGN_061: Card = {
  id: 'OGN-061', cardNo: 'OGN·061/298', name: '魄罗牧者', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时若场上有魄罗单位则给我增益并抽1(makePoroShepherdTrigger)' }],
}

                                                              
                                      
                                      
                                        
                                                                    
                                                    
export const VEN_037_CARD_EFFECT =
  '当你打出我时，如果你控制的符文不少于七枚，则选择一件敌方装备。如果该装备已强化，则解除其强化。否则将其摧毁。'
const RUNES_I_CONTROL: Selector = { type: 'rune', fielded: true, controller: 'you' }
export function makeBarbaraTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('VEN-037:play', selfOid, controller, {
    guard: (ctx) => resolveSelector(ctx.state, RUNES_I_CONTROL, ctx.controller).length >= 7,
    choose: {
      key: 'gear', prompt: '盗墓贼芭芭拉:选择一件敌方装备(已强化则解除强化,否则摧毁)',
      selector: { type: 'equipment', fielded: true, controller: 'opponent', isTarget: true },
    },
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const t = ctx.chosen['gear'] as ObjId | undefined
        if (!t) return []
        const o = ctx.state.objects[t]
        if (!o) return []                              
        return isEmpowered(o) ? [{ kind: 'disempower', target: t }] : [{ kind: 'destroy', target: t }]
      },
    }],
  })
}
export const VEN_037: Card = {
  id: 'VEN-037', cardNo: 'VEN·037', name: '盗墓贼芭芭拉', category: 'unit',
  domains: ['green'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时符文≥7则解除一件敌方装备的强化,否则摧毁它(makeBarbaraTrigger)' }],
}

                                                               
                                                    
                                       
                                            
                                        
export const OGN_149_CARD_EFFECT =
  '当你打出我时，选择任意战场上的一名敌方单位，让我和这名单位相互以自身战力给对方造成伤害。'
export function makeCarnivorousVineTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-149:play', selfOid, controller, {
    choose: {
      key: 'foe', prompt: '食肉蛇藤:选择任意战场上的一名敌方单位与我互相造成伤害',
      selector: { type: 'unit', zone: 'battlefield', controller: 'opponent', isTarget: true },
    },
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const t = ctx.chosen['foe'] as ObjId | undefined
        const me = ctx.selfOid ? ctx.state.objects[ctx.selfOid] : undefined
        const foe = t ? ctx.state.objects[t] : undefined
        if (!me || !foe || !t || !ctx.selfOid) return []
                                    
        const myMight = effectiveMight(me).reference
        const foeMight = effectiveMight(foe).reference
        return [
                                                                            
                                                 
                                                              
                                                               
          { kind: 'damage', target: t, amount: myMight, source: ctx.selfOid, sourcePlayer: ctx.controller },
          { kind: 'damage', target: ctx.selfOid, amount: foeMight, source: t, sourcePlayer: foe.controller },
        ]
      },
    }],
  })
}
export const OGN_149: Card = {
  id: 'OGN-149', cardNo: 'OGN·149/298', name: '食肉蛇藤', category: 'unit',
  domains: ['orange'], energy: 5, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时与一名战场上的敌方单位互相以战力造成伤害(makeCarnivorousVineTrigger)' }],
}

                                                               
                              
                                                  
                                                      
                                                                   
                                  
                           
                                                        
                 
export const SFD_039_CARD_EFFECT = '当你打出我时，让一名传奇变为活跃或休眠状态。'
export function makeRoyalRetainerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const pick = ctx.chosen['legend']
        if (!pick) return []
        const [oid, mode] = pick.split(':::')
        if (!oid || !mode || !ctx.state.objects[oid as ObjId]) return []
                                                                            
                                                                               
        return [{ kind: 'statusChange', target: oid as ObjId, key: 'tapped', value: mode === 'dormant' }]
      },
    }],
  })
  return compileTrigger({
    id: 'SFD-039:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    nextChoice: (state, ev, chosen) => {
      if (chosen['legend'] !== undefined) return null
      const legends = resolveSelector(state, { type: 'legend', fielded: true }, controller, { ev })
      if (legends.length === 0) return null
      return {
        itemId: `trig:SFD-039:play:${selfOid}`, controller, key: 'legend',
        prompt: '皇家随从:让一名传奇变为活跃或休眠状态',
                                                                              
                                                             
                                                                                
        isTarget: true,
        candidates: legends.flatMap((oid) => {
          const nm = state.objects[oid]?.defId ?? (oid as string)
          return [
            { id: `${oid as string}:::ready`, label: `${nm} → 活跃` },
            { id: `${oid as string}:::dormant`, label: `${nm} → 休眠` },
          ]
        }),
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_039: Card = {
  id: 'SFD-039', cardNo: 'SFD·039/221', name: '皇家随从', category: 'unit',
  domains: ['green'], energy: 3, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时让一名传奇变为活跃或休眠(makeRoyalRetainerTrigger)' }],
}

                                                               
                                
                                                            
                                          
                                                
export const SFD_174_CARD_EFFECT = '当你打出我时，打出四个休眠的“金币”装备指示物。'
export function makeTreasureGolemTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('SFD-174:play', selfOid, controller, {
    then: Array.from({ length: 4 }, () => ({
      op: 'spawnToken' as const, spec: GOLD_TOKEN,
      zone: (ctx: EffectCtx) => `base:${ctx.controller}`, // §149.2 装备打到基地
      dormant: true,
    })),
  })
}
export const SFD_174: Card = {
  id: 'SFD-174', cardNo: 'SFD·174/221', name: '宝藏魔像', category: 'unit',
  domains: ['yellow'], energy: 8, power: 9, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时打出四个休眠金币(makeTreasureGolemTrigger)' }],
}

                                                               
                                                           
                                                                 
                                                                     
                                              
                                            
                                                                
                           
                                                                                                 
export const SFD_074_CARD_EFFECT =
  '当你打出我时，你可以选择摧毁一件法力费用不高于{{1}}的装备。若如此做，则打出一个休眠的“金币”装备指示物。'
export function makeAlleyThiefTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                         
                                                             
                                                      
                                                     
                                           
    guard: (ctx) => {
      const g = ctx.chosen['gear']
      return !!g && g !== 'skip' && ctx.state.objects[g as ObjId] !== undefined
    },
    then: [
      { op: 'destroy', target: { ref: 'chosen', key: 'gear' } }, // 费用在前(§204.1.b)
      { op: 'spawnToken', spec: GOLD_TOKEN, zone: (ctx) => `base:${ctx.controller}`, dormant: true }, // 收益在后
    ],
  })
  return compileTrigger({
    id: 'SFD-074:play', event: 'playUnit', by: 'you',
    mayChoose: true, // §383.3.a 开头「你可以选择」⇒ 确认阶段决定做不做
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'gear', prompt: '暗巷神偷:摧毁一件法力费用≤1的装备,以此拿一个休眠金币',
      selector: {
        type: 'equipment', fielded: true, isTarget: true,
                           
                                                                 
                                                           
                                                      
        filter: (o) => (CARD_COSTS[o.defId]?.mana ?? (isToken(o) ? 0 : Number.POSITIVE_INFINITY)) <= 1,
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_074: Card = {
  id: 'SFD-074', cardNo: 'SFD·074/221', name: '暗巷神偷', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可拆一件≤1费装备换一个休眠金币(makeAlleyThiefTrigger)' }],
}

                                                                          
                                                     
                                              
                                                                          

   
                                 
               
                                                         
                                                           
   
export const SPRITE_TOKEN = { defId: 'token:精灵', baseMight: 3, baseTypes: ['unit'], baseKeywords: ['瞬息'], baseTags: ['仙灵'] } as const

                                                               
                               
                                           
                                                 
                                            
                                                 
export const SFD_091_CARD_EFFECT = '当你打出我时，你可以选择抽一张牌或给予我增益。'
export function makeCaptainBaruTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const mode = ctx.chosen['mode']
        if (mode === 'draw') return [{ kind: 'draw', player: ctx.controller, count: 1 }]
        if (mode === 'buff' && ctx.selfOid) return [{ kind: 'grantBuff', target: ctx.selfOid }]
        return []
      },
    }],
  })
  return compileTrigger({
    id: 'SFD-091:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
                                                             
                                                          
                                                                  
                                                                  
                                                          
                                              
                                                              
                                                               
    mayChoose: true,
    nextChoice: (state, _ev, chosen) => {
      if (chosen['mode'] !== undefined) return null
      return {
        itemId: `trig:SFD-091:play:${selfOid}`, controller, key: 'mode',
        prompt: '芭茹队长:抽一张牌,还是给予我增益?',
        candidates: [{ id: 'draw', label: '抽一张牌' }, { id: 'buff', label: '给予我增益' }],
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_091: Card = {
  id: 'SFD-091', cardNo: 'SFD·091/221', name: '芭茹队长', category: 'unit',
  domains: ['orange'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时二选一:抽1 或 给我增益(makeCaptainBaruTrigger)' }],
}

                                                               
                                                  
export const OGN_106_CARD_EFFECT =
  '当你打出我时，在此处打出一个处于活跃状态的3S“精灵”，它拥有瞬息。'
export function makeSpriteMotherTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return playTrigger('OGN-106:play', selfOid, controller, {
    then: [{ op: 'spawnToken', spec: SPRITE_TOKEN, zone: hereOf, ready: true }],
  })
}
export const OGN_106: Card = {
  id: 'OGN-106', cardNo: 'OGN·106/298', name: '精灵之母', category: 'unit',
  domains: ['blue'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时在此处打出一个活跃的带瞬息3[M]精灵(makeSpriteMotherTrigger)' }],
}

                                                               
                                                    
                     
                                                
                         
                                                
                                                           
                                               
                           
export const UNL_084_CARD_EFFECT =
  '当你打出我时或在你的开始阶段开始时，打出一名处于活跃状态的3S“精灵”到你的基地，它拥有瞬息。'
export function makeSpriteQueenTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const effect = compileEffect({
    then: [{
      op: 'spawnToken', spec: SPRITE_TOKEN,
      zone: (ctx) => `base:${ctx.controller}`, // 写死基地,不是「此处」
      ready: true,
    }],
  })
  const run: Trigger['effect'] = (state, ev, chosen) =>
    effect({ state, selfOid, controller, ev, chosen: chosen ?? {} })
  const abilityKey = `UNL-084:sprite:${selfOid}`
  return [
    compileTrigger({
      id: `${abilityKey}:play`, rawId: true, sourceDefId: 'UNL-084',
      event: 'playUnit', by: 'you', abilityKey,
      when: [{ kind: 'subjectIsSelf' }],
      effect: run,
    }, selfOid, controller),
    compileTrigger({
      id: `${abilityKey}:start`, rawId: true, sourceDefId: 'UNL-084',
      event: 'startPhase', by: 'you', abilityKey,
                                        
      when: [{ kind: 'eventPlayerIs', side: 'you' }],
                                         
      activeZone: ['battlefield', 'base'],
      effect: run,
    }, selfOid, controller),
  ]
}
export const UNL_084: Card = {
  id: 'UNL-084', cardNo: 'UNL-084/219', name: '精灵女王', category: 'unit',
  domains: ['blue'], energy: 7, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时/我的开始阶段:打出一个活跃的带瞬息3[M]精灵到基地(makeSpriteQueenTriggers)' }],
}

                                                                
                                            
                                  
                                                           
                                              
                                          
                                                   
                           
export const OGN_147_CARD_EFFECT =
  '当你打出我时，你可以选择消耗一个增益，以此给予我增益并让我变为活跃状态。'
export function makeWildclawShamanTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                                 
    guard: (ctx) => {
      const c = ctx.chosen['buffSrc']
      if (!c || c === 'skip') return false
      const o = ctx.state.objects[c as ObjId]
      return !!o && buffCount(o) > 0
    },
    then: [
      { op: 'consumeBuff', target: { ref: 'chosen', key: 'buffSrc' }, by: { ref: 'controller' } }, // 费用在前
      { op: 'grantBuff', target: { ref: 'self' } },                                                 // 收益在后
      { op: 'setStatus', target: { ref: 'self' }, key: 'dormant', value: false },
    ],
  })
  return compileTrigger({
    id: 'OGN-147:play', event: 'playUnit', by: 'you',
    mayChoose: true, // §383.3.a 开头「你可以选择」
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'buffSrc', prompt: '野爪萨满:消耗一个增益,换"给我增益+变活跃"',
      selector: {
                                        
        type: 'unit', fielded: true, controller: 'you', isTarget: true,
        filter: (o) => buffCount(o) > 0,
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_147: Card = {
  id: 'OGN-147', cardNo: 'OGN·147/298', name: '野爪萨满', category: 'unit',
  domains: ['orange'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可消耗一个增益换"给我增益+变活跃"(makeWildclawShamanTrigger)' }],
}

                                                               
        
                           
                                  
                         
                                                           
                                                         
                                   
                                                       
                                                    
export const SFD_101_CARD_EFFECT =
  '当你打出我时，给予最多四名友方单位增益。\n当你消耗一个增益时，打出一个休眠的“金币”装备指示物。'
const FAE_PREFIX = 'buffT'

                                                                                    
                                                                                                     
const FAE_BUFF_POOL = { type: 'unit', fielded: true, controller: 'you' } as const
export function makeFaeDragonTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
                       
  const buffEffect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
                                                                      
                                                  
        const live = new Set(resolveSelector(ctx.state, FAE_BUFF_POOL, ctx.controller))
        return multiSelectPicked(ctx.chosen, FAE_PREFIX)
          .filter((oid) => live.has(oid as ObjId))
          .map((oid) => ({ kind: 'grantBuff', target: oid as ObjId }))
      },
    }],
  })
                                                                     
  const ask = multiSelectChoice({
    itemId: `trig:SFD-101:play:${selfOid}`, controller, prefix: FAE_PREFIX,
    prompt: '仙灵龙:给予友方单位增益(最多四名)',
    doneLabel: '够了,不再给',
    max: 4,
                                                                                                                         
                                                                                       
    isTarget: true, // 卡文「给予最多四名友方单位增益」—— 选场上单位 = §355.7 选取目标
    candidates: (state) => resolveSelector(
      state, FAE_BUFF_POOL, controller,
    ).map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
  })
                          
  const goldEffect = compileEffect({
    then: [{ op: 'spawnToken', spec: GOLD_TOKEN, zone: (ctx) => `base:${ctx.controller}`, dormant: true }],
  })
  return [
    compileTrigger({
      id: `SFD-101:play:${selfOid}`, rawId: true, sourceDefId: 'SFD-101',
      event: 'playUnit', by: 'you',
      when: [{ kind: 'subjectIsSelf' }],
      nextChoice: (state, _ev, chosen) => ask(state, chosen),
      effect: (state, ev, chosen) => buffEffect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
    }, selfOid, controller),
    compileTrigger({
      id: `SFD-101:consume:${selfOid}`, rawId: true, sourceDefId: 'SFD-101',
      event: 'consumeBuff', by: 'you', // 「当【你】消耗一个增益时」
      effect: (state, ev, chosen) => goldEffect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
    }, selfOid, controller),
  ]
}
export const SFD_101: Card = {
  id: 'SFD-101', cardNo: 'SFD·101/221', name: '仙灵龙', category: 'unit',
  domains: ['orange'], energy: 7, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时给最多四名友方单位增益;你每消耗一个增益打出一个休眠金币(makeFaeDragonTriggers)' }],
}

                                                                          
                         
                                                                          

                                                               
                            
                                                   
                                                
                                           
                                
                                                                                          
                                                           
                                                             
                                                   
export const OGN_141_CARD_EFFECT = '当你打出我时，给予最多两名其他友方单位增益。'
                                                                                     
const OTHER_FRIENDLY: Selector = { type: 'unit', fielded: true, controller: 'you', excludeSelf: true, isTarget: true }
export function makeEquilibriumMonkTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'grantBuff', target: { ref: 'chosen', key: 'a' } },
      { op: 'grantBuff', target: { ref: 'chosen', key: 'b' } },
    ],
  })
  return compileTrigger({
    id: 'OGN-141:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    chooses: [
      { key: 'a', prompt: '均衡僧侣:给予其他友方单位增益(第一名)', selector: OTHER_FRIENDLY },
      { key: 'b', prompt: '均衡僧侣:给予其他友方单位增益(第二名)', selector: OTHER_FRIENDLY, excludeChosen: ['a'] },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_141: Card = {
  id: 'OGN-141', cardNo: 'OGN·141/298', name: '均衡僧侣', category: 'unit',
  domains: ['orange'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时给其他两名友方单位增益(makeEquilibriumMonkTrigger)' }],
}

                                                              
                                       
                                               
                                             
                                                                     
                              
export const SFD_132_CARD_EFFECT = '当你打出我时，让另一名友方单位和一名敌方单位返回其所属的手牌。'
export function makeAbyssalLeviathanTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'bounceToOwnerHand', target: { ref: 'chosen', key: 'mate' } },
      { op: 'bounceToOwnerHand', target: { ref: 'chosen', key: 'foe' } },
    ],
  })
  return compileTrigger({
    id: 'SFD-132:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    chooses: [
      { key: 'mate', prompt: '海渊巨兽:让另一名友方单位返回其所属手牌', selector: OTHER_FRIENDLY },
      {
        key: 'foe', prompt: '海渊巨兽:让一名敌方单位返回其所属手牌',
        selector: { type: 'unit', fielded: true, controller: 'opponent', isTarget: true },
      },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_132: Card = {
  id: 'SFD-132', cardNo: 'SFD·132/221', name: '海渊巨兽', category: 'unit',
  domains: ['purple'], energy: 7, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时弹回一名友方与一名敌方单位(makeAbyssalLeviathanTrigger)' }],
}

                                                              
                                            
                    
                                            
                                                   
                                                    
                                            
                                                
export const OGN_223_CARD_EFFECT =
  '当你打出我时，给予我增益。如果你将我打出到一处战场，则给予此处包括我在内的所有友方单位增益。'
export function makeSummitGuardianTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'grantBuff', target: { ref: 'self' } }, // 第一句:无条件
      {
                              
        op: 'forEach',
        selector: { type: 'unit', zone: 'battlefield', controller: 'you', atSelfZone: true },
        then: [{ op: 'grantBuff', target: { ref: 'each' } }],
      },
    ],
  })
  return compileTrigger({
    id: 'OGN-223:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_223: Card = {
  id: 'OGN-223', cardNo: 'OGN·223/298', name: '巅峰守护者', category: 'unit',
  domains: ['yellow'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时给我增益;若打到战场则此处所有友方单位都得增益(makeSummitGuardianTrigger)' }],
}
