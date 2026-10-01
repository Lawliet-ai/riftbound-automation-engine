import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { recursionCostOptions } from '../../src/keywords/recursion'
import { PUMP_SPELLS, PUMP_SPELL_SPECS } from '../../data/cards/pump-spells'

                                                                    
                                    
  
                                          
                                                           
                                                      
  
                                                           
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const row = () => PUMP_SPELLS.find((r) => r.defId === 'VEN-081')!
const unit = (oid: string, who: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const gear = (oid: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId: 'SFD-150', owner: who, controller: who, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
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
const cands = (s: GameState) =>
  (PUMP_SPELL_SPECS['VEN-081']!.legalTargets!(s, P1, 'sp') as string[]).slice().sort()

describe('★ 前提:卡面与接线(族表自动登记)', () => {
  test('★4费 0pip 橙,法术;spec 与关键词都由族表生成', () => {
    expect(CARD_COSTS['VEN-081']).toEqual({ mana: 4, pips: 0, colors: ['orange'] })
    expect(cardKind('VEN-081')).toBe('spell')
    expect(playSpecFor('VEN-081'), '★进了 PLAY_SPECS').toBeDefined()
    expect(row().energy).toBe(4)
    expect(row().cost, '★★★0 pip ⇒ 一枚都不写').toEqual({ mana: 4 })
  })

  test('🔴★★★★★★[流转4] 三处同源,且是【纯法力不带 pip】那一档', () => {
    expect(cardKeywords('VEN-081'), '★② 印刷关键词').toEqual(['流转4'])
    expect(row().keywords).toEqual(['流转4'])
    expect(specLookup('VEN-081').baseKeywords).toEqual(['流转4'])
                                              
    expect(recursionCostOptions(['流转4']).length > 0).toBe(true)
    expect(recursionCostOptions(['流转4']), '★★★4 法力、【一枚 pip 都不要】')
      .toEqual([{ mana: 4 }])
  })

  test('🔴★★★★★对照:带色那种写法解析出来【多一格 pips】(两档不同解)', () => {
    expect(recursionCostOptions(['流转4紫色']), '★★★同样是 4 法力,但多一枚紫')
      .toEqual([{ mana: 4, pips: [['purple']] }])
    expect(recursionCostOptions(['流转4'])).not.toEqual(recursionCostOptions(['流转4紫色']))
  })
})

describe('🔴🔴🔴★★★★★★候选:「一名单位」没有任何限定', () => {
  test('🔴★★★★★★敌我都能选(没有阵营词)', () => {
    const s = scene([unit('mine', P1), unit('foe', P2)])
    expect(cands(s), '★★★别顺手写成 friendlyUnit').toEqual(['foe', 'mine'])
  })

  test('🔴★★★★★★基地里的也能选(没有位置词 ⇒ 含基地,⑳)', () => {
    const s = scene([unit('onBf', P1), unit('atBase', P2, `base:${P2}`)])
    expect(cands(s)).toEqual(['atBase', 'onBf'])
  })

  test('🔴★★★★★装备不算(「单位」二字是道真门)', () => {
    const s = scene([unit('mine', P1), gear('g', P1)])
    expect(cands(s)).toEqual(['mine'])
  })

  test('🔴★★★★★场上没单位 ⇒ 一个候选都没有', () => {
    expect(cands(scene([gear('g', P1)]))).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★产出:本回合内 [S]+6', () => {
  test('🔴★★★★★★加的是 6,不是别的数', () => {
    expect(row().delta).toBe(6)
  })

  test('🔴★★★★★★加战力【不设下限】—— 卡文一个字没写(⑩⑤ 别硬凑)', () => {
                                                                         
    const withFloor = PUMP_SPELLS.find((r) => r.floor !== undefined)
    expect(withFloor, '★前提:族里确实有带 floor 的').toBeDefined()
    expect(row().floor, '★★★本张没有').toBeUndefined()
  })

  test('🔴★★★★★它【只做加减】—— 不授予关键词、不抽牌、不设基础战力、没有回响', () => {
    const r = row()
    expect([r.grants, r.draw, r.setMight, r.echo], '★★★这几格都不该有').toEqual(
      [undefined, undefined, undefined, undefined])
  })

  test('🔴★★★★★★它是【单体档】(没给 group)', () => {
    expect(row().group, '★★★给了 group 就成群体档了').toBeUndefined()
    expect(PUMP_SPELL_SPECS['VEN-081']!.target, '★单体档走 custom 问链').toBe('custom')
  })
})

describe('🔴🔴★★★★★与龙之形【同构】:分野只有两处', () => {
  const dragon = () => PUMP_SPELLS.find((r) => r.defId === 'VEN-116')!

  test('🔴★★★★★★同构的那几条逐条同解:都是单体、都带流转、都 0 pip', () => {
    expect([row().group, dragon().group]).toEqual([undefined, undefined])
    expect([recursionCostOptions(row().keywords ?? []).length > 0, recursionCostOptions(dragon().keywords ?? []).length > 0])
      .toEqual([true, true])
    expect([row().cost.pips, dragon().cost.pips], '★两张都没有 pip').toEqual([undefined, undefined])
  })

  test('🔴★★★★★★分野一:那张改【基础战力】、这张是【加减】', () => {
    expect([dragon().setMight, dragon().delta], '★对照那张:setMight 有、delta 没有')
      .toEqual([5, undefined])
    expect([row().setMight, row().delta], '★★★本张正相反').toEqual([undefined, 6])
  })

  test('🔴★★★★★分野二:流转数额一个 3 一个 4', () => {
    expect(recursionCostOptions(dragon().keywords ?? [])).toEqual([{ mana: 3 }])
    expect(recursionCostOptions(row().keywords ?? [])).toEqual([{ mana: 4 }])
  })
})
