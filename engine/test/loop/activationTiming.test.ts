import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { canActivateNow } from '../../src/loop/activationTiming'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                            
function base(over: Partial<GameState> = {}): GameState {
  const s = createInitialState([P1, P2], 2)
  return { ...s, activePlayer: P1, phase: 'main', chain: [], spellDuelActive: false, ...over }
}
                                      
const dummyChain = [{ id: 'x', controller: P1, kind: 'spell', status: 'pending', resolve: () => [] }] as unknown as GameState['chain']

describe('§381/§145.2 默认门(无权限关键词)', () => {
  test('己方回合 + 主阶段 + 开环 + 非对决 → 可激活', () => {
    expect(canActivateNow(base(), P1, [], 'action')).toBe(true)
    expect(canActivateNow(base(), P1, undefined, 'action')).toBe(true)
  })

  test('§381 非控制者的回合 → 不可', () => {
    expect(canActivateNow(base({ activePlayer: P2 }), P1, [], 'action')).toBe(false)
  })

  test('§145.2 非主阶段 → 不可', () => {
    expect(canActivateNow(base({ phase: 'ending' }), P1, [], 'action')).toBe(false)
  })

  test('§381 闭环(链上有项目)→ 不可(此前完全没有这道门,是既有漏洞)', () => {
    expect(canActivateNow(base({ chain: dummyChain }), P1, [], 'action')).toBe(false)
  })

  test('§145.2 法术对决期间 → 不可', () => {
    expect(canActivateNow(base({ spellDuelActive: true }), P1, [], 'action')).toBe(false)
  })

  test('§338.1.a.1 闭环反应窗口 → 默认不可(所有卡牌和主动技能默认不能在闭环状态下打出)', () => {
    expect(canActivateNow(base(), P1, [], 'window')).toBe(false)
  })
})

describe('§813 [反应]:解除闭环/对决/回合限制', () => {
  test('§813.1.c.2 闭环反应窗口内可激活', () => {
    expect(canActivateNow(base({ chain: dummyChain }), P1, ['反应'], 'window')).toBe(true)
  })

  test('§813.1.c.2「任意玩家回合」:对手回合也可', () => {
    expect(canActivateNow(base({ activePlayer: P2, chain: dummyChain }), P1, ['反应'], 'window')).toBe(true)
  })

  test('§813.2/§308.1.a 法术对决期间可激活', () => {
    expect(canActivateNow(base({ spellDuelActive: true }), P1, ['反应'], 'action')).toBe(true)
  })

  test('开环主阶段照常可(权限只增不减,§813.2「涵盖…可使用的所有时机」)', () => {
    expect(canActivateNow(base(), P1, ['反应'], 'action')).toBe(true)
  })
})

describe('§806 [迅捷]:对决场合,任意玩家回合', () => {
  test('§806.1.c.2 法术对决期间可激活(含对手回合)', () => {
    expect(canActivateNow(base({ spellDuelActive: true }), P1, ['迅捷'], 'action')).toBe(true)
    expect(canActivateNow(base({ spellDuelActive: true, activePlayer: P2 }), P1, ['迅捷'], 'action')).toBe(true)
  })

  test('§806.2 默认时机保留:己方开环主阶段照常可', () => {
    expect(canActivateNow(base(), P1, ['迅捷'], 'action')).toBe(true)
  })

  test('[迅捷]不给闭环反应窗口权限(§806.1.c.2 只提对决,窗口是[反应]的地盘)', () => {
    expect(canActivateNow(base({ chain: dummyChain }), P1, ['迅捷'], 'window')).toBe(false)
  })

  test('[迅捷]不解除"非己方回合的开环"(默认门要求己方回合,对决之外无豁免)', () => {
    expect(canActivateNow(base({ activePlayer: P2 }), P1, ['迅捷'], 'action')).toBe(false)
  })
})
