import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { OGN_071_SPEC } from '../../data/cards/OGN-071'

                                                            
                            
                                
                                     
  
           
                                        
                                                        
                                      
                                                             
                                       
                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const scene = (): GameState => {
  const base = createInitialState([P1, P2], 2)
  return { ...base, activePlayer: P1, phase: 'main' } as GameState
}

type Ev = { kind: string, player?: string, count?: number, dormant?: boolean }
const ask = (s: GameState, me: PlayerId, chosen: Record<string, string>) =>
  OGN_071_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: me } as never)(s, chosen)
const resolveWith = (s: GameState, me: PlayerId, chosen: Record<string, string>): readonly Ev[] =>
  OGN_071_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: me } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:上游/接线', () => {
  test('★★★★★3费 0pip 绿、法术、无印刷关键词、进 PLAY_SPECS;⑤无 Trigger ⇒ 不进触发区清单', () => {
    expect(CARD_COSTS['OGN-071']).toEqual({ mana: 3, pips: 0, colors: ['green'] })
    expect(OGN_071_SPEC.cost).toEqual({ mana: 3 })
    expect(cardKind('OGN-071')).toBe('spell')
    expect(cardKeywords('OGN-071')).toEqual([])
    expect(playSpecFor('OGN-071')!.target).toBe('none')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('OGN-071')
  })
})

describe('★★★★★★★ ①②「除你之外」逐人必选问', () => {
  test('★★★★★★P1 施法 ⇒ 问 P2(controller=P2、候选两档无 skip);答过 ⇒ null(**不问施法者**)', () => {
    const s = scene()
    const q = ask(s, P1, {})!
    expect(q.controller).toBe(P2)
    expect(q.key).toBe('party:P2')
    expect(q.candidates.map((c) => c.id), '★「让…选择」没写「可以」⇒ 就两档,无 skip').toEqual(['card', 'rune'])
    expect(ask(s, P1, { 'party:P2': 'card' }), '★①除你之外:P2 答完即 null,施法者 P1 不被问').toBeNull()
  })

  test('★★★★★①对称:P2 施法 ⇒ 问的是 P1', () => {
    const q = ask(scene(), P2, {})!
    expect(q.controller).toBe(P1)
    expect(q.key).toBe('party:P1')
  })
})

describe('★★★★★★★ ③④resolve 两档', () => {
  test('★★★★★★③选「卡牌」⇒ 你和该玩家**各**抽一张(分条、你在前)', () => {
    const evs = resolveWith(scene(), P1, { 'party:P2': 'card' })
    expect(evs).toEqual([
      { kind: 'draw', player: P1, count: 1 },
      { kind: 'draw', player: P2, count: 1 },
    ])
  })

  test('★★★★★★④选「符文」⇒ 各召一枚**休眠**符文(dormant=true,§430.2)', () => {
    const evs = resolveWith(scene(), P1, { 'party:P2': 'rune' })
    expect(evs).toEqual([
      { kind: 'summonRune', player: P1, count: 1, dormant: true },
      { kind: 'summonRune', player: P2, count: 1, dormant: true },
    ])
  })

  test('★★★★★没答到 ⇒ 空(防御;FEPR 问完才 resolve,正常不发生)', () => {
    expect(resolveWith(scene(), P1, {})).toEqual([])
  })
})
