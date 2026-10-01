                                 
  
                                      
                           
                                                             
                                       
                                       
  
                                               
                                                                         
                                                    
  
                                                 
                                                 
                                                  
                                     
  
                                                
                                           

import { passiveDefId } from '../passiveIdentity'                                      
import type { Card } from '../../src/dsl/card'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import type { StaticEffect } from '../../src/effects/continuousView'
import { onField } from './activated-batch2'                                             
import { buffCount } from '../../src/keywords/buff'
import { typesOf, isToken, isRune } from '../../src/state/cardTypes'
import { battleRoleOf, sameRoleCombatants } from '../../src/combat/battleRoles'
import { armamentsOn } from '../../src/keywords/equip'                    
import { enemyUnitsAt } from './damage-split'                                  
import { CARD_FACTS } from '../cardFacts'                   
import { ownDiscard } from '../../src/keywords/insight'                          
import { resolveImplDefId } from '../variantAlias'
import { currentKeywords } from '../../src/state/object'

                                              
function kwsOf(o: GameObject): readonly string[] {
  return currentKeywords(o)
}
   
                                                   
  
                                                       
                                                                                 
                                                        
                                                                      
                                                                          
                                                                
                                                                    
                                                           
                                                                                  
   
function fielded(state: GameState, o: GameObject): boolean {
  return onField(state, o)
}

                               
type Counter = (self: GameObject, state: GameState) => number

   
              
                         
                                 
                                      
                                 
   
const COUNTERS: Readonly<Record<string, Counter>> = {
                                                
                                                
  'OGN-240': (self, state) => Object.values(state.objects).filter((o) =>
    (o.zone as string) === (self.zone as string)
    && o.controller === self.controller
    && typesOf(o).includes('unit')
    && buffCount(o) > 0).length,

                                     
                                                      
  'SFD-085': (self, state) => Object.values(state.objects).filter((o) =>
    fielded(state, o)
    && o.controller === self.controller
    && typesOf(o).includes('equipment')).length,

                                                      
                                                                  
                                                                  

                                                   
                                            
                              
  'VEN-109': (self, state) => Object.values(state.objects).filter((o) =>
    fielded(state, o)
    && o.controller === self.controller
    && isToken(o)
    && typesOf(o).includes('unit')).length,

                                               
                                   
    
                                                         
                                                         
                                              
                                                        
                                              
                                                             
                                                        
                                                  
                                                                     
  'OGN-109': (self, state) => ownDiscard(state, self.controller).length,

                                                                   
                                 
                                                      
                                          
                                                                 
                                  
                                                          
                                                              
                                                        
                                                         
                                                      
                                                
  'VEN-097': (self, state) => {
    const nameOfObj = (o: GameObject): string | undefined =>
      CARD_FACTS[o.derived?.copiedDefId ?? o.defId]?.name
    const myName = nameOfObj(self)
    if (myName === undefined) return 0
    return Object.values(state.objects).filter((o) =>
      o.oid !== self.oid         
      && (o.zone as string) === (self.zone as string)
      && o.controller === self.controller
      && typesOf(o).includes('unit')
      && nameOfObj(o) === myName).length
  },

                                                   
                                                        
  'UNL-076': (self, state) => Object.values(state.objects).filter((o) =>
    (o.zone as string) === (self.zone as string)
    && o.controller === self.controller
    && typesOf(o).includes('unit')
    && kwsOf(o).includes('瞬息')).length,

                                               
                                              
                                          
                                                     
  'OGN-065': (self) => (buffCount(self) > 0 ? 1 : 0),

                                                  
                                    
                                             
  'SFD-159': (self, state) => (Object.values(state.objects).some((o) =>
    o.oid !== self.oid
    && (o.zone as string) === (self.zone as string)
    && o.controller === self.controller
    && typesOf(o).includes('unit')) ? 1 : 0),

                                                          
    
                              
                                                  
                                                      
                                                  
                            
    
                                             
                                                        
  'OGN-055': (self, state) =>
    (battleRoleOf(self) !== null && sameRoleCombatants(state, self).length === 1 ? 2 : 0),

                                                  
                                           
                                                                   
  'UNL-154': (self, state) =>
    (battleRoleOf(self) === 'attacking' && sameRoleCombatants(state, self).length >= 2 ? 2 : 0),

                                               
                                                
                                                
                                       
                                                 
                                                 
                                                    
                                       
                                                                     
  'OGN-028': (self, state) => state.scores[self.controller as string] ?? 0,

  'OGS-004': (self, state) => (Object.values(state.objects).filter((o) =>
    isRune(o) && fielded(state, o) && o.controller === self.controller).length >= 8 ? 4 : 0),

                                                   
    
                               
                                                         
                                                           
                                                          
    
                                                                  
                                                               
                                                                           
    
                  
                                                                          
                                                            
                                                           
                                                                      
  'SFD-068': (self, state) => armamentsOn(state, self.oid)
    .reduce((sum, g) => sum + (g.basePowerBonus ?? 0), 0),

                                                                      
                                                                
    
                                                                     
                                               
                                   
    
                                                  
                                                                
                                                        
                                                                  
                                                                          
  'SFD-131': (self, state) => enemyUnitsAt(state, self.zone as string, self.controller).length,
}
                                                          
