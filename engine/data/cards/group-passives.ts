                        
  
                            
                                                                            
                                                                      
                                                
                                         
  
                                                   
  
                                 
                                                            
                                                          
                                                   
  
                                                 
                                            

import { onField } from './activated-batch2'                    
import { passiveDefId } from '../passiveIdentity'                                      
import { SAND_SOLDIER_DEF_ID } from './SFD-197'
import { VARIANT_GROUPS } from '../variantAliases'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameObject } from '../../src/state/object'
import { isFieldedExceptStandby } from '../../src/state/zones'
import type { GameState } from '../../src/state/gameState'
import type { StaticEffect } from '../../src/effects/continuousView'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasteChoice, type EffectSpec } from '../../src/dsl/effectSpec'                 
import { hasteKeyOf } from './haste-key'                            
import { isToken, isUnit, typesOf } from '../../src/state/cardTypes'
import { controlsBattlefield } from '../../src/state/battlefieldControl'
import { SFD_208_GRANT_KEY } from './SFD-208'
import { leonaStunnedScope, OGN_079_MIGHT_DELTA, OGN_079_MIGHT_FLOOR } from './OGN-079'            
import { leeSinScope, OGN_151_BONUS } from './OGN-151'           
import { experienceOf } from '../../src/keywords/level'
import { buffCount } from '../../src/keywords/buff'
import { selfAtLevel } from './level-self'
import { isAlone } from '../../src/keywords/alone'                  
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { NO_READY } from '../../src/keywords/cannotReady'
import { referencedMight } from './might-common'
import { makeHoldTrigger } from './combat-keywords'
import { objectCardTags } from '../cardTagQuery'                                    
import { GRASS_TAGS } from './animal-tags'                
import { akaliUntargetable } from './untargetable-cards'
import { EPHEMERAL_IMMUNE } from '../../src/keywords/ephemeral'             
import { ARMAMENT_TAG } from '../../src/keywords/equip'                              
import { battleRoleOf, sameRoleCombatants, opposingRoleCombatants, NO_COMBAT_DAMAGE }
  from '../../src/combat/battleRoles'
import { OGN_078_BUFF_LIMIT } from './OGN-078'                   
import { resolveImplDefId } from '../variantAlias'
import { currentKeywords } from '../../src/state/object'
import { ROBOT_TOKEN } from './token-spells'                                                       

                                         
export const BARRIER_KEYWORD = '壁垒'

   
                                       
                                                     
                                                              
   
function derivedKeywordsOf(o: GameObject): readonly string[] {
  return currentKeywords(o)
}

                         
interface GroupPassive {
                                           
  readonly scope: (o: GameObject, self: GameObject, state: GameState, hasTag: TagFn) => boolean
     
                                                           
                                                         
                                                   
     
  readonly modifications: readonly StaticEffect['modification'][]
}
type TagFn = (defId: string, tag: string) => boolean

   
                        
                                 
  
                                                           
                                                                             
   
                                                   
                                                                 
                                              
                                                           
                     
const fielded = onField

   
                                         
                                                 
                                                    
                                                                    
                                                             
                                           
   
function legendOnField(state: GameState, o: GameObject): boolean {
  if (!typesOf(o).includes('legend')) return false
  const k = state.zones[o.zone]?.kind
  return isFieldedExceptStandby(k)
}

   
                                                     
                      
   
   
                                                   
                             
                                                        
                                                   
                                                           
  
                                                  
                                                                                    
                                                            
                                                                                  
                                                            
                                                                       
                                                              
                                            
                                                            
                                  
                                                                           
                                                     
   
export const mightBelowSelfHere = (side: 'friendly' | 'enemy') =>
  (o: GameObject, self: GameObject, state: GameState): boolean =>
    fielded(state, o) && isUnit(o)
                                                  
    && ((o.controller === self.controller) === (side === 'friendly'))
    && (o.zone as string) === (self.zone as string)                             
    && referencedMight(state, o.oid) < referencedMight(state, self.oid)            

                                      
export const beastKingScope = mightBelowSelfHere('friendly')
                                       
export const throatScope = mightBelowSelfHere('enemy')

const WUJU_LEVEL6: GroupPassive = {
  scope: (o, self, state) => fielded(state, o) && isUnit(o)
    && o.controller === self.controller                 
                                                
                                                                    
                                                            
                                                              
    && experienceOf(state, self.controller) >= 6,
  modifications: [{ kind: 'addMight', delta: 1 }],
}

   
                                                
                                                     
                                                            
                                         
                                                            
                                                          
                                                    
   
export const hereOtherAllyUnits = (o: GameObject, self: GameObject, state: GameState): boolean =>
  fielded(state, o) && isUnit(o)
  && o.oid !== self.oid                                          
  && (o.zone as string) === (self.zone as string)                
  && o.controller === self.controller                            

