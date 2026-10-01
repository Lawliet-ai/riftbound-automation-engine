import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function unit(id: string, ctrl: typeof P1, might: number): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(BF0), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}

                                                                  
function scene(p2score: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const z = base.zones[BF0]!
  const deckCard = (id: string, owner: typeof P1): GameObject => ({
    oid: asObjId(id), defId: 'BLK', owner, controller: owner, zone: asZoneId(`mainDeck:${owner}`),
    baseMight: 1, baseKeywords: [], damage: 0, counters: {}, status: {},
  })
  const md = (p: typeof P1, ids: string[]): { contents: readonly import('../../src/state/ids').ObjId[] } =>
    ({ contents: ids.map(asObjId) })
  return {
    ...base, activePlayer: P2, priority: null, phase: 'main',
    scores: { P1: 0, P2: p2score },
    objects: {
      p2u: unit('p2u', P2, 5), p1u: unit('p1u', P1, 1),
      d1: deckCard('d1', P1), d2: deckCard('d2', P1), d3: deckCard('d3', P2), d4: deckCard('d4', P2),
    },
    zones: {
      ...base.zones,
      [BF0]: { ...z, contents: [asObjId('p2u'), asObjId('p1u')] },
      ['mainDeck:P1']: { ...base.zones['mainDeck:P1']!, ...md(P1, ['d1', 'd2']) },
      ['mainDeck:P2']: { ...base.zones['mainDeck:P2']!, ...md(P2, ['d3', 'd4']) },
    },
  }
}

function drain(g: InteractiveGame): void {
  for (let i = 0; i < 20 && g.pending().mode !== 'action' && g.pending().mode !== 'gameover'; i++) {
    const p = g.pending()
    if (p.mode === 'choice') g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
    else if (p.mode === 'window') g.apply({ kind: 'PASS', player: p.player })
    else break
  }
}

describe('完整游戏闭环:战斗→征服→得分 + 末分锁', () => {
  test('非末分:P2(6分)进攻→击杀P1单位→征服→得第7分', () => {
    const g = new InteractiveGame(scene(6), DEPS)
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    drain(g)
                                             
    expect(g.state.scores['P2']).toBe(7)
    expect(g.state.winner).toBeNull()       
  })

  test('末分锁§471.1.b.1:P2(7分)征服单个战场不能凑第8分,改为抽牌', () => {
    const g = new InteractiveGame(scene(7), DEPS)
    const handBefore = g.state.zones['hand:P2']?.contents.length ?? 0
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    drain(g)
                                                    
    expect(g.state.scores['P2']).toBe(7)
    expect(g.state.winner).toBeNull()
                            
    expect(g.state.zones['hand:P2']?.contents.length).toBe(handBefore + 1)
    const log = g.journal.projectFor(P2)
    expect(log.some((e) => e.kind === 'draw' && e.player === 'P2')).toBe(true)
  })
})

describe('征服显示只在真得分时claim(委托人:征服了但积分没显示)', () => {
  test('§470 本回合已在此计分:再赢一场不重复得分,战报不谎报征服', () => {
                              
    const s0 = scene(2)
    const s = { ...s0, scoredBattlefieldsThisTurn: { P2: [BF0] } }
    const g = new InteractiveGame(s, DEPS)
    const before = g.state.scores['P2']
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    drain(g)
    expect(g.state.scores['P2']).toBe(before)       
                                   
    expect(g.state.lastCombat?.conquered ?? null).toBeNull()
                              
    const log = g.journal.projectFor(P2)
    const ce = log.find((e) => e.kind === 'combatEnd')
    expect(ce).toBeDefined()
    expect(ce!.conquered ?? null).toBeNull()
    expect(ce!.note ?? '').toContain('已在此')
  })

  test('新战场真征服:得分,战报claim征服', () => {
    const g = new InteractiveGame(scene(2), DEPS)
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    drain(g)
    expect(g.state.scores['P2']).toBe(3)       
    expect(g.state.lastCombat?.conquered).toBe(P2)
  })
})
