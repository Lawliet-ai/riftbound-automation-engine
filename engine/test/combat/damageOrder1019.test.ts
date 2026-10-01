import { describe, expect, test } from 'vitest'
import { assignDamage, pendingDamageOrder, orderTargets, damageOrderKey, parseDamageOrder, type DamageTarget } from '../../src/combat/damageAssign'
import { asObjId, asPlayerId } from '../../src/state/ids'

                                        
  
                                             
                                      
                                                        
                                                              
                                   
  
                                                 
                                                        
                                                            
                                   
                                                
                                                                                 

const mk = (oid: string, need: number, extra: Partial<DamageTarget> = {}): DamageTarget =>
  ({ oid: asObjId(oid), lethalNeeded: need, ...extra } as DamageTarget)
const ids = (ts: readonly DamageTarget[]): string[] => ts.map((t) => String(t.oid))

                                                               
                                                 
                                                               
                                                                   
                                                    
                                                     
                                                  
                                               
                                                          
                              
describe('★★★★★★★ ★1019/★1119 兜底:不传答案时按 §465.2.c.3 分配', () => {
  test('🔴空答案 = 纯优先级稳定排序', () => {
    const ts = [mk('a', 3), mk('b', 2, { barrier: true }), mk('c', 1, { backline: true }), mk('d', 4)]
    expect(ids(orderTargets(ts, [])), '★壁垒最先、后排最后、同级保持原序').toEqual(['b', 'a', 'd', 'c'])
    expect(ids(ts), '★不许原地改调用方的数组').toEqual(['a', 'b', 'c', 'd'])
  })

  test('🔴空答案时 assignDamage 按 §465.2.c.3 分配(旧的 A=2 是违规行为,已被缺陷 107 修掉)', () => {
    const ts = [mk('A', 4), mk('B', 1)]
                           
                                                           
                                               
                                                                  
    expect([...assignDamage(2, ts)].map(([o, n]) => `${o}=${n}`), '★c.3:杀得死的必须先杀').toEqual(['B=1', 'A=1'])
                                                  
    expect([...assignDamage(5, ts)].map(([o, n]) => `${o}=${n}`), '★够全杀时行为与改前一致').toEqual(['A=4', 'B=1'])
                                                       
                                                    
    const four = [mk('a', 3), mk('b', 3), mk('c', 3), mk('d', 3)]
    expect([...assignDamage(5, four)].map(([o, n]) => `${o}=${n}`), '★与 c.3 官方举例逐字一致').toEqual(['a=3', 'b=2'])
                                              
    expect([...assignDamage(9, [mk('only', 3)])].map(([o, n]) => `${o}=${n}`), '★§465.2.c.4 的封顶只在"尚有其他单位"时生效').toEqual(['only=9'])
  })
})

describe('★★★★★★★ ★1019 什么时候【该问】分配方', () => {
  const A = mk('A', 4), B = mk('B', 1)

                                                      
                                                                          
                                                  
                                                          
                                                
  test('🔴该问:同优先级 2 个、两个都杀得死、伤害不够全杀', () => {
    const C = mk('C', 3), D = mk('D', 3)
    const ask = pendingDamageOrder(5, [C, D])
    expect(ask).not.toBeNull()
    expect(ids(ask!.candidates)).toEqual(['C', 'D'])
    expect(ask!.remaining, '★UI 要显示"还剩几点",玩家才知道够不够再杀一个').toBe(5)
  })

  test('🔴不问:同优先级 2 个里【只有一个杀得死】⇒ §465.2.c.3 已经替玩家定死,没有选择余地', () => {
                                                    
                                                    
    expect(pendingDamageOrder(2, [A, B]), '★只有 B 能被 2 点致命 ⇒ 候选只剩一个').toBeNull()
  })

                                          
  test('🔴不问:伤害够把这一组全部致命 ⇒ 每人恰好拿 need,顺序不改变任何结果', () => {
    expect(pendingDamageOrder(5, [A, B]), '★4+1=5,刚好够').toBeNull()
    expect(pendingDamageOrder(9, [A, B]), '★更够').toBeNull()
  })

  test('🔴不问:同优先级只有一个', () => {
    expect(pendingDamageOrder(2, [A])).toBeNull()
                                   
    expect(pendingDamageOrder(1, [mk('x', 5, { barrier: true }), mk('y', 5)])).toBeNull()
  })

  test('🔴不问:一点伤害都没有', () => {
    expect(pendingDamageOrder(0, [A, B])).toBeNull()
  })

  test('🔴不问:答案已经定好了', () => {
    expect(pendingDamageOrder(2, [A, B], ['B', 'A']), '★两个都定了序').toBeNull()
  })

  test('🔴免疫单位不算候选(§465.2.c.10 忽略它)', () => {
    expect(pendingDamageOrder(2, [A, mk('imm', 1, { immune: true })]), '★可选的只剩 A 一个').toBeNull()
  })
})