const GROUP_PASSIVES: Readonly<Record<string, GroupPassive>> = {
                                       
  'OGS-013': {
    scope: hereOtherAllyUnits,
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
                                                             
                                                                   
                                                           
  'OGN-243': {
    scope: hereOtherAllyUnits,
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
                                        
                               
                                                    
                                                                              
                                                                 
                                                                
                                                          
                                                         
  'OGN-100': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o)
      && o.oid !== self.oid                                          
      && o.controller === self.controller,                    // 「友方」
    modifications: [{ kind: 'grantKeyword', keyword: '预知' }],
  },
                                                              
    
                                                
                                                          
                                                                            
                                                      
                                                                      
                                                             
                                                         
                                                                      
  'SFD-054': {
                                                                                               
                                                                                   
                                                                                     
                                                                                              
                                                                              
    scope: (o, self, state, hasTag) => o.controller === self.controller
      && hasTag(o.defId, ARMAMENT_TAG)
                                                                  
                                                                   
                                                       
                                                               
                                                       
      && fielded(state, self),
    modifications: [{ kind: 'grantKeyword', keyword: '灵便' }],
  },
                                        
                                                         
  'OGN-015': {
    scope: hereOtherAllyUnits, // ★第396轮抽:与盖伦/德莱厄斯同一个范围
    modifications: [{ kind: 'grantKeyword', keyword: '强攻' }],
  },
                                                                        
                                                           
                                                                  
                                                               
                                                                 
                                                        
                                                                                        
  'OGN-063': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o) && o.controller === self.controller
      && buffCount(o) > 0,
    modifications: [{ kind: 'grantKeyword', keyword: '法盾', ifAbsent: true }],
  },
                                                           
                                                             
                                                    
                                                                  
                                                                 
  'SFD-104': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o) && o.controller === self.controller,
    modifications: [{ kind: 'grantKeyword', keyword: '法盾' }],
  },
                                      
                                                        
                                                 
  'UNL-077': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o) && isToken(o)
      && o.controller === self.controller,
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
                                                           
                                                       
                                                                
                                                       
  'SFD-026': {
    scope: (o, self, state, hasTag) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller
                                                                         
                                                                   
                                                                        
                                                             
      && objectCardTags(o).includes('机械'),
    modifications: [{ kind: 'grantKeyword', keyword: '强攻' }],
  },
                                                       
                                                           
                                
                                                  
                                                            
                                                          
                                                 
                                                                    
  'SFD-065': {
    scope: (o, self, state, hasTag) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller
      && objectCardTags(o).includes('机械'), // ★865 物件级(被授予的也算,SFD-073;详见 SFD-026 那条)
    modifications: [{ kind: 'grantKeyword', keyword: '预知' }],
  },
                                             
                          
                                                          
                                                                  
                                                                           
                                            
  'SFD-197': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller                 
                                                                     
                                                   
                                         
                                                        
                                                                        
      && (o.derived?.copiedDefId ?? o.defId) === SAND_SOLDIER_DEF_ID, // 「黄沙士兵」(含复制体)
    modifications: [{ kind: 'grantKeyword', keyword: '百炼' }],
  },
                                                       
  'SFD-181': {
    scope: (o, self, state, hasTag) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller
      && objectCardTags(o).includes('机械'), // ★865 物件级(被授予的也算,SFD-073;详见 SFD-026 那条)
    modifications: [{ kind: 'grantKeyword', keyword: '坚守' }],
  },
                                                              
                                                       
                                                  
                                                  
  'OGN-074': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o)
      && o.oid !== self.oid
      && (o.zone as string) === (self.zone as string)
      && o.controller === self.controller,
    modifications: [{ kind: 'grantKeyword', keyword: '坚守' }],
  },
                                                         
                                       
                                         
  'UNL-041': {
    scope: (o, self, state) => state.zones[self.zone]?.kind === 'battlefield'              
      && fielded(state, o) && isUnit(o)
      && o.oid !== self.oid
      && (o.zone as string) === (self.zone as string)
      && o.controller === self.controller,
    modifications: [{ kind: 'grantKeyword', keyword: '法盾' }],
  },
                                              
                                                         
                                          
  'SFD-071': {
    scope: (o, self, state, hasTag) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller
      && objectCardTags(o).includes('机械'), // ★865 物件级(被授予的也算,SFD-073;详见 SFD-026 那条)
    modifications: [
      { kind: 'grantKeyword', keyword: '法盾' },
      { kind: 'grantKeyword', keyword: '游走' },
    ],
  },
                                                                
                                                                  
                                              
                                                               
                                                       
                                                            
                                                   
                                                  
                                                                 
                                          
  'UNL-058': {
    scope: (o, self, state) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller
      && isToken(o),
    modifications: [{ kind: 'grantKeyword', keyword: BARRIER_KEYWORD }],
  },
                                                                
                                                          
                                                         
                                                                    
                                                            
                                                        
                                                                            
  'OGN-079': {
    scope: (o, self, state) => leonaStunnedScope(o, self, state),
    modifications: [{ kind: 'addMight', delta: OGN_079_MIGHT_DELTA, floor: OGN_079_MIGHT_FLOOR }],
  },
                                                                
                                                                      
                                                
                                                       
                                                   
                                                           
                                                   
  'OGN-151': {
    scope: (o, self, state) => leeSinScope(o, self, state),
    modifications: [{ kind: 'addMight', delta: OGN_151_BONUS }],
  },
                                              
                                                                      
                                                      
                                                                            
  'OGN-078': {
    scope: (o, self) => o.oid === self.oid,
    modifications: [{ kind: 'setLimit', limit: 'buff', value: OGN_078_BUFF_LIMIT }],
  },
                                                       
                                        
  'UNL-111': {
    scope: (o, self) => o.oid === self.oid,
    modifications: [{ kind: 'addRestriction', restriction: 'moveToBase' }],
  },
                                    
                                                  
                                                     
  'SFD-014': {
    scope: (o, _self, state) => fielded(state, o) && isUnit(o),
    modifications: [{ kind: 'addRestriction', restriction: 'moveToBase' }],
  },
                                                             
                                                
                                                 
                                                   
                                                      
                                         
                                               
                                               
                                              
                                                
                                              
                                                       
                                       
                                                        
                                         
                                                             
                                            
                                               
                                          
                                                
                                                  
                                          
                                                           
                                                                   
    
                                                 
                                                  
              
                                                         
                                                              
                                              
                                                              
  'UNL-090': {
    scope: (o, self, state) => o.controller === self.controller
      && (o.zone as string) === (self.zone as string)
                                               
                                                          
                                                          
      && state.zones[self.zone]?.kind === 'battlefield',
    modifications: [{ kind: 'addRestriction', restriction: EPHEMERAL_IMMUNE }],
  },

  'UNL-171': {
    scope: (o, self) => o.oid === self.oid, // 无条件:只罩我自己
    modifications: [{ kind: 'addRestriction', restriction: NO_COMBAT_DAMAGE }],
  },

                                                                  
                                                                     
                                           
                                         
                                                 

  'VEN-129': {
    scope: (o, self, state) => o.oid === self.oid
      && Object.values(state.objects).filter((x) => x.oid !== self.oid
        && (x.zone as string) === (self.zone as string)
        && x.controller === self.controller
        && isUnit(x) && fielded(state, x)).length !== 1,
    modifications: [{ kind: 'addRestriction', restriction: NO_COMBAT_DAMAGE }],
  },

                                                         
                                     
                                           
                                
                                                         
                         
                                                                           
  'SFD-110': {
    scope: (o, self, state) => o.oid === self.oid
      && sameRoleCombatants(state, self).length === 1
      && opposingRoleCombatants(state, self).length === 1,
    modifications: [{ kind: 'doubleMight' }],
  },

  'OGS-019': {
    scope: (o, self, state) => isUnit(o)
      && fielded(state, o)
      && o.controller === self.controller                   
      && battleRoleOf(o) === 'defending'                          
      && sameRoleCombatants(state, o).length === 1, // 「只有一名」
    modifications: [{ kind: 'addMight', delta: 2 }],
  },

                                                
                                                          
                                         
  'SFD-089': {
    scope: (o, self, state, hasTag) => fielded(state, o) && isUnit(o)
      && o.controller === self.controller
      && objectCardTags(o).includes('机械'), // ★865 物件级(被授予的也算,SFD-073;详见 SFD-026 那条)
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
                                                            
                                                                              
                                        
  'UNL-191': WUJU_LEVEL6,
  'UNL-231': WUJU_LEVEL6,
                                                           
                                                                 
                                                                 
  'UNL-016': { scope: selfAtLevel(3), modifications: [{ kind: 'addMight', delta: 1 }] },
  'UNL-094': { scope: selfAtLevel(6), modifications: [{ kind: 'addMight', delta: 1 }] },
  'UNL-098': { scope: selfAtLevel(11), modifications: [{ kind: 'addMight', delta: 4 }] },
                                                         
  'UNL-113': {
    scope: selfAtLevel(6),
    modifications: [{ kind: 'grantKeyword', keyword: '法盾' }, { kind: 'grantKeyword', keyword: '游走' }],
  },
                                             
                                    
  'UNL-047': { // 踏苔蜥:+1 和 [法盾]
    scope: selfAtLevel(3),
    modifications: [{ kind: 'addMight', delta: 1 }, { kind: 'grantKeyword', keyword: '法盾' }],
  },
  'UNL-075': { // 风行狐:+1 和 [游走]
    scope: selfAtLevel(3),
    modifications: [{ kind: 'addMight', delta: 1 }, { kind: 'grantKeyword', keyword: '游走' }],
  },
                                                  
                                                       
                                                   
                                                                   
  'SFD-105': { // 沙墟啸匪:无条件
    scope: (o, self) => o.oid === self.oid,
    modifications: [{ kind: 'addRestriction', restriction: NO_ENEMY_TARGET }],
  },
  'UNL-059': { // 易:同一句话,外面包着 {等级16>} 的门
    scope: selfAtLevel(16),
    modifications: [{ kind: 'addRestriction', restriction: NO_ENEMY_TARGET }],
  },
                                                    
                                                                  
  'VEN-038': {
    scope: akaliUntargetable,
    modifications: [{ kind: 'addRestriction', restriction: NO_ENEMY_TARGET }],
  },
                                                 
                                                               
                                                      
                                                 
  'UNL-057': {
    scope: beastKingScope,
    modifications: [{ kind: 'addRestriction', restriction: NO_ENEMY_TARGET }],
  },
                                                   
                                                                      
                                                     
                                                                
                                            
  'UNL-060': {
    scope: throatScope,
    modifications: [{ kind: 'addRestriction', restriction: NO_COMBAT_DAMAGE }],
  },
                                         
                                                                
                                                     
  'UNL-144': {
    scope: (o, self) => o.oid === self.oid,
    modifications: [{ kind: 'addRestriction', restriction: NO_READY }],
  },
}

   
                                               
  
                              
                                                                        
                                      
                                                 
                                             
                                                      
   
