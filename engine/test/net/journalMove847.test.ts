                                          
  
                                              
                                                                
                                                             
                                                                   
                                                                      

import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardCost } from '../../data/registry'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

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

   
                                         
                                           
                                                                     
                                                            
                                                                    
                                                                        
                                                   
                                                                    
                  
   
function settle(g: InteractiveGame): void {
  for (let i = 0; i < 16; i++) {
    let did = false
    const pend = g.pending()
    if (pend.mode === 'choice') {
      const req = pend.request
      const ans = req.candidates.find((c) => c.id === 'no')?.id ?? req.candidates[0]!.id
      g.apply({ kind: 'CHOOSE', player: pend.player, key: req.key, answer: ans })
      continue
    }
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) { g.apply(pass); did = true }
    }
    if (!did) return
  }
}

function endTurn(g: InteractiveGame, p: typeof P1): void {
  const e = g.legalActions(p).find((a) => a.kind === 'END_TURN')
  expect(e, `${p} 应当能结束回合`).toBeDefined()
  g.apply(e!)
  settle(g)
}

   
                             
                                                 
                                          
   
function playThenMove(g: InteractiveGame): { oid: string; from: string; to: string } {
  const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_UNIT')
  expect(play, '牌库里得有单位可打').toBeDefined()
  g.apply(play!)
  settle(g)
  endTurn(g, P1)
  endTurn(g, P2)
  const mv = g.legalActions(P1).find((a) => a.kind === 'MOVE')
  expect(mv, '唤醒后的单位应当有合法的标准移动').toBeDefined()
  const act = mv as Extract<Parameters<InteractiveGame['apply']>[0], { kind: 'MOVE' }>
  const from = (g.view(P1).objects[act.oid] as { zone?: string } | undefined)?.zone
  expect(from, '移动前该物件应当在场').toBeDefined()
                                    
  expect(g.journal.projectFor(P1).some((e) => e.kind === 'unitMoved')).toBe(false)
  g.apply(act)
  settle(g)
  return { oid: act.oid, from: from!, to: act.to }
}

describe('★847 战报 · 标准移动', () => {
  test('移动会在战报里留下 unitMoved,且带 oid/卡名/起止区域', () => {
    const g = newGame()
    const { oid, from, to } = playThenMove(g)
    const moved = g.journal.projectFor(P1).filter((e) => e.kind === 'unitMoved')
    expect(moved.length, '移动必须在战报里看得见(★847 之前是 0 条)').toBe(1)
    const e = moved[0]!
    expect(e.oid).toBe(oid)
    expect(e.player).toBe(P1)
    expect(e.zoneFrom).toBe(from)
    expect(e.zoneTo).toBe(to)
    expect(e.defId, '基地/战场都是公开区(§109),卡名不该被抹').toBeDefined()
  })

  test('§109 移动只发生在公开区之间 ⇒ 对手看到的与我一字不差', () => {
    const g = newGame()
    playThenMove(g)
    const pick = (p: typeof P1): readonly string[] =>
      g.journal.projectFor(p).filter((e) => e.kind === 'unitMoved')
        .map((e) => `${e.oid}|${e.defId}|${e.zoneFrom}|${e.zoneTo}`)
    expect(pick(P2).length).toBe(1)
    expect(pick(P2)).toEqual(pick(P1))                   
  })
})
