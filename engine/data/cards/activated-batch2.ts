                       
  
                                       
                                                   
                                                 
                                                   
                                                                     
                                              
                                                                                   
                                                
                                                 
                       
  
                                    
                                                           
                                                                  
                                                             
                                                     

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isRallyActive } from '../../src/keywords/rally'
import { isUnit, isEquipment } from '../../src/state/cardTypes'
import { grantKeywordEvent } from './activated-batch'

   
                                                                   
                                           
                                                                    
                                                                          
                                                            
                                                                        
                              
                                                                                                    
                                                                                     
                                                                                 
                                               
                                                                        
                                              
   
export function onField(state: GameState, o: { readonly zone: string }): boolean {
  const k = state.zones[o.zone]?.kind
  return k === 'battlefield' || k === 'base'
}

   
                                        
                                                        
                                                 
   
export function unitsOnBattlefields(state: GameState): string[] {
  return Object.values(state.objects)
    .filter((o) => state.zones[o.zone]?.kind === 'battlefield' && isUnit(o))
    .map((o) => o.oid as string)
    .sort()
}

                                                                 
                                        
                                                            
  
                    
                                                                 
                                                               
                                                              
                                   
                                                
export const OGN_253_CARD_EFFECT =
  '{{横置}}：{{反应}}，{{鼓舞}}—{{获得}}{{1}}。（获得费用资源的技能无法成为其他法术的反应目标。如果你在本回合内已打出过其他卡牌，则发动此效果。）'

export const OGN_253_SPEC: ActivatedSpec = {
  key: 'OGN-253:rallyMana',
  label: '{{横置}}:{{反应}},{{鼓舞}}—获得 1 法力',
  cost: {},
  tapSelf: true,
  keywords: ['反应'],
  fastResolve: true,
                                                
  available: (state, _c, selfOid) => isRallyActive(state, state.objects[selfOid as ObjId]),
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'gainResource', player: controller, mana: 1 }],
}
                                                                  
                                                            
                                 
  
                                           
                                                           
                                                       
                                                            
  
                                                                 
                                                                       
                                                                
export const UNL_093_CARD_EFFECT =
  '{{反应>}} {{横置}}：{{获得}}{{1}}。（获得费用资源的技能无法成为其他法术的反应目标。）'

export const UNL_093_SPEC: ActivatedSpec = {
  key: 'UNL-093:mana',
  label: '{{反应}} {{横置}}:获得 1 法力',
  cost: {},
  tapSelf: true, // 「{横置}」那一截(§135.2.e.2 要求当前未横置)
  keywords: ['反应'], // §813 权限轴 —— 不是印刷关键词
  fastResolve: true, // §337.2/§429.2 获得资源的技能立即结算、不入链
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'gainResource', player: controller, mana: 1 }],
}

export const UNL_093: Card = {
  id: 'UNL-093', cardNo: 'UNL-093/219', name: '龙魂贤者', category: 'unit',
  domains: ['orange'], energy: 2, power: 1,
  keywords: [], // ⚠️ 印刷关键词为空:[反应] 是那条技能的时机权限,不是卡面关键词
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应][横置]:获得1法力(UNL_093_SPEC;诺克萨斯之手的无条件档)' }],
}

const noxusHand = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '诺克萨斯之手', category: 'legend',
  domains: ['red', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '[横置][反应][鼓舞]获得1法力(OGN_253_SPEC)' }],
})
export const OGN_253: Card = noxusHand('OGN-253', 'OGN·253/298')

                                                                  
                                                
  
                                         
                                     
                                                                      
                         
export const OGN_267_CARD_EFFECT = '{{横置}}：让一名单位本回合内获得{{游走}}。（它可以向其他战场进行移动。）'