export function groupPassives(obj: GameObject, state: GameState, hasTag: TagFn): readonly StaticEffect[] {
  const spec = GROUP_PASSIVES_WITH_VARIANTS[passiveDefId(obj)]
  if (!spec) return []
  return spec.modifications.map((modification, i) => ({
    id: `${obj.defId}:group${i}:${obj.oid}`,
    duration: 'permanent' as const,
    fromPassive: true, // §477.3.b 印刷被动来源不快照
    timestamp: 0,
    predicate: (x: GameObject, st: GameState) => spec.scope(x, obj, st, hasTag),
    modification,
  }))
}

   
                        
                                                                     
                                                                          
                                             
   
   
                                 
  
                                                            
                                           
                                                
                                                                            
                                                   
                                                         
  
                                                  
                                                      
   
const GROUP_PASSIVES_WITH_VARIANTS: Readonly<Record<string, GroupPassive>> = (() => {
  const out: Record<string, GroupPassive> = { ...GROUP_PASSIVES }
  for (const [id, spec] of Object.entries(GROUP_PASSIVES)) {
    for (const alias of VARIANT_GROUPS[id] ?? []) {
      if (alias.includes('*')) continue                   
      out[alias] ??= spec
    }
  }
                                                             
                                 
  out['SFD-082'] = GROUP_PASSIVES['UNL-171']!
  out['SFD-082a'] = GROUP_PASSIVES['UNL-171']!
  out['SFD-082b'] = GROUP_PASSIVES['UNL-171']!
  return out
})()

                                                       
export const GROUP_PASSIVE_DEFIDS: readonly string[] = Object.keys(GROUP_PASSIVES_WITH_VARIANTS)

                                                                
                                                
                                                                   
export const UNL_191_CARD_EFFECT =
  '{{等级6>}} 你的单位获得{{S}}+1。（如果你拥有不少于6经验，则获得该效果。）\n{{等级11>}} 你的单位以活跃状态进场。'
