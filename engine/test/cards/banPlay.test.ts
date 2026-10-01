import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKind, cardCost, cardKeywords, cardCost as costOf, costModsFor } from '../../data/registry'
import { computeCost } from '../../src/game/costPipeline'
import { consumeNextSpellDiscount } from '../../src/game/costPipeline'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { seedRunes } from '../../src/game/economy'
import type { GameEvent } from '../../src/loop/events'
import { BAN_PLAY_DEFIDS } from '../../data/cards/ban-play'

                                                
  
                                                 
                                                   
  
              
                                    
                                                     
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardCost: costOf, costModsFor }

function obj(oid: string, defId: string, ctrl: typeof P1, zone: string, might = 2): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(extra: GameObject[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of extra) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let s: GameState = { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones }
  s = seedRunes(s, P1, 'red', 8)
  s = seedRunes(s, P2, 'red', 8)
  return s
}
                               
const ban = (s: GameState, p: typeof P1): GameState =>
  applyEvents(s, [{ kind: 'banPlayCards', player: p } as GameEvent], {}).state

describe('★玩家级禁手 §054(第141轮)', () => {
  test('前提:登记齐、费用照卡面(6费0pip 5[M])', () => {
    expect(BAN_PLAY_DEFIDS).toContain('OGN-026')                     
    expect(cardKind('OGN-026')).toBe('unit')
    expect(cardCost('OGN-026').mana).toBe(6)
    expect(cardCost('OGN-026').pips ?? []).toHaveLength(0)
    expect(specLookup('OGN-026').baseMight).toBe(5)
  })

  test('★卡的触发只禁【对手】,不禁我自己(㉒「对手」不含我)', () => {
    const st = scene([obj('x', 'OGN-026', P1, BF0, 5)])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    const evs = t.effect(st, { kind: 'playUnit', unit: asObjId('x'), player: P1 }, {})
    expect(evs.map((e) => [e.kind, (e as { player: string }).player])).toEqual([['banPlayCards', 'P2']])
    const s2 = applyEvents(st, evs, {}).state
    expect(s2.cannotPlayCardsThisTurn).toEqual(['P2'])
  })

                                                             
  test('★枚举侧:被禁的玩家,三条打出路子都不列出来', () => {
    const g = new InteractiveGame(ban(scene([obj('u', 'BLK', P1, `hand:${P1}`)]), P1), DEPS)
    const kinds = new Set(g.legalActions(P1).map((a) => a.kind))
    expect(kinds.has('PLAY_UNIT')).toBe(false)
    expect(kinds.has('PLAY_CARD')).toBe(false)
    expect(kinds.has('PLAY_STANDBY')).toBe(false)
  })

  test('★没被禁的时候,那条路是【真的列得出来】的(否则上一条恒真、测了个寂寞)', () => {
                                                         
    const g = new InteractiveGame(scene([obj('u', 'BLK', P1, `hand:${P1}`)]), DEPS)
    expect(g.legalActions(P1).some((a) => a.kind === 'PLAY_UNIT')).toBe(true)
  })

  test('★★执行侧:绕开枚举直接发 PLAY_UNIT,照样打不出来', () => {
                                     
    const g = new InteractiveGame(ban(scene([obj('u', 'BLK', P1, `hand:${P1}`)]), P1), DEPS)
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'u', to: `base:${P1}` })
    expect(g.state.objects['u']!.zone).toBe(`hand:${P1}`)        
  })

  test('★禁的是【被点名的那个人】,另一名玩家不受影响', () => {
    const g = new InteractiveGame(ban(scene([obj('u', 'BLK', P1, `hand:${P1}`)]), P2), DEPS)
    expect(g.legalActions(P1).some((a) => a.kind === 'PLAY_UNIT')).toBe(true)
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'u', to: `base:${P1}` })
    expect(g.state.objects['u']).toBeUndefined()                      
  })

  test('★§430 召出符文不是打出 ⇒ 不该被禁令拦住', () => {
                                              
                                                 
                                                   
    const deck = obj('rd1', 'rune:red', P1, `runeDeck:${P1}`, 0)
    const s = ban(scene([deck]), P1)
    const inDeck = (x: GameState) => (x.zones[`runeDeck:${P1}`]?.contents ?? []).length
    expect(inDeck(s)).toBe(1)                
    const after = applyEvents(s, [{ kind: 'summonRune', player: P1, count: 1 } as GameEvent], {}).state
    expect(inDeck(after)).toBe(0)                 
  })

  test('★禁令只管【本回合】:回合末清掉', () => {
    const g = new InteractiveGame(ban(scene([obj('u', 'BLK', P1, `hand:${P1}`)]), P1), DEPS)
    expect(g.state.cannotPlayCardsThisTurn).toEqual([P1])
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.state.cannotPlayCardsThisTurn ?? []).toEqual([])
  })
})

                                                                          
                                      
  
            
                                           
                                       
                                                          
                  
                                               
                                                                          
