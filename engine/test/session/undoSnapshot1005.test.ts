import { describe, expect, test } from 'vitest'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import type { PlayerId } from '../../src/state/ids'

installProviders()

                                              
  
                                                                     
                                                        
                                                                                  
                                                                                    
  
                                  
                                                                             
                                                                                  
                                 
                                         
                                                     
                               

const FIELDS = [
  'window', 'choice', 'pendingCombat', 'pendingTurnStart', 'duelPasses',
  'duelPlayOpener', 'pendingNonCombatDuel', 'pendingMoveContest', 'pendingTurnEnd',
                                                     
  'pendingDamageOrder',
                                                    
  'pendingDestroyOrder', 'replayAfterAnswer',
                                                          
                                                               
                                       
  'pendingContestOrder',
                                                                
                                                
  'pendingBurnoutOpponent',
                                                                              
                                        
  'pendingReplaceEventOrder',
                                    
  'roleLedger', 'pendingRoleSignals',
] as const

                                           
function fingerprint(g: InteractiveGame): string {
  const o = g as unknown as Record<string, unknown>
  return FIELDS.map((k) => {
    const v = o[k]
    if (v === null || v === undefined) return `${k}=∅`
    if (typeof v === 'number') return `${k}=${v}`
    const r = v as Record<string, unknown>
    const keys = Object.keys(r).filter((x) => ['string', 'number', 'boolean'].includes(typeof r[x]))
    return `${k}={${keys.map((x) => `${x}:${String(r[x])}`).join(',')}}`
  }).join('|')
}

function freshGame(seed: number): InteractiveGame {
  const deps = makeGameDeps(seed ^ 0x5bf03635) as InteractiveDeps
  return new InteractiveGame(setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(seed)).state, deps)
}

                                         
function driftCount(seed: number, mode: 'snap' | 'legacy'): { pushes: number; drift: number } {
  const rng = makeRng(seed)
  const g = freshGame(seed)
  let pushes = 0, drift = 0, turns = 0
  for (let step = 0; step < 400; step++) {
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
    const snap = g.snapshot()
    const beforeState = g.state
    const before = fingerprint(g)
    g.apply(pick)
    if (g.state === beforeState) continue                            
    pushes++
    if (mode === 'snap') g.restore(snap)
    else (g as unknown as { state: unknown }).state = beforeState                
    if (fingerprint(g) !== before) drift++
    g.apply(pick)            
    if (turns >= 40) break
  }
  return { pushes, drift }
}

describe('★★★★★★★ ★1005 撤回要回退整个会话,不只是 state', () => {
  test('🔴承重:快照还原后,九个会话字段一个都不漂移', () => {
    let pushes = 0, drift = 0
    for (let i = 1; i <= 6; i++) {
      const r = driftCount(i * 7919, 'snap')
      pushes += r.pushes
      drift += r.drift
    }
    expect(pushes, '前提自证:这几局真的入栈了动作').toBeGreaterThan(300)
    expect(drift, '★还原后会话状态必须与动作前完全一致').toBe(0)
  }, 30_000)

  test('🔴对照组:旧行为(只换 state)会大面积漂移 —— 证明上一条有判别力', () => {
    let pushes = 0, drift = 0
    for (let i = 1; i <= 6; i++) {
      const r = driftCount(i * 7919, 'legacy')
      pushes += r.pushes
      drift += r.drift
    }
    expect(pushes, '前提自证:同样入栈了动作').toBeGreaterThan(300)
                                       
    expect(drift / pushes, '★旧行为漂移率应远高于一半').toBeGreaterThan(0.5)
  }, 30_000)

  test('🔴哨兵:新增实例字段必须同步进快照 —— 忘了就会红', () => {
    const g = freshGame(7919)
    const actual = Object.keys(g).sort()
    const covered = Object.keys(g.snapshot()).sort()
                                                    
                                           
    const exempt = ['deps', 'rdeps', 'journal']
    expect(covered, '快照必须恰好覆盖 state + FIELDS 里的全部会话字段').toEqual(
      ['state', ...FIELDS].sort(),
    )
    expect(actual, '★实例字段 = 快照覆盖 + 有意豁免;多出任何一个都说明有人加了字段却没收进快照')
      .toEqual([...covered, ...exempt].sort())
  })

  test('放开侧:journal 有意【不】回退 —— 撤回不该抹掉已经发生过的历史', () => {
                                                                
                                                       
                                      
    const rng = makeRng(7919)
    const g = freshGame(7919)
    let before = 0, after = 0, snap = g.snapshot(), found = false
    for (let step = 0; step < 200 && !found; step++) {
      const p = g.pending()
      if (p.mode === 'gameover') break
      const actor = p.player as PlayerId
      const legal = g.legalActions(actor)
      if (legal.length === 0) break
      const pick = legal[rng.int(legal.length)]!
      snap = g.snapshot()
      before = g.journal.projectFor(actor).length
      g.apply(pick)
      after = g.journal.projectFor(actor).length
      if (after > before) { found = true; break }
    }
    expect(found, '前提自证:确实找到了一个会写战报的动作').toBe(true)
    expect(after, '前提自证:它真的写了(否则下面那条空洞成立)').toBeGreaterThan(before)
    const viewer = g.state.players[0]!
    const lenAfterAct = g.journal.projectFor(viewer).length
    g.restore(snap)
    expect(g.journal.projectFor(viewer).length, '★还原后战报长度【不】缩回去').toBe(lenAfterAct)
  })
})
