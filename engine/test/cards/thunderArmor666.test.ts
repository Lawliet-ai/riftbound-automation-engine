import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { recursionCostOptions } from '../../src/keywords/recursion'
import { VEN_156_SPEC, VEN_156_PICK, VEN_156_SKIP } from '../../data/cards/VEN-156'

                                                              
                                      
                                
  
           
                                                                            
                                                   
                                                              
                                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const card = (oid: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: `C-${oid}`, owner: who, controller: who, zone: asZoneId(`mainDeck:${who}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['spell'], damage: 0, counters: {}, status: {},
} as GameObject)

                                                                          
function deckOf(n: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (let i = 0; i < n; i++) {
    const o = card(`d${i}`, P1)
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

type Ev = { kind: string, obj?: string, to?: string }
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  VEN_156_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  VEN_156_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:①登记/流转', () => {
  test('★★★★★1费 0pip 紫/黄、[流转2A] 两份且 §829 解析出 {mana:2,pips:[[]]}、target none、不登触发区', () => {
    expect(CARD_COSTS['VEN-156']).toEqual({ mana: 1, pips: 0, colors: ['purple', 'yellow'] })
    expect(cardKind('VEN-156')).toBe('spell')
    expect(cardKeywords('VEN-156')).toEqual(['流转2A'])
    expect(recursionCostOptions(cardKeywords('VEN-156')), '★{A}=一枚任意域 [[]](㊶)').toEqual([{ mana: 2, pips: [[]] }])
    expect(playSpecFor('VEN-156')!.target).toBe('none')
    expect(playSpecFor('VEN-156')!.cost).toEqual({ mana: 1 })
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('VEN-156')
  })
})

describe('★★★★★★★ ②问链', () => {
  test('★★★★★★候选=顶3全部+skip;牌堆空不问;不足3有几问几;答过不问', () => {
    const s = deckOf(5)                       
    const q = ask(s)!
    expect(q.key).toBe(VEN_156_PICK)
    expect(q.candidates.map((c) => c.id)).toEqual(['d4', 'd3', 'd2', VEN_156_SKIP])
    expect(ask(deckOf(0)), '★牌堆空 ⇒ 没得看').toBeNull()
    expect(ask(deckOf(2))!.candidates.map((c) => c.id), '★不足3有几问几').toEqual(['d1', 'd0', VEN_156_SKIP])
    expect(ask(s, { [VEN_156_PICK]: 'd3' })).toBeNull()
  })
})

describe('★★★★★★★ ③④结算', () => {
  test('★★★★★★③指定 d3 ⇒ d3 进手、d4/d2 进废;**零 revealed**(「指定」≠「展示」㉒)', () => {
    const s = deckOf(5)
    const evs = resolveWith(s, { [VEN_156_PICK]: 'd3' })
    expect(evs.every((e) => e.kind === 'zoneChange'), '★一条 revealed 都不发').toBe(true)
    expect(evs).toHaveLength(3)
    expect(evs.find((e) => e.obj === 'd3')!.to, '★抽取=进手').toBe(`hand:${P1}`)
    expect(evs.filter((e) => e.to === `discard:${P1}`).map((e) => e.obj).sort(), '★其余两张进废').toEqual(['d2', 'd4'])
  })

  test('★★★★★★④skip/没答 ⇒ 三张全进废;指定的已不在顶3 ⇒ 当没拿(㉖ 复验);牌堆空 ⇒ 空', () => {
    const s = deckOf(5)
    for (const chosen of [{ [VEN_156_PICK]: VEN_156_SKIP }, {}]) {
      const evs = resolveWith(s, chosen as Record<string, string>)
      expect(evs).toHaveLength(3)
      expect(evs.every((e) => e.kind === 'zoneChange' && e.to === `discard:${P1}`), '★「其余」=全部').toBe(true)
    }
    const stale = resolveWith(s, { [VEN_156_PICK]: 'd0' })                
    expect(stale.every((e) => e.to === `discard:${P1}`), '★选中的那张必须还在顶3 才算真拿').toBe(true)
    expect(stale).toHaveLength(3)
    expect(resolveWith(deckOf(0), {})).toEqual([])
  })

  test('★★★★★不足3:两张牌指定一张 ⇒ 一进手一进废', () => {
    const evs = resolveWith(deckOf(2), { [VEN_156_PICK]: 'd1' })
    expect(evs).toHaveLength(2)
    expect(evs.find((e) => e.obj === 'd1')!.to).toBe(`hand:${P1}`)
    expect(evs.find((e) => e.obj === 'd0')!.to).toBe(`discard:${P1}`)
  })
})
