import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { computeDerived, type Modification, type StaticEffect } from '../src/effects/continuousView'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function eff(id: string, mod: Modification, timestamp: number, fromPassive = false): StaticEffect {
  return { id, duration: 'permanent', fromPassive, predicate: () => true, modification: mod, timestamp }
}
function unit(baseMight: number): GameObject {
  return { oid: asObjId('a'), defId: 'U', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'), baseMight, damage: 0, counters: {}, status: {} }
}
const S = (): GameState => createInitialState([P1, P2])
const might = (base: number, effects: StaticEffect[]) => computeDerived(unit(base), S(), effects).might

describe('§478-479 依赖判定(单向)', () => {
  test('§479 例:提升至5(被动) 依赖 训练有素(+2) → 训练有素先 → 4战力→6', () => {
                                                             
    const raise = eff('raise', { kind: 'raiseTo', value: 5 }, 1, true)
    const train = eff('train', { kind: 'addMight', delta: 2 }, 2)
    expect(might(4, [raise, train])).toBe(6)                        
  })

  test('背水一战×星蚀:翻倍依赖星蚀减值 → 星蚀先 → base2→-2→负值翻倍+0 → -2', () => {
    const star = eff('star', { kind: 'addMight', delta: -4 }, 1)         
    const dbl = eff('dbl', { kind: 'doubleMight' }, 2)           
    expect(might(2, [star, dbl])).toBe(-2)
  })
})

describe('§479.1 双向依赖无法建立 → 回落时间戳,结果顺序无关', () => {
  test('提升至5 + (+2最多至5):两者互相改变 → 无依赖 → 结果恒为5', () => {
    const raise = eff('raise', { kind: 'raiseTo', value: 5 }, 1, true)
    const spell = eff('spell', { kind: 'addMight', delta: 2, cap: 5 }, 2)
    expect(might(4, [raise, spell])).toBe(5)
                               
    const raise2 = eff('raise', { kind: 'raiseTo', value: 5 }, 3, true)
    const spell2 = eff('spell', { kind: 'addMight', delta: 2, cap: 5 }, 0)
    expect(might(4, [raise2, spell2])).toBe(5)
  })
})

describe('§477.3.e + §480:无依赖时增值先于减值、同子层按时间戳', () => {
  test('独立 +3 与 -1(无依赖):增值先 → base3→6→5', () => {
    const inc = eff('inc', { kind: 'addMight', delta: 3 }, 5)
    const dec = eff('dec', { kind: 'addMight', delta: -1 }, 1)                 
    expect(might(3, [inc, dec])).toBe(5)
  })

  test('两个独立增值:按时间戳先后(此处结果同,验证不抛/收敛)', () => {
    const a = eff('a', { kind: 'addMight', delta: 2 }, 2)
    const b = eff('b', { kind: 'addMight', delta: 1 }, 1)
    expect(might(3, [a, b])).toBe(6)
  })
})
