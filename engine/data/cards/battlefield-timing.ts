                                        
  
                                              
                                                               
                                                               
                                                                             
                                                           
  
                                    
                                      
                                                          
                                                
  
                               
                                                   
                                                                  
                                                       
                                                                            

import { hereOf } from './here-of'                            
import { MINION } from './reprint-batch'
import { variantSiblings } from '../variantAlias'            
import { SPRITE_TOKEN } from './batch-play-triggers'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasHaste, effectHasteChoice, type EffectCtx, type EffectSpec, type Op } from '../../src/dsl/effectSpec'                 
import type { Selector } from '../../src/dsl/selector'
import type { ChoiceRequest } from '../../src/loop/chain'        
import { hasteKeyOf } from './haste-key'                                    
import { resolveSelector } from '../../src/dsl/selector'
import type { GameState } from '../../src/state/gameState'
import type { Cost } from '../../src/state/runePool'         
import { payFromState } from '../../src/game/economy'                        
import type { GameEvent } from '../../src/loop/events'
import { spendExperienceCost } from './spend-xp-buff-self'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { GOLD_TOKEN } from './gear-triggers'
import { lookTakeRecycle } from './batch-play-triggers'
import { voidSproutChoice } from './SFD-018'        
import { LAST_RITES } from '../../src/keywords/lastRites'
import { wonBattle } from './won-battle-triggers'                                 
import { grantKeywordEvent, pumpEvent } from './activated-batch'                            
import { effectiveMight } from '../../src/state/might'                      
import { activateEvent } from './longtail-7'
import { currentKeywords } from '../../src/state/object'                                   
import { canDormantSelf } from './dormant-self-cost'                                            
import { applyEvents } from '../../src/loop/reduce'                                            
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'

                                                                 

                                    
function bfTrigger(
  id: string,
  timing: 'conquer' | 'hold' | 'movedTo',
  selfOid: ObjId,
  controller: PlayerId,
  spec: {
                                                                  
    readonly choose?: { key: string; prompt: string; selector: Selector; optional?: boolean }
    readonly postChoice?: (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null           
    readonly then: readonly Op[]
    readonly guard?: (ctx: EffectCtx) => boolean
                                                                         
                                                                      
                                              
    readonly oncePerTurn?: boolean
    readonly nthType?: boolean
                                                                                       
    readonly mayChoose?: boolean
  },
): Trigger {
  const effSpec: EffectSpec = { then: spec.then, ...(spec.guard ? { guard: spec.guard } : {}) }
  const effect = compileEffect(effSpec)
  const haste = effectHasHaste(effSpec)                                                                             
  return compileTrigger({
    id,
    event: timing === 'movedTo' ? 'unitMoved' : timing,
    by: 'you',
    when: timing === 'movedTo'
                                                        
      ? [{ kind: 'subjectIsSelf' }, { kind: 'movedToBattlefield' }]
                                                
      : [{ kind: 'selfAtEventBattlefield' }],
    ...(spec.mayChoose === true ? { mayChoose: spec.mayChoose } : {}), // ★1052 §383.3.a(不写字面量,免得污染 mayChoosePosition 那把尺子)
    ...(spec.choose ? { choose: spec.choose } : {}),
    ...(spec.postChoice !== undefined || haste
      ? { postChoice: (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null =>
          spec.postChoice?.(state, chosen) ?? (haste ? effectHasteChoice(effSpec, state, controller, chosen) : null) }
      : {}), // ★749 透传;★1398 DSL 急速钩接在其后
    ...(spec.oncePerTurn === true ? { oncePerTurn: true } : {}), // §383.1
    ...(spec.nthType === true ? { nthType: true } : {}),          // §383.1.b
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                             
                                       
                                                
  
                                                               
                                                               
                                                    
                                         
                                                                   
export const SFD_179_CARD_EFFECT = '当我移动到一处战场时，在此处打出三名1{{S}}的“随从”。'
                        
export const SFD_179_MINIONS = 3
                                                      
export function sfd179HasteKey(i: number): string {
  return hasteKeyOf('SFD-179:minion', i)
}
export function makeKahinaTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-179:moved', 'movedTo', selfOid, controller, {
                                                                        
    then: Array.from({ length: SFD_179_MINIONS }, (_, i): Op => ({ op: 'spawnToken', spec: MINION, zone: hereOf, haste: { key: sfd179HasteKey(i + 1), label: '随从' } })),
  })
}
export const SFD_179: Card = {
  id: 'SFD-179', cardNo: 'SFD·179/221', name: '卡银娜·薇蕊泽', category: 'unit',
  domains: ['yellow'], energy: 7, power: 6, keywords: ['急速'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时在此处打出三名随从(makeKahinaTrigger);[急速]走§805' }],
}

                                                                
                                                                       
                                 
                                                             
                                                                           
                                                                                        
                          
                                                      
  
                                                
                                                                      
                                                                                 
                                                                   
                                                                                       
                                                                               
                                                                                                                                                          
export const SFD_112_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n' +
  '当我移动到一处战场时，让另一名友方单位在本回合内获得我的关键词和等同于我战力的+{{S}}加成。'
export function makeKatoTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-112:moved', 'movedTo', selfOid, controller, {
    choose: {
      key: 'ally', prompt: '巨腕加藤:让另一名友方单位本回合获得我的关键词和等同于我战力的战力加成',
      selector: { type: 'unit', fielded: true, controller: 'you', excludeSelf: true, isTarget: true },
    },
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const target = ctx.chosen['ally']
        const me = ctx.selfOid ? ctx.state.objects[ctx.selfOid] : undefined
        if (target === undefined || !me) return []
        const kws = currentKeywords(me)
        const might = effectiveMight(me).reference
        return [
          ...kws.map((kw) => grantKeywordEvent(`SFD-112:kw:${kw}`, target, kw)),
          ...(might > 0 ? [pumpEvent('SFD-112:pump', target, might)] : []),
        ]
      },
    }],
  })
}
export const SFD_112: Card = {
  id: 'SFD-112', cardNo: 'SFD·112/221', name: '巨腕加藤', category: 'unit',
  domains: ['orange'], energy: 4, power: 3, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时给另一名友方单位抄我的关键词+等同我战力的{S}(makeKatoTrigger)' }],
}

                                                                  
                              
                         
                     
  
                                                       
                                    
                                                                                
                                               
                                                                       
                                                            
                                                                    
                                                              
                                                          
                                    
export const SFD_123_CARD_EFFECT =
  '每当我移动到一处战场时，弃置一张手牌。\n每当我赢得战斗时，抽一张牌。'
                        
