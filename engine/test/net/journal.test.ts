                                                    
                                                       

import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { Room } from '../../src/net/room'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardCost }

function newGame(): InteractiveGame {
  const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
  const g = new InteractiveGame(state, DEPS)
  g.apply({ kind: 'MULLIGAN', player: P1, put: [] })
  g.apply({ kind: 'MULLIGAN', player: P2, put: [] })
  return g
}

describe('对局战报', () => {
  test('记下事件流,且带回合序号;回合交接记召出+抽牌', () => {
    const g = newGame()
    expect(g.journal.projectFor(P1).some((e) => e.kind === 'draw')).toBe(true)              
    g.apply({ kind: 'END_TURN', player: P1 })
    const entries = g.journal.projectFor(P1)
    expect(entries.every((e) => e.seq > 0 && e.turn >= 1)).toBe(true)
    expect(entries.some((e) => e.kind === 'summonRune')).toBe(true)               
    expect(entries.some((e) => e.turn === 2)).toBe(true)          
  })

  test('§109 密封:进入手牌的卡,对手在战报里看不到身份,拥有者看得到', () => {
    const g = newGame()
    const toHand = (p: string): ReturnType<InteractiveGame['journal']['projectFor']> =>
      g.journal.projectFor(asPlayerId(p)).filter((e) => e.kind === 'zoneChange' && e.zoneTo?.startsWith('hand:'))
    const mine = toHand('P1').filter((e) => e.zoneTo === 'hand:P1')
    const theirs = toHand('P2').filter((e) => e.zoneTo === 'hand:P1')
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.every((e) => e.defId !== undefined)).toBe(true)              
    expect(theirs.every((e) => e.defId === undefined)).toBe(true)                
  })

  test('打到公开区(战场)的卡对双方都带卡名', () => {
    const g = newGame()
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')
    expect(play).toBeDefined()
    g.apply(play!)
    const played = (p: string): number =>
      g.journal.projectFor(asPlayerId(p)).filter((e) => e.kind === 'playUnit' && e.defId !== undefined).length
    expect(played('P1')).toBeGreaterThan(0)
    expect(played('P1')).toBe(played('P2'))                 
  })

  test('增量拉取:sinceSeq 之后的条目才下发', () => {
    const g = newGame()
    const all = g.journal.projectFor(P1)
    const cut = all[Math.floor(all.length / 2)]!.seq
    const rest = g.journal.projectFor(P1, cut)
    expect(rest.every((e) => e.seq > cut)).toBe(true)
    expect(rest.length).toBe(all.length - all.filter((e) => e.seq <= cut).length)
  })

  test('房间视图把战报按座位脱敏后下发', () => {
    const g = newGame()
    const room = new Room('TEST', g)
    room.join('c1')
    room.join('c2')
    const v1 = room.viewFor('c1')
    const v2 = room.viewFor('c2')
    expect(v1.logSeq).toBe(v2.logSeq)
    const p1HandReveals = v2.log.filter((e) => e.zoneTo === 'hand:P1' && e.defId !== undefined)
    expect(p1HandReveals).toHaveLength(0)                  
    expect(v1.log.filter((e) => e.zoneTo === 'hand:P1' && e.defId !== undefined).length).toBeGreaterThan(0)
  })
})
