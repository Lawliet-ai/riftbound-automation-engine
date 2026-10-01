                                      
  
                                                          
                                                
                                                                       
                                                                          
                                                   
                                                             
                                                     
import { describe, expect, it } from 'vitest'
import { detectTriggersForBatchAndNote, type Trigger } from '../../src/dsl/trigger'
import { addItems } from '../../src/loop/chain'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asPlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { InteractiveGame, type InteractiveAction, type InteractiveDeps } from '../../src/session/interactiveGame'
import { setupGame } from '../../src/game/setup'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B, DEMO_DECK_C } from '../../data/decks'
import { makeGameDeps } from '../../data/gameDeps'
import { makeRng } from '../../src/util/rng'

const P1 = asPlayerId('P1')
const base = (): GameState => createInitialState([P1, asPlayerId('P2')], 2)

                                                               
const spellResolved = (card: string): GameEvent => ({ kind: 'spellResolved', player: P1, cardOid: card } as unknown as GameEvent)
const trig = (): Trigger => ({ id: 'OGN-103:playSpell:o109', sourceOid: null, controller: P1, event: 'spellResolved', by: 'any', effect: () => [] } as unknown as Trigger)

describe('★1124【缺陷 115】同一触发器先后触发两次 ⇒ 两个项目的 id 必须不同', () => {
  it('🔴🔴 第一个项目还挂在链上时,第二次触发不能生成同一个 id', () => {
    const s0 = base()
    const r1 = detectTriggersForBatchAndNote(s0, [spellResolved('cardA')], [trig()], P1)
    expect(r1.items.length, '造景:第一次要触发得起来').toBe(1)
    const s1: GameState = { ...r1.state, chain: addItems(r1.state.chain, r1.items) }
    const r2 = detectTriggersForBatchAndNote(s1, [spellResolved('cardB')], [trig()], P1)
    expect(r2.items.length, '造景:第二次也要触发得起来').toBe(1)
    expect(r2.items[0]!.id).not.toBe(r1.items[0]!.id)
                        
    const all = [...s1.chain, ...r2.items].map((i) => i.id)
    expect(new Set(all).size, `链上出现了重复 id:${all.join(' | ')}`).toBe(all.length)
  })

  it('🔴 链上没撞上时 id 形态一字不变(去重后缀只在真冲突时才加)', () => {
    const s0 = base()
    const r = detectTriggersForBatchAndNote(s0, [spellResolved('cardA')], [trig()], P1)
    expect(r.items[0]!.id).toBe('trig:OGN-103:playSpell:o109:spellResolved:P1')            
  })

  it('🔴 撞第三次也要能继续错开(后缀会往下数)', () => {
    let s: GameState = base()
    const ids: string[] = []
    for (const c of ['a', 'b', 'c']) {
      const r = detectTriggersForBatchAndNote(s, [spellResolved(c)], [trig()], P1)
      ids.push(r.items[0]!.id)
      s = { ...r.state, chain: addItems(r.state.chain, r.items) }
    }
    expect(new Set(ids).size, `三次的 id:${ids.join(' | ')}`).toBe(3)
  })
})

describe('★1124 端到端复现:selfplay linear seed=128271 那一局跑得完', () => {
  it('🔴🔴🔴 原样重放那一局(与 selfplay 的 playOne 逐字同款的动作选择)⇒ 不再抛「FEPR 链循环未在 1000 轮内收敛」', () => {
    const SEED = 128271
    const PAIRS = [[DEMO_DECK_A, DEMO_DECK_B], [DEMO_DECK_A, DEMO_DECK_C], [DEMO_DECK_B, DEMO_DECK_C]] as const
    const rng = makeRng(SEED)
    const deps = makeGameDeps(SEED ^ 0x5bf03635) as InteractiveDeps
    const [da, db] = PAIRS[SEED % 3]!
    const g = new InteractiveGame(setupGame(da, db, specLookup, makeRng(SEED)).state, deps)
    let turns = 0
    let steps = 0
                                                           
                                            
    let why = 'stepCap'
    for (let step = 0; step < 4000; step++) {
      const p = g.pending() as { mode: string; player?: string }
      if (p.mode === 'gameover') { why = 'gameover'; break }
      const legal = g.legalActions(p.player as never)
      if (legal.length === 0) { why = `noLegal@${p.mode}`; break }
      const weighted: InteractiveAction[] = []
      for (const a of legal) {
        const w = a.kind === 'END_TURN' ? 1 : a.kind === 'PASS' ? 2 : 4
        for (let i = 0; i < w; i++) weighted.push(a)
      }
      const pick = weighted[rng.int(weighted.length)]!
      if (pick.kind === 'END_TURN') turns += 1
      g.apply(pick)                 
      steps += 1
      if (turns >= 60) { why = 'turnCap'; break }
    }
                                                                    
                                                                
                                                    
                                                                
                                                            
                                       
    expect(why, '★★★★★这一局【跑到分出胜负】—— 没抛「FEPR 链循环未收敛」,也没卡在没有合法动作').toBe('gameover')
    expect(steps, '★前提自证:确实打了上百步,不是开局就结束(空跑也能满足 gameover)').toBeGreaterThan(100)
  })
})
