import { describe, expect, test } from 'vitest'
import { computeCost, type CostMod } from '../../src/game/costPipeline'
import type { Cost } from '../../src/state/runePool'

                                                   
  
                                                    
                                            
                                                                  
                                                                             
                                                           

const BASE: Cost = { mana: 3 }

describe('§356.3 增费:pip 的颜色', () => {
  test('★不给 `pipColors` ⇒ 仍是【任意域】(存量行为一个字都没变)', () => {
    const mods: readonly CostMod[] = [{ kind: 'increase', part: 'pips', pips: 1 }]
                                  
    expect(computeCost(BASE, mods)).toEqual({ mana: 3, pips: [[]] })
  })

  test('★★给了 `pipColors: [\'red\']` ⇒ 那一枚只能用【红】付', () => {
    const mods: readonly CostMod[] = [{ kind: 'increase', part: 'pips', pips: 1, pipColors: ['red'] }]
    expect(computeCost(BASE, mods)).toEqual({ mana: 3, pips: [['red']] })
  })

  test('★★★这正是 UNL-025 那句「支付{3}和【红色】」:比"任意域"更严,不是更松', () => {
    const anyDomain = computeCost(BASE, [{ kind: 'increase', part: 'pips', pips: 1 }])
    const redOnly = computeCost(BASE, [{ kind: 'increase', part: 'pips', pips: 1, pipColors: ['red'] }])
                                         
    expect(anyDomain.mana).toBe(redOnly.mana)
    expect(anyDomain.pips).toHaveLength(1)
    expect(redOnly.pips).toHaveLength(1)
    expect(anyDomain.pips?.[0], '任意域 = 空清单').toEqual([])
    expect(redOnly.pips?.[0], '点名红色 = 只收红').toEqual(['red'])
  })

  test('★加多枚时每一枚都带上那份颜色清单', () => {
    const mods: readonly CostMod[] = [{ kind: 'increase', part: 'pips', pips: 2, pipColors: ['red', 'purple'] }]
    expect(computeCost(BASE, mods)).toEqual({ mana: 3, pips: [['red', 'purple'], ['red', 'purple']] })
  })

  test('★★每一枚是【各自一份】拷贝,不是共享同一个数组(免得下游改一枚串了另一枚)', () => {
    const out = computeCost(BASE, [{ kind: 'increase', part: 'pips', pips: 2, pipColors: ['red'] }])
    expect(out.pips?.[0]).not.toBe(out.pips?.[1])
  })

  test('★`pipColors` 只对增费有意义:挂在【减费】上不该改变结果', () => {
                                         
                                          
    const withColors = computeCost({ mana: 3, pips: [['red']] },
      [{ kind: 'reduce', part: 'mana', mana: 1, pipColors: ['blue'] } as CostMod])
    const without = computeCost({ mana: 3, pips: [['red']] }, [{ kind: 'reduce', part: 'mana', mana: 1 }])
    expect(withColors).toEqual(without)
  })
})
