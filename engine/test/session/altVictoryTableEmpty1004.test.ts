import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { checkAltVictory } from '../../src/scoring/altVictory'
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

                                                
function scan(seed: number): { nonEmpty: number; palaceSeen: number; steps: number } {
  const rng = makeRng(seed)
  const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
  const [da, db] = PAIRS[seed % 3]!
  const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(seed)).state, deps)
  let nonEmpty = 0, palaceSeen = 0, steps = 0, turns = 0
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
    g.apply(pick)
    steps++
    if (g.state.victoryConditions.length > 0) nonEmpty++
    if (Object.values(g.state.objects).some((o) => o.defId === 'UNL-088')) palaceSeen++
    if (turns >= 60) break
  }
  return { nonEmpty, palaceSeen, steps }
}

describe('★★★★★★★ ★1004 victoryConditions 登记表在真对局里恒空(哨兵)', () => {
  test('🔴哨兵:12 局里登记表【一次都没被填过】—— 将来有人接线,这条会红', () => {
    let nonEmpty = 0, palaceSeen = 0, steps = 0
    for (let i = 1; i <= 12; i++) {
      const r = scan(seedOf(i))
      nonEmpty += r.nonEmpty
      palaceSeen += r.palaceSeen
      steps += r.steps
    }
                                           
                                                           
    expect(steps, '前提自证:这些局真的跑起来了').toBeGreaterThan(500)
    expect(palaceSeen, '★对照口:UNL-088 确实反复上场 ⇒ 表空不是因为卡没出场').toBeGreaterThan(100)
    expect(nonEmpty, '★登记表在生产里一次都没被填过').toBe(0)
  }, 30_000)

  test('放开侧:框架本身是好的 —— 手动登记一条,清理时它就会判胜', () => {
                                               
    const seed = seedOf(1)
    const deps = makeGameDeps(seed) as InteractiveDeps
    void deps
    const g = new InteractiveGame(setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(seed)).state,
      makeGameDeps(seed) as InteractiveDeps)
    const P1 = g.state.players[0]!
    expect(checkAltVictory(g.state).winner, '前提自证:表空 ⇒ 不判胜').toBe(null)
    const withVc = { ...g.state, victoryConditions: [{ id: 'probe', player: P1, kind: 'win' as const, predicate: () => true }] }
    expect(checkAltVictory(withVc).winner, '★登记一条恒真的 ⇒ 立刻判胜(框架是通的)').toBe(P1)
  })
})