describe('★可消耗减费:狂暴龙怪 OGN-031(第142轮)', () => {
  const SPELL = 'OGN-169'                 
  const UNIT = 'OGN-026'                   
  const withDiscount = (s: GameState, p: typeof P1, n: number): GameState =>
    ({ ...s, nextSpellDiscountThisTurn: { ...(s.nextSpellDiscountThisTurn ?? {}), [p]: n } })
  const manaAfterMods = (s: GameState, p: typeof P1, defId: string, printed: number): number =>
    computeCost({ mana: printed }, costModsFor(s, p, defId)).mana ?? 0

  test('前提:两张都在本族清单里;道具卡的类别就是我以为的那样', () => {
    expect(BAN_PLAY_DEFIDS).toEqual(['OGN-026', 'OGN-031'])
    expect(cardKind(SPELL)).toBe('spell')
    expect(cardKind(UNIT)).toBe('unit')
    expect(cardCost('OGN-031').pips).toEqual([['red']])
    expect(specLookup('OGN-031').baseMight).toBe(4)
  })

  test('★卡的触发只是【记账】,不当场改任何费用', () => {
    const st = scene([obj('x', 'OGN-031', P1, BF0, 4)])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    const evs = t.effect(st, { kind: 'playUnit', unit: asObjId('x'), player: P1 }, {})
    expect(evs).toEqual([{ kind: 'grantNextSpellDiscount', player: P1, mana: 5 }])
    const s2 = applyEvents(st, evs, {}).state
    expect(s2.nextSpellDiscountThisTurn?.[P1]).toBe(5)
  })

  test('★★减免只对【法术】生效,单位不吃', () => {
    const s = withDiscount(scene(), P1, 5)
    expect(manaAfterMods(s, P1, SPELL, 8)).toBe(3)       
    expect(manaAfterMods(s, P1, UNIT, 8)).toBe(8)         
  })

  test('★没有额度时法术是原价(对照组:证明上面那条减的是真的)', () => {
                                           
    expect(manaAfterMods(scene(), P1, SPELL, 8)).toBe(8)
  })

  test('★额度只属于【记账的那个人】,对手不沾光', () => {
    const s = withDiscount(scene(), P1, 5)
    expect(manaAfterMods(s, P2, SPELL, 8)).toBe(8)
  })

  test('★减到 0 为止,不会变负', () => {
    const s = withDiscount(scene(), P1, 5)
    expect(manaAfterMods(s, P1, SPELL, 1)).toBe(0)
  })

  test('★两张叠加 = 额度相加(每条都指同一个"下一个法术")', () => {
    const st = scene([obj('a', 'OGN-031', P1, BF0, 4), obj('b', 'OGN-031', P1, BF0, 4)])
    let s = st
    for (const oid of ['a', 'b']) {
      const t = activeTriggers(s).find((y) => y.sourceOid === asObjId(oid))!
      s = applyEvents(s, t.effect(s, { kind: 'playUnit', unit: asObjId(oid), player: P1 }, {}), {}).state
    }
    expect(s.nextSpellDiscountThisTurn?.[P1]).toBe(10)
  })

  test('★★枚举侧【只读不扣】:反复算费用不会把额度用光', () => {
                                                             
                              
    const g = new InteractiveGame(withDiscount(scene([obj('u', 'BLK', P1, `hand:${P1}`)]), P1, 5), DEPS)
    g.legalActions(P1)
    g.legalActions(P1)
    expect(g.state.nextSpellDiscountThisTurn?.[P1]).toBe(5)
  })

  test('★额度回合末清掉(只管本回合)', () => {
    const g = new InteractiveGame(withDiscount(scene(), P1, 5), DEPS)
    expect(g.state.nextSpellDiscountThisTurn?.[P1]).toBe(5)
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.state.nextSpellDiscountThisTurn?.[P1] ?? 0).toBe(0)
  })

  test('★消耗原语:没额度时返回【原 state 引用】(与项目其他无操作原语同一约定)', () => {
    const s = scene()
    expect(consumeNextSpellDiscount(s, P1)).toBe(s)
    const withN = withDiscount(s, P1, 5)
    expect(consumeNextSpellDiscount(withN, P1).nextSpellDiscountThisTurn?.[P1]).toBe(0)
  })
})
