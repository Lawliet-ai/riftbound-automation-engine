import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import {
  crossesNonFieldBoundary,
  moveObject,
  type GameObject,
} from '../src/state/object'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function mkUnit(over: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId('o1'),
    defId: 'UNIT_X',
    owner: P1,
    controller: P2, // 被对手夺控中,验证跨区回归拥有者
    zone: asZoneId('battlefield:shared:0'),
    baseMight: 3,
    damage: 2,
    counters: { buff: 1, exp: 2 },
    status: { ready: true, stunned: true, tempKeywords: ['迅捷'] },
    ...over,
  }
}

describe('跨非场地边界判定(§124,DK-14)', () => {
  test('到非场地 / 从非场地 = 跨界', () => {
    expect(crossesNonFieldBoundary('battlefield', 'hand')).toBe(true)
    expect(crossesNonFieldBoundary('hand', 'battlefield')).toBe(true)
    expect(crossesNonFieldBoundary('discard', 'base')).toBe(true)
  })
  test('场地↔场地(游走)不跨界', () => {
    expect(crossesNonFieldBoundary('battlefield', 'battlefield')).toBe(false)
    expect(crossesNonFieldBoundary('battlefield', 'base')).toBe(false)
    expect(crossesNonFieldBoundary('base', 'legend')).toBe(false)
  })
})

describe('移动:游走 vs 跨界(§124/§124.1)', () => {
  test('游走(战场→战场):保留 oid 与临时状态', () => {
    const u = mkUnit()
    const moved = moveObject(u, asZoneId('battlefield:shared:1'), 'battlefield', 'battlefield', asObjId('oNEW'))
    expect(moved.oid).toBe(asObjId('o1'))          
    expect(moved.damage).toBe(2)        
    expect(moved.counters).toEqual({ buff: 1, exp: 2 })         
    expect(moved.status.stunned).toBe(true)          
    expect(moved.controller).toBe(P2)         
    expect(moved.zone).toBe(asZoneId('battlefield:shared:1'))
  })

  test('跨界(战场→手牌):换 oid,清临时状态,回归拥有者控制', () => {
    const u = mkUnit()
    const moved = moveObject(u, asZoneId('hand:P1'), 'battlefield', 'hand', asObjId('oNEW'))
    expect(moved.oid).toBe(asObjId('oNEW'))               
    expect(moved.damage).toBe(0)               
    expect(moved.counters).toEqual({})                
    expect(moved.status).toEqual({})                 
    expect(moved.controller).toBe(P1)                      
    expect(moved.defId).toBe('UNIT_X')        
    expect(moved.owner).toBe(P1)         
  })

  test('跨界(手牌→战场):同样换 oid 并清临时状态', () => {
    const u = mkUnit({ zone: asZoneId('hand:P1') })
    const moved = moveObject(u, asZoneId('battlefield:shared:0'), 'hand', 'battlefield', asObjId('oNEW'))
    expect(moved.oid).toBe(asObjId('oNEW'))
    expect(moved.damage).toBe(0)
    expect(moved.status).toEqual({})
  })
})

                                                          
                                                           
                                                               
                                                                  
