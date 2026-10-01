import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { resetTurnLedgers } from '../../src/scoring/score'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { OGN_053_SPEC } from '../../data/cards/OGN-053'

                                                           
                                                       
  
           
                                                        
                                                              
                                                 
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, buffs = 0): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: buffs > 0 ? { buff: buffs } : {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], bonus?: Record<string, number>): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(bonus ? { buffBonusThisTurn: bonus } : {}) } as GameState
}

const mightOf = (s: GameState, oid: string): number => {
  const o = recomputeContinuous(s).objects[asObjId(oid)]!
  return o.derived?.might ?? o.baseMight
}

describe('★ 前提:①登记与候选', () => {
  test('★★★★★法术 3费 0pip 绿、[待命][迅捷] 登了、PLAY_SPECS 接了;候选=友方单位(敌方/装备不在)', () => {
    expect(CARD_COSTS['OGN-053']).toEqual({ mana: 3, pips: 0, colors: ['green'] })
    expect(cardKind('OGN-053')).toBe('spell')
    expect(cardKeywords('OGN-053')).toEqual(['待命', '迅捷'])
    expect(playSpecFor('OGN-053')).toBe(OGN_053_SPEC)
    const s = scene([obj('mine', 'U-M', P1, BF0), obj('atBase', 'U-B', P1, `base:${P1}`), obj('foe', 'U-F', P2, BF0)])
    expect([...OGN_053_SPEC.legalTargets(s, P1)]).toEqual(['atBase', 'mine'])
  })

  test('★★★★★②resolve:grantBuff+buffBonus 两事件;目标没了 ⇒ 句②独立照发(★676)', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)])
    const evs = OGN_053_SPEC.makeResolve!({ movedCardOid: 'mv', controller: P1, target: 'mine' } as never)(s, {} as never, undefined as never) as unknown as readonly { kind: string, target?: string, player?: string, delta?: number }[]
    expect(evs.map((e) => e.kind)).toEqual(['grantBuff', 'buffBonus'])
    expect(evs[0]).toMatchObject({ kind: 'grantBuff', target: 'mine' })
    expect(evs[1]).toMatchObject({ kind: 'buffBonus', player: P1, delta: 1 })
    const gone = OGN_053_SPEC.makeResolve!({ movedCardOid: 'mv', controller: P1, target: 'ghost' } as never)(s, {} as never, undefined as never) as unknown as readonly { kind: string }[]
    expect(gone.map((e) => e.kind), '★目标离场 ⇒ 只发句②').toEqual(['buffBonus'])
  })
})

describe('★★★★★★★ ③④第二十四本账与求值', () => {
  test('★★★★★★账=1 ⇒ 我的单位每枚增益+2;对手的单位读对手账(0)⇒ 每枚仍+1;账累加(两张=+3)', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0, 2), obj('foe', 'U-F', P2, BF0, 2)], { [P1 as string]: 1 })
    expect(mightOf(s, 'mine'), '★2枚×(1+1)=+4 ⇒ 3+4=7').toBe(7)
    expect(mightOf(s, 'foe'), '★「友方」=单位控制者的账:对手账0 ⇒ 2枚×1=+2').toBe(5)
    const two = scene([obj('mine', 'U-M', P1, BF0, 1)], { [P1 as string]: 2 })
    expect(mightOf(two, 'mine'), '★两张魂落累加:1枚×(1+2)=+3').toBe(6)
  })

  test('★★★★★★E2E:apply 两事件 ⇒ 目标 1枚增益+账1 ⇒ might 3+2=5;resetTurnLedgers 清账回落 +1', () => {
    const s = scene([obj('mine', 'U-M', P1, BF0)])
    const evs = OGN_053_SPEC.makeResolve!({ movedCardOid: 'mv', controller: P1, target: 'mine' } as never)(s, {} as never, undefined as never)
    const after = applyEvents(s, evs as never, {}).state
    expect(after.buffBonusThisTurn, '★buffBonus 事件真记账').toEqual({ [P1 as string]: 1 })
    const twice = applyEvents(after, [{ kind: 'buffBonus', player: P1, delta: 1 }] as never, {}).state
    expect(twice.buffBonusThisTurn, '★第二发**累加**不覆盖(reduce +=)').toEqual({ [P1 as string]: 2 })
    expect(mightOf(after, 'mine'), '★1枚×(1+1)=+2').toBe(5)
    const nextTurn = resetTurnLedgers(after)
    expect(nextTurn.buffBonusThisTurn ?? {}, '★清=回合末').toEqual({})
    expect(mightOf(nextTurn, 'mine'), '★账清后增益回落每枚+1(§476.3 同步回落)').toBe(4)
  })
})
