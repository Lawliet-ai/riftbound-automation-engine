import { describe, expect, test } from 'vitest'
import { asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import { attemptConquer, attemptHold, type ScoringHooks } from '../src/scoring/score'
import { burnOut } from '../src/scoring/burnout'
import { skipScoringShield } from '../src/effects/replacement'
import type { ReduceDeps } from '../src/loop/reduce'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const BF2 = 'battlefield:shared:2'

describe('§470 每战场每回合每人≤1分', () => {
  test('同战场征服两次:第二次 alreadyScored', () => {
    const s0 = createInitialState([P1, P2])
    const r1 = attemptConquer(s0, P1, BF0)
    expect(r1.result).toBe('scored')
    expect(r1.state.scores['P1']).toBe(1)
    const r2 = attemptConquer(r1.state, P1, BF0)
    expect(r2.result).toBe('alreadyScored')
  })
  test('征服后再据守同战场:alreadyScored(征服据守共享上限)', () => {
    const r1 = attemptConquer(createInitialState([P1, P2]), P1, BF0)
    const r2 = attemptHold(r1.state, P1, BF0)
    expect(r2.result).toBe('alreadyScored')
  })
})

describe('§471 末分锁只锁征服', () => {
  const atMatchPoint = (over: Partial<GameState> = {}): GameState => ({
    ...createInitialState([P1, P2]),
    scores: { P1: 7, P2: 0 },
    winTarget: 8,
    ...over,
  })
  test('赛点征服未补齐每个战场 → 改抽(drawInstead)', () => {
    let drew = false
    const hooks: ScoringHooks = { drawCard: (st) => ((drew = true), st) }
    const r = attemptConquer(atMatchPoint(), P1, BF0, {}, hooks)
    expect(r.result).toBe('drawInstead')
    expect(drew).toBe(true)
    expect(r.state.scores['P1']).toBe(7)       
  })
  test('赛点征服补齐最后一个战场(其他已得) → 拿最后一分', () => {
    const s = atMatchPoint({ scoredBattlefieldsThisTurn: { P1: [BF1, BF2] } })
    const r = attemptConquer(s, P1, BF0)
    expect(r.result).toBe('scored')
    expect(r.state.scores['P1']).toBe(8)
  })
  test('据守不受末分锁:赛点据守直接得分', () => {
    const r = attemptHold(atMatchPoint(), P1, BF0)
    expect(r.result).toBe('scored')
    expect(r.state.scores['P1']).toBe(8)
  })
})

describe('§383.4.c.2.c 征服技能与gainPoint解耦(分数被挡仍触发)', () => {
  test('缇亚娜式Skip挡分:result=blocked,但征服技能已触发', () => {
    let fired = false
    const hooks: ScoringHooks = { fireScoringAbilities: (st) => ((fired = true), st) }
    const deps: ReduceDeps = { replacement: { shields: [skipScoringShield('tia', P2, () => true)] } }
    const r = attemptConquer(createInitialState([P1, P2]), P1, BF0, deps, hooks)
    expect(r.result).toBe('blocked')       
    expect(r.state.scores['P1']).toBe(0)
    expect(fired).toBe(true)                         
  })
})

describe('燃尽 §431.3(H3:首个可挡,后续豁免+立即胜)', () => {
  const emptyDeckState = (): GameState => ({
    ...createInitialState([P1, P2]),
    scores: { P1: 0, P2: 1 },
    winTarget: 3, // P2 到3即胜
  })
  test('反复燃尽:后续分使对手达标 → 立即获胜(§431.3.c.1)', () => {
    const s = burnOut(emptyDeckState(), P1)
    expect(s.winner).toBe(P2)                         
    expect(s.scores['P2']).toBe(3)
  })
  test('H3:首个燃尽分可被Skip挡(后续exempt不可挡)', () => {
                                    
    const deps: ReduceDeps = { replacement: { shields: [skipScoringShield('tia', P2, () => true)] } }
    const s = burnOut(emptyDeckState(), P1, deps)
                                                    
    expect(s.winner).toBe(P2)
    expect(s.scores['P2']).toBe(3)                              
  })
})
