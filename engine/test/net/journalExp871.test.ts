                                                      
  
                                                                   
                                                                         
                                                    
                                                                   
import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { Journal } from '../../src/net/journal'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import type { GameEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1')

function anyState() {
  return setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state
}

describe('★871 gainResource 投影带上经验', () => {
  test('🔴 experience:3 的事件,战报条目要有 experience:3(此前投影成 amount:0 把它吞了)', () => {
    const j = new Journal()
    j.record({ kind: 'gainResource', player: P1, experience: 3 } as GameEvent, anyState())
    const e = j.projectFor(P1).find((x) => x.kind === 'gainResource') as { amount?: number; experience?: number }
    expect(e).toBeDefined()
    expect(e.experience).toBe(3)
    expect(e.amount).toBe(0)                         
  })
  test('🔴★891 restricted 受限载荷(「获得{2}仅可打法术」族)也要计入 amount(此前显示资源+0)', () => {
    const j = new Journal()
    j.record({ kind: 'gainResource', player: P1,
      restricted: { mana: 2, energy: { blue: 1 }, purposes: ['spell'] } } as GameEvent, anyState())
    const e = j.projectFor(P1).find((x) => x.kind === 'gainResource') as { amount?: number }
    expect(e.amount, '★受限的 2 法力+1 符能=3').toBe(3)
  })
  test('纯法力的 gainResource 不带 experience 键(别给老消费者塞新字段)', () => {
    const j = new Journal()
    j.record({ kind: 'gainResource', player: P1, mana: 2 } as GameEvent, anyState())
    const e = j.projectFor(P1).find((x) => x.kind === 'gainResource') as { amount?: number; experience?: number }
    expect(e.amount).toBe(2)
    expect('experience' in e).toBe(false)
  })
})
