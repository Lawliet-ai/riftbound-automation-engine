import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId } from '../src/state/ids'
import { createInitialState, zonesByKind } from '../src/state/gameState'
import {
  isOrderedZone,
  isPositionKind,
  setStandbyCapacity,
  STANDBY_DEFAULT_CAPACITY,
  zoneCategory,
  type Zone,
} from '../src/state/zones'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

describe('区域分类(§106-108,DK-13)', () => {
  test('场地:基地/战场/待命区/传奇区', () => {
    expect(zoneCategory('base')).toBe('fielded')
    expect(zoneCategory('battlefield')).toBe('fielded')
    expect(zoneCategory('standby')).toBe('fielded')
    expect(zoneCategory('legend')).toBe('fielded')                      
  })

  test('非场地 7 类', () => {
    for (const k of ['chain', 'discard', 'heroZone', 'mainDeck', 'runeDeck', 'exile', 'hand'] as const) {
      expect(zoneCategory(k)).toBe('non-fielded')
    }
  })

  test('只有牌堆有序', () => {
    expect(isOrderedZone('mainDeck')).toBe(true)
    expect(isOrderedZone('runeDeck')).toBe(true)
    expect(isOrderedZone('hand')).toBe(false)
    expect(isOrderedZone('discard')).toBe(false)
  })
})

describe('位置语义(§107.3.e,DK-15)', () => {
  test('只有基地/战场是位置;待命区与传奇区不是', () => {
    expect(isPositionKind('base')).toBe(true)
    expect(isPositionKind('battlefield')).toBe(true)
    expect(isPositionKind('standby')).toBe(false)                      
    expect(isPositionKind('legend')).toBe(false)
  })
})

describe('标准区域拓扑', () => {
  const state = createInitialState([P1, P2], 3)

  test('每处战场带一个待命区子区(§107.3.a)', () => {
    const battlefields = zonesByKind(state, 'battlefield')
    const standbys = zonesByKind(state, 'standby')
    expect(battlefields).toHaveLength(3)
    expect(standbys).toHaveLength(3)
                                       
    const bfIds = new Set(battlefields.map((b) => b.id))
    for (const sb of standbys) {
      expect(sb.parentBattlefield).toBeDefined()
      expect(bfIds.has(sb.parentBattlefield!)).toBe(true)
      expect(sb.capacity).toBe(STANDBY_DEFAULT_CAPACITY)                   
    }
  })

  test('每玩家有基地/传奇区各1,非场地各1(chain 共有)', () => {
    expect(zonesByKind(state, 'base')).toHaveLength(2)
    expect(zonesByKind(state, 'legend')).toHaveLength(2)
    expect(zonesByKind(state, 'hand')).toHaveLength(2)
    expect(zonesByKind(state, 'chain')).toHaveLength(1)         
    expect(zonesByKind(state, 'chain')[0]!.owner).toBeNull()
  })
})

describe('待命区容量(§107.3.b/b.1/b.2,DK-15)', () => {
  const mkStandby = (contents: string[], capacity: number): Zone => ({
    id: 'standby:shared:0' as Zone['id'],
    kind: 'standby',
    owner: null,
    contents: contents.map(asObjId),
    parentBattlefield: 'battlefield:shared:0' as Zone['id'],
    capacity,
  })

  test('容量可增(§107.3.b.1),无 overflow', () => {
    const z = mkStandby(['a'], 1)
    const { zone, overflow } = setStandbyCapacity(z, 2)
    expect(zone.capacity).toBe(2)
    expect(overflow).toHaveLength(0)
    expect(zone.contents).toHaveLength(1)
  })

  test('缩容到低于现有数量,差额进废牌堆(§107.3.b.2)', () => {
    const z = mkStandby(['a', 'b'], 2)
    const { zone, overflow } = setStandbyCapacity(z, 1)
    expect(zone.capacity).toBe(1)
    expect(zone.contents).toEqual([asObjId('a')])
    expect(overflow).toEqual([asObjId('b')])                      
  })

  test('非待命区调用抛错', () => {
    const bad: Zone = { id: 'hand:P1' as Zone['id'], kind: 'hand', owner: P1, contents: [] }
    expect(() => setStandbyCapacity(bad, 2)).toThrow()
  })
})