export const UNL_231_CARD_EFFECT =
  '{{等级6>}} 你的单位获得{{S}}+1。\n{{等级11>}} 你的单位以活跃状态进场。'
const wuju = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '无极宗师', category: 'legend',
  domains: ['green', 'orange'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '等级6 你的单位+1(GROUP_PASSIVES);等级11 活跃进场(BOARD_WIDE_ENTER_READY)' }],
})
export const UNL_191: Card = wuju('UNL-191', 'UNL-191/219')
export const UNL_231: Card = wuju('UNL-231', 'UNL-231/219')

                                                                      
                                             

export const UNL_060_CARD_EFFECT =
  '{{伏击}}（你可以选择将我作为{{反应}}牌，打出到有己方单位的战场。）\n'
  + '此处战力低于我的敌方单位无法造成战斗伤害。\n当我据守一处战场时，抽一张牌。'
                                                              
export const UNL_060_KEYWORDS: readonly string[] = ['伏击']
                                                                     
export function makeThroatHoldTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeHoldTrigger({ id: `UNL-060-draw:${selfOid}`, reward: 'draw' }, selfOid, controller)
}
export const UNL_060: Card = {
  id: 'UNL-060', cardNo: 'UNL-060/219', name: '卑鄙之喉', category: 'unit',
  domains: ['green'], energy: 8, power: 8, keywords: [...UNL_060_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '伏击+此处战力低于我的敌方单位无法造成战斗伤害(GROUP_PASSIVES)+据守抽1' }],
}

