import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { playBonusFor } from '../../data/registry'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import {
  SFD_079, SFD_228, SFD_079_CARD_EFFECT, SFD_079_EXTRA_COST, SFD_079_PREFIX,
  makeBardTrigger, myLegendOid,
} from '../../data/cards/play-extra-cost'

                                           
                                                               
                                                                       
                                                                           
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('bard')

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, opts: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    ...opts,
  } as GameObject
}
const legend = (oid: string, ctrl = P1, dormant = false): GameObject =>
  ({ ...obj(oid, 'LEG', ctrl, `legend:${ctrl}`, { baseTypes: ['legend'] as never }),
    status: dormant ? { dormant: true } : {} } as GameObject)
function scene(objs: GameObject[]): GameState {
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
const played = (bonus?: boolean): GameEvent =>
  ({ kind: 'playUnit', unit: SELF, player: P1, ...(bonus !== undefined ? { bonus } : {}) } as GameEvent)

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('三号并组;4费1蓝pip 4S;表行 = payEvents 型(无 cost 无 options 无 required)', () => {
    expect(CARD_COSTS['SFD-079']).toEqual({ mana: 4, pips: 1, colors: ['blue'] })
    expect(CARD_COSTS['SFD-228']).toEqual(CARD_COSTS['SFD-079'])
    expect(VARIANT_GROUPS['SFD-079']).toEqual(['SFD-079', 'SFD-228', 'SFD-228*'])
    expect(SFD_079.power, '上游实测 4S').toBe(4)
    expect(SFD_228.id).toBe('SFD-228')
    expect(playBonusFor('SFD-079')).toBe(SFD_079_EXTRA_COST)
    expect(playBonusFor('SFD-228'), '再版同一份').toBe(SFD_079_EXTRA_COST)
    expect(SFD_079_EXTRA_COST.required).toBeUndefined()
    expect(SFD_079_EXTRA_COST.cost).toBeUndefined()
    expect(SFD_079_EXTRA_COST.options, '传奇只有一张没得选').toBeUndefined()
    expect(SFD_079_CARD_EFFECT).toContain('开放的战场')
  })
})

describe('🔴★★★★额外费:传奇休眠(铁律70:已休眠付不出)', () => {
  test('🔴★★★available 三态:活跃 true / 已休眠 false / 没传奇 false', () => {
    const ready = scene([obj('bard', 'SFD-079'), legend('L')])
    expect(SFD_079_EXTRA_COST.available!(ready, P1)).toBe(true)
    const dorm = scene([obj('bard', 'SFD-079'), legend('L', P1, true)])
    expect(SFD_079_EXTRA_COST.available!(dorm, P1), '已休眠付不出').toBe(false)
    expect(SFD_079_EXTRA_COST.available!(scene([obj('bard', 'SFD-079')]), P1), '没传奇').toBe(false)
  })

  test('🔴★★payEvents = statusChange dormant true(打给我的传奇)', () => {
    const s = scene([obj('bard', 'SFD-079'), legend('L')])
    expect(myLegendOid(s, P1)).toBe('L')
    expect(SFD_079_EXTRA_COST.payEvents!(s, P1)).toEqual([
      { kind: 'statusChange', target: 'L', key: 'dormant', value: true },
    ])
  })
})

describe('🔴★★★★触发:选开放战场 + multiSelect 任意数量我方单位', () => {
  const trig = makeBardTrigger(SELF, P1)
                                               
  const board = (): GameState => scene([
    obj('bard', 'SFD-079', P1, BF0),
    obj('m1', 'BLK', P1, `base:${P1}`),
    obj('m2', 'BLK', P1, BF0),
    obj('foe', 'BLK', P2, `base:${P2}`),
  ])

  test('🔴★★判据:ev.bonus===true 才响', () => {
    expect(trig.filter!(played(true), board())).toBe(true)
    expect(trig.filter!(played(undefined), board()), '没付不响').toBe(false)
  })

  test('🔴★★★问1:只有【开放的】战场(有单位的 BF0 不算);全占满 ⇒ 不问', () => {
    const req = trig.nextChoice!(board(), played(true), {})
    expect(req!.key).toBe('bf')
    expect(req!.candidates.map((c) => c.id)).toEqual([BF1])
    const full = scene([obj('bard', 'SFD-079', P1, BF0), obj('x', 'BLK', P2, BF1)])
    expect(trig.nextChoice!(full, played(true), {}), '没有开放战场不问').toBeNull()
  })

  test('🔴★★★问2:候选 = 我控单位(基地+战场),敌方不进;选满可 DONE', () => {
    const req = trig.nextChoice!(board(), played(true), { bf: BF1 })
    const ids = req!.candidates.map((c) => c.id)
    expect(ids).toContain('m1')
    expect(ids).toContain('m2')
    expect(ids).toContain('bard')                    
    expect(ids).not.toContain('foe')
    expect(ids, '有 DONE 选项(任意数量含 0)').toContain(MULTI_SELECT_DONE)
  })

  test('🔴★★★effect:逐个 zoneChange+unitMoved 成对到选的战场;选 0 个 = 空', () => {
    const chosen = { bf: BF1, [`${SFD_079_PREFIX}0`]: 'm1', [`${SFD_079_PREFIX}1`]: 'm2', [`${SFD_079_PREFIX}2`]: MULTI_SELECT_DONE }
    const evs = trig.effect!(board(), played(true), chosen) as readonly { kind: string; obj?: string; unit?: string; to?: string }[]
    expect(evs).toHaveLength(4)
    expect(evs.filter((e) => e.kind === 'zoneChange').map((e) => e.obj)).toEqual(['m1', 'm2'])
    expect(evs.filter((e) => e.kind === 'unitMoved').map((e) => e.unit)).toEqual(['m1', 'm2'])
    expect(evs.every((e) => e.to === BF1)).toBe(true)
    const none = trig.effect!(board(), played(true), { bf: BF1, [`${SFD_079_PREFIX}0`]: MULTI_SELECT_DONE })
    expect(none, '选 0 个 = 一个都不移').toEqual([])
  })
})
