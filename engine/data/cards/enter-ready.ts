                                  
  
                            
                                                      
                                                 
                                                  
                                            
  
                                     
                                                                    
                                             
                                              
                             
  
                                                     
                                                       

import type { Card } from '../../src/dsl/card'
import { variantSiblings } from '../variantAlias'                             
import { sameNameCountInDiscard } from './same-name'
import type { Trigger } from '../../src/dsl/trigger'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { Cost } from '../../src/state/runePool'         
import { payFromState } from '../../src/game/economy'                        
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { fieldedUnits } from './activated-batch'                          
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { resolveSelector } from '../../src/dsl/selector'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { experienceOf } from '../../src/keywords/level'
import { LEVEL_ENTRY_READY, levelReached } from './level-self'
import type { ZoneId } from '../../src/state/ids'
import { playedToBattlefield } from './UNL-194'
import { leonaEnterReady } from './OGN-079'            
import { objectHasCardTag } from '../cardTagQuery'                              

   
                           
                                                    
                                             
                                                     
   
                                                                                 
                                                                
                                             
export type EnterReadyCond = (state: GameState, player: PlayerId, to?: string, self?: string) => boolean

const always: EnterReadyCond = () => true

                                              
const vayneEntry: EnterReadyCond = (state, player) =>
  state.players.some((p) => p !== player && controlledBattlefields(state, p).length > 0)

   
                               
  
                                           
                                                         
                                                    
                                                                     
                                             
  
                                                   
                                                                 
                                                      
                                                             
                                                                              
                                                                              
                                                        
                                                                
                                                       
                                                                                 
                                                               
                             
                                                                          
                                                         
                                                  
                                                                           
                                                                                       
                                                   
                                                         
                                                              
                                              
   
function myFieldedUnits(state: GameState, player: PlayerId, except?: string) {
  return Object.values(state.objects).filter((o) => {
    const k = state.zones[o.zone]?.kind
    return (k === 'battlefield' || k === 'base') && isUnit(o) && o.controller === player && (except === undefined || (o.oid as string) !== except)
  })
}

   
                                                     
                                                     
  
                                              
                                                             
                                                
                                                                                          
                                                                   
                                                                    
                                                                           
                                                             
                                                                
                                                                 
                                                           
                                               
                                                       
                                                     
   
const BOARD_WIDE_ENTER_READY: Readonly<Record<string, EnterReadyCond>> = {
  'OGN-011': (state, player, _to, self) => myFieldedUnits(state, player, self).some((o) => o.defId === 'OGN-011'), // ★1082「其他友方单位」:自己打出时不算
                                                           
                                               
                                                                    
                                         
                                            
  'UNL-191': (state, player) => wujuLevel(state, player, 'UNL-191'),
  'UNL-231': (state, player) => wujuLevel(state, player, 'UNL-231'),
}

                                 
function wujuLevel(state: GameState, player: PlayerId, defId: string): boolean {
  const inLegendZone = (state.zones[`legend:${player}`]?.contents ?? [])
    .some((oid) => state.objects[oid]?.defId === defId)
  return inLegendZone && experienceOf(state, player) >= 11
}

                                      
export function boardWideEnterReady(state: GameState, player: PlayerId, self?: string): boolean {
  return Object.values(BOARD_WIDE_ENTER_READY).some((cond) => cond(state, player, undefined, self))
}

                         
export const BOARD_WIDE_ENTER_READY_DEFIDS: readonly string[] = Object.keys(BOARD_WIDE_ENTER_READY)

                                                      
  
                    
                                                                    
                                                              
                                                        
                                           

                                                           
export const SFD_171_CARD_EFFECT = '你的指示物以活跃状态进场。'

const TOKEN_ENTER_READY: Readonly<Record<string, EnterReadyCond>> = {
                                                    
                                                          
                                                       
  'SFD-171': (state, player) => {
    const kin = variantSiblings('SFD-171')
    return myFieldedUnits(state, player).some((o) => kin.includes(o.defId))
  },
}

                                                               
export function tokenEntersReady(state: GameState, owner: PlayerId): boolean {
  return Object.values(TOKEN_ENTER_READY).some((cond) => cond(state, owner))
}

                                 
export const TOKEN_ENTER_READY_DEFIDS: readonly string[] = Object.keys(TOKEN_ENTER_READY)

