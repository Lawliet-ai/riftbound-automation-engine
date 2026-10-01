                                                                 
  
                                                                          
                                                 
                                                                          
                                                  
  
                                                   
                                                            
                                                        
  
                                                         
                                              
                                                                          
                                    
                                                              
import { passiveDefId } from '../passiveIdentity'                                      
import type { GameObject } from '../../src/state/object'
import { isUnit } from '../../src/state/cardTypes'                                              
import type { GameState } from '../../src/state/gameState'
import type { StaticEffect } from '../../src/effects/continuousView'
import { attachedTo } from '../../src/state/attach'
import { resolveImplDefId } from '../variantAlias'
import { NO_ENEMY_MOVE } from '../../src/state/moveRestriction'
import { levelReached } from './level-self'                                 

                                       
export type GearHostCondition =
                                                       
  | 'exactlyOneOtherAllyAtMyBattlefield'
  /** 「如果**此牌**是在**本回合**贴附到我身上的」(残暴之力 SFD-042)
   *  ⚠️ 主语是**武装自己**(「此牌」),不是宿主 —— 判据读的是武装的 oid,别拿 host 去查。 */
  | 'attachedThisTurn'
  /** 无条件(锯齿弯刀 VEN-073:卡文没有「如果」从句,贴着就一直在)。 */
  | 'always'
  /**
   * 「[等级3] …（如果**你**拥有不少于3经验,则获得该效果。）」(灵魂之剑 UNL-039)
   * ⚠️⚠️【★1542 修缺陷 204】主语是「**你**」= **带[等级]那张卡自己的控制者**(§824.1.c.1
   *   「如果带有[等级]的**卡牌**的控制者发生变化,则依赖性技能会根据**新控制者**的经验」)
   *   ⇒ 读 `gear.controller`,**不是** host 的。今天贴附时两者同控制者,但夺控类效果会让它们分开。
   * ⚠️ 走 `level-self.ts::levelReached` —— ★995 认定的**真路径**;
   *   **不是** `keywords` 通道(★995 实测:卡池里一处都没有把等级登记进 `keywords`)。
   */
  | 'controllerAtLevel3'

export interface GearHostPassiveRow {
  readonly defId: string
  readonly name: string
                                                                       
  readonly cardText: string
  readonly condition: GearHostCondition
                                                                       
  readonly modification: StaticEffect['modification']
}

                              
export const VEN_027_OTHER_ALLY_COUNT = 1
                 
export const VEN_027_MIGHT_DELTA = 2

                                                      
export const SFD_042_MIGHT_DELTA = 2

                                                                
export const UNL_039_LEVEL = 3
export const UNL_039_MIGHT_DELTA = 1

export const GEAR_HOST_PASSIVES: readonly GearHostPassiveRow[] = [
  {
    defId: 'VEN-027', name: '杠锤',
    cardText: '如果我所在的战场上受你控制的其他单位有且仅有一个，则我获得[M]+2。',
    condition: 'exactlyOneOtherAllyAtMyBattlefield',
    modification: { kind: 'addMight', delta: VEN_027_MIGHT_DELTA },
  },
  {
    defId: 'SFD-042', name: '残暴之力',
    cardText: '如果此牌是在本回合贴附到我身上的，则我额外获得[M]+2。',
    condition: 'attachedThisTurn',
    modification: { kind: 'addMight', delta: SFD_042_MIGHT_DELTA },
  },
  {
    defId: 'SFD-073', name: '海克斯注力刚壁',
    cardText: '我拥有“机械”属性。',
                                                         
                                                                 
                                                            
    condition: 'always',
    modification: { kind: 'grantTag', tag: '机械' },
  },
  {
                                                            
                                                                        
                                                                    
                                                                
                                                               
                                                                 
    defId: 'UNL-039', name: '灵魂之剑',
    cardText: '等级3 我额外获得[M]+1。（如果你拥有不少于3经验，则获得该效果。）',
    condition: 'controllerAtLevel3',
    modification: { kind: 'addMight', delta: UNL_039_MIGHT_DELTA },
  },
  {
    defId: 'VEN-073', name: '锯齿弯刀',
    cardText: '我无法被敌方法术和技能移动。',
                                                            
                                                                     
                                         
    condition: 'always',
    modification: { kind: 'addRestriction', restriction: NO_ENEMY_MOVE },
  },
]

const BY_DEF: Readonly<Record<string, GearHostPassiveRow>> =
  Object.fromEntries(GEAR_HOST_PASSIVES.map((r) => [r.defId, r]))

   
        
                                                                
                                                         
                                               
   
function holds(c: GearHostCondition, host: GameObject, gear: GameObject, state: GameState): boolean {
  switch (c) {
    case 'exactlyOneOtherAllyAtMyBattlefield': {
                        
                                                   
                                                                                 
                                                     
                                          
                                             
      if (state.zones[host.zone]?.kind !== 'battlefield') return false
      const others = Object.values(state.objects).filter((x) =>
        x.oid !== host.oid
        && x.zone === host.zone
        && x.controller === host.controller
                                                                                                     
                                                                  
                                                                                                         
        && isUnit(x)).length
      return others === VEN_027_OTHER_ALLY_COUNT
    }
    case 'attachedThisTurn':
                                                             
                                                                     
                                                              
      return state.attachedThisTurn?.[gear.oid as string] === true
    case 'controllerAtLevel3':
                                                              
                                                              
                                                                          
      return levelReached(state, gear.controller, UNL_039_LEVEL)
    case 'always':
      return true                                             
  }
}

   
                                         
                                                       
   
export function gearHostPassives(obj: GameObject, state?: GameState): readonly StaticEffect[] {
                                                                          
                                                             
                                                                     
                                                               
                                                     
  const row = BY_DEF[resolveImplDefId(passiveDefId(obj), (x) => x in BY_DEF)]
  if (row === undefined || state === undefined) return []
  const host = attachedTo(obj)
  if (host === undefined) return []                                
  return [{
    id: `${row.defId}:gearHost:${obj.oid}`,
    duration: 'permanent',
    fromPassive: true,
    timestamp: 0,
                                                    
                                          
    predicate: (x: GameObject): boolean => x.oid === host && holds(row.condition, x, obj, state),
    modification: row.modification, // ★864 泛化(addMight/addRestriction 都从表行来)
  }]
}
