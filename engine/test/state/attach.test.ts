import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { attachCard, detachCard, attachedTo, attachmentsOf, canAttach } from '../../src/state/attach'
import { isUnit, isEquipment, typesOf } from '../../src/state/cardTypes'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  }
}

function scene(objs: Record<string, GameObject>): GameState {
  const base = createInitialState([P1, P2], 2)
  const zones = { ...base.zones }
  for (const o of Object.values(objs)) {
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects: objs, zones }
}

const contentsOf = (s: GameState, z: string): string[] => (s.zones[z]?.contents ?? []) as unknown as string[]

describe('§434 贴附 / 卸除', () => {
  test('§434.1 贴附把已贴附卡与顶部卡牌连起来', () => {
    const s = attachCard(scene({ eq: obj('eq', 'base:P1'), u: obj('u', BF0) }), asObjId('eq'), asObjId('u'))
    expect(attachedTo(s.objects['eq'])).toBe('u')
    expect(attachmentsOf(s, asObjId('u')).map((o) => o.oid)).toEqual(['eq'])
  })

  test('§434.4 位置变为与顶部卡牌相同(区域 contents 同步)', () => {
    const s = attachCard(scene({ eq: obj('eq', 'base:P1'), u: obj('u', BF0) }), asObjId('eq'), asObjId('u'))
    expect(s.objects['eq']!.zone).toBe(BF0)
    expect(contentsOf(s, BF0)).toContain('eq')
    expect(contentsOf(s, 'base:P1')).not.toContain('eq')
  })

  test('§446.1 贴附导致的位置变更【不是移动】:oid 不变(没走 §124 跨界换 oid)', () => {
    const s = attachCard(scene({ eq: obj('eq', 'base:P1'), u: obj('u', BF0) }), asObjId('eq'), asObjId('u'))
    expect(s.objects['eq']).toBeDefined()                     
    expect(s.objects['eq']!.oid).toBe('eq')
  })

  test('§434.5/§719.4 除贴附关系与位置外其余状态一概不动(休眠装备贴附后仍休眠)', () => {
    const s = attachCard(
      scene({ eq: obj('eq', 'base:P1', { status: { dormant: true } }), u: obj('u', BF0) }),
      asObjId('eq'), asObjId('u'),
    )
    expect(s.objects['eq']!.status.dormant).toBe(true)
    expect(s.objects['u']!.status.dormant).toBeUndefined()               
  })

  test('§434.1.g 贴附到【当前】顶部卡牌:不产生任何效果(返回原引用)', () => {
    const once = attachCard(scene({ eq: obj('eq', 'base:P1'), u: obj('u', BF0) }), asObjId('eq'), asObjId('u'))
    expect(attachCard(once, asObjId('eq'), asObjId('u'))).toBe(once)
  })

  test('§434.1.f 贴到新顶部卡牌会从旧的上面卸除', () => {
    let s = scene({ eq: obj('eq', 'base:P1'), a: obj('a', BF0), b: obj('b', 'battlefield:shared:1') })
    s = attachCard(s, asObjId('eq'), asObjId('a'))
    s = attachCard(s, asObjId('eq'), asObjId('b'))
    expect(attachedTo(s.objects['eq'])).toBe('b')
    expect(attachmentsOf(s, asObjId('a'))).toHaveLength(0)
    expect(s.objects['eq']!.zone).toBe('battlefield:shared:1')
  })

  test('§434.1 两张都必须在【场上】:手牌/废牌堆里的不能贴附', () => {
    const s = scene({ eq: obj('eq', 'hand:P1'), u: obj('u', BF0) })
    expect(canAttach(s, asObjId('eq'), asObjId('u'))).toBe(false)
    expect(attachCard(s, asObjId('eq'), asObjId('u'))).toBe(s)
  })

  test('不能贴附到自己身上', () => {
    const s = scene({ u: obj('u', BF0) })
    expect(canAttach(s, asObjId('u'), asObjId('u'))).toBe(false)
  })

  test('卸除:清掉贴附关系,位置保持不变;未贴附时无操作', () => {
    const on = attachCard(scene({ eq: obj('eq', 'base:P1'), u: obj('u', BF0) }), asObjId('eq'), asObjId('u'))
    const off = detachCard(on, asObjId('eq'))
    expect(attachedTo(off.objects['eq'])).toBeUndefined()
    expect(off.objects['eq']!.zone).toBe(BF0)              
    expect(detachCard(off, asObjId('eq'))).toBe(off)            
  })
})

describe('§178 类型谓词(卡无关,缺省回落推断)', () => {
  test('未登记 baseTypes 时:rune: 前缀判符文,其余按单位', () => {
    expect(isUnit(obj('u', BF0))).toBe(true)
    expect(isUnit(obj('r', 'base:P1', { defId: 'rune:blue' }))).toBe(false)
  })

  test('§178.1.a.1 类型是【集合】:可以同时是单位和装备', () => {
    const both = obj('x', BF0, { baseTypes: ['unit', 'equipment'] } as never)
    expect(isUnit(both)).toBe(true)
    expect(isEquipment(both)).toBe(true)
    expect(typesOf(both)).toEqual(['unit', 'equipment'])
  })

  test('纯装备不是单位(战斗/控制权判定要靠这条把装备排除掉)', () => {
    const eq = obj('e', BF0, { baseTypes: ['equipment'] } as never)
    expect(isUnit(eq)).toBe(false)
    expect(isEquipment(eq)).toBe(true)
  })
})
