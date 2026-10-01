                                                        
        
                                                           
                                            
                                                     
                                                                  
                                                          
                                                            
                                                           
                            
import { describe, expect, it } from 'vitest'
import { setupGame, setupGameMulti, battlefieldCountFor } from '../../src/game/setup'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import type { ZoneId } from '../../src/state/ids'

const bfCount = (s: { zones: Record<string, unknown> }): number =>
  Object.keys(s.zones).filter((z) => z.startsWith('battlefield:')).length

describe('★1120 §483.4 战场数量按模式定', () => {
  it('1v1 = 2(§485.4);三人乱斗 = 3(§487.4);四人也是 3(§488.4)', () => {
    expect(battlefieldCountFor(2)).toBe(2)
    expect(battlefieldCountFor(3)).toBe(3)
    expect(battlefieldCountFor(4)).toBe(3)                       
  })
})

describe('★1120 两人路径逐字不变(硬要求:全仓 8+ 调用点走它)', () => {
  it('setupGame 与 setupGameMulti([A,B]) 产出同一局面', () => {
    const a = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
    const b = setupGameMulti([DEMO_DECK_A, DEMO_DECK_B], specLookup, makeRng(7))
    expect(JSON.stringify(b.state)).toBe(JSON.stringify(a.state))
    expect(b.chosenBattlefields).toEqual(a.chosenBattlefields)
  })
  it('两人局的关键位:2 处战场 / turnsTaken 只有起始玩家是 1 / 额外符文给后手', () => {
    const { state } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(7))
    expect(bfCount(state)).toBe(2)
    expect(state.turnsTaken).toEqual({ P1: 1, P2: 0 })
    expect(state.extraRunesFirstSummon).toEqual({ P2: 1 })
  })
})

describe('★1120 三人局建得起来', () => {
  const { state } = setupGameMulti([DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_A], specLookup, makeRng(7))
  it('三名玩家 + §487.4 三处战场', () => {
    expect(state.players).toEqual(['P1', 'P2', 'P3'])
    expect(bfCount(state)).toBe(3)
  })
  it('§116 每人各摸开手 4 张,各自的牌堆分开', () => {
    for (const p of state.players) {
      expect(state.zones[`hand:${p}` as ZoneId]?.contents.length, `${p} 的开手`).toBe(4)
      expect((state.zones[`mainDeck:${p}` as ZoneId]?.contents.length ?? 0), `${p} 的牌堆`).toBeGreaterThan(0)
    }
  })
  it('§487.7 额外符文只给【最后一个行动的】玩家,不是所有非起始玩家', () => {
    expect(state.turnsTaken).toEqual({ P1: 1, P2: 0, P3: 0 })
    expect(state.extraRunesFirstSummon).toEqual({ P3: 1 })                      
  })
  it('§115.1.b 起始玩家可以不是 P1,回合顺序从他起按座位转', () => {
    const s2 = setupGameMulti([DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_A], specLookup, makeRng(7), 'P2' as never).state
    expect(s2.activePlayer).toBe('P2')
    expect(s2.turnsTaken).toEqual({ P2: 1, P3: 0, P1: 0 })                
    expect(s2.extraRunesFirstSummon).toEqual({ P1: 1 })               
  })
})

describe('★1120 §115.1 三人局的回合顺序循环往复', () => {
  it('P1 → P2 → P3 → P1 转两圈,turnsTaken 各自累加', () => {
    const { state } = setupGameMulti([DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_A], specLookup, makeRng(7))
    const g = new InteractiveGame(state, makeGameDeps(0x51) as never)
    const seen: string[] = []
    for (let i = 0; i < 60 && seen.length <= 6; i++) {
      const p = g.pending() as { mode: string; player?: string; request?: { key: string; candidates: { id: string }[] } }
      if (p.mode === 'gameover') break
      if (p.mode === 'mulligan') { g.apply({ kind: 'MULLIGAN', player: p.player, put: [] } as never); continue }
      if (p.mode === 'choice') { g.apply({ kind: 'CHOOSE', player: p.player, key: p.request!.key, answer: p.request!.candidates[0]!.id } as never); continue }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
      if (p.mode === 'action') {
        const cur = String(g.state.activePlayer)
        if (seen[seen.length - 1] !== cur) seen.push(cur)
        if (seen.length > 6) break
        g.apply({ kind: 'END_TURN', player: g.state.activePlayer } as never); continue
      }
      break
    }
    expect(seen.slice(0, 6)).toEqual(['P1', 'P2', 'P3', 'P1', 'P2', 'P3'])
    expect(g.state.turnsTaken).toEqual({ P1: 3, P2: 2, P3: 2 })
  })
})