export const OGN_267_SPEC: ActivatedSpec = {
  key: 'OGN-267:grantRoam',
  label: '{{横置}}:让一名单位本回合内获得{{游走}}',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state): string[] =>
    Object.values(state.objects)
      .filter((o) => onField(state, o) && isUnit(o))
      .map((o) => o.oid as string)
      .sort(),
                                                           
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [grantKeywordEvent('OGN-267:roam', target, '游走')],
}
const bountyHunter = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '赏金猎人', category: 'legend',
  domains: ['orange', 'purple'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '[横置]让一名单位本回合获得[游走](OGN_267_SPEC)' }],
})
export const OGN_267: Card = bountyHunter('OGN-267', 'OGN·267/298')

                                                              
                                                           
                                                   
  
                                      
                                                 
                                             
                                                               
export const OGN_113_CARD_EFFECT =
  '摧毁一个友方单位或装备，{{横置}}：{{迅捷}}-{{获得}}{{A}}{{A}}，用以支付符能费用。（可在你的回合或法术对决中打出。获得费用资源的技能无法成为其他法术的反应目标。）'

export const OGN_113_SPEC: ActivatedSpec = {
  key: 'OGN-113:sacrifice',
  label: '摧毁一个友方单位或装备并{{横置}}:{{迅捷}}—获得 2 点任意符能',
  cost: {},
  tapSelf: true,
  keywords: ['迅捷'],
  fastResolve: true,
  extraCost: {
    label: '摧毁一个友方单位或装备',
                                                   
    options: (state: GameState, controller: PlayerId) =>
      Object.values(state.objects)
        .filter((o) => o.controller === controller && onField(state, o) && (isUnit(o) || isEquipment(o)))
        .map((o) => ({ id: o.oid as string, label: `摧毁 ${o.defId}` })),
                                                                      
                                           
    pay: (state: GameState, _c: PlayerId, _self: string, choice?: string): GameState | null =>
      (!choice || !state.objects[choice as ObjId]) ? null : state, // §203.3 付不起 ⇒ 整个激活作废
    payEvents: (_state: GameState, controller: PlayerId, _self: string, choice?: string): readonly GameEvent[] =>
      choice === undefined ? [] : [{ kind: 'destroy', target: choice as ObjId, sourcePlayer: controller } ],
  },
  target: 'none',
  legalTargets: (): string[] => [],
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'gainResource', player: controller, energy: { '*': 2 } }], // [A] = 无色符能
}
export const OGN_113: Card = {
  id: 'OGN-113', cardNo: 'OGN·113/298', name: '玛尔扎哈', category: 'unit',
  domains: ['blue'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '摧毁一个友方单位或装备+横置:[迅捷]获得{A}{A}(OGN_113_SPEC)' }],
}

                                                               
                                               
  
                                 
                                                    
                                                      
                                   
export const VEN_060_CARD_EFFECT = '弃置一张装备牌，支付{{1}}，{{横置}}：对战场上的一名单位造成4点伤害。'

                                                           
export function makeSkyWandererSpec(isEquipmentDef: (defId: string) => boolean): ActivatedSpec {
  return {
    key: 'VEN-060:bolt',
    label: '弃置一张装备牌,支付 1 法力并{{横置}}:对战场上的一名单位造成 4 点伤害',
    cost: { mana: 1 },
    tapSelf: true,
    discard: 1,
    discardFilter: isEquipmentDef, // ★没有它整条费用就形同虚设
    target: 'custom',
    legalTargets: (state): string[] => unitsOnBattlefields(state), // 「战场上的」不含基地(㊼ 与 OGN-017 共用)
    makeResolve: ({ selfOid, target }) => (): readonly GameEvent[] =>
      target === undefined ? [] : [{ kind: 'damage', target: target as ObjId, amount: 4, source: selfOid as ObjId }],
  }
}
export const VEN_060: Card = {
  id: 'VEN-060', cardNo: 'VEN·060', name: '天际漫游者', category: 'unit',
  domains: ['blue'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '弃装备牌+付1+横置:对战场上一名单位造成4点伤害(makeSkyWandererSpec)' }],
}

                                                  
export const ACTIVATED2_DEFIDS: readonly string[] = [
  'OGN-253', 'OGN-302', 'OGN-267', 'OGN-309', 'OGN-113', 'VEN-060',
]
