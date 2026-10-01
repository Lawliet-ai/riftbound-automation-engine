import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKind, playBonusFor } from '../../data/registry'
import {
  VEN_101, VEN_101_CARD_EFFECT, VEN_101_EXTRA_COST, makeWindMonkTrigger, allUnitsOnField101,
} from '../../data/cards/play-extra-cost'
                                                                           
import { allDiscards } from '../../src/keywords/insight'

                                      
                                                    
                                                           
                                                 
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('monk')

function obj(oid: string, defId: string, ctrl = P1, zone = BF0, types: readonly string[] = ['unit']): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as GameObject
}
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
  test('2费0pip 紫 2S;表行 = cost {mana:1}、无 required 无 events(收益走触发 ㉙)', () => {
    expect(CARD_COSTS['VEN-101']).toEqual({ mana: 2, pips: 0, colors: ['purple'] })
    expect(cardKind('VEN-101')).toBe('unit')
    expect(VEN_101.power, '上游实测 2S').toBe(2)
    expect(playBonusFor('VEN-101')).toBe(VEN_101_EXTRA_COST)
    expect(VEN_101_EXTRA_COST.required).toBeUndefined()
    expect(VEN_101_EXTRA_COST.cost).toEqual({ mana: 1 })
    expect(VEN_101_EXTRA_COST.events).toBeUndefined()
    expect(VEN_101_CARD_EFFECT).toContain('强攻2')
  })
})

describe('🔴★★★★两问与效果', () => {
  const board = (): GameState => scene([
    obj('monk', 'VEN-101', P1, BF0),
    obj('foe', 'BLK', P2, BF0),
    obj('d1', 'BLK', P1, `discard:${P1}`),
    obj('d2', 'BLK', P2, `discard:${P2}`),
  ])
  const trig = makeWindMonkTrigger(SELF, P1)

  test('🔴★★判据:ev.bonus===true 才响', () => {
    expect(trig.filter!(played(true), board())).toBe(true)
    expect(trig.filter!(played(undefined), board()), '没付不响').toBe(false)
  })

  test('🔴★★★问1「任意废牌堆」= 双方并集(跨玩家);双方全空 ⇒ 不问', () => {
    const req = trig.nextChoice!(board(), played(true), {})
    expect(req!.key).toBe('card')
    expect(req!.candidates.map((c) => c.id).sort(), '双方废牌堆都在候选里').toEqual(['d1', 'd2'])
    const empty = scene([obj('monk', 'VEN-101', P1, BF0)])
    expect(trig.nextChoice!(empty, played(true), {}), '全空不问').toBeNull()
  })

  test('🔴★★★问2「一名单位」= 全场不分敌我、不排除自己(逐字口径)', () => {
    const req = trig.nextChoice!(board(), played(true), { card: 'd1' })
    expect(req!.key).toBe('unit')
    expect(req!.candidates.map((c) => c.id).sort(), '敌我+自己都在').toEqual(['foe', 'monk'])
  })

  test('🔴★★★effect:banish(by=我)+ 强攻2 thisTurn(addEffect 包装,授予给敌方也行)', () => {
    const evs = trig.effect!(board(), played(true), { card: 'd2', unit: 'foe' }) as unknown as readonly {
      kind: string; target?: string; by?: string; effect?: { duration: string; modification: { kind: string; keyword: string } }
    }[]
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'banish', target: 'd2', by: 'monk' })
    expect(evs[1]!.kind).toBe('addEffect')
    expect(evs[1]!.effect!.duration, '本回合内').toBe('thisTurn')
    expect(evs[1]!.effect!.modification).toEqual({ kind: 'grantKeyword', keyword: '强攻2' })
  })

  test('🔴★★依赖结构:牌没了 ⇒ 整条不执行;单位没了 ⇒ 只放逐', () => {
    expect(trig.effect!(board(), played(true), { card: 'gone', unit: 'foe' }), '牌没了').toEqual([])
    const evs = trig.effect!(board(), played(true), { card: 'd1', unit: 'gone' })
    expect(evs).toHaveLength(1)
    expect((evs[0] as { kind: string }).kind, '只剩放逐').toBe('banish')
  })

  test('★候选工具单元:allDiscards 只收 discard 区(★1517 从同名的 anyDiscardCards 改过来);allUnitsOnField101 不收装备/手牌', () => {
    const s = scene([
      obj('monk', 'VEN-101', P1, BF0),
      obj('h', 'BLK', P1, `hand:${P1}`),
      obj('g', 'SFD-150', P1, BF0, ['equipment']),
      obj('d1', 'BLK', P1, `discard:${P1}`),
    ])
    expect(allDiscards(s), '手牌/场上不进废牌堆候选').toEqual(['d1'])
    expect(allUnitsOnField101(s), '装备/手牌不进单位候选').toEqual(['monk'])
  })
})
