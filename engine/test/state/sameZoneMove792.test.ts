                                            
  
                                             
                                                                        
                                                             
                                                           
  
                                                      
                                              
                                                  
import { describe, expect, test } from 'vitest'
import { moveObject } from '../../src/state/object'
import type { GameObject } from '../../src/state/object'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'

const P1 = asPlayerId('P1')

function unit(zone: string): GameObject {
  return {
    oid: asObjId('u1'), defId: 'TEST-001', owner: P1, controller: asPlayerId('P2'), // 受控制中
    zone: asZoneId(zone), baseMight: 3, baseKeywords: [],
    damage: 2, counters: { buff: 1 }, status: { tapped: true },
  }
}

describe('★792 §124 同区移动', () => {
  test('废牌堆→废牌堆:oid 不变,§124.1 那套临时状态一样都不清', () => {
    const o = unit('discard:P1')
    const moved = moveObject(o, asZoneId('discard:P1'), 'discard', 'discard', asObjId('oNEW'))
    expect(moved.oid, '同区不成新对象 ⇒ 不换 oid').toBe(asObjId('u1'))
    expect(moved.damage, '§124.1 只在跨区时清伤害').toBe(2)
    expect(moved.counters['buff'], '增益也不该被清').toBe(1)
    expect((moved.status as { tapped?: boolean }).tapped, '横置也不该被解除').toBe(true)
    expect(moved.controller, '§124.2 受控制回归也只在跨区时发生').toBe(asPlayerId('P2'))
    expect(moved, '必须是新引用 —— 上游要写回 objects 表').not.toBe(o)
  })

  test('手牌→手牌 / 牌堆→牌堆 同理(三类非场地区都走同一条闸)', () => {
    for (const z of ['hand:P1', 'mainDeck:P1']) {
      const moved = moveObject(unit(z), asZoneId(z), 'hand', 'hand', asObjId('oNEW'))
      expect(moved.oid, `${z} 同区不该换 oid`).toBe(asObjId('u1'))
      expect(moved.damage, `${z} 同区不该清伤害`).toBe(2)
    }
  })

  test('反面:真跨区仍然换 oid + 清干净(别把总闸修成了全面豁免)', () => {
    const moved = moveObject(unit('base:P1'), asZoneId('discard:P1'), 'base', 'discard', asObjId('oNEW'))
    expect(moved.oid, '跨非场地边界 ⇒ §124 新对象').toBe(asObjId('oNEW'))
    expect(moved.damage).toBe(0)
    expect(moved.counters).toEqual({})
    expect(moved.status).toEqual({})
    expect(moved.controller, '§124.2 回归拥有者').toBe(P1)
  })

  test('反面:场地↔场地(游走)照旧不换 oid、不清状态', () => {
    const moved = moveObject(unit('base:P1'), asZoneId('battlefield:shared:0'), 'base', 'battlefield', asObjId('oNEW'))
    expect(moved.oid).toBe(asObjId('u1'))
    expect(moved.damage, '§810 游走不是跨界,伤害跟着走').toBe(2)
    expect(moved.zone).toBe(asZoneId('battlefield:shared:0'))
  })
})