const COUNTERS_WITH_REPRINTS: Readonly<Record<string, Counter>> = {
  ...COUNTERS,
  'VEN-182': COUNTERS['VEN-109']!,
                                                             
  'VEN-076': COUNTERS['SFD-085']!,
}

   
                                                
                                                     
                   
   
export function countScaledMightPassives(obj: GameObject, state: GameState): readonly StaticEffect[] {
                                                                                                 
  const implId = resolveImplDefId(passiveDefId(obj), (x) => x in COUNTERS_WITH_REPRINTS)
  const counter = COUNTERS_WITH_REPRINTS[implId]
  if (!counter) return []
  const delta = counter(obj, state)
  if (delta <= 0) return []
  const selfOid = obj.oid
  const valuedKw = VALUED_KEYWORD_PAYOUT[implId]
  return [{
    id: valuedKw === undefined ? `${obj.defId}:countMight:${selfOid}` : `${obj.defId}:countKw:${selfOid}`,
    duration: 'permanent',
    fromPassive: true, // 印刷被动来源,§477.3.b 不快照
    timestamp: 0,
    predicate: (x: GameObject) => x.oid === selfOid, // 只加在【我】身上
    modification: valuedKw === undefined
      ? { kind: 'addMight', delta }
      : { kind: 'grantKeyword', keyword: `${valuedKw}${delta}` },
  }]
}

   
                                      
                                                              
                                                           
  
                                    
                                                                 
                                                                   
                                                                           
                                              
   
                                       
                                 
export const VALUED_KEYWORD_PAYOUT: Readonly<Record<string, string>> = {
                                           
                                                                           
  'VEN-076': '强攻',
                                                    
                                                     
                                                         
  'SFD-131': '强攻',
}

                                   
export const COUNT_SCALED_DEFIDS: readonly string[] = Object.keys(COUNTERS_WITH_REPRINTS)

                                                                     
                                                 

export const SFD_068_KEYWORDS: readonly string[] = ['急速']
export const SFD_068_CARD_EFFECT =
  '急速（你可以选择额外支付1和蓝色，让我以活跃状态进场。）\n贴附在我身上的每件武装提供双倍基础战力加成。'
export const SFD_068: Card = {
  id: 'SFD-068', cardNo: 'SFD·068/221', name: '机械迷', category: 'unit',
  domains: ['blue'], energy: 5, power: 3, keywords: [...SFD_068_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '贴在我身上的每件武装再给一份基础加成(countScaledMightPassives)' }],
}

export const SFD_131_KEYWORDS: readonly string[] = ['急速']
export const SFD_131_CARD_EFFECT =
  '急速（你可以选择额外支付1和紫色，让我以活跃状态进场。）\n'
  + '我拥有等同于此处敌方单位数量的强攻数值。（如果我是进攻方，则每点强攻提供S+1。）'
export const SFD_131: Card = {
  id: 'SFD-131', cardNo: 'SFD·131/221', name: '远古战狂', category: 'unit',
  domains: ['purple'], energy: 5, power: 4, keywords: [...SFD_131_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '此处每有一名敌方单位就给一点[强攻](countScaledMightPassives)' }],
}

