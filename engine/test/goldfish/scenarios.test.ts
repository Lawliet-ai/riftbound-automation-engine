                                                

import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { runTurn } from '../../src/goldfish/singleSeat'
import { assertInvariants } from '../../src/test/invariants'
import { drawCard } from '../../src/goldfish/singleSeat'
import { attemptConquer } from '../../src/scoring/score'
import { skipScoringShield } from '../../src/effects/replacement'
import type { ReduceDeps } from '../../src/loop/reduce'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

describe('§431.3.c.1 燃尽即时胜(goldfish 空堆抽牌触发)', () => {
  test('runTurn 抽牌阶段空堆 → 反复燃尽 → 对手达标立即胜,不变量成立', () => {
                                                      
    let s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 2 }, winTarget: 3 }
    s = runTurn(s)                      
    assertInvariants(s)
    expect(s.winner).toBe(P2)
  })
})

describe('H3 首个燃尽分可挡(§431.3.b)', () => {
  test('goldfish 抽牌燃尽:首个分被 Skip 挡,后续 exempt 不可挡直至达标', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 1 }, winTarget: 3 }
    const deps: ReduceDeps = { replacement: { shields: [skipScoringShield('tia', P2, () => true)] } }
    const after = drawCard(s, P1, deps)                        
    expect(after.winner).toBe(P2)
    expect(after.scores['P2']).toBe(3)                          
  })
})

describe('§471.1.b 末分锁改抽(赛点征服未补齐全场)', () => {
  test('赛点征服未补齐 → 改抽(据守不锁,征服锁)', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 7, P2: 0 }, winTarget: 8 }
    let drew = false
    const r = attemptConquer(s, P1, 'battlefield:shared:0', {}, { drawCard: (st) => ((drew = true), st) })
    expect(r.result).toBe('drawInstead')
    expect(drew).toBe(true)
    expect(r.state.scores['P1']).toBe(7)
  })
})