export const UNL_057_CARD_EFFECT =
  '{{壁垒}}（我在战斗中首先承担伤害。）\n你此处战力低于我的单位无法被敌方法术或技能选作目标。'
                              
export const UNL_057_KEYWORDS: readonly string[] = ['壁垒']
export const UNL_057: Card = {
  id: 'UNL-057', cardNo: 'UNL-057/219', name: '野爪兽王', category: 'unit',
  domains: ['green'], energy: 6, power: 7, keywords: [...UNL_057_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '壁垒(damageAssign)+此处战力低于我的友方单位敌方不可选(GROUP_PASSIVES)' }],
}

export const OGS_013_CARD_EFFECT = '此处的其他友方单位获得{{S}}+1。'
export const OGS_013: Card = {
  id: 'OGS-013', cardNo: 'OGS·013/024', name: '盖伦', category: 'unit',
  domains: ['yellow'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '此处其他友方单位+1(GROUP_PASSIVES)' }],
}

export const OGN_100_CARD_EFFECT =
  '{{预知}}（当你打出我时，查看主牌堆顶部的一张牌，你可以选择将其回收。）\n其他友方单位获得{{预知}}。'
export const OGN_100: Card = {
  id: 'OGN-100', cardNo: 'OGN·100/298', name: '宝石真知者', category: 'unit',
                                                                 
                                              
  domains: ['blue'], energy: 3, power: 3, keywords: ['预知'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '其他友方单位获得[预知](GROUP_PASSIVES)' }],
}

export const OGN_015_CARD_EFFECT = '此处的其他友方单位获得{{强攻}}。（如果他们是进攻方，则{{S}}+1。）'
export const OGN_015: Card = {
  id: 'OGN-015', cardNo: 'OGN·015/298', name: '法荣队长', category: 'unit',
  domains: ['red'], energy: 4, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '此处其他友方单位获得[强攻](GROUP_PASSIVES)' }],
}

export const UNL_077_CARD_EFFECT = '你的指示物单位获得{{S}}+1。'
export const UNL_077: Card = {
  id: 'UNL-077', cardNo: 'UNL-077/219', name: '牧魂人', category: 'unit',
  domains: ['blue'], energy: 5, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的指示物单位+1(GROUP_PASSIVES)' }],
}

export const SFD_065_CARD_EFFECT =
  '你的“机械”属性单位获得{{预知}}。（当你打出我时，查看主牌堆顶部的一张牌，你可以选择将其回收。）'
