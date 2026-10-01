import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import {
  canTakeDiscretionaryAction,
  checkPriorityFocusInvariants,
  grantFocus,
  grantPriority,
  passFocusAfterChainClose,
  passPriorityKeepFocus,
} from '../src/loop/priorityFocus'
import { CLEANUP_ITERATION_CAP } from '../src/loop/cleanup'
import { EXPIRATION_LOOP_CAP, runExpirationStepLoop } from '../src/loop/turnStructure'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const duel = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState([P1, P2]),
  spellDuelActive: true,
  ...over,
})

describe('优先权/焦点共存(§312/§313,DK-04)', () => {
  test('§313.2 获得焦点同时获得优先权', () => {
    const s = grantFocus(createInitialState([P1, P2]), P1)
    expect(s.focus).toBe(P1)
    expect(s.priority).toBe(P1)
  })
  test('§313.3 让过优先权保留焦点 ⇒ 允许持焦点但无优先权(非二选一)', () => {
    const s = passPriorityKeepFocus(grantFocus(duel(), P1))
    expect(s.focus).toBe(P1)        
    expect(s.priority).toBe(P2)          
    expect(s.focus).not.toBe(s.priority)                               
  })
})

describe('自决行动门控(§312.1 主门 + §313.1 附加门)', () => {
  test('普通开环态:只需持优先权(无焦点门)', () => {
    const s = grantPriority(createInitialState([P1, P2]), P1)         
    expect(canTakeDiscretionaryAction(s, P1)).toBe(true)
    expect(canTakeDiscretionaryAction(s, P2)).toBe(false)
  })
  test('法术对决开环态:须同时持优先权与焦点', () => {
                        
    const s1 = grantPriority(duel({ focus: P2 }), P1)
    expect(canTakeDiscretionaryAction(s1, P1)).toBe(false)
                
    const s2 = grantFocus(duel(), P1)
    expect(canTakeDiscretionaryAction(s2, P1)).toBe(true)
  })
  test('闭环态(链存在):焦点门不适用,只看优先权', () => {
    const s = { ...grantPriority(duel(), P1), chain: [{} as never] }          
    expect(canTakeDiscretionaryAction(s, P1)).toBe(true)                      
  })
})

describe('焦点传递(§346/§346.1)', () => {
  test('§346 链结算回开环:焦点传下一名,同时获优先权', () => {
    const s = passFocusAfterChainClose(grantFocus(duel(), P1), false)
    expect(s.focus).toBe(P2)
    expect(s.priority).toBe(P2)
  })
  test('§346.1 触发式/[获得]开启的链:焦点不以此方式传递', () => {
    const s = passFocusAfterChainClose(grantFocus(duel(), P1), true)
    expect(s.focus).toBe(P1)       
  })
})

describe('不变量(§313.5)', () => {
  test('普通状态有焦点 → 违反', () => {
    const bad: GameState = { ...createInitialState([P1, P2]), focus: P1, spellDuelActive: false }
    expect(() => checkPriorityFocusInvariants(bad)).toThrow(/普通状态/)
  })
  test('法术对决状态持焦点 → 合法', () => {
    expect(() => checkPriorityFocusInvariants(grantFocus(duel(), P1))).not.toThrow()
  })
})

describe('§317.2.f 失效步骤循环 vs §322 清理不动点(两循环分离)', () => {
  test('是两个独立常量/独立循环,停止条件不同', () => {
    expect(EXPIRATION_LOOP_CAP).toBeGreaterThan(0)
    expect(CLEANUP_ITERATION_CAP).toBeGreaterThan(0)
                                           
    let n = 0
    const after = runExpirationStepLoop(createInitialState([P1, P2]), (st) => {
      n++
      return { state: st, feprOccurred: n < 3 }                      
    })
    expect(n).toBe(3)
    expect(after).toBeDefined()
  })
})
