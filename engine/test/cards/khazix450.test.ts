import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { cardKeywords, cardKind } from '../../data/registry'
import {
  UNL_119, UNL_119A, UNL_119_CARD_EFFECT, UNL_119_XP, makeKhazixTrigger, khazixFoesAt,
} from '../../data/cards/UNL-119'

                                                              
                                                                              
                                                   
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('kz')

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, might = 5): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as GameObject
}
function scene(objs: GameObject[], xp = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    experience: { ...base.experience, [P1]: xp } } as GameState
}
const atk = (unit = SELF, bf = BF0): GameEvent =>
  ({ kind: 'attack', unit, player: P1, battlefield: bf } as GameEvent)

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('双号并组;5费1橙pip 5S;[狩猎] 两条通道;mayChoose 标记', () => {
    expect(CARD_COSTS['UNL-119']).toEqual({ mana: 5, pips: 1, colors: ['orange'] })
    expect(CARD_COSTS['UNL-119a']).toEqual(CARD_COSTS['UNL-119'])
                                                                    
    expect(VARIANT_GROUPS['UNL-119']).toEqual(['UNL-119', 'UNL-119a', 'VEN-180'])
    expect(cardKind('UNL-119')).toBe('unit')
    expect(UNL_119.power, '上游实测 5S').toBe(5)
    expect(UNL_119A.id).toBe('UNL-119a')
    expect(UNL_119.keywords).toEqual(['狩猎'])
    expect(cardKeywords('UNL-119'), 'CARD_KEYWORDS 通道(教训②)').toEqual(['狩猎'])
    expect(cardKeywords('UNL-119a')).toEqual(['狩猎'])
    expect(UNL_119_XP).toBe(3)
    expect(UNL_119_CARD_EFFECT).toContain('狩猎')
    const trig = makeKhazixTrigger(SELF, P1)
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose).toBe(true)
  })
})

describe('🔴★★★★判据:我进攻 + 经验门', () => {
  const trig = makeKhazixTrigger(SELF, P1)
  const board = (xp: number): GameState => scene([
    obj('kz', 'UNL-119', P1, BF0),
    obj('mate', 'BLK', P1, BF0),
    obj('foe', 'BLK', P2, BF0, 2),
  ], xp)

  test('🔴★★★我进攻+经验够 ⇒ 响;队友进攻 ⇒ 不响;经验 2 点 ⇒ 不响(付不起连问都不问)', () => {
    expect(trig.filter!(atk(), board(3))).toBe(true)
    expect(trig.filter!(atk(asObjId('mate')), board(3)), '队友进攻').toBe(false)
    expect(trig.filter!(atk(), board(2)), '经验不足').toBe(false)
  })
})

describe('🔴★★★★候选与效果', () => {
  const trig = makeKhazixTrigger(SELF, P1)
  const board = (): GameState => scene([
    obj('kz', 'UNL-119', P1, BF0),
    obj('mate', 'BLK', P1, BF0),
    obj('foe', 'BLK', P2, BF0, 2),
    obj('far', 'BLK', P2, BF1, 2),
  ], 5)

  test('🔴★★★候选 =「此处」敌方(别处敌方/此处友方不进);无敌方 ⇒ 不问', () => {
    expect(khazixFoesAt(board(), BF0, P1)).toEqual(['foe'])
    const req = trig.nextChoice!(board(), atk(), {})
    expect(req!.candidates.map((c) => c.id)).toEqual(['foe'])
    const none = scene([obj('kz', 'UNL-119', P1, BF0)], 5)
    expect(trig.nextChoice!(none, atk(), {}), '此处无敌方不问').toBeNull()
  })

                                                              
                                                                  
                                               
  test('🔴🔴🔴★★★★★★【B1 核心分辨】事件说 BF1、我人在 BF0 ⇒ 候选按 BF0 算', () => {
    const req = trig.nextChoice!(board(), atk(SELF, BF1), {})
    expect(req?.candidates.map((c) => c.id), '★★★旧写法(读 ev.battlefield)会给 far').toEqual(['foe'])
  })

  test('🔴★★★★★★我被挪到 BF1 ⇒ 候选跟着换成那处的敌人', () => {
    const moved = scene([
      obj('kz', 'UNL-119', P1, BF1), obj('foe', 'BLK', P2, BF0, 2), obj('far', 'BLK', P2, BF1, 2),
    ], 5)
    expect(trig.nextChoice!(moved, atk(SELF, BF0), {})?.candidates.map((c) => c.id)).toEqual(['far'])
  })

  test('🔴🔴★★★★★★我【回了基地】⇒ 不问(不在战场上 ⇒ 忽略与战场相关的指示)', () => {
    const atBase = scene([
      obj('kz', 'UNL-119', P1, `base:${P1}`), obj('foe', 'BLK', P2, BF0, 2),
    ], 5)
    expect(trig.nextChoice!(atBase, atk(SELF, BF0), {}), '★事件带着 BF0 也不算数').toBeNull()
  })

  test('🔴★★★effect = spend(经验3)在前 + damage 等同【现读】战力在后;我离场 ⇒ 只付费无伤害', () => {
    const evs = trig.effect!(board(), atk(), { foe: 'foe' }) as unknown as readonly Record<string, unknown>[]
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'spend', player: P1, experience: UNL_119_XP })
    expect(evs[1]).toMatchObject({ kind: 'damage', target: 'foe', amount: 5, sourcePlayer: P1 })
  })

  test('★经验不够时 effect 整条作废(㊹ 编译器兜底,与 when 门重叠双防)', () => {
    const poor = scene([obj('kz', 'UNL-119', P1, BF0), obj('foe', 'BLK', P2, BF0, 2)], 2)
    expect(trig.effect!(poor, atk(), { foe: 'foe' })).toEqual([])
  })
})
