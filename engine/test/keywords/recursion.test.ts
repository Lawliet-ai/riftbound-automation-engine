import { describe, expect, test } from 'vitest'
import {
  parseRecursionCost, recursionCostOptions,
  isRecursionSource, recursionChangesTiming,
} from '../../src/keywords/recursion'

describe('§829 流转:从【自己的】废牌堆打出,然后放逐', () => {
  test('§829.1.c 解析法力部分', () => {
    expect(parseRecursionCost('流转4')).toEqual({ mana: 4 })
    expect(parseRecursionCost('流转')).toEqual({ mana: 0 })          
  })

  test('§829.1.c.2 解析色 pip(卡池真实写法:流转4红色)', () => {
    expect(parseRecursionCost('流转4红色')).toEqual({ mana: 4, pips: [['red']] })
    expect(parseRecursionCost('流转2蓝色')).toEqual({ mana: 2, pips: [['blue']] })
  })

  test('同色重复=多枚 pip(卡池真实写法:流转4黄色黄色)', () => {
    expect(parseRecursionCost('流转4黄色黄色')).toEqual({ mana: 4, pips: [['yellow'], ['yellow']] })
  })

  test('[A]=任意特性符能,内层空数组(卡池真实写法:流转3A / 流转5AA)', () => {
    expect(parseRecursionCost('流转3A')).toEqual({ mana: 3, pips: [[]] })
    expect(parseRecursionCost('流转5AA')).toEqual({ mana: 5, pips: [[], []] })
  })

  test('不是流转 / 尾巴无法识别 → 返回 null(宁可判空也不猜)', () => {
    expect(parseRecursionCost('强攻2')).toBeNull()
    expect(parseRecursionCost('流转4喵色')).toBeNull()
  })

  test('§829.2 是法术的特性', () => {
                                                   
                                                                  
                                              
    expect(recursionCostOptions(['流转3']).length > 0).toBe(true)
    expect(recursionCostOptions(['迅捷']).length > 0).toBe(false)
  })

  test('§829.1.c.3 多个费用不同的流转 → 控制者【任选其一】(给出全部选项)', () => {
    const opts = recursionCostOptions(['流转2', '流转5AA', '迅捷'])
    expect(opts).toHaveLength(2)
    expect(opts[0]).toEqual({ mana: 2 })
    expect(opts[1]).toEqual({ mana: 5, pips: [[], []] })
  })

  test('§829.1.c.3 的合并规则【自成一档】:任选其一,既非相加也非只算第一个', () => {
                                              
    const opts = recursionCostOptions(['流转2', '流转3'])
    expect(opts).toHaveLength(2)                              
  })

  test('§829.1.b 来源限【自己的】废牌堆:对手废牌堆里的同名卡不能流转打出', () => {
    expect(isRecursionSource('discard:P1', 'P1')).toBe(true)
    expect(isRecursionSource('discard:P2', 'P1')).toBe(false)              
    expect(isRecursionSource('hand:P1', 'P1')).toBe(false)
    expect(isRecursionSource('mainDeck:P1', 'P1')).toBe(false)
  })

                                                        
                                                   
                                            
                                                                  
                                                                                      
                                   

  test('§829.1.b.2 流转【不改变打出时机】,只多给一个可打出的区域', () => {
                                               
    expect(recursionChangesTiming()).toBe(false)
  })
})
