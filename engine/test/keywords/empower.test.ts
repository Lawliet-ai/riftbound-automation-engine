import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { empower, disempower, isEmpowered, empowerCount } from '../../src/keywords/empower'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const OID = asObjId('u')

function obj(zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: OID, defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  }
}

function scene(o: GameObject): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, objects: { u: o } }
}

describe('§441 强化 / §442 解除强化', () => {
  test('§441.1 场上物件被强化 → 进入已强化状态', () => {
    const s = empower(scene(obj('base:P1')), OID)
    expect(isEmpowered(s.objects['u'])).toBe(true)
  })

  test('§441.1.b/§441.1.c 已强化的再被指示强化:不发生任何事(返回【原引用】供调用方判无操作)', () => {
    const once = empower(scene(obj('base:P1')), OID)
    const twice = empower(once, OID)
    expect(twice).toBe(once)                     
    expect(empowerCount(twice.objects['u'])).toBe(1)
  })

  test('§441.1.c.1 上限挂在【物件】上:有多次权限的物件可叠到上限', () => {
                                               
    const kayle = obj('battlefield:shared:0', { derived: { empowerLimit: 3 } as never })
    let s = scene(kayle)
    s = empower(s, OID); s = empower(s, OID); s = empower(s, OID)
    expect(empowerCount(s.objects['u'])).toBe(3)
    const over = empower(s, OID)
    expect(over).toBe(s)           
  })

  test('§441.1.c.1 权限【不】由发起方携带:外部强化源打到有权限的物件上照样能叠', () => {
                                                  
                                             
    const kayle = obj('base:P1', { derived: { empowerLimit: 2 } as never })
    let s = empower(scene(kayle), OID)                
    s = empower(s, OID)                                             
    expect(empowerCount(s.objects['u'])).toBe(2)
  })

  test('§441.2 只有【场上】物件能持有:手牌/废牌堆里的牌强化无效', () => {
    for (const z of ['hand:P1', 'discard:P1', 'mainDeck:P1', 'exile:P1']) {
      const before = scene(obj(z))
      expect(empower(before, OID)).toBe(before)
      expect(isEmpowered(empower(before, OID).objects['u'])).toBe(false)
    }
  })

                                                                     
                                                                               
                                                                                    
                                                                            
  test('§441.2 场上:基地/战场/传奇能持有;待命区(正面朝下、未打出)不能 —— ★1571 缺陷 206', () => {
    for (const z of ['base:P1', 'battlefield:shared:0', 'legend:P1']) {
      const s = empower(scene(obj(z)), OID)
      expect(isEmpowered(s.objects['u']), `★${z}`).toBe(true)
    }
    const before = scene(obj('standby:shared:0'))
    expect(empower(before, OID), '★待命区:无操作,返回原引用').toBe(before)
  })

  test('§442.1 解除强化 → 移除已强化状态', () => {
    const on = empower(scene(obj('base:P1')), OID)
    const off = disempower(on, OID)
    expect(isEmpowered(off.objects['u'])).toBe(false)
  })

  test('§442.1.a.1 解除一个未强化的物件:不产生任何效果(返回原引用)', () => {
    const before = scene(obj('base:P1'))
    expect(disempower(before, OID)).toBe(before)
  })

  test('🔴★★★★★★多层被解除时【减一】—— 官方 2026-08-13 给了判例,原先的「归零」是错的', () => {
                                                    
                                                            
                                    
                                      
                                      
    const kayle = obj('base:P1', { derived: { empowerLimit: 3 } as never })
    let s = scene(kayle)
    s = empower(s, OID); s = empower(s, OID); s = empower(s, OID)
    expect(empowerCount(s.objects['u'])).toBe(3)

    const once = disempower(s, OID)
    expect(empowerCount(once.objects['u']), '★★★一次只掉一层,不是归零').toBe(2)

                                                 
    const twice = disempower(once, OID)
    expect(empowerCount(twice.objects['u'])).toBe(1)
    const thrice = disempower(twice, OID)
    expect(empowerCount(thrice.objects['u']), '★第三次才归零').toBe(0)
    expect(disempower(thrice, OID), '★★到 0 之后再解除:§442.1.a.1 无操作、返回原引用').toBe(thrice)
  })

  test('🔴★★★★★二元档(缺省 limit=1)一字不变:解一次就没了', () => {
                                                      
    let s = scene(obj('base:P1'))
    s = empower(s, OID)
    expect(empowerCount(s.objects['u'])).toBe(1)
    expect(empowerCount(disempower(s, OID).objects['u'])).toBe(0)
  })

  test('不存在的物件:安全返回原引用', () => {
    const before = scene(obj('base:P1'))
    expect(empower(before, asObjId('nope'))).toBe(before)
    expect(disempower(before, asObjId('nope'))).toBe(before)
  })
})
