                                                   
                                               
  
                                      
                                                
  
                                    
                                                        
                                                       
                                        
                                                         
                                                        
  
                                          
                                                          
                                                            
                                       
  
                
                                  
                                                                    
                                             
                                             

import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'

                                                        
const DOMAIN_CN: Readonly<Record<string, string>> = {
  red: '红色', green: '绿色', blue: '蓝色',
  orange: '橙色', purple: '紫色', yellow: '黄色',
}

                                                       
export const RUNE_DEF_PREFIX = 'rune:'

function tapForMana(domain: string): ActivatedSpec {
  return {
    key: `rune:tap:${domain}`,
    label: '{{横置}}:产 1 点法力',
    cost: {},          // 冒号前只有 [E],没有资源费
    tapSelf: true,     // §164.2.a [E] = 横置自身;要求当前未横置
    keywords: ['反应'], // §813 权限轴:任意玩家回合、闭环也能发
    fastResolve: true, // §429.2 获得资源的技能确认后立即结算,不入链、不可被反应
    target: 'none',
    legalTargets: (): string[] => [],
    makeResolve: ({ controller }) => (): readonly GameEvent[] =>
      [{ kind: 'gainResource', player: controller, mana: 1 }],
  }
}

function recycleForEnergy(domain: string): ActivatedSpec {
  const cn = DOMAIN_CN[domain] ?? domain
  return {
    key: `rune:recycle:${domain}`,
    label: `回收 → 产 1 点${cn}符能`,
    cost: {},
    recycleSelf: true, // §164.2.b「回收此牌」;§416.1.b 符文回符文牌堆
    keywords: ['反应'],
    fastResolve: true,
    target: 'none',
    legalTargets: (): string[] => [],
                                    
    makeResolve: ({ controller }) => (): readonly GameEvent[] =>
      [{ kind: 'gainResource', player: controller, energy: { [domain]: 1 } }],
  }
}

                                                            
export const RUNE_SPECS: Readonly<Record<string, readonly ActivatedSpec[]>> = Object.fromEntries(
  Object.keys(DOMAIN_CN).map((d) => [`${RUNE_DEF_PREFIX}${d}`, [tapForMana(d), recycleForEnergy(d)]]),
)