export const SFD_065: Card = {
  id: 'SFD-065', cardNo: 'SFD·065/221', name: '先见机甲', category: 'unit',
                                                      
                                                            
  domains: ['blue'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的机械单位获得[预知](GROUP_PASSIVES)' }],
}

export const SFD_181_CARD_EFFECT = '你的“机械”属性单位获得{{坚守}}。（如果它们是防守方，则{{S}}+1。）'
export const SFD_181: Card = {
  id: 'SFD-181', cardNo: 'SFD·181/221', name: '机械公敌', category: 'legend',
  domains: ['red', 'blue'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你的机械单位获得[坚守](GROUP_PASSIVES)' }],
}

                                                               
                                 
                                           
                                                          
                                               
export const SFD_089_CARD_EFFECT =
  '你的“机械”属性单位获得{{S}}+1。（包括我。）\n当我据守一处战场时，打出一名3{{S}}的“机器人”到你的基地。'
                                        
export const SFD_089_HASTE_KEY = hasteKeyOf('SFD-089:robot')
export function makeRumbleTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                               
  const effSpec: EffectSpec = {
    then: [{
      op: 'spawnToken',
      spec: ROBOT_TOKEN, // ★1576:原先内联一份(没写 baseKeywords,缺省 ≡ []),折到 token-spells 的正本
      zone: (ctx) => `base:${ctx.controller}`,
      haste: { key: SFD_089_HASTE_KEY, label: '机器人' },
    }],
  }
  const effect = compileEffect(effSpec)
  return compileTrigger({
    id: `SFD-089:hold:${selfOid}`, rawId: true, sourceDefId: 'SFD-089',
    event: 'hold', by: 'you',
    when: [{ kind: 'selfAtEventBattlefield' }], // 单位卡的据守
    postChoice: (state, chosen) => effectHasteChoice(effSpec, state, controller, chosen), // ★1399 落点写死基地不问 ⇒ 只问急速
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_089: Card = {
  id: 'SFD-089', cardNo: 'SFD·089/221', name: '兰博', category: 'unit',
  domains: ['blue'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的机械单位+1(含我);据守时打出3[M]机器人到基地(makeRumbleTrigger)' }],
}

export const UNL_090_KEYWORDS: readonly string[] = ['后排']
export const UNL_090_CARD_EFFECT =
  '{{后排}}（我在战斗中最后承担伤害。）\n你在我所处战场的{{瞬息}}效果不会触发。'
export const UNL_090: Card = {
  id: 'UNL-090', cardNo: 'UNL-090/219', name: '乐芙兰', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: [...UNL_090_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我所处战场上你的[瞬息]效果不会触发(GROUP_PASSIVES)' }],
}
                        
export const UNL_090A: Card = { ...UNL_090, id: 'UNL-090a', cardNo: 'UNL-090a/219' }

export const OGN_074_CARD_EFFECT =
  '{{坚守}}（如果我是防守方，则{{S}}+1。）\n{{壁垒}}（我在战斗中首先承担伤害。）\n此处的其他友方单位获得{{坚守}}。'
export const OGN_074: Card = {
  id: 'OGN-074', cardNo: 'OGN·074/298', name: '塔里克', category: 'unit',
  domains: ['green'], energy: 4, power: 4, keywords: ['坚守', '壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[坚守][壁垒];此处其他友方单位获得[坚守](GROUP_PASSIVES)' }],
}

export const UNL_041_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n如果我位于战场上，则你此处的其他单位获得{{法盾}}。'
export const UNL_041: Card = {
  id: 'UNL-041', cardNo: 'UNL-041/219', name: '艾蕾，头号拥趸', category: 'unit',
  domains: ['green'], energy: 3, power: 3, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[法盾];我在战场上时此处其他友方单位获得[法盾](GROUP_PASSIVES)' }],
}

export const SFD_071_CARD_EFFECT =
  '你的“机械”属性单位获得{{法盾}}和{{游走}}。\n如果你控制着其他“机械”单位，则我以活跃状态进场。'
export const SFD_071: Card = {
  id: 'SFD-071', cardNo: 'SFD·071/221', name: '疾驰机械', category: 'unit',
  domains: ['blue'], energy: 8, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的机械单位获得[法盾]和[游走];控制其他机械则活跃进场' }],
}

                                  
export const GROUP_PASSIVE_BATCH_DEFIDS: readonly string[] = [
  'OGS-013', 'OGN-015', 'UNL-077', 'SFD-181', 'SFD-240', 'SFD-089',
  'OGN-074', 'UNL-041', 'SFD-071', // 第156轮
  'UNL-090', 'UNL-090a', // ★第532轮 乐芙兰(+异画):我这格你的[瞬息]不触发
  'SFD-082', 'SFD-082a', 'SFD-082b', // ★第534轮 伊泽瑞尔(三个卡号):第二句与 UNL-171 逐字相同
  'UNL-111', 'SFD-014',            // 第158轮(移动限制)
  'OGS-019',                       // 第161轮(独自防守的群体版)
  'VEN-129', 'SFD-110',            // 第162轮(无法造成战斗伤害 / 一对一翻倍)
  'UNL-171',                       // 第525轮(同一条限制的【无条件档】)
]

                                                      
  
                 
                                                                  
                                                                         
                                                                 
                                                 
  
                             
                                                                    
                                                            
                      
                                                                    
                                                                                   
                                                          
                                                            
                                                  

                                           
interface BattlefieldPassive {
  readonly scope: (o: GameObject, zoneId: string, state: GameState) => boolean
  readonly modifications: readonly StaticEffect['modification'][]
}

   
                                                     
                                             
                                                            
                        
   
                                                                     
                                                                           
                                            
                                                                         
export { isAlone }

const BF_PASSIVES: Readonly<Record<string, BattlefieldPassive>> = {
                                                  
                                                          
                                             
                                                    
                                                                   
                                                           
                                                            
  'token:草丛': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o)
      && objectCardTags(o).some((t) => GRASS_TAGS.has(t)),
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
  'OGN-294': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o),
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
                                                        
                                                              
                                                                        
                                              
  'UNL-213': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o),
    modifications: [{ kind: 'grantActivated', specKey: 'UNL-213:xp' }],
  },
                                           
  'OGN-297': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o),
    modifications: [{ kind: 'grantKeyword', keyword: '游走' }],
  },
                                           
                                    
                                                      
                                                  
                                   
                                                        
  'OGN-295': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o),
    modifications: [{ kind: 'addRestriction', restriction: 'moveToBase' }],
  },
                                                  
                                                        
                                                                            
                                              
                                                
  'VEN-159': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o)
      && derivedKeywordsOf(o).includes(BARRIER_KEYWORD),
    modifications: [{ kind: 'addMight', delta: 1 }],
  },
                                                 
                                            
                                                   
                                                                          
                                                           
                                      
  'UNL-208': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o)
      && derivedKeywordsOf(o).includes('瞬息'),
    modifications: [{ kind: 'grantKeyword', keyword: '坚守' }],
  },
                                                   
                                       
                       
                                                               
                                                
                                          
                                                           
                                                    
  'UNL-210': {
    scope: (o, zoneId, state) => (o.zone as string) === zoneId && isUnit(o) && fielded(state, o)
      && o.status.defending === true && isAlone(state, o),
    modifications: [{ kind: 'addMight', delta: -2 }],
  },
                                                            
                                       
                                                       
                                                                  
                                                       
                                                                        
                                                              
                                                               
                                                                  
                                                                   
                                                    
                                                                              
                                                       
                                               
  'SFD-208': {
    scope: (o, zoneId, state) => legendOnField(state, o)
      && controlsBattlefield(state, o.controller, zoneId),
    modifications: [{ kind: 'grantActivated', specKey: SFD_208_GRANT_KEY }],
  },
}

                                                                 
export function battlefieldPassives(
  defId: string,
  zoneId: string,
  _owner: PlayerId,
  _state: GameState,
): readonly StaticEffect[] {
                                                            
                                        
                                                            
                                                        
                                        
  const spec = BF_PASSIVES[resolveImplDefId(defId, (x) => x in BF_PASSIVES)]
  if (!spec) return []
  return spec.modifications.map((modification, i) => ({
    id: `${defId}:bfGroup${i}:${zoneId}`,
    duration: 'permanent' as const,
    fromPassive: true,
    timestamp: 0,
    predicate: (x: GameObject, st: GameState) => spec.scope(x, zoneId, st),
    modification,
  }))
}