describe('★★★★★★★ ★1019 答案真的改变结果', () => {
  const A = mk('A', 4), B = mk('B', 1)

                                                             
                                                               
                                                             
  test('🔴🔴两个都杀得死时选序才有意义:选"先打 D" ⇒ D 死;缺省 ⇒ C 死', () => {
    const C = mk('C', 3), D = mk('D', 3)
    const 缺省 = assignDamage(5, [C, D])
    const 先打D = assignDamage(5, [C, D], ['D'])
    expect([...缺省].map(([o, n]) => `${o}=${n}`), '★缺省:C 拿 3 点致命,余 2 点给 D(D 是最后一个 ⇒ 吃满剩余)').toEqual(['C=3', 'D=2'])
    expect([...先打D].map(([o, n]) => `${o}=${n}`), '★选了先打 D:D 拿 3 点致命,余 2 点给 C').toEqual(['D=3', 'C=2'])
    const died = (m: Map<never, number>): string[] =>
      [C, D].filter((t) => ((m as Map<typeof t.oid, number>).get(t.oid) ?? 0) >= t.lethalNeeded).map((t) => String(t.oid))
    expect(died(缺省 as never)).toEqual(['C'])
    expect(died(先打D as never), '★这就是选择权的硬后果').toEqual(['D'])
  })

  test('🔴选序【不能跳过 §465.2.c.3】—— 玩家选"先打杀不死的那个"也不作数', () => {
                                                             
                                                      
                                                     
    expect([...assignDamage(2, [A, B], ['A'])].map(([o, n]) => `${o}=${n}`), '★c.3 是强制,不在选择权范围内').toEqual(['B=1', 'A=1'])
  })

  test('🔴选序【不能跨优先级】—— 壁垒先分是强制的,玩家选不了', () => {
    const bar = mk('bar', 2, { barrier: true }), norm = mk('norm', 2)
                                  
    expect(ids(orderTargets([bar, norm], ['norm'])), '★§465.2.c.6 是强制,不在选择权范围内').toEqual(['bar', 'norm'])
  })

  test('🔴部分定序:定了一个,其余保持原序', () => {
    const ts = [mk('p', 1), mk('q', 1), mk('r', 1)]
    expect(ids(orderTargets(ts, ['r'])), '★r 提到最前,p/q 保持原来的先后').toEqual(['r', 'p', 'q'])
  })
})

describe('★★★★★★★ ★1019 key 与答案编码', () => {
  const P1 = asPlayerId('P1'), P2 = asPlayerId('P2')

  test('🔴🔴两边各问各的 —— key 必须带分配方', () => {
                                                  
    expect(damageOrderKey('bf:0', P1)).not.toBe(damageOrderKey('bf:0', P2))
  })

  test('🔴不同战场不串味', () => {
    expect(damageOrderKey('bf:0', P1)).not.toBe(damageOrderKey('bf:1', P1))
  })

  test('🔴答案编码:空串与 undefined 都当"还没定"', () => {
    expect(parseDamageOrder(undefined)).toEqual([])
    expect(parseDamageOrder('')).toEqual([])
    expect(parseDamageOrder('a,b')).toEqual(['a', 'b'])
  })
})
