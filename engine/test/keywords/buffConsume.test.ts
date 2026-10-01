import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { buffCount, buffedUnitsOf, canConsumeBuff, consumeBuffInState } from '../../src/keywords/buff'
import { effectiveMight } from '../../src/state/might'

                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, buffs = 0, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0,
    counters: buffs > 0 ? { buff: buffs } : {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}

describe('§702.2.b 消耗 = 移除【单个】增益指示物', () => {
  test('有一枚 → 消耗后归零', () => {
    const s = consumeBuffInState(scene(obj('u', 1)), asObjId('u'))
    expect(buffCount(s.objects['u' as never])).toBe(0)
  })

  test('★有两枚只消耗【一枚】(原文"单个",不是清空)', () => {
    const s = consumeBuffInState(scene(obj('u', 2)), asObjId('u'))
    expect(buffCount(s.objects['u' as never])).toBe(1)
  })

  test('归零后把计数标键摘掉,不留 0 值脏数据', () => {
    const s = consumeBuffInState(scene(obj('u', 1)), asObjId('u'))
    expect(s.objects['u' as never]!.counters).toEqual({})
  })
})

describe('§702.2.b.1/§702.2.b.2 两条限制', () => {
  test('§702.2.b.1 没有增益 → 无法消耗,返回【原引用】(调用方据此判"没付成")', () => {
    const s0 = scene(obj('u', 0))
    expect(consumeBuffInState(s0, asObjId('u'))).toBe(s0)
  })

  test('§702.2.b.2 只能消耗【自己控制的】单位身上的', () => {
    const s0 = scene(obj('theirs', 1, { controller: P2 }))
    expect(consumeBuffInState(s0, asObjId('theirs'), P1)).toBe(s0)          
    expect(consumeBuffInState(s0, asObjId('theirs'), P2)).not.toBe(s0)         
  })

  test('不传 by = 引擎内部调用,不做控制权校验', () => {
    const s0 = scene(obj('theirs', 1, { controller: P2 }))
    expect(buffCount(consumeBuffInState(s0, asObjId('theirs')).objects['theirs' as never])).toBe(0)
  })

  test('物件不存在 → 无操作', () => {
    const s0 = scene()
    expect(consumeBuffInState(s0, asObjId('nope'))).toBe(s0)
  })

  test('canConsumeBuff 与原语判据一致', () => {
    const s = scene(obj('mine', 1), obj('empty', 0), obj('theirs', 1, { controller: P2 }))
    expect(canConsumeBuff(s, asObjId('mine'), P1)).toBe(true)
    expect(canConsumeBuff(s, asObjId('empty'), P1)).toBe(false)
    expect(canConsumeBuff(s, asObjId('theirs'), P1)).toBe(false)
  })
})

describe('buffedUnitsOf 候选枚举', () => {
  test('只列自己控制的、身上真有增益的', () => {
    const s = scene(obj('a', 1), obj('b', 0), obj('c', 2), obj('t', 1, { controller: P2 }))
    expect(buffedUnitsOf(s, P1)).toEqual(['a', 'c'])
  })

  test('★顺序稳定(同一态下枚举出的动作列表不能抖,否则 replay/投影会飘)', () => {
    const s = scene(obj('z', 1), obj('a', 1), obj('m', 1))
    expect(buffedUnitsOf(s, P1)).toEqual(['a', 'm', 'z'])
  })
})

describe('consumeBuff 事件走 applyEvents', () => {
  test('事件落地 = 少一枚增益', () => {
    const s = applyEvents(scene(obj('u', 1)), [{ kind: 'consumeBuff', target: asObjId('u') }]).state
    expect(buffCount(s.objects['u' as never])).toBe(0)
  })

  test('★§703 少一枚增益 = 少 1 战力,且【会重跑清理】——掉到致命就当场死', () => {
                                                     
    const s0 = scene(obj('u', 1))
    const damaged = applyEvents(s0, [{ kind: 'damage', target: asObjId('u'), amount: 2 }]).state
    expect(effectiveMight(damaged.objects['u' as never]!).reference).toBe(3)
    expect(damaged.objects['u' as never]).toBeDefined()       
    const after = applyEvents(damaged, [{ kind: 'consumeBuff', target: asObjId('u') }]).state
    expect(after.objects['u' as never]).toBeUndefined()                   
  })

  test('§702.2.b.2 事件带 by 时同样校验控制权', () => {
    const s0 = scene(obj('t', 1, { controller: P2 }))
    const s = applyEvents(s0, [{ kind: 'consumeBuff', target: asObjId('t'), by: P1 }]).state
    expect(buffCount(s.objects['t' as never])).toBe(1)         
  })
})
