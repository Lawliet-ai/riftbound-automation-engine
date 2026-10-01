import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import {
  OGN_161, OGN_161_KEYWORDS, OGN_161_CARD_EFFECT, SFD_093_CARD_EFFECT,
  extraPlayZonesFor, LONGTAIL19_DEFIDS,
} from '../../data/cards/longtail-19'

                                                 
                                                 
  
                                             
                                                 
                            
                                                  
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const mk = (oid: string, who: PlayerId, zone: string, role?: 'attacking'): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: role === undefined ? {} : { [role]: true },
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}
const zonesOf = (s: GameState, defId: string, p: PlayerId = P1) =>
  [...extraPlayZonesFor(s, p, defId)].sort()

describe('★ 前提:卡面与接线', () => {
  test('★8费 2橙pip、8 战力,印 [法盾]', () => {
    expect(CARD_COSTS['OGN-161']).toEqual({ mana: 8, pips: 2, colors: ['orange'] })
    expect([OGN_161.power, OGN_161.energy]).toEqual([8, 8])
    expect(cardKind('OGN-161')).toBe('unit')
    expect(cardKeywords('OGN-161'), '★② 印刷关键词三处同源').toEqual(['法盾'])
    expect(OGN_161_KEYWORDS).toEqual(['法盾'])
    expect(specLookup('OGN-161').baseKeywords).toEqual(['法盾'])
    expect(LONGTAIL19_DEFIDS).toContain('OGN-161')
  })

  test('🔴★★★★★★【同解自证】那一句与无畏先锋【逐字】相同 —— 这才是能加一行的理由', () => {
    const mine = OGN_161_CARD_EFFECT.split('\n').at(-1)
    expect(mine, '★★★一个字都不差,才敢共用判据(㊼ 收口前逐条对过同解)').toBe(SFD_093_CARD_EFFECT)
  })
})

describe('🔴🔴★★★★★★判据:敌方【控制】的战场', () => {
  test('🔴★★★★★★对手独占那处 ⇒ 算', () => {
    expect(zonesOf(scene([mk('foe', P2, BF0)]), 'OGN-161')).toEqual([BF0])
  })

  test('🔴★★★★★★空场【不算】(那是"开放"那一档的地盘)', () => {
    const s = scene([mk('foe', P2, BF0)])          
    expect(zonesOf(s, 'OGN-161'), '★★★只有 BF0').toEqual([BF0])
    expect(zonesOf(s, 'OGN-176'), '★★★开放那档反过来只认 BF1').toEqual([BF1])
  })

  test('🔴★★★★★★我也有单位的争夺处【不算】(控制权归属未定)', () => {
    const s = scene([mk('foe', P2, BF0), mk('mine', P1, BF0)])
    expect(zonesOf(s, 'OGN-161'), '★★★「敌方控制」要求对手独占').toEqual([])
  })

  test('🔴★★★★★我独占的那处不算(那是默认落点,不用加宽)', () => {
    expect(zonesOf(scene([mk('mine', P1, BF0)]), 'OGN-161')).toEqual([])
  })

  test('🔴★★★★★★与无畏先锋在同一个盘面上【拿到一模一样的答案】(共用判据的实证)', () => {
    const s = scene([mk('foe', P2, BF0), mk('foe2', P2, BF1)])
    expect(zonesOf(s, 'OGN-161')).toEqual(zonesOf(s, 'SFD-093'))
    expect(zonesOf(s, 'OGN-161'), '★两处都是对手独占').toEqual([BF0, BF1])
  })
})

describe('🔴🔴★★★★★★同轴【五档】互不干扰(同一个盘面各问各的)', () => {
                                    
  const board = () => scene([
    mk('foe', P2, BF0),
    mk('meAtk', P1, BF1, 'attacking'), mk('foe2', P2, BF1),
  ])

  test('🔴★★★★★★敌方控制档 vs 我进攻档:同一盘面答案不同', () => {
    expect(zonesOf(board(), 'OGN-161'), '★敌方控制 ⇒ 只有 BF0').toEqual([BF0])
    expect(zonesOf(board(), 'SFD-025'), '★★★我进攻 ⇒ 只有 BF1').toEqual([BF1])
  })

  test('🔴★★★★★开放档在这盘一处都给不出(两处都有人)', () => {
    expect(zonesOf(board(), 'OGN-176')).toEqual([])
  })

  test('🔴★★★★★没登记的卡一处都不多给(样本有分辨力)', () => {
    expect(extraPlayZonesFor(board(), P1, 'OGN-012')).toEqual([])
  })
})