export const UNL_111_CARD_EFFECT = '我无法移动到基地。'
export const UNL_111: Card = {
  id: 'UNL-111', cardNo: 'UNL-111/219', name: '坚定的哨兵', category: 'unit',
  domains: ['orange'], energy: 1, power: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我无法移动到基地(GROUP_PASSIVES)' }],
}

export const SFD_014_CARD_EFFECT = '所有单位无法移动到基地。'
export const SFD_014: Card = {
  id: 'SFD-014', cardNo: 'SFD·014/221', name: '牛头人清算者', category: 'unit',
  domains: ['red'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '所有单位无法移动到基地(GROUP_PASSIVES)' }],
}

export const VEN_159_CARD_EFFECT = '此处拥有{{壁垒}}的单位获得{{S}}+1。'
export const UNL_210_CARD_EFFECT =
  '如果防守此处的单位落单，则该单位{{S}}-2。（所在位置没有其他友方单位时，即视为“落单”。）'
export const UNL_210: Card = {
  id: 'UNL-210', cardNo: 'UNL-210/219', name: '禁忌荒原', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处落单的防守方单位 -2(BF_PASSIVES)' }],
}

export const VEN_159: Card = {
  id: 'VEN-159', cardNo: 'VEN·159', name: '均衡寺院', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处拥有[壁垒]的单位+1(BF_PASSIVES)' }],
}

