                                            
  
                                                    
                                                                    
                                                
                                           
import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { Journal } from '../../src/net/journal'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import type { GameEvent } from '../../src/loop/events'

const P1 = asPlayerId('P1')

describe('★872 burn 事件进战报', () => {
  test('🔴 burn count:7 的事件,战报要有 {kind:burn, amount:7}(此前白名单没有它,燃烧全程隐身)', () => {
    const j = new Journal()
    const st = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7)).state
    j.record({ kind: 'burn', player: P1, count: 7 } as GameEvent, st)
    const e = j.projectFor(P1).find((x) => x.kind === 'burn') as { player?: string; amount?: number }
    expect(e).toBeDefined()
    expect(e.amount).toBe(7)
    expect(e.player).toBe(P1)
  })
})
