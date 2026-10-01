import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardCost, cardKind } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { playerTurnIndex, resetTurnLedgers } from '../../src/scoring/score'
import { LONGTAIL11_DEFIDS } from '../../data/cards/longtail-11'
import { EXTRA_BF_DEFIDS } from '../../data/cards/battlefields-extra'

                                      
  
                             
                           
                                                    
  
                                           
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

   
                                                 
                                           
   
function scene(bfCards: Record<string, { defId: string; owner: string }>, runeDeck = 3): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const p of [P1, P2]) {
    for (let i = 0; i < runeDeck; i++) {
      const oid = asObjId(`rd${p}${i}`)
      objects[oid] = {
        oid, defId: 'rune:red', owner: p, controller: p, zone: asZoneId(`runeDeck:${p}`),
        baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
      }
      const z = zones[`runeDeck:${p}`]
      if (z) zones[`runeDeck:${p}`] = { ...z, contents: [...z.contents, oid] }
    }
  }
  return { ...base, phase: 'awaken', objects, zones, battlefieldCards: bfCards } as GameState
}
                                 
const onFieldRunes = (s: GameState, p: string): number =>
  (s.zones[`base:${p}`]?.contents ?? []).filter((o) => s.objects[o]!.defId.startsWith('rune:')).length
const startEv = (p: string): GameEvent => ({ kind: 'startPhase', player: p as never })
                      
function fire(st: GameState, ev: GameEvent, actor: string): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor as never, {})
  for (const it of s.chain.filter((x: { status: string }) => x.status === 'pending')) {
    s = applyEvents(s, it.resolve(s, {}, it), {}).state
  }
  return s
}
const runeCount = onFieldRunes
const scoreOf = (s: GameState, p: string): number => (s.scores as Record<string, number>)[p] ?? 0
                                                             
const handTo = (s: GameState, p: string): GameState =>
  resetTurnLedgers({ ...s, activePlayer: p as never, turn: s.turn + 1 })

describe('★新账本:每名玩家各自的回合序数', () => {
  test('★★开局先手记 1、后手记 0;交接一次后各自 +1', () => {
    const s0 = createInitialState([P1, P2], 2)
    expect(playerTurnIndex(s0, P1)).toBe(1)                         
    expect(playerTurnIndex(s0, P2)).toBe(0)           

    const s1 = handTo(s0, P2)
    expect(playerTurnIndex(s1, P2)).toBe(1)
    expect(playerTurnIndex(s1, P1)).toBe(1)               

    const s2 = handTo(s1, P1)
    expect(playerTurnIndex(s2, P1)).toBe(2)
    expect(playerTurnIndex(s2, P2)).toBe(1)
  })

  test('★★这本账不等于全局 turn:同一个 turn 值下两人的序数不同', () => {
    const s = handTo(createInitialState([P1, P2], 2), P2)
    expect(s.turn).toBe(2)
    expect(playerTurnIndex(s, P1)).toBe(1)
    expect(playerTurnIndex(s, P2)).toBe(1)                                 
  })

  test('★★额外回合下不会算错人头(同一人连做两个回合)', () => {
                                                       
    const s0 = createInitialState([P1, P2], 2)
    const again = handTo(s0, P1)         
    expect(again.turn).toBe(2)
    expect(playerTurnIndex(again, P1)).toBe(2)
    expect(playerTurnIndex(again, P2)).toBe(0)                          
  })
})

describe('★【长尾批次·十一】前提', () => {
  test('登记齐(含战场卡对账表)', () => {
    expect(LONGTAIL11_DEFIDS.slice().sort()).toEqual(['OGN-284', 'OGN-290'])
    expect(EXTRA_BF_DEFIDS).toEqual(expect.arrayContaining(['OGN-284', 'OGN-290']))
    for (const d of LONGTAIL11_DEFIDS) {
      expect(cardKind(d), d).toBe('battlefield')
      expect(cardCost(d), d).toEqual({ mana: 0 })              
    }
  })
})

describe('★★力量方尖碑 OGN-284(第一个回合 → 额外一枚符文)', () => {
  const st = () => scene({ [BF0]: { defId: 'OGN-284', owner: P1 as string } })

  test('★★先手在自己第一个回合开始阶段召出一枚', () => {
    const after = fire(st(), startEv(P1), P1)
    expect(runeCount(after, P1)).toBe(1)
    expect(runeCount(after, P2)).toBe(0)           
  })

  test('★★「每名玩家」——后手轮到时同样给(战场卡触发每人各一份,铁律78)', () => {
    const s1 = handTo(st(), P2)
    const after = fire(s1, startEv(P2), P2)
    expect(runeCount(after, P2)).toBe(1)
  })

  test('★★只在【第一个】回合给:同一人第二个回合不再给', () => {
    const s2 = handTo(handTo(st(), P2), P1)                   
    expect(playerTurnIndex(s2, P1)).toBe(2)
    expect(runeCount(fire(s2, startEv(P1), P1), P1)).toBe(0)                 
  })

  test('★★一回合只响一次:P1 的开始阶段不许把 P2 那份也点着', () => {
                                         
                                             
                                       
                                          
    const both = { ...st(), turnsTaken: { [P1 as string]: 1, [P2 as string]: 1 } } as GameState
    expect(playerTurnIndex(both, P1)).toBe(1)
    expect(playerTurnIndex(both, P2)).toBe(1)                   
    const chain = landAndEnqueueTriggers(both, [startEv(P1)], activeTriggers, P1, {}).chain
    expect(chain).toHaveLength(1)                     
    const after = fire(both, startEv(P1), P1)
    expect(runeCount(after, P1)).toBe(1)
    expect(runeCount(after, P2)).toBe(0)                 
  })

  test('★召出的符文不是休眠/横置的(卡文没写「休眠的」)', () => {
    const after = fire(st(), startEv(P1), P1)
    const oid = (after.zones[`base:${P1}`]?.contents ?? [])
      .find((o) => after.objects[o]!.defId.startsWith('rune:'))!
    expect(after.objects[oid]!.status.tapped).not.toBe(true)                             
  })
})

describe('★★荣耀竞技场 OGN-290(同时机同条件,只有效果不同)', () => {
  const st = () => scene({ [BF0]: { defId: 'OGN-290', owner: P1 as string } })

  test('★★先手第一个回合得 1 分,而且【不召符文】', () => {
    const after = fire(st(), startEv(P1), P1)
    expect(scoreOf(after, P1)).toBe(1)
    expect(runeCount(after, P1)).toBe(0)                        
  })

  test('★★后手轮到时同样得分', () => {
    const s1 = handTo(st(), P2)
    expect(scoreOf(fire(s1, startEv(P2), P2), P2)).toBe(1)
  })

  test('★★只在第一个回合得分', () => {
    const s2 = handTo(handTo(st(), P2), P1)
    expect(scoreOf(fire(s2, startEv(P1), P1), P1)).toBe(0)
  })

  test('★对照:方尖碑不给分(两张的效果各管各的)', () => {
    const obelisk = scene({ [BF0]: { defId: 'OGN-284', owner: P1 as string } })
    expect(scoreOf(fire(obelisk, startEv(P1), P1), P1)).toBe(0)
  })
})
