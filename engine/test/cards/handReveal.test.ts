import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind, cardCost } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import type { GameEvent } from '../../src/loop/events'
import { HAND_REVEAL_DEFIDS } from '../../data/cards/hand-reveal'

                            
  
                                         
                                           
                                                          
                                       
                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function card(oid: string, defId: string, ctrl = P1): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {},
  }
}
function handCard(oid: string, defId: string, owner: typeof P1): GameObject {
  return {
    oid: asObjId(oid), defId, owner, controller: owner, zone: asZoneId(`hand:${owner}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function deckCard(oid: string, owner: typeof P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'DECK', owner, controller: owner, zone: asZoneId(`mainDeck:${owner}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
                                                 
                                 
  for (const o of [...objs, deckCard('d1', P1), deckCard('d2', P1)]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
const playEv = (self: string): GameEvent => ({ kind: 'playUnit', unit: asObjId(self), player: P1 })
function trig(st: GameState, self: string) {
  return activeTriggers(st).find((t) => t.sourceOid === asObjId(self))!
}
                                          
function run(st: GameState, self: string, answers: Record<string, string>) {
  const t = trig(st, self)
  const chosen: Record<string, string> = {}
  const asked: { key: string; who: string; cands: string[] }[] = []
  for (let i = 0; i < 5; i++) {
    const req = t.nextChoice?.(st, playEv(self), chosen)
    if (!req) break
    asked.push({ key: req.key, who: req.controller as string, cands: req.candidates.map((c) => c.id) })
    chosen[req.key] = answers[req.key] ?? req.candidates[0]!.id
  }
  return { state: applyEvents(st, t.effect(st, playEv(self), chosen), {}).state, asked }
}
const discardOf = (s: GameState, p: typeof P1) => (s.zones[`discard:${p}`]?.contents ?? []).map((o) => s.objects[o]?.defId)
const handSizeOf = (s: GameState, p: typeof P1) => s.zones[`hand:${p}`]?.contents.length ?? 0

describe('★「展示手牌 / 让某人弃牌」一族(第138轮)', () => {
  test('前提:本族三张都进了登记,费用照卡面', () => {
                                                   
    expect(HAND_REVEAL_DEFIDS.slice().sort()).toEqual(['OGN-192', 'UNL-121', 'UNL-135'])
    for (const id of HAND_REVEAL_DEFIDS) expect(cardKind(id)).toBe('unit')
    expect(cardCost('OGN-192').pips).toEqual([['purple'], ['purple']])                  
    expect(cardCost('UNL-121').pips ?? []).toHaveLength(0)
    expect(specLookup('OGN-192').baseMight).toBe(7)
    expect(specLookup('UNL-121').baseMight).toBe(2)
  })

  test('★辟心玄龙:候选是【对手手牌】,我自己的手牌不在里面', () => {
    const st = scene([card('x', 'OGN-192'),
      handCard('foeA', 'OGN-013', P2), handCard('foeB', 'OGN-097', P2),
      handCard('mine', 'OGN-169', P1)])
    const req = trig(st, 'x').nextChoice?.(st, playEv('x'), {})!
    expect(req.candidates.map((c) => c.id).sort()).toEqual(['foeA', 'foeB'])
    expect(req.controller).toBe(P1)            
  })

  test('★辟心玄龙:选中的那张进【对手的】废牌堆,不是我的', () => {
    const st = scene([card('x', 'OGN-192'), handCard('foeA', 'OGN-013', P2), handCard('foeB', 'OGN-097', P2)])
    const { state } = run(st, 'x', { card: 'foeB' })
    expect(discardOf(state, P2)).toEqual(['OGN-097'])
    expect(discardOf(state, P1)).toEqual([])
    expect(handSizeOf(state, P2)).toBe(1)
  })

  test('★辟心玄龙:对手手上没牌 ⇒ 不弹问、什么都不做(§355.17)', () => {
    const st = scene([card('x', 'OGN-192')])
    const { state, asked } = run(st, 'x', {})
    expect(asked).toEqual([])
    expect(discardOf(state, P2)).toEqual([])
  })

  test('★★魅惑之灵:弃哪张由【被选中的那名玩家自己】答 —— 这一格只在 controller 上显形', () => {
                                         
    const st = scene([card('x', 'UNL-121'), handCard('foeA', 'OGN-013', P2), handCard('foeB', 'OGN-097', P2)])
    const { asked } = run(st, 'x', { who: 'P2', card: 'foeB' })
    expect(asked.map((a) => [a.key, a.who])).toEqual([['who', 'P1'], ['card', 'P2']])
  })

  test('★魅惑之灵:「一名玩家」含我自己 —— 我也在候选里,选我就我自己弃', () => {
    const st = scene([card('x', 'UNL-121'), handCard('mine', 'OGN-169', P1), handCard('foeA', 'OGN-013', P2)])
    const first = trig(st, 'x').nextChoice?.(st, playEv('x'), {})!
    expect(first.candidates.map((c) => c.id).sort()).toEqual(['P1', 'P2'])
    const { state, asked } = run(st, 'x', { who: 'P1', card: 'mine' })
    expect(asked[1]!.who).toBe('P1')                       
    expect(asked[1]!.cands).toEqual(['mine'])              
    expect(discardOf(state, P1)).toEqual(['OGN-169'])
    expect(discardOf(state, P2)).toEqual([])
  })

  test('★魅惑之灵:被选中的玩家手上没牌 ⇒ 只问了第一问,没得弃', () => {
    const st = scene([card('x', 'UNL-121'), handCard('mine', 'OGN-169', P1)])
    const { state, asked } = run(st, 'x', { who: 'P2' })
    expect(asked.map((a) => a.key)).toEqual(['who'])
    expect(discardOf(state, P2)).toEqual([])
    expect(handSizeOf(state, P1)).toBe(1)            
  })
})

                                                                          
                                            
  
                                                           
                                                               
                                                   
                         
                                                                          
describe('★缜密的调查员 UNL-135:㊹ 费用=消耗2经验', () => {
  const withXp = (s: GameState, n: number): GameState =>
    ({ ...s, experience: { ...s.experience, [P1]: n } })

  test('前提:登记齐、费用照卡面(3费0pip)', () => {
    expect(cardKind('UNL-135')).toBe('unit')
    expect(cardCost('UNL-135').mana).toBe(3)
    expect(cardCost('UNL-135').pips ?? []).toHaveLength(0)
    expect(specLookup('UNL-135').baseMight).toBe(3)
  })

  test('★经验够(2点):扣掉2点 + 对手弃那张 + 【我】抽一张', () => {
    const st = withXp(scene([card('x', 'UNL-135'),
      handCard('foeA', 'OGN-013', P2), handCard('foeB', 'OGN-097', P2)]), 2)
    const { state } = run(st, 'x', { card: 'foeB' })
    expect(state.experience[P1]).toBe(0)
    expect(discardOf(state, P2)).toEqual(['OGN-097'])
    expect(handSizeOf(state, P1)).toBe(1)                  
  })

  test('★★经验不够(1点):整条不执行 —— 对手的牌一张不少、我也不抽、经验不变', () => {
                                                 
                                       
    const st = withXp(scene([card('x', 'UNL-135'), handCard('foeA', 'OGN-013', P2)]), 1)
    const { state } = run(st, 'x', { card: 'foeA' })
    expect(state.experience[P1]).toBe(1)
    expect(discardOf(state, P2)).toEqual([])
    expect(handSizeOf(state, P2)).toBe(1)
    expect(handSizeOf(state, P1)).toBe(0)
  })

  test('★费用在前收益在后,而且经验挂在同一条 spend 事件上(没另开事件种类)', () => {
    const st = withXp(scene([card('x', 'UNL-135'), handCard('foeA', 'OGN-013', P2)]), 5)
    const evs = trig(st, 'x').effect(st, playEv('x'), { card: 'foeA' })
    expect(evs.map((e) => e.kind)).toEqual(['spend', 'zoneChange', 'draw'])
    expect((evs[0] as { experience?: number }).experience).toBe(2)
  })

  test('★与辟心玄龙的差别只在费用:后者【没有】费用,0经验也照做', () => {
                                                
    const st = withXp(scene([card('y', 'OGN-192'), handCard('foeA', 'OGN-013', P2)]), 0)
    const { state } = run(st, 'y', { card: 'foeA' })
    expect(discardOf(state, P2)).toEqual(['OGN-013'])
  })
})