export const SFD_171: Card = {
  id: 'SFD-171', cardNo: 'SFD·171/221', name: '烈娜塔·戈拉斯克', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的指示物以活跃状态进场(TOKEN_ENTER_READY)' }],
}

                                                             
export const OGN_011_CARD_EFFECT = '当我在场上时，其他友方单位以活跃状态进场。'
export const OGN_011: Card = {
  id: 'OGN-011', cardNo: 'OGN·011/298', name: '熔浆巨龙', category: 'unit',
  domains: ['red'], energy: 8, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我在场上时其他友方单位活跃进场(BOARD_WIDE_ENTER_READY)' }],
}

   
                                                  
                                                      
   
export function makeEnterReadyTable(
  hasTag: (defId: string, tag: string) => boolean,
  nameOf?: (defId: string) => string,
): Readonly<Record<string, EnterReadyCond>> {
     
                                            
                                                         
                                       
     
                                                           
                            
  const sameNameInMyDiscard = (self: string): EnterReadyCond => (state, player) =>
    nameOf ? sameNameCountInDiscard(state, player, self, nameOf) >= 1 : false
  return {
                                                       
    'SFD-006': always, // 好斗的龙犬
    'OGS-016': always, // 先锋扈从
    'OGS-009': always, // 易(另有印刷关键词[游走])
    'UNL-001': always, // 竞技场理事(另有[横置]主动技能)
    'ARC-004': always, // 沃里克(再版 OGN-159 走别名)
    'UNL-196': always, // 小菊!(第255轮;另有减费与进攻眩晕两句)

                                                                  
                                              
                                                                       
      
                                             
                                                                   
                                                        
      
                                                         
                                                   
                                                             
                                         
    'UNL-008': (state) => Object.values(state.unitDestroyedThisTurn ?? {}).some((v) => v === true),

                                              
                                                    
                                     
    'SFD-027': (state, player) => (state.zones[`hand:${player}`]?.contents.length ?? 0) <= 2,

                                                
                                           
                                           
                                                               
    'SFD-094': (state, player, _to, self) =>                                  
                                                                        
                                                              
                                                             
                                                                   
      myFieldedUnits(state, player, self).some((o) => objectHasCardTag(o, '龙')),

                                                                
                                    
                                                                   
                                            
    'UNL-194': playedToBattlefield,

                                                         
                                          
                                                     
                                                                  
    'OGN-079': leonaEnterReady,

                                                                
                                                          
                                                 
                                                                              
                                                  
                                                            
    'UNL-037': (state, player) => state.allyDiedInStartPhaseThisTurn?.[player as string] === true,

                                                                
                                                         
    'SFD-176': (state, player, _to, self) => Object.values(state.objects).filter((o) =>                                
      (o.zone as string) === `base:${player}` && isUnit(o) && (o.oid as string) !== self).length >= 2,

                                            
                                                            
                                                        
                                                            
                                                         
    'OGN-035': vayneEntry,
    'SFD-223': vayneEntry,

                                                        
                                               
    'SFD-071': (state, player, _to, self) =>                             
                                                                        
                                                               
                                                             
                                                                   
      myFieldedUnits(state, player, self).some((o) => objectHasCardTag(o, '机械')),

                                                                     
    'VEN-091': (state, player) => state.winTarget - (state.scores[player] ?? 0) > 3,

                                         
    'VEN-013': sameNameInMyDiscard('VEN-013'),

                                                   
                                          
                                                           
                                      
    ...Object.fromEntries(Object.entries(LEVEL_ENTRY_READY).map(
      ([defId, n]): [string, EnterReadyCond] => [defId, (state, player) => levelReached(state, player, n)],
    )),
  }
}

                                                                      

export const SFD_006_CARD_EFFECT = '我以活跃状态进场。'
export const SFD_006: Card = {
  id: 'SFD-006', cardNo: 'SFD·006/221', name: '好斗的龙犬', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '以活跃状态进场(ENTER_READY 表)' }],
}

export const OGS_016_CARD_EFFECT = '我以活跃状态进场。'
export const OGS_016: Card = {
  id: 'OGS-016', cardNo: 'OGS·016/024', name: '先锋扈从', category: 'unit',
  domains: ['yellow'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '以活跃状态进场(ENTER_READY 表)' }],
}

                                                              
                                        
                                                           
                                                          
