                                                      
  
                                           
                                                               
                                                                    
                                        
                            
  
                                            
                                                     
                                                                
                                               
  
                                              
                                       
                                                                      
                                                       
                                                           
                                        
                                                                              
                                         
                                                                                               
                                                  

import { passiveDefId } from '../passiveIdentity'                                      
import type { GameObject } from '../../src/state/object'
import { isUnit } from '../../src/state/cardTypes'                                                  
import type { StaticEffect } from '../../src/effects/continuousView'
import { empowerCount, isEmpowered } from '../../src/keywords/empower'
import { resolveImplDefId } from '../variantAlias'

                                    
const EMPOWERED_MIGHT: Readonly<Record<string, number>> = {
  'VEN-007': 1, // 拳拳魄罗
  'VEN-021': 1, // 阿卡丽
  'VEN-028': 2, // 悲悯见证者
  'VEN-032': 3, // 霜衣狼母
  'VEN-047': 1, // 见习法师
  'VEN-070': 2, // 残暴猎手(另有 [游走],见下面的关键词表——两张表都要登记)
  'VEN-093': 1, // ★627 均衡渡命人(与 VEN-070 逐字同构,只差数值;同样【两张表都要登记】)
  'VEN-122': 1, // ★665 烈阳之鹰(与 VEN-093 逐字同构;关键词那半在 EMPOWERED_KEYWORDS)
  'VEN-043': 7, // ★钢爪——本表里【唯一整张都实现了】的一张(法盾+强化7+已强化>+7 三段全通)
  'VEN-124': 2, // ★608 脱逃的灰背(另一半「[强化]—摧毁一名友方单位」在 data/cards/VEN-124.ts)
                                                                             
  'VEN-084': 3,
  'VEN-084a': 3,
}

                                      
const EMPOWERED_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  'VEN-001': ['法盾', '强攻2'], // 巴凯旋沙者
  'VEN-050': ['法盾', '坚守3'], // 凶暴的岩熊
  'VEN-070': ['游走'], // 残暴猎手(战力那半在 EMPOWERED_MIGHT)
  'VEN-093': ['游走'], // ★627 均衡渡命人(战力那半在 EMPOWERED_MIGHT)
  'VEN-122': ['法盾2'], // ★665 烈阳之鹰(战力那半在 EMPOWERED_MIGHT;deflectValue 认 N)
                                                                             
  'VEN-092': ['法盾', '游走'],
  'VEN-092a': ['法盾', '游走'],
  'VEN-177': ['法盾', '游走'],
                          
                                                        
                                                                
                             
  'VEN-136': ['强攻2'],
  'VEN-136a': ['强攻2'],
}

   
                         
                                                    
   
   
                                                   
                                                      
                                                      
                                                        
   
function ragePassive(obj: GameObject): readonly StaticEffect[] {
  if (passiveDefId(obj) !== 'VEN-018') return []
  const owner = obj.controller
  const delta = isEmpowered(obj) ? 2 : 1               
  return [{
    id: `VEN-018:rage:${obj.oid}`,
    duration: 'permanent',
    fromPassive: true,
    timestamp: 0,
    predicate: (x: GameObject) => x.controller === owner && isUnit(x), // ★1384:§187.6 映像是单位指示物,「你的单位」含它(★1202 口径;严格判据把它错排除 ⇒ 映像拿不到 +1/+2)
    modification: { kind: 'addMight', delta },
  }]
}

   
                                                          
                                                      
                                               
                                                              
                                                           
                                                 
                                                                       
                                                              
                                                                     
   
const KAYLE_LIMIT = 3
const KAYLE_PER_STACK = 2
function kaylePassives(obj: GameObject): readonly StaticEffect[] {
  if (passiveDefId(obj) !== 'VEN-134') return []
  const selfOid = obj.oid
  const mine = (x: GameObject): boolean => x.oid === selfOid
  const emp = Math.min(empowerCount(obj), KAYLE_LIMIT)
  const out: StaticEffect[] = [{
    id: `VEN-134:limit:${selfOid}`, duration: 'permanent', fromPassive: true, timestamp: 0,
    predicate: mine, // 上限权限常驻(未强化也在),别加 isEmpowered
    modification: { kind: 'setLimit', limit: 'empower', value: KAYLE_LIMIT },
  }]
  if (emp > 0) {
    out.push({
      id: `VEN-134:might:${selfOid}`, duration: 'permanent', fromPassive: true, timestamp: 0,
      predicate: mine, modification: { kind: 'addMight', delta: KAYLE_PER_STACK * emp },
    })
  }
  if (emp >= KAYLE_LIMIT) {
    for (const kw of ['法盾3', '游走']) {
      out.push({
        id: `VEN-134:full:${kw}:${selfOid}`, duration: 'permanent', fromPassive: true, timestamp: 0,
        predicate: mine, modification: { kind: 'grantKeyword', keyword: kw },
      })
    }
  }
  return out
}

export function empoweredPassives(obj: GameObject): readonly StaticEffect[] {
  const out: StaticEffect[] = [...ragePassive(obj), ...kaylePassives(obj)]
  const selfOid = obj.oid
  const mine = (x: GameObject): boolean => x.oid === selfOid && isEmpowered(x)

                                                                       
                                                          
                                                          
                                                   
                                                          
                                                
  const implId = resolveImplDefId(passiveDefId(obj), (x) => x in EMPOWERED_MIGHT || x in EMPOWERED_KEYWORDS)
  const delta = EMPOWERED_MIGHT[implId]
  if (delta !== undefined) {
    out.push({
      id: `${obj.defId}:empowered:might:${selfOid}`,
      duration: 'permanent',
      fromPassive: true, // 印刷被动来源,§477.3.b 不快照
      timestamp: 0,
      predicate: mine,
      modification: { kind: 'addMight', delta },
    })
  }
  for (const kw of EMPOWERED_KEYWORDS[implId] ?? []) {
    out.push({
      id: `${obj.defId}:empowered:kw:${kw}:${selfOid}`,
      duration: 'permanent',
      fromPassive: true,
      timestamp: 0,
      predicate: mine,
      modification: { kind: 'grantKeyword', keyword: kw },
    })
  }
  return out
}

                        
export const EMPOWERED_PASSIVE_DEFIDS: readonly string[] = [
  ...Object.keys(EMPOWERED_MIGHT),
  ...Object.keys(EMPOWERED_KEYWORDS),
  'VEN-134', // ★670 凯尔(多档手写 kaylePassives,不进两张表)
]
