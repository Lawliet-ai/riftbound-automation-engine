import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { empowerCount } from '../../src/keywords/empower'
import { buffCount } from '../../src/keywords/buff'
import { layerOf } from '../../src/effects/continuousView'

                                                      
                                                                   
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], limits: { empower?: number; buff?: number; on?: string } = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const effects = []
  const target = limits.on ?? 'u'
  if (limits.empower !== undefined) {
    effects.push({
      id: 'lim:e', duration: 'permanent' as const, fromPassive: true, timestamp: 1,
      predicate: (x: GameObject) => (x.oid as string) === target,
      modification: { kind: 'setLimit' as const, limit: 'empower' as const, value: limits.empower },
    })
  }
  if (limits.buff !== undefined) {
    effects.push({
      id: 'lim:b', duration: 'permanent' as const, fromPassive: true, timestamp: 2,
      predicate: (x: GameObject) => (x.oid as string) === target,
      modification: { kind: 'setLimit' as const, limit: 'buff' as const, value: limits.buff },
    })
  }
  return { ...base, activePlayer: P1, objects, zones, continuousEffects: effects as never }
}
const empowerN = (s: GameState, id: string, n: number): GameState => {
  let out = s
  for (let i = 0; i < n; i++) out = applyEvents(out, [{ kind: 'empower', target: asObjId(id) }]).state
  return out
}

describe('setLimit 归属第 §477.2 技能层', () => {
  test('层归属正确(给权限属技能层,不是数值层)', () => {
    expect(layerOf({ kind: 'setLimit', limit: 'empower', value: 3 })).toBe('ability')
  })
})

describe('★§441.1.c.1 多次强化权限(此前无通道,凯尔 VEN-134 那类卡实现不了)', () => {
  test('没有权限 → 缺省上限 1', () => {
    const s = empowerN(scene([obj('u')]), 'u', 5)
    expect(empowerCount(s.objects['u' as never])).toBe(1)
  })

  test('★给了 3 层权限 → 能叠到 3,再多不叠', () => {
    const s = empowerN(scene([obj('u')], { empower: 3 }), 'u', 5)
    expect(empowerCount(s.objects['u' as never])).toBe(3)
  })

  test('★权限长在【那个物件】身上:同场另一个没权限的仍是 1', () => {
    let s = scene([obj('u'), obj('other')], { empower: 3, on: 'u' })
    s = empowerN(s, 'u', 5)
    s = empowerN(s, 'other', 5)
    expect(empowerCount(s.objects['u' as never])).toBe(3)
    expect(empowerCount(s.objects['other' as never])).toBe(1)
  })

  test('权限只放宽不收紧:给 value=1 也不会把缺省压到 0', () => {
    const s = empowerN(scene([obj('u')], { empower: 1 }), 'u', 3)
    expect(empowerCount(s.objects['u' as never])).toBe(1)
  })
})

describe('§426.1.b.2 多次增益权限(同一条通道)', () => {
  test('没有权限 → 缺省上限 1', () => {
    let s = scene([obj('u')])
    for (let i = 0; i < 4; i++) s = applyEvents(s, [{ kind: 'grantBuff', target: asObjId('u') }]).state
    expect(buffCount(s.objects['u' as never])).toBe(1)
  })

  test('★给了 3 层权限 → 能叠到 3', () => {
    let s = scene([obj('u')], { buff: 3 })
    for (let i = 0; i < 5; i++) s = applyEvents(s, [{ kind: 'grantBuff', target: asObjId('u') }]).state
    expect(buffCount(s.objects['u' as never])).toBe(3)
  })

  test('两种权限互不串台:只给强化权限,增益仍是 1', () => {
    let s = scene([obj('u')], { empower: 3 })
    for (let i = 0; i < 4; i++) s = applyEvents(s, [{ kind: 'grantBuff', target: asObjId('u') }]).state
    expect(buffCount(s.objects['u' as never])).toBe(1)
  })
})
