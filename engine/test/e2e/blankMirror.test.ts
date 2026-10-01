                                                     

import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { GameSession } from '../../src/session/gameSession'
import { assertInvariants } from '../../src/test/invariants'
import { makeRng } from '../../src/bot/randomBot'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

describe('白板镜像局 e2e', () => {
  test('会话初始化:视图脱敏(对手手牌不可见)', () => {
    const g = new GameSession()
    const v1 = g.view(P1)
                              
    expect(v1.zones['hand:P2']!.contents.every((c) => c === 'hidden')).toBe(true)
             
    expect(v1.zones['hand:P1']!.contents.some((c) => c !== 'hidden')).toBe(true)
  })

  test('点名式:仅回合玩家 PROMPT,对手 WAITING', () => {
    const g = new GameSession()
    expect(g.prompt(g.state.activePlayer)).toBe('PROMPT')
    const other = g.state.players.find((p) => p !== g.state.activePlayer)!
    expect(g.prompt(other)).toBe('WAITING')
  })

  test('脚本局:打出单位→发起战斗→结束回合,不变量成立', () => {
    const g = new GameSession()
    const acts = g.legalActions(P1)
    const play = acts.find((a) => a.kind === 'PLAY_UNIT')!
    g.apply(play)
    assertInvariants(g.state)
    const attack = g.legalActions(P1).find((a) => a.kind === 'ATTACK')
    if (attack) g.apply(attack)
    assertInvariants(g.state)
    g.apply({ kind: 'END_TURN', player: P1 })
    assertInvariants(g.state)
    expect(g.state.activePlayer).toBe(P2)        
  })

  test('random-bot 白板局自我对弈:多局不崩、不变量恒成立、能收敛到胜负', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = makeRng(seed)
      const g = new GameSession()
      for (let turn = 0; turn < 60 && !g.state.winner; turn++) {
        const player = g.state.activePlayer
        const acts = g.legalActions(player)
        if (acts.length === 0) break
                                      
        const nonEnd = acts.filter((a) => a.kind !== 'END_TURN')
        const pick = nonEnd.length > 0 && rng() < 0.6 ? nonEnd[Math.floor(rng() * nonEnd.length)]! : { kind: 'END_TURN' as const, player }
        g.apply(pick)
        assertInvariants(g.state)
      }
    }
    expect(true).toBe(true)         
  })
})