export const OGN_240_CARD_EFFECT =
  '壁垒（我在战斗中首先承担伤害。）\n我所处的战场每有一名拥有增益的友方单位，我便获得S+1。'
export const OGN_240: Card = {
  id: 'OGN-240', cardNo: 'OGN·240/298', name: '瑟提', category: 'unit',
  domains: ['yellow'], energy: 4, power: 5, keywords: ['壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我所处战场每有一名带增益的友方单位则[M]+1(countScaledMightPassives)' }],
}

export const SFD_085_CARD_EFFECT =
  '法盾2\n百炼\n每有一件友方装备，我便获得S+1。'
export const SFD_085: Card = {
  id: 'SFD-085', cardNo: 'SFD·085/221', name: '奥恩', category: 'unit',
  domains: ['blue'], energy: 6, power: 4, keywords: ['法盾2', '百炼'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每有一件友方装备则[M]+1(countScaledMightPassives)' }],
}

export const UNL_076_CARD_EFFECT = '我所处的战场你每有一名拥有瞬息的单位，我便获得S+1。'
export const UNL_076: Card = {
  id: 'UNL-076', cardNo: 'UNL-076/219', name: '花瓣仙子', category: 'unit',
  domains: ['blue'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我所处战场每有一名带瞬息的友方单位则[M]+1(countScaledMightPassives)' }],
}

                                                                 
                                        
                                       
                    
  
                    
                                                                   
                                                
                                                          
                                                    
                                          
export const VEN_097_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '你在此处每控制一名和我同名的其他单位，我便获得{{S}}+1。\n' +
  '你的卡组中可以包含任意数量名为“小蜘蛛”的卡牌。'

export const VEN_097: Card = {
  id: 'VEN-097', cardNo: 'VEN·097', name: '小蜘蛛', category: 'unit',
  domains: ['purple'], energy: 3, power: 1, keywords: ['待命'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '此处每有一名同名的其他友方单位则[S]+1(countScaledMightPassives);卡组可含任意数量(CardFacts.anyNumber)' }],
}

                                                               
                                 
                                                  
                             
                                                          
                                         
                                      
export const VEN_109_CARD_EFFECT =
  '当你打出我时，或当我得分时，打出一名具有“比尔吉沃特”属性的1S“触手”。\n你每控制一名指示物单位，我便获得S+1。'

                                                             
export const OGN_055_CARD_EFFECT = '如果我独自进攻或防守一处战场，则我获得 {{S}}+2。'
export const OGN_055: Card = {
  id: 'OGN-055', cardNo: 'OGN·055/298', name: '驭水者', category: 'unit',
  domains: ['green'], energy: 3, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '独自进攻或防守时[M]+2(countScaledMightPassives)' }],
}

export const UNL_154_CARD_EFFECT = '如果我和另一名单位一起进攻一处战场，则我获得{{S}}+2。'
export const UNL_154: Card = {
  id: 'UNL-154', cardNo: 'UNL-154/219', name: '猩红飞鸽', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '与另一名单位一起进攻时[M]+2(countScaledMightPassives)' }],
}

export const OGS_004_CARD_EFFECT = '如果你拥有不少于八枚符文，则我获得{{S}}+4。'
export const OGS_004: Card = {
  id: 'OGS-004', cardNo: 'OGS·004/024', name: '易', category: 'unit',
  domains: ['green'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的符文不少于八枚则[M]+4(countScaledMightPassives)' }],
}

export const VEN_076_CARD_EFFECT =
  '我拥有等同于你控制装备数量的{{强攻}}数值。（如果我是进攻方，则每点强攻提供{{S}}+1。）'
export const VEN_076: Card = {
  id: 'VEN-076', cardNo: 'VEN·076', name: '维修专家', category: 'unit',
                                                                            
                                        
  domains: ['orange'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '强攻数值 = 你控制的装备数(countScaledMightPassives)' }],
}

export const OGN_028_CARD_EFFECT = '把你的分数加到我的战力上。'
export const OGN_028: Card = {
  id: 'OGN-028', cardNo: 'OGN·028/298', name: '德莱文', category: 'unit',
  domains: ['red'], energy: 5, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '把你的分数加到我的战力上(countScaledMightPassives)' }],
}
