import { describe, expect, test } from 'vitest'
import {
  addMana,
  addRune,
  clearRunePoolAtEndStep,
  clearRunePoolAtMainPhaseStart,
  emptyRunePool,
  isEmpty,
} from '../src/state/runePool'

describe('符文池两处清零点(§316.3 / §317.2.d,DK-11/DK-12)', () => {
  test('主阶段开始清零:未消耗法力与符能全清', () => {
    let pool = emptyRunePool()
    pool = addMana(pool, 3)
    pool = addRune(pool, 'red', 2)
    expect(isEmpty(pool)).toBe(false)
    const cleared = clearRunePoolAtMainPhaseStart(pool)
    expect(isEmpty(cleared)).toBe(true)
    expect(cleared.mana).toBe(0)
    expect(cleared.runes).toEqual({})
  })

  test('回合末失效步骤清零:同样全清(独立时点)', () => {
    let pool = addMana(emptyRunePool(), 5)
    pool = addRune(pool, 'blue', 1)
    const cleared = clearRunePoolAtEndStep(pool)
    expect(isEmpty(cleared)).toBe(true)
  })

  test('两处清零是独立的纯操作(各自不改入参)', () => {
    const pool = addMana(emptyRunePool(), 4)
    clearRunePoolAtMainPhaseStart(pool)
    expect(pool.mana).toBe(4)               
  })
})