export const OGN_294_CARD_EFFECT = '此处的所有单位获得{{S}}+1。（包括进攻方单位。）'
export const OGN_294: Card = {
  id: 'OGN-294', cardNo: 'OGN·294/298', name: '崔法利兵营', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处所有单位+1(BF_PASSIVES)' }],
}

export const OGN_297_CARD_EFFECT = '此处的单位获得{{游走}}。（他们可以向其他战场进行移动。）'
export const OGN_297: Card = {
  id: 'OGN-297', cardNo: 'OGN·297/298', name: '疾风山丘', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处单位获得[游走](BF_PASSIVES)' }],
}

export const UNL_208_CARD_EFFECT = '此处拥有{{瞬息}}的单位获得{{坚守}}。（如果它们是防守方，则{{S}}+1。）'
export const UNL_208: Card = {
  id: 'UNL-208', cardNo: 'UNL-208/219', name: '黑焰祭坛', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处拥有[瞬息]的单位获得[坚守](BF_PASSIVES;两跳依赖,430 不动点解锁)' }],
}

export const OGN_295_CARD_EFFECT = '单位无法从此处移动到基地。'
export const OGN_295: Card = {
  id: 'OGN-295', cardNo: 'OGN·295/298', name: '卑鄙之喉的巢穴', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处单位无法移动到基地(BF_PASSIVES)' }],
}

export const OGS_019_CARD_EFFECT = '如果你只有一名友方单位防守一处战场，则该单位{{S}}+2。'
export const OGS_019: Card = {
  id: 'OGS-019', cardNo: 'OGS·019/024', name: '无极剑圣', category: 'legend',
  domains: ['green', 'orange'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '我方只有一名单位防守时该单位[M]+2(GROUP_PASSIVES)' }],
}

export const VEN_129_CARD_EFFECT = '除非我所在的战场上受你控制的其他单位有且仅有一个，否则我无法造成战斗伤害。'
export const VEN_129: Card = {
  id: 'VEN-129', cardNo: 'VEN·129', name: '神圣守护者', category: 'unit',
  domains: ['yellow'], energy: 4, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '此处友方其他单位不恰为一个则我无法造成战斗伤害(GROUP_PASSIVES)' }],
}

                                               
export const UNL_171_KEYWORDS: readonly string[] = ['法盾', '壁垒']
export const UNL_171_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n'
  + '{{壁垒}}（我在战斗中首先承担伤害。）\n'
  + '我无法造成战斗伤害。'
export const UNL_171: Card = {
  id: 'UNL-171', cardNo: 'UNL-171/219', name: '加里奥', category: 'unit',
  domains: ['yellow'], energy: 3, power: 6, keywords: [...UNL_171_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我无法造成战斗伤害(无条件;GROUP_PASSIVES)' }],
}

export const SFD_110_CARD_EFFECT = '当我进行一对一的进攻或防守时，在这场战斗中，我的战力翻倍。'
export const SFD_110: Card = {
  id: 'SFD-110', cardNo: 'SFD·110/221', name: '菲奥娜', category: 'unit',
  domains: ['orange'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '一对一进攻或防守时战力翻倍(GROUP_PASSIVES)' }],
}

                            
export const BF_PASSIVE_DEFIDS: readonly string[] = Object.keys(BF_PASSIVES)

                                                           
                                                                               
                                                                 
                                                                                 
                                                                                           
                                        
                                                                
  
              
                                                                
                                                                        
                                                              
                                                                                  
                                                                                       
                                                       
                                               
export const SFD_054_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n你各处的武装都获得{{灵便}}。（每件武装获得{{反应}}。当你打出此牌时，将其贴附到你控制的一名单位上。）'
                                                                                                                      

export const SFD_054: Card = {
                                                                
  id: 'SFD-054', cardNo: 'SFD·054/221', name: '贾克斯', category: 'unit',
  domains: ['green'], energy: 5, power: 5, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[法盾]§828 印刷关键词(引擎统一处理)' },
    { kind: 'passive', describe: '你各处的武装都获得[灵便](GROUP_PASSIVES;★1590 errata,原「手牌中」)' },
  ],
}
