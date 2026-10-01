import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import type { PlayerId } from '../../src/state/ids'

installProviders()

                                                                 
  
                         
                                 
                               
                                                         
                                                      
  
                                                           
                                         
  
                                                 
                                                                 
                                                            
                                                             
  
                                        
                                  
                                          
                                                      
                                                             

const PAIRS = [
  [DEMO_DECK_A, DEMO_DECK_B],
  [DEMO_DECK_A, DEMO_DECK_C],
  [DEMO_DECK_B, DEMO_DECK_C],
] as const
const PLAYS = new Set(['PLAY_CARD', 'PLAY_STANDBY', 'PLAY_UNIT', 'ACTIVATE'])
const seedOf = (i: number): number => {
  let x = (i * 2654435761) >>> 0
  x ^= x >>> 15
  x = (x * 2246822519) >>> 0
  x = (x ^ (x >>> 13)) >>> 0
  return x % 2000000
}

interface Tally { openedChain: number; duelKept: number; focusMoved: number; focusStuck: number; duelClosed: number }

                                       
function tally(seed: number): Tally {
  const rng = makeRng(seed)
  const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
  const [da, db] = PAIRS[seed % 3]!
  const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
  const t: Tally = { openedChain: 0, duelKept: 0, focusMoved: 0, focusStuck: 0, duelClosed: 0 }
  let turns = 0
  for (let step = 0; step < 3000; step++) {
    const p = g.pending()
    if (p.mode === 'gameover') break
    const actor = p.player as PlayerId
    const legal = g.legalActions(actor)
    if (legal.length === 0) break
    const weighted: InteractiveAction[] = []
    for (const a of legal) {
      const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
      for (let i = 0; i < w; i++) weighted.push(a)
    }
    const pick = weighted[rng.int(weighted.length)]!
    if (pick.kind === 'END_TURN') turns++
    const wasDuel = g.state.spellDuelActive
    const focusBefore = g.state.focus
    g.apply(pick)
    if (wasDuel && PLAYS.has(pick.kind)) {
      if (g.state.chain.length === 0) continue                         
      t.openedChain++
                                         
      for (let k = 0; k < 60 && g.state.chain.length > 0; k++) {
        const q = g.pending()
        if (q.mode === 'window') { g.apply({ kind: 'PASS', player: q.player }); continue }
        if (q.mode === 'choice') {
          const c = q.request.candidates[0]
          g.apply({ kind: 'CHOOSE', player: q.player, key: q.request.key, answer: c ? c.id : 'skip' })
          continue
        }
        break
      }
      if (g.state.spellDuelActive) {
        t.duelKept++
        if (g.state.focus !== focusBefore) t.focusMoved++
        else t.focusStuck++
      } else t.duelClosed++
    }
    if (turns >= 200) break
  }
  return t
}

describe('★★★★★★★ ★1000 §348:对决里有人打出过 ⇒ 链关闭时对决不结束,焦点传下一名', () => {
  test('🔴12 局合计:对决里开过链之后,对决【确实还开着】,而且焦点全传了', () => {
    const sum: Tally = { openedChain: 0, duelKept: 0, focusMoved: 0, focusStuck: 0, duelClosed: 0 }
    for (let i = 1; i <= 12; i++) {
      const t = tally(seedOf(i))
      sum.openedChain += t.openedChain
      sum.duelKept += t.duelKept
      sum.focusMoved += t.focusMoved
      sum.focusStuck += t.focusStuck
      sum.duelClosed += t.duelClosed
    }
                                    
    expect(sum.openedChain, '前提自证:样本里确实有对决内开链').toBeGreaterThan(5)
                                            
    expect.soft(sum.duelKept, '★§348 有人打出过 ⇒ 链关闭时对决不结束(修前这个数是 0)').toBeGreaterThan(0)
                                             
                                                         
                                               
                                                    
                                         
    expect.soft(sum.focusStuck, '★§347.1.b 只要对决还开着,焦点就必须已经传给下一名').toBe(0)
  }, 30_000)

  test('放开侧:没人打出、双方一路让过 ⇒ §347.2.a 对决照常关闭(修法没让对决永不结束)', () => {
                                                        
      
                                              
                                                             
                                                  
                                                                 
                                               
                                                            
                                         
                                                                 
                                                    
                                                                   
    const DUEL_RUN_CAP = 60
    let worstDuelRun = 0
    let finished = 0
    for (let i = 1; i <= 8; i++) {
      const seed = seedOf(i)
      const rng = makeRng(seed)
      const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
      const [da, db] = PAIRS[seed % 3]!
      const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
      let turns = 0, steps = 0, duelRun = 0
      for (let step = 0; step < 3000; step++) {
        const p = g.pending()
        if (p.mode === 'gameover') break
        const actor = p.player as PlayerId
        const legal = g.legalActions(actor)
        if (legal.length === 0) break
        const weighted: InteractiveAction[] = []
        for (const a of legal) {
          const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
          for (let i2 = 0; i2 < w; i2++) weighted.push(a)
        }
        const pick = weighted[rng.int(weighted.length)]!
        if (pick.kind === 'END_TURN') turns++
        duelRun = g.state.spellDuelActive === true ? duelRun + 1 : 0
        if (duelRun > worstDuelRun) worstDuelRun = duelRun
        g.apply(pick)
        steps++
        if (turns >= 60) break
      }
      if (steps > 50) finished++
    }
    expect(finished, '每局都能走到底(没在半路卡住不动)').toBe(8)
                                            
    expect(worstDuelRun, `★★★最长连续"对决开着"的步数要有上界(实测 8 局最大 21)`).toBeLessThan(DUEL_RUN_CAP)
    expect(worstDuelRun, '★前提自证:样本里确实开过对决(否则上面那条空洞成立)').toBeGreaterThan(0)
  }, 30_000)
})
