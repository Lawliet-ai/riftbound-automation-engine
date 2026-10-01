import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import {
  checkPriorityFocusInvariants,
  grantFocus,
  passFocusAfterChainClose,
  passPriorityKeepFocus,
} from '../src/loop/priorityFocus'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function makeRng(seed: number) {
  let x = seed >>> 0
  return () => ((x = (x * 1664525 + 1013904223) >>> 0), x / 0xffffffff)
}

describe('优先权/焦点不变量(property)', () => {
  test('法术对决态下任意 grant/pass 序列:①不变量恒成立 ②≤1持焦点≤1持优先权 ③持焦点者∈玩家集', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = makeRng(seed)
      let s: GameState = { ...createInitialState([P1, P2]), spellDuelActive: true, focus: P1, priority: P1 }
      for (let step = 0; step < 20; step++) {
        const r = rng()
        if (r < 0.34) s = grantFocus(s, rng() < 0.5 ? P1 : P2)
        else if (r < 0.67) s = passPriorityKeepFocus(s)
        else s = passFocusAfterChainClose(s, rng() < 0.5)
                                      
        expect(() => checkPriorityFocusInvariants(s)).not.toThrow()
                                   
        if (s.focus !== null) expect(s.players).toContain(s.focus)
        if (s.priority !== null) expect(s.players).toContain(s.priority)
      }
    }
  })

  test('grantFocus 那一刻 focus===priority(§313.2)', () => {
    const rng = makeRng(7)
    let s: GameState = { ...createInitialState([P1, P2]), spellDuelActive: true }
    for (let i = 0; i < 50; i++) {
      const p = rng() < 0.5 ? P1 : P2
      s = grantFocus(s, p)
      expect(s.focus).toBe(p)
      expect(s.priority).toBe(p)                
    }
  })
})
