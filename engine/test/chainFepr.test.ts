import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { ChainItem } from '../src/loop/chain'
import { FEPR_STEP_NAMES, runFepr, type FeprDecide } from '../src/loop/chainFepr'
import type { GameEvent } from '../src/loop/events'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const ALWAYS_PASS: FeprDecide = () => ({ kind: 'pass' })

function item(id: string, kind: ChainItem['kind'], resolve: () => readonly GameEvent[] = () => []): ChainItem {
  return { id, controller: P1, kind, status: 'pending', resolve }
}

function withChain(items: ChainItem[]): GameState {
  return { ...createInitialState([P1, P2]), chain: items }
}

describe('H1:FEPR 四步命名(§334)', () => {
  test('是 确认/执行/让过/结算,绝不是 Focus/Priority', () => {
    expect(FEPR_STEP_NAMES).toEqual({ finalize: '确认', execute: '执行', pass: '让过', resolve: '结算' })
    const values = Object.values(FEPR_STEP_NAMES)
    expect(values).not.toContain('焦点')
    expect(values).not.toContain('优先权')
  })
})

describe('§337.2 快捷结算旁路', () => {
  test('单位确认后立即结算,不开执行/让过窗口(decide 不被调用)', () => {
    const s = withChain([item('u1', 'unit')])
    const after = runFepr(s, () => {
      throw new Error('快捷结算不应进入执行步骤')
    })
    expect(after.chain).toHaveLength(0)
    expect(after.priority).toBeNull()
  })
  test('装备/获资源同样快捷结算', () => {
    for (const kind of ['equipment', 'resource'] as const) {
      const after = runFepr(withChain([item('x', kind)]), () => {
        throw new Error('不应进入执行')
      })
      expect(after.chain).toHaveLength(0)
    }
  })
  test('法术不快捷:需走执行/让过,全员让过后结算', () => {
    let resolved = false
    const s = withChain([item('spell1', 'spell', () => {
      resolved = true
      return []
    })])
    const after = runFepr(s, ALWAYS_PASS)
    expect(resolved).toBe(true)
    expect(after.chain).toHaveLength(0)
  })
})

describe('§340.1 结算最新已确认(LIFO)', () => {
  test('两个法术:后加入的先结算', () => {
    const order: string[] = []
    const s = withChain([
      item('A', 'spell', () => {
        order.push('A')
        return []
      }),
      item('B', 'spell', () => {
        order.push('B')
        return []
      }),
    ])
    runFepr(s, ALWAYS_PASS)
                                              
    expect(order).toEqual(['B', 'A'])
  })
})

describe('§339.1 全员让过则结算 + 链空回开环', () => {
  test('单法术全员让过后结算,链空 priority=null', () => {
    const s = withChain([item('s', 'spell')])
    const after = runFepr(s, ALWAYS_PASS)
    expect(after.chain).toHaveLength(0)
    expect(after.priority).toBeNull()
  })
})
