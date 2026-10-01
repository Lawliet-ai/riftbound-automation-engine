import { describe, expect, test } from 'vitest'
import { computeCost, type CostMod } from '../../src/game/costPipeline'

                               

const red = (m: Partial<CostMod>): CostMod => ({ kind: 'reduce', part: 'total', ...m })

describe('§356.1.b 无视费用 = 把对应部分【设为零】', () => {
  test('§356.1.b.1「无视其费用」→ 法力与符能都归零', () => {
    const c = computeCost({ mana: 5, pips: [['orange'], ['orange']] }, [{ kind: 'zero', part: 'total' }])
    expect(c).toEqual({ mana: 0 })
  })

  test('§356.1.b.2「无视其法力费用」→ 只归零法力,符能照付', () => {
    const c = computeCost({ mana: 5, pips: [['orange']] }, [{ kind: 'zero', part: 'mana' }])
    expect(c).toEqual({ mana: 0, pips: [['orange']] })
  })

  test('§356.1.b.3 归零之后的增费可以把总费用【顶回零以上】', () => {
    const c = computeCost({ mana: 5 }, [
      { kind: 'zero', part: 'total' },
      { kind: 'increase', part: 'mana', mana: 2 },
    ])
    expect(c.mana).toBe(2)
  })
})

describe('§356.3 增费', () => {
  test('法力增费直接加', () => {
    expect(computeCost({ mana: 1 }, [{ kind: 'increase', part: 'mana', mana: 2 }]).mana).toBe(3)
  })

  test('符能增费记为【任意域】(空数组=任意特性可付)', () => {
    const c = computeCost({ mana: 0 }, [{ kind: 'increase', part: 'pips', pips: 1 }])
    expect(c.pips).toEqual([[]])
  })
})

describe('★§356.4.e 下限【只属于那一条减费】,不是全局地板', () => {
  test('单条带下限:减1不得低于1 → 2 变 1', () => {
    expect(computeCost({ mana: 2 }, [red({ part: 'mana', mana: 1, floor: 1 })]).mana).toBe(1)
  })

  test('已经在下限上 → 这条减费不再降(也不报错)', () => {
    expect(computeCost({ mana: 1 }, [red({ part: 'mana', mana: 1, floor: 1 })]).mana).toBe(1)
  })

  test('★带下限的减费 + 【无下限】的减费 → 后者可继续压到 0', () => {
                                   
    const c = computeCost({ mana: 2 }, [
      red({ part: 'mana', mana: 1, floor: 1 }), // 2→1(到自己的下限)
      red({ part: 'mana', mana: 1 }), // 1→0(它没有下限)
    ])
    expect(c.mana).toBe(0)
  })

  test('两条各带下限:各自 clamp,不互相接管', () => {
    const c = computeCost({ mana: 5 }, [
      red({ part: 'mana', mana: 2, floor: 3 }), // 5→3
      red({ part: 'mana', mana: 5, floor: 2 }), // 3→2(被自己的下限拦住)
    ])
    expect(c.mana).toBe(2)
  })

  test('无下限时不为负', () => {
    expect(computeCost({ mana: 1 }, [red({ part: 'mana', mana: 9 })]).mana).toBe(0)
  })
})

describe('★§356.4.c/§356.4.d 部分性减费【先于】总额性', () => {
  test('顺序影响结果:部分性带下限时,先后不同答案不同', () => {
                             
                            
    const c = computeCost({ mana: 5 }, [
      red({ part: 'total', mana: 2 }),
      red({ part: 'mana', mana: 2, floor: 3 }),
    ])
    expect(c.mana).toBe(1)
    // 若把总额性排前面:5→3→3(部分性到下限不再降)= 3,与规则不符
  })

  test('mods 传入顺序不影响结果(管线自己按 §356 分批施加)', () => {
    const a = computeCost({ mana: 5 }, [red({ part: 'mana', mana: 2, floor: 3 }), red({ part: 'total', mana: 2 })])
    const b = computeCost({ mana: 5 }, [red({ part: 'total', mana: 2 }), red({ part: 'mana', mana: 2, floor: 3 })])
    expect(a).toEqual(b)
  })
})

describe('符能(pip)减免', () => {
  test('减一枚 pip', () => {
    const c = computeCost({ mana: 2, pips: [['blue'], ['blue']] }, [red({ part: 'pips', pips: 1 })])
    expect(c.pips).toHaveLength(1)
  })

  test('减光了就没有 pips 字段(不留空数组)', () => {
    expect(computeCost({ mana: 2, pips: [['blue']] }, [red({ part: 'pips', pips: 3 })])).toEqual({ mana: 2 })
  })
})

describe('§356.1.c/§206.1 印刷费不被回写', () => {
  test('算完之后原对象一点没变(别的效果仍读印刷值)', () => {
    const printed = { mana: 5, pips: [['orange'] as readonly string[]] }
    const snapshot = JSON.stringify(printed)
    computeCost(printed, [red({ part: 'total', mana: 3 }), { kind: 'zero', part: 'mana' }])
    expect(JSON.stringify(printed)).toBe(snapshot)
  })

  test('无修正 → 原样返回(通道关闭时行为与接线前一致)', () => {
    expect(computeCost({ mana: 3, pips: [['blue']] })).toEqual({ mana: 3, pips: [['blue']] })
  })
})
