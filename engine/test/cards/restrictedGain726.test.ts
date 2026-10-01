import { describe, expect, test } from 'vitest'
import { asPlayerId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'
import { canPayFromState } from '../../src/game/economy'
import { activatedFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { specLookup } from '../../data/decks'
import {
  OGS_014_SPEC, OGS_014_GRANT, SFD_189_SPEC, SFD_189_GRANT, VEN_141_SPEC, VEN_141_GRANT,
} from '../../data/cards/restricted-gain'

                                                   
                                             
                                                               
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const scene = (): GameState => ({ ...createInitialState([P1, P2], 2), activePlayer: P1, phase: 'main' } as GameState)
const gained = (spec: typeof OGS_014_SPEC): GameState =>
  applyEvents(scene(), spec.makeResolve({ selfOid: 'x', controller: P1 } as never)(scene(), {} as never, undefined as never) as never, {}).state

describe('★★★★★★★ 三卡用途正反例', () => {
  test('★★★★★★拉克丝:{2} 打法术可付/打单位与缺省不可;载荷钉字面量', () => {
    const s = gained(OGS_014_SPEC)
    expect(canPayFromState(s, P1, { mana: 2 }, 'playSpell')).toBe(true)
    expect(canPayFromState(s, P1, { mana: 2 }, 'playUnit')).toBe(false)
    expect(canPayFromState(s, P1, { mana: 2 })).toBe(false)
    expect(OGS_014_GRANT).toEqual({ mana: 2, energy: {}, purposes: ['playSpell'] })
  })

  test('★★★★★★山隐之焰:{A} 装备两用途都可付/法术不可(QA L226 效果费同理不可)', () => {
    const s = gained(SFD_189_SPEC)
    expect(canPayFromState(s, P1, { pips: [[]] }, 'playGear'), '★打出装备').toBe(true)
    expect(canPayFromState(s, P1, { pips: [[]] }, 'gearAbility'), '★「或使用装备技能」').toBe(true)
    expect(canPayFromState(s, P1, { pips: [[]] }, 'playSpell')).toBe(false)
    expect(SFD_189_GRANT.purposes).toEqual(['playGear', 'gearAbility'])
  })

  test('★★★★★★荒漠屠夫:{2} 单位两用途可付/装备不可;费用=两枚任意+横置(㊶ ㊼ VEN-142)', () => {
    const s = gained(VEN_141_SPEC)
    expect(canPayFromState(s, P1, { mana: 2 }, 'playUnit')).toBe(true)
    expect(canPayFromState(s, P1, { mana: 2 }, 'unitAbility'), '★「或单位的主动技能」').toBe(true)
    expect(canPayFromState(s, P1, { mana: 2 }, 'playGear')).toBe(false)
    expect(VEN_141_SPEC.cost, '★「支付{{A}}{{A}}」=两枚任意域').toEqual({ pips: [[], []] })
    expect(VEN_141_SPEC.tapSelf).toBe(true)
    expect(VEN_141_GRANT.purposes).toEqual(['playUnit', 'unitAbility'])
  })
})

describe('★ 前提:登记面三款', () => {
  test('★★★★★拉克丝=单位登记面(㊼ UNL-160:ACTIVATED+UNIT_COST+CARDS 有肉);无组实证', () => {
    expect(CARD_COSTS['OGS-014']).toEqual({ mana: 4, pips: 0, colors: ['yellow'] })
    expect(cardKind('OGS-014')).toBe('unit')
                                           
                                         
                                                               
    expect(VARIANT_GROUPS['OGS-014'], '★796 起与 VEN-SP6 同组').toEqual(['OGS-014', 'VEN-SP6'])
    expect(activatedFor('OGS-014')).toHaveLength(1)
    expect(specLookup('OGS-014').baseMight, '★decks CARDS 有肉(空壳闸姿势)').toBe(2)
  })

  test('★★★★★山隐/荒漠=传奇折叠(双号组实证)+keywords 全空+[反应]三种排版同落权限', () => {
    expect(cardKind('SFD-189')).toBe('legend')
    expect(VARIANT_GROUPS['SFD-189']).toEqual(['SFD-189', 'SFD-244'])
    expect(VARIANT_GROUPS['VEN-141']).toEqual(['VEN-141', 'VEN-190'])
    expect(activatedFor('SFD-244'), '★折叠').toHaveLength(1)
    expect(activatedFor('VEN-190'), '★折叠').toHaveLength(1)
    for (const no of ['OGS-014', 'SFD-189', 'SFD-244', 'VEN-141', 'VEN-190']) expect(cardKeywords(no), no).toEqual([])
    for (const sp of [OGS_014_SPEC, SFD_189_SPEC, VEN_141_SPEC]) {
      expect(sp.keywords, '★权限轴').toEqual(['反应'])
      expect((sp as { fastResolve?: boolean }).fastResolve, '★§429.2 规则级').toBe(true)
    }
  })
})