export const OGS_009_CARD_EFFECT = '{{游走}}（我可以向其他战场进行移动。）\n我以活跃状态进场。'
export const OGS_009: Card = {
  id: 'OGS-009', cardNo: 'OGS·009/024', name: '易', category: 'unit',
  domains: ['orange'], energy: 7, power: 6, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[游走];以活跃状态进场(ENTER_READY 表)' }],
}

                                                             
                                            
                                                             
export const UNL_001_CARD_EFFECT = '我以活跃状态进场。\n{{横置}}：让一名单位在本回合内{{S}}+3。'
export const UNL_001_SPEC: ActivatedSpec = {
  key: 'UNL-001:pump',
  label: '{{横置}}:让一名单位本回合战力+3',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] =>
    fieldedUnits(state), // ★1515:折到共用件(㊼ 「一名单位」零限定;判据逐字等价)
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{
      kind: 'addEffect',
      effect: {
        id: `UNL-001:pump:${target}`, duration: 'thisTurn', fromPassive: false,
        predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
        modification: { kind: 'addMight', delta: 3 },
      },
    } as GameEvent],
}
export const UNL_001: Card = {
  id: 'UNL-001', cardNo: 'UNL-001/219', name: '竞技场理事', category: 'unit',
  domains: ['red'], energy: 5, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '以活跃状态进场;[横置]让一名单位本回合+3(UNL_001_SPEC)' }],
}

                                                           
                                        
                                                  
                                                   
                           
export const ARC_004_CARD_EFFECT = '我以活跃状态进场。\n当我进攻时，摧毁此处所有已受伤的敌方单位。'
export function makeWarwickTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'forEach',
      selector: {
        type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent',
        filter: (o) => o.damage > 0, // 「已受伤」
      },
      then: [{ op: 'destroy', target: { ref: 'each' } }],
    }],
  })
  return compileTrigger({
    id: `ARC-004:attack:${selfOid}`, rawId: true, sourceDefId: 'ARC-004',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const ARC_004: Card = {
  id: 'ARC-004', cardNo: 'ARC-004/006', name: '沃里克', category: 'unit',
  domains: ['orange'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '以活跃状态进场;进攻时摧毁此处所有已受伤敌方单位(makeWarwickTrigger)' }],
}

                                                             
                                               
                                                                     
export const SFD_027_CARD_EFFECT = '如果你的手牌不超过两张，则我以活跃状态进场。\n当我据守一处战场时，抽两张牌。'
export function makeSandhornTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 2 }] })
  return compileTrigger({
    id: `SFD-027:hold:${selfOid}`, rawId: true, sourceDefId: 'SFD-027',
    event: 'hold', by: 'you',
    when: [{ kind: 'selfAtEventBattlefield' }], // 单位卡的据守
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_027: Card = {
  id: 'SFD-027', cardNo: 'SFD·027/221', name: '穿沙角兽', category: 'unit',
  domains: ['red'], energy: 7, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '手牌≤2则活跃进场;据守时抽两张(makeSandhornTrigger)' }],
}

export const SFD_094_CARD_EFFECT = '如果你控制着其他“龙”属性单位，则我以活跃状态进场。'
export const SFD_094: Card = {
  id: 'SFD-094', cardNo: 'SFD·094/221', name: '凶翼', category: 'unit',
  domains: ['orange'], energy: 7, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '控制其他"龙"单位则活跃进场(ENTER_READY 表)' }],
}

                                  
export const VEN_013_CARD_EFFECT = '如果你的废牌堆中有一张和我同名的卡牌，则我以活跃状态进场。'
export const VEN_013: Card = {
  id: 'VEN-013', cardNo: 'VEN·013', name: '暗影刺客', category: 'unit',
  domains: ['red'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '废牌堆有同名卡则以活跃状态进场(ENTER_READY)' }],
}

   
                    
                                          
                                                         
                                       
                                                            
   
export const ENTER_READY_DEFIDS: readonly string[] = Object.keys(makeEnterReadyTable(() => false))

                                                  
  
                                  
                                                        
                                                                   
                                
                                                                    
                                                    
                                                                         
                                  
                                                             
                                                                

                                                                 
                                          
                                                
                                       
                                                                     
export const UNL_008_KEYWORDS: readonly string[] = ['强攻']
export const UNL_008_CARD_EFFECT =
  '{{强攻}}（如果我是进攻方，则{{S}}+1。）\n如果本回合内有单位被摧毁，则我以活跃状态进场。'
