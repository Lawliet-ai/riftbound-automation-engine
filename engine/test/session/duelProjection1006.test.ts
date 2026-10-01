import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { project } from '../../src/net/project'
import type { PlayerId } from '../../src/state/ids'

installProviders()

                                       
  
                                                               
                                                 
                                  
  
                                                                       
                                            
                                                           
  
                                                      
                                                            
                                                                     

const PAIRS = [
  [DEMO_DECK_A, DEMO_DECK_B],
  [DEMO_DECK_A, DEMO_DECK_C],
  [DEMO_DECK_B, DEMO_DECK_C],
] as const
const seedOf = (i: number): number => {
  let x = (i * 2654435761) >>> 0
  x ^= x >>> 15
  x = (x * 2246822519) >>> 0
  x = (x ^ (x >>> 13)) >>> 0
  return x % 2000000
}

interface Tally {
  openDuelWin: number; withDuel: number
  notDuelWin: number; leakDuel: number
  projMismatch: number; bfBad: number
  seenCombat: number; seenNoncombat: number; seenPassesGt0: number
}

function scan(games: number): Tally {
  const t: Tally = { openDuelWin: 0, withDuel: 0, notDuelWin: 0, leakDuel: 0, projMismatch: 0, bfBad: 0, seenCombat: 0, seenNoncombat: 0, seenPassesGt0: 0 }
  for (let gi = 1; gi <= games; gi++) {
    const seed = seedOf(gi)
    const rng = makeRng(seed)
    const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
    const [da, db] = PAIRS[seed % 3]!
    const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
    let turns = 0
    for (let step = 0; step < 3000; step++) {
      const p = g.pending()
      if (p.mode === 'gameover') break
      const actor = p.player as PlayerId
      const legal = g.legalActions(actor)
      if (legal.length === 0) break
      if (p.mode === 'window') {
        const inOpenDuel = g.state.spellDuelActive && g.state.chain.length === 0
        const d = p.duel
        if (inOpenDuel) {
          t.openDuelWin++
          if (d) {
            t.withDuel++
            if (g.state.zones[d.battlefield]?.kind !== 'battlefield') t.bfBad++
            if (d.kind === 'combat') t.seenCombat++
            else t.seenNoncombat++
            if (d.passes > 0) t.seenPassesGt0++
          }
        } else {
          t.notDuelWin++
          if (d) t.leakDuel++
        }
      }
      const v = project(g.state, actor)
      if (v.spellDuelActive !== g.state.spellDuelActive) t.projMismatch++
      if ((v.duelBattlefield ?? null) !== ((g.state.duelBattlefield as string | undefined) ?? null)) t.projMismatch++
      const weighted: InteractiveAction[] = []
      for (const a of legal) {
        const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
        for (let i = 0; i < w; i++) weighted.push(a)
      }
      const pick = weighted[rng.int(weighted.length)]!
      if (pick.kind === 'END_TURN') turns++
      g.apply(pick)
      if (turns >= 200) break
    }
  }
  return t
}

describe('★★★★★★★ ★1006 开环对决的公开态投给了客户端', () => {
  test('🔴上下界成对:开环对决窗口【全都】带 duel,不在对决的窗口【一个都不】带', () => {
    const t = scan(25)
    expect(t.openDuelWin, '前提自证:样本里确实出现过开环对决窗口').toBeGreaterThan(200)
    expect(t.notDuelWin, '前提自证:也出现过不在对决的窗口(否则下界空洞)').toBeGreaterThan(200)
                                          
    expect.soft(t.withDuel, '★上界:开环对决窗口必须全带 duel').toBe(t.openDuelWin)
    expect.soft(t.leakDuel, '★下界:不在开环对决却带了 duel = 泄漏(★999b 同款守卫)').toBe(0)
  }, 60_000)

  test('🔴duel 的内容站得住:战场是真战场、两种 kind 都见过、passes 会真的增长', () => {
    const t = scan(25)
    expect(t.bfBad, '★duel.battlefield 必须指向真战场').toBe(0)
    expect(t.seenNoncombat, '前提自证:非战斗对决出现过(§344.2)').toBeGreaterThan(0)
    expect(t.seenCombat, '前提自证:战斗对决也出现过(§344.1)').toBeGreaterThan(0)
    expect(t.seenPassesGt0, '★passes 会真的从 0 涨上去 —— 否则这个字段等于常量').toBeGreaterThan(0)
  }, 60_000)

  test('🔴投影字段与 state 严格一致(spellDuelActive / duelBattlefield)', () => {
    const t = scan(15)
    expect(t.projMismatch, '★投影不能与 state 打架').toBe(0)
  }, 60_000)

  test('🔴feprPasses 必须【只】在链非空时下发 —— 开环对决里它是 undefined 而不是 0', () => {
                                                        
                                          
                                                 
                                                        
    let sawOpenDuel = 0, leaked = 0
    for (let gi = 1; gi <= 12; gi++) {
      const seed = seedOf(gi)
      const rng = makeRng(seed)
      const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
      const [da, db] = PAIRS[seed % 3]!
      const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
      let turns = 0
      for (let step = 0; step < 3000; step++) {
        const p = g.pending()
        if (p.mode === 'gameover') break
        const actor = p.player as PlayerId
        const legal = g.legalActions(actor)
        if (legal.length === 0) break
        if (g.state.spellDuelActive && g.state.chain.length === 0) {
          sawOpenDuel++
          if (project(g.state, actor).feprPasses !== undefined) leaked++
        }
        const weighted: InteractiveAction[] = []
        for (const a of legal) {
          const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
          for (let i = 0; i < w; i++) weighted.push(a)
        }
        const pick = weighted[rng.int(weighted.length)]!
        if (pick.kind === 'END_TURN') turns++
        g.apply(pick)
        if (turns >= 200) break
      }
    }
    expect(sawOpenDuel, '前提自证:样本里确实出现过开环对决(否则这条空洞成立)').toBeGreaterThan(100)
    expect(leaked, '★开环对决里 feprPasses 必须缺席 —— 出现就说明有人把它搬出了 chain 条件块').toBe(0)
  }, 60_000)
})
