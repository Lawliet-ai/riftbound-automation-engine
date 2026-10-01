import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKind, cardCost, cardKeywords, playBonusFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'

                                             
                                                   
                                                     
  
           
                                                         
                                                                                
                                                                  
                                      
                                                           
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, counters: Record<string, number> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters, status: {},
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const buffed = (oid: string, who: PlayerId = P1) => obj(oid, who, BF0, { buff: 1 })

describe('★ 前提:登记面(两张,单印次无组)', () => {
  test('★★★★★海妖:3费2pip橙、[急速][强攻];莱卓斯:6费4pip黄、[法盾][游走];UNIT_COST 带 pips', () => {
    expect(CARD_COSTS['OGN-150']).toEqual({ mana: 3, pips: 2, colors: ['orange'] })
    expect(CARD_COSTS['OGN-231']).toEqual({ mana: 6, pips: 4, colors: ['yellow'] })
    expect(cardKind('OGN-150')).toBe('unit')
    expect(cardKind('OGN-231')).toBe('unit')
    expect(VARIANT_GROUPS['OGN-150'], '★单印次无组实证').toBeUndefined()
    expect(VARIANT_GROUPS['OGN-231']).toBeUndefined()
    expect(cardKeywords('OGN-150'), '★急速强攻都有行为面(§805/SFD-028)').toEqual(['急速', '强攻'])
    expect(cardKeywords('OGN-231'), '★法盾游走都有行为面(§809/§810.1.b)').toEqual(['法盾', '游走'])
    expect(cardCost('OGN-150')).toEqual({ mana: 3, pips: [['orange'], ['orange']] })
    expect(cardCost('OGN-231')).toEqual({ mana: 6, pips: [['yellow'], ['yellow'], ['yellow'], ['yellow']] })
  })
})

describe('★★★★★★★ ①②海妖:数量档+减 pip', () => {
  test('★★★★★★两个带增益友方 ⇒ 两档(1/2);discount N=减 N 枚;available 空=false', () => {
    const bs = playBonusFor('OGN-150')!
    const s = scene([buffed('a'), buffed('b'), obj('plain', P1, BF0), buffed('foe', P2)])
    expect(bs.available!(s, P1), '★有增益友方才可付').toBe(true)
    const opts = bs.options!(s, P1)
    expect(opts.map((o) => o.id), '★①数量档 1..K(K=2;plain 无增益、foe 敌方都不算)').toEqual(['1', '2'])
    expect(bs.discount!(s, P1, '2'), '★②N=2 ⇒ 减 2 枚 pip').toEqual([{ kind: 'reduce', part: 'pips', pips: 2, source: 'OGN-150 海妖猎手' }])
    expect(bs.available!(scene([obj('plain', P1, BF0)]), P1), '★没增益 ⇒ 这条变体不列').toBe(false)
  })

  test('★★★★★③payEvents:N=1 ⇒ 一条 consumeBuff(oid 序取前 N,带 by);N 超界只发有的', () => {
    const bs = playBonusFor('OGN-150')!
    const s = scene([buffed('a'), buffed('b')])
    const evs = bs.payEvents!(s, P1, '1') as unknown as readonly { kind: string, target?: string, by?: string }[]
    expect(evs).toEqual([{ kind: 'consumeBuff', target: 'a', by: P1 }])
    expect(bs.payEvents!(s, P1, '9') as unknown as readonly unknown[], '★超界=只发俩(防御)').toHaveLength(2)
  })
})

describe('★★★★★★★ ①②③莱卓斯:同构(摧毁友方)', () => {
  test('★★★★★★三名友方 ⇒ 三档;discount 同构;payEvents=destroy 前 N 名(敌方不在候选)', () => {
    const bs = playBonusFor('OGN-231')!
    const s = scene([obj('a', P1, BF0), obj('b', P1, `base:${P1}`), obj('c', P1, BF0), obj('foe', P2, BF0)])
    expect(bs.options!(s, P1).map((o) => o.id), '★K=3(敌方不算「友方」)').toEqual(['1', '2', '3'])
    expect(bs.discount!(s, P1, '3')).toEqual([{ kind: 'reduce', part: 'pips', pips: 3, source: 'OGN-231 莱卓斯指挥官' }])
    const evs = bs.payEvents!(s, P1, '2') as unknown as readonly { kind: string, target?: string, sourcePlayer?: string }[]
    expect(evs.map((e) => e.kind)).toEqual(['destroy', 'destroy'])
    expect(evs.map((e) => e.target), '★oid 序前 2(语义锚②:对象自动分配记档)').toEqual(['a', 'b'])
    expect(evs[0]!.sourcePlayer).toBe(P1)
  })

  test('★★★★★没友方 ⇒ available false(枚举侧不列这条变体 ㊼ 波比 UNL-178 同款)', () => {
    expect(playBonusFor('OGN-231')!.available!(scene([obj('foe', P2, BF0)]), P1)).toBe(false)
  })
})