export const UNL_008: Card = {
  id: 'UNL-008', cardNo: 'UNL-008/219', name: '莽林巨象', category: 'unit',
  domains: ['red'], energy: 6, power: 6, keywords: [...UNL_008_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合死过任何单位则活跃进场(ENTER_READY 表)' }],
}

export const UNL_037_CARD_EFFECT = '本回合内，如果一名友方单位在你的开始阶段被摧毁，则我以活跃状态进场。'
export const UNL_037: Card = {
  id: 'UNL-037', cardNo: 'UNL-037/219', name: '影卫', category: 'unit',
  domains: ['green'], energy: 4, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我的开始阶段死过友方单位则活跃进场(ENTER_READY 表)' }],
}

                                                               
                                                          
                                                                       
                                             
                            
export const SFD_176_CARD_EFFECT =
  '{{壁垒}}（我在战斗中首先承担伤害。）\n如果你的基地中有不少于两名其他单位，则我以活跃状态进场。'
export const SFD_176: Card = {
  id: 'SFD-176', cardNo: 'SFD·176/221', name: '赵信', category: 'unit',
  domains: ['yellow'], energy: 3, power: 4, keywords: ['壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[壁垒];基地里≥2名其他单位则活跃进场(ENTER_READY 表)' }],
}

                                                               
                                 
                                
                                             
                                                        
                                                      
                                                        
                                                         
export const OGN_035_CARD_EFFECT =
  '{{强攻3}}（如果我是进攻方，则{{S}}+3。）\n如果对手已控制任意战场，则我以活跃状态进场。\n每当我征服一处战场时，你可以选择支付{{1}}来让我返回所属的手牌。'
                                                                    
export const VAYNE_COST: Cost = { mana: 1 }
export function makeVayneTrigger(selfOid: ObjId, controller: PlayerId, sourceDefId = 'OGN-035'): Trigger {
                                                                  
                                                              
                                                                
                                                          
                                                              
                                                     
                                                                   
  const effect = compileEffect({
    then: [{ op: 'bounceToOwnerHand', target: { ref: 'self' } }],
  })
  return compileTrigger({
    id: `${sourceDefId}:conquer:${selfOid}`, rawId: true, sourceDefId,
    event: 'conquer', by: 'you',
    mayChoose: true, // 「你可以选择」
    when: [{ kind: 'selfAtEventBattlefield' }], // 单位卡的征服
                                                              
                                                                            
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, VAYNE_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
const vayne = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '薇恩', category: 'unit',
  domains: ['red'], energy: 4, power: 2, keywords: ['强攻3'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[强攻3];对手控场则活跃进场;征服时可付1回手(makeVayneTrigger)' }],
})
export const OGN_035: Card = vayne('OGN-035', 'OGN·035/298')
                                             
export const SFD_223: Card = vayne('SFD-223', 'SFD·223/221')

                                                              
                                  
                                                     
                                                                
                                                              
                                                               
  
                                                            
                                                            
                                                     
                                                           
                                              
                                                
                                                           
                                                               
                                                                
                                                                       
                                                                
                                   
                                                                
export const VEN_091_CARD_EFFECT =
  '如果你的得分距离胜利得分超过3分，则我以活跃状态进场。\n当我进攻时，你可以选择将此处任意数量的战力不高于5{{S}}的敌方单位移动到其基地。'
const VEN_091_PREFIX = 'drakeMove'
export function makeCorruptDrakeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] => {
        const picked = multiSelectPicked(ctx.chosen, VEN_091_PREFIX)
        return picked.flatMap((oid) => {
          const o = ctx.state.objects[oid as ObjId]
          if (!o) return []
          const to = `base:${o.controller}` as ZoneId
          if ((o.zone as string) === (to as string)) return []
          return [
            { kind: 'zoneChange' as const, obj: o.oid, to },
            { kind: 'unitMoved' as const, unit: o.oid, player: o.controller, from: o.zone, to }, // §446.1
          ]
        })
      },
    }],
  })
  return compileTrigger({
    id: `VEN-091:attack:${selfOid}`, rawId: true, sourceDefId: 'VEN-091',
    event: 'attack', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
                                                         
                                                     
                                                 
                                                       
    mayChoose: true,
    nextChoice: (state, ev, chosen) => multiSelectChoice({
      itemId: `trig:VEN-091:${selfOid}`,
      controller,
      prefix: VEN_091_PREFIX,
      prompt: '腐化巨龙:把此处任意数量的战力≤5的敌方单位赶回其基地',
      isTarget: true, // ★1782 将此处任意数量的…敌方单位移动到其基地
      candidates: (st) => resolveSelector(
        st,
        { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent', maxMight: 5 },
        controller, { ev, selfOid },
      ).map((oid) => ({ id: oid as string, label: `赶回 ${st.objects[oid]?.defId ?? oid}` })),
    })(state, chosen),
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const VEN_091: Card = {
  id: 'VEN-091', cardNo: 'VEN·091', name: '腐化巨龙', category: 'unit',
  domains: ['orange'], energy: 10, power: 10, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '落后>3分则活跃进场;进攻时可把此处任意数量≤5[M]敌方赶回基地(makeCorruptDrakeTrigger)' }],
}