export const SFD_123_DRAW = 1

                               
export function makeCorruptEnforcerMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-123:moved', 'movedTo', selfOid, controller, {
    choose: {
      key: 'card', prompt: '腐化执法官:弃置一张手牌',
      selector: { type: 'any', zone: 'hand', owner: 'you' },
    },
    then: [{ op: 'moveTo', target: { ref: 'chosen', key: 'card' }, zone: (ctx) => `discard:${ctx.controller}` }],
  })
}

                                                 
export function makeCorruptEnforcerWinTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-123:won:${selfOid}`, rawId: true, sourceDefId: 'SFD-123',
    event: 'battleEnd',
    by: 'any', // §466「一场战斗」不限是谁发起的
    when: [{ kind: 'custom', test: (ev): boolean => wonBattle(ev, selfOid, controller) }],
    effect: (): readonly GameEvent[] => [
      { kind: 'draw', player: controller, count: SFD_123_DRAW } as GameEvent,
    ],
  }, selfOid, controller)
}

export const SFD_123: Card = {
  id: 'SFD-123', cardNo: 'SFD·123/221', name: '腐化执法官', category: 'unit',
  domains: ['purple'], energy: 3, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时弃一张手牌;赢得战斗时抽一张(两条触发)' }],
}

                                                          
                                  
  
                                                                        
                                                                                
                                                       
                                         
                                                           
                                                                                
export const UNL_127_CARD_EFFECT = '当我移动至战场时，获得2经验。'
                
export const UNL_127_XP = 2
export function makeMisterRootTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('UNL-127:moved', 'movedTo', selfOid, controller, {
    then: [{ op: 'gainExperience', amount: UNL_127_XP }],
  })
}
export const UNL_127: Card = {
  id: 'UNL-127', cardNo: 'UNL-127/219', name: '树根先生', category: 'unit',
  domains: ['purple'], energy: 2, power: 1, keywords: ['急速'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动至战场时获得2经验(makeMisterRootTrigger);[急速]走§805' }],
}

                                                             
                                            
  
                                         
                                                                
                                  
                                                                
                                                                                   
                                                               
                 
  
                                                   
                                                                    
                                                                             
                                                 
export const SFD_113_CARD_EFFECT = '每回合首次，当我征服一处战场时，让我变为活跃状态。'
export function makeLucianTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-113:conquer', 'conquer', selfOid, controller, {
    oncePerTurn: true,
    nthType: true,
    then: [{
      op: 'custom',
      emit: (ctx) => {
        const me = ctx.selfOid ? ctx.state.objects[ctx.selfOid] : undefined
        const e = me ? activateEvent(me) : null
        return e ? [e] : []
      },
    }],
  })
}
export const SFD_113: Card = {
  id: 'SFD-113', cardNo: 'SFD·113/221', name: '卢锡安', category: 'unit',
  domains: ['orange'], energy: 3, power: 3, keywords: ['百炼'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合首次征服一处战场时让我变为活跃状态(makeLucianTrigger);[百炼]走§821工厂' }],
}

                                                         
function goldOp(): Op {
  return { op: 'spawnToken', spec: GOLD_TOKEN, zone: (ctx) => `base:${ctx.controller}`, dormant: true }
}

                                                              
                                                 
export const SFD_069_CARD_EFFECT = '当我征服一处战场时，打出一个休眠的“金币”装备指示物。'
export function makeBadPoroTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-069:conquer', 'conquer', selfOid, controller, { then: [goldOp()] })
}
const badPoro = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '坏坏魄罗', category: 'unit',
  domains: ['blue'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '征服一处战场时打出一个休眠金币(makeBadPoroTrigger)' }],
})
export const SFD_069: Card = badPoro('SFD-069', 'SFD·069/221')
export const UNL_222: Card = badPoro('UNL-222', 'UNL-222/219')             

                                                               
                                   
                                        
export const SFD_152_CARD_EFFECT = '当我据守一处战场时，打出两个休眠的“金币”装备指示物。'
export function makeGoldPatronTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-152:hold', 'hold', selfOid, controller, { then: [goldOp(), goldOp()] })
}
export const SFD_152: Card = {
  id: 'SFD-152', cardNo: 'SFD·152/221', name: '显赫金主', category: 'unit',
  domains: ['yellow'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '据守一处战场时打出两个休眠金币(makeGoldPatronTrigger)' }],
}

                                                                
                    
                                           
                                           
                                   
                                                        
export const VEN_042_CARD_EFFECT =
  '当我据守一处战场时，如果你在此处控制的其他单位有且仅有一个，则抽一张牌。'
export function makeShenTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('VEN-042:hold', 'hold', selfOid, controller, {
    guard: (ctx) => resolveSelector(
      ctx.state,
      { type: 'unit', zone: 'battlefield', controller: 'you', atEventBattlefield: true, excludeSelf: true },
      ctx.controller, { ev: ctx.ev, ...(ctx.selfOid !== null ? { selfOid: ctx.selfOid } : {}) },
    ).length === 1,
    then: [{ op: 'draw', count: 1 }],
  })
}
const shen = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '慎', category: 'unit',
  domains: ['green'], energy: 5, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '据守时若此处己方其他单位恰好一名则抽1(makeShenTrigger)' }],
})
export const VEN_042: Card = shen('VEN-042', 'VEN·042')
export const VEN_170: Card = shen('VEN-170', 'VEN·170')             

                                                                    
                                                                         
                                
                                            
                                                                 
                                                  
export const VEN_138_CARD_EFFECT =
  '{{坚守}}（如果我是防守方，则{{S}}+1。）\n' +
  '当我据守一处战场时，如果此处受你控制的其他单位有且仅有一个，则你获得1分。'
                             
export const VEN_138_POINTS = 1
export function makeShen138Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('VEN-138:hold', 'hold', selfOid, controller, {
    guard: (ctx) => resolveSelector(
      ctx.state,
      { type: 'unit', zone: 'battlefield', controller: 'you', atEventBattlefield: true, excludeSelf: true },
      ctx.controller, { ev: ctx.ev, ...(ctx.selfOid !== null ? { selfOid: ctx.selfOid } : {}) },
    ).length === 1,
    then: [{
      op: 'custom',
      emit: (): readonly GameEvent[] =>
        [{ kind: 'gainPoint', player: controller, amount: VEN_138_POINTS } as GameEvent],
    }],
  })
}
const shen138 = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '慎', category: 'unit',
  domains: ['yellow'], energy: 6, power: 7, keywords: ['坚守'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[坚守]§814 防守方时 S+1(通用求值)' },
    { kind: 'passive', describe: '据守时此处我控其他单位恰好一个→得1分(makeShen138Trigger)' },
  ],
})
export const VEN_138: Card = shen138('VEN-138', 'VEN·138')
export const VEN_138A: Card = shen138('VEN-138a', 'VEN·138a')

                                                          
                                                      
                                
                                                    
                                                              
                                                                             
                                            
export const UNL_048_CARD_EFFECT =
  '{{坚守}}（如果我是防守方，则{{S}}+1。）\n' +
  '当我据守一处战场时，在此处打出一名处于活跃状态的3{{S}}"精灵"，它拥有{{瞬息}}。'
export function makeTrevorTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('UNL-048:hold', 'hold', selfOid, controller, {
    then: [{ op: 'spawnToken', spec: SPRITE_TOKEN, zone: hereOf, ready: true }],
  })
}
export const UNL_048: Card = {
  id: 'UNL-048', cardNo: 'UNL-048/219', name: '特雷弗·达顿尔', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: ['坚守'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[坚守]§814 防守方时 S+1(通用求值)' },
    { kind: 'passive', describe: '据守时在此处打出活跃3S精灵带[瞬息](makeTrevorTrigger)' },
  ],
}

                                                            
                                               
                                             
export const OGN_222_CARD_EFFECT = '当我移动到一处战场时，在此处打出一名1S的“随从”（它也位于此战场）。'
                                       
export const OGN_222_HASTE_KEY = hasteKeyOf('OGN-222:minion')
export function makeNoxianDrummerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('OGN-222:moved', 'movedTo', selfOid, controller, {
                                                  
    then: [{ op: 'spawnToken', spec: MINION, zone: hereOf, haste: { key: OGN_222_HASTE_KEY, label: '随从' } }], // ㊼ 第314轮收口;★1399 缺陷 176 B4 · DSL 钩
  })
}
export const OGN_222: Card = {
  id: 'OGN-222', cardNo: 'OGN·222/298', name: '诺克萨斯鼓手', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时在此处打出一名1[M]随从(makeNoxianDrummerTrigger)' }],
}

                                                               
                                        
                                            
                            
export const SFD_038_CARD_EFFECT = '当我移动到一处战场时，让另一名友方单位在本回合内S+1。'
export function makeSilkDancerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('SFD-038:moved', 'movedTo', selfOid, controller, {
    choose: {
      key: 'unit', prompt: '绸舞士:让另一名友方单位本回合战力+1',
                                                  
      selector: { type: 'unit', fielded: true, controller: 'you', excludeSelf: true, isTarget: true },
    },
    then: [{
      op: 'addMight', target: { ref: 'chosen', key: 'unit' },
      delta: 1, duration: 'thisTurn', id: `SFD-038:might:${selfOid}`,
    }],
  })
}
export const SFD_038: Card = {
  id: 'SFD-038', cardNo: 'SFD·038/221', name: '绸舞士', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时让另一名友方单位本回合[M]+1(makeSilkDancerTrigger)' }],
}

                                                                          
                                     
                                                                
                                                       
  
                                           
                                                 
                                       
  
                                           
                                                
                                                             
                                                                          

                                                                                
                                                                                      
                                                                      
                                                                              
                                                                                        
                                                                                                      
                                                                 

                                                                 
                    
                                           
                                            
                                   
                                               
                                                 
                                             
                                           
export const UNL_193_CARD_EFFECT =
  '当你或一名盟友据守一处战场时，你可以选择让我变为休眠状态，以此抽一张牌。'
export function makeGloomBringerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                 
                                                       
  const effect = compileEffect({
    then: [{ op: 'draw', count: 1 }], // 收益;费用在下面 basePerform(确认阶段)
  })
  return compileTrigger({
    id: `UNL-193:hold:${selfOid}`, rawId: true, sourceDefId: 'UNL-193',
    event: 'hold', by: 'you',
    mayChoose: true, // §383.3.a 开头「你可以选择」
    when: [
      { kind: 'eventPlayerIs', side: 'you' },
      { kind: 'custom', test: (_ev, state) => canDormantSelf(state, selfOid) }, // ★1581 入链门槛:付得出这项费用(读归一后的 tapped 轴)
    ],
                                                                             
                                                                        
                                                                                  
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
const gloomBringer = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '愁云使者', category: 'legend',
  domains: ['green', 'purple'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守时可让自己休眠换抽一张牌(makeGloomBringerTrigger)' }],
})
export const UNL_193: Card = gloomBringer('UNL-193', 'UNL-193/219')
export const UNL_232: Card = gloomBringer('UNL-232', 'UNL-232/219')             

                                                                 
                    
                      
                         
                                                 
                                               
                                        
export const UNL_203_CARD_EFFECT = '当你据守一处战场时，获得1经验。\n消耗3经验，横置：抽一张牌。'
export function makeSteadfastHammerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'gainExperience', amount: 1 }] })
  return compileTrigger({
    id: `UNL-203:hold:${selfOid}`, rawId: true, sourceDefId: 'UNL-203',
    event: 'hold', by: 'you',
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 传奇不在战场上,判据是"据守者是我"
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
                                                     
export const STEADFAST_HAMMER_ACTIVATED: ActivatedSpec = {
  key: 'hammer:draw',
  label: '消耗3经验,横置:抽一张牌',
  cost: {},          // 无资源费用
  tapSelf: true,     // [横置] 是 §145 的 [E] 轴,与「休眠」dormant 无关
  target: 'none' as const,
                                                             
  extraCost: spendExperienceCost(3),
  makeResolve: (ctx) => (): readonly GameEvent[] => [{ kind: 'draw', player: ctx.controller, count: 1 }],
}
const steadfastHammer = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '圣锤之毅', category: 'legend',
  domains: ['orange', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '据守时获得1经验;可消耗3经验横置抽1(makeSteadfastHammerTrigger)' }],
})
export const UNL_203: Card = steadfastHammer('UNL-203', 'UNL-203/219')
export const UNL_237: Card = steadfastHammer('UNL-237', 'UNL-237/219')             

                                                              
                           
                                             
                                                    
                                                                   
                         
                                 
export const OGN_066_CARD_EFFECT = '当我据守一处战场时，你获得的分数+1。'
                                 
const AHRI_KIN: readonly string[] = variantSiblings('OGN-066')

export function ahriScoringBonus(
  state: GameState, player: PlayerId, battlefield: string, kind: 'conquer' | 'hold',
): number {
  if (kind !== 'hold') return 0           
  let bonus = 0
  for (const o of Object.values(state.objects)) {
                                                                
    if (!AHRI_KIN.includes(o.defId)) continue
    if (o.controller !== player) continue
    if ((o.zone as string) !== battlefield) continue                      
    bonus += 1
  }
  return bonus
}
                                                               
                                             
                                                       
  
                                                           
                                          
                                                          
                                                                     
                                                                       
                                              
                                              
  
                                                            
                                                      
                                                                                    
                                          
                                                      
export const TAHM_EXCESS_THRESHOLD = 5
export const OGN_034_CARD_EFFECT =
  '当我通过进攻征服一处战场时，如果你给敌方单位造成过不低于5点的过量伤害，则你获得的分数+1。'

export function tryndamereScoringBonus(
  state: GameState, player: PlayerId, battlefield: string, kind: 'conquer' | 'hold',
): number {
                                           
  if (kind !== 'conquer') return 0
                                                                  
  if ((state.maxExcessDamageThisTurn?.[player as string] ?? 0) < TAHM_EXCESS_THRESHOLD) return 0
  let bonus = 0
  for (const o of Object.values(state.objects)) {
    if (o.defId !== 'OGN-034') continue
    if (o.controller !== player) continue
    if ((o.zone as string) !== battlefield) continue                         
    bonus += 1
  }
  return bonus
}

export const OGN_034: Card = {
                                                                
  id: 'OGN-034', cardNo: 'OGN·034/298', name: '泰达米尔', category: 'unit',
  domains: ['red'], energy: 7, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我进攻征服时,若本回合造成过≥5过量伤害则该次得分+1(tryndamereScoringBonus)' }],
}

export const OGN_066: Card = {
  id: 'OGN-066', cardNo: 'OGN·066/298', name: '阿狸', category: 'unit',
  domains: ['green'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我据守时该次得分+1(ahriScoringBonus,走 ScoringHooks 不发事件)' }],
}

                                                                          
                       
                                                            
  
                                                       
                                                    
                                                                          

                           
function eventBattlefieldOf(ctx: EffectCtx): string {
  const ev = ctx.ev as { battlefield?: string; to?: string }
  return ev.battlefield ?? ev.to ?? ''
}

                                                              
                                      
                                            
                                                          
export const UNL_112_CARD_EFFECT = '当我移动到一处战场时，你可以选择将一名敌方单位移动到该战场。'
export function makeAlluringSpriteTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger('UNL-112:moved', 'movedTo', selfOid, controller, {
    mayChoose: true, // ★1052【缺陷第 42 条】卡文开头「你可以选择」(§383.3.a),原先没给拒绝路,玩家被迫把敌方拉过来
    choose: {
      key: 'foe', prompt: '诱人仙灵:把一名敌方单位拉到该战场',
                                             
      selector: { type: 'unit', fielded: true, controller: 'opponent', isTarget: true },
    },
    then: [{ op: 'moveOnField', target: { ref: 'chosen', key: 'foe' }, zone: eventBattlefieldOf }],
  })
}
export const UNL_112: Card = {
  id: 'UNL-112', cardNo: 'UNL-112/219', name: '诱人仙灵', category: 'unit',
  domains: ['orange'], energy: 2, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时可把一名敌方单位拉到该战场(makeAlluringSpriteTrigger)' }],
}

                                                              
                                                    
                                                                
                                                               
                                                  
export const SFD_125_CARD_EFFECT =
  '当我移动到一处战场时，你可以选择支付紫色，将你控制的另一名单位移动到相同的战场。'
                                                    
export const SFD_125_COST: Cost = { pips: [['purple']] }
export function makeStrongSpriteTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                              
                                                       
                                                          
                                                          
                                                   
  const effect = compileEffect({
    then: [{ op: 'moveOnField', target: { ref: 'chosen', key: 'mate' }, zone: eventBattlefieldOf }],
  })
  return compileTrigger({
    id: `SFD-125:moved:${selfOid}`, rawId: true, sourceDefId: 'SFD-125',
    event: 'unitMoved', by: 'you',
    mayChoose: true, // §383.3.a 开头「你可以选择」
    when: [{ kind: 'subjectIsSelf' }, { kind: 'movedToBattlefield' }],
    choose: {
      key: 'mate', prompt: '大力仙灵:支付 1 点混沌符能,把你控制的另一名单位拉到相同的战场',
      selector: { type: 'unit', fielded: true, controller: 'you', excludeSelf: true, isTarget: true },
    },
                                                              
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, SFD_125_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_125: Card = {
  id: 'SFD-125', cardNo: 'SFD·125/221', name: '大力仙灵', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时可付紫符能把另一名友方单位拉过来(makeStrongSpriteTrigger)' }],
}

                                                             
                               
                                             
                                                                   
                        
                                                        
                                            
export const SFD_126_CARD_EFFECT = '当你防守一处战场时，可以选择将我移动到此战场。'
export function makeLoyalHoundTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'moveOnField', target: { ref: 'self' }, zone: eventBattlefieldOf }],
  })
  return compileTrigger({
    id: `SFD-126:defend:${selfOid}`, rawId: true, sourceDefId: 'SFD-126',
    event: 'defend', by: 'you',
    mayChoose: true, // 「可以选择」
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_126: Card = {
  id: 'SFD-126', cardNo: 'SFD·126/221', name: '忠诚的猎犬', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你防守一处战场时可把我移过去(makeLoyalHoundTrigger)' }],
}

                                                               
                                          
                                             
                                         
                           
export const OGS_023_CARD_EFFECT =
  '当你征服一处战场时，如果你在该战场上拥有不少于四名单位，则抽两张牌。'
export function makeDemaciaMightTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    guard: (ctx) => resolveSelector(
      ctx.state,
      { type: 'unit', zone: 'battlefield', controller: 'you', atEventBattlefield: true },
      ctx.controller, { ev: ctx.ev },
    ).length >= 4,
    then: [{ op: 'draw', count: 2 }],
  })
  return compileTrigger({
    id: `OGS-023:conquer:${selfOid}`, rawId: true, sourceDefId: 'OGS-023',
    event: 'conquer', by: 'you',
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGS_023: Card = {
  id: 'OGS-023', cardNo: 'OGS·023/024', name: '德玛西亚之力', category: 'legend',
  domains: ['orange', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '征服时若该战场上己方单位≥4则抽2(makeDemaciaMightTrigger)' }],
}

                                                                       
                            
                                      
                                        
                                                             
                                
  
                                                      
                                                                                                    
                                                             
                                            
                                                                                                
                                                    
                                                                    
                                    
                                                    
                                                   
                                               
export const UNL_179_LOOK = 3
export const UNL_179_KEY = 'u179card'
export const UNL_179_CARD_EFFECT =
  '当我移动至一处战场时，查看你主牌堆顶部的三张牌。你可以选择从中展示一名单位，并抽取该卡牌。回收其余的卡牌。 {{绝念>}} 从你的手牌中打出一名单位到你的基地，无视其法力费用。（当我被摧毁后，发动此效果。仍需支付所有符能费用。）'

                            
export function makeRiftHeraldMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return bfTrigger(`UNL-179:moved:${selfOid}`, 'movedTo', selfOid, controller, {
    choose: {
      key: UNL_179_KEY,
      prompt: `峡谷先锋:从顶${UNL_179_LOOK}张里取一名单位`,
                                                               
      selector: { type: 'unit', zone: 'mainDeck', owner: 'you', topOfDeck: UNL_179_LOOK },
      optional: true, // §383.3.a.3「你可以选择」在后半部分 ⇒ 可以一张都不拿(与 UNL-064 同款)
    },
    postChoice: (st, ch) => voidSproutChoice(st, controller, ch), // ★749 兽苗前置
    then: lookTakeRecycle(UNL_179_LOOK, UNL_179_KEY),
  })
}

export const UNL_179: Card = {
  id: 'UNL-179', cardNo: 'UNL-179/219', name: '峡谷先锋', category: 'unit',
  domains: ['yellow'], energy: 8, power: 7, keywords: [LAST_RITES], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动到战场时查顶3取一名单位;[绝念]从手牌免法力打出一名单位' }],
}
