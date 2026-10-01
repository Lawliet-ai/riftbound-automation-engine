import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { grantBuffInState, hasBuff, buffCount } from '../../src/keywords/buff'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const OID = asObjId('u')

function obj(extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: OID, defId: 'BLK', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'),
    baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(o: GameObject): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, objects: { u: o } }
}
const mightOf = (s: GameState): number => effectiveMight(recomputeContinuous(s).objects['u']!).reference

describe('§426 给予增益 / §701-705 增益计数标', () => {
  test('§426.1.b 给予增益 → 单位拥有一枚增益', () => {
    const s = grantBuffInState(scene(obj()), OID)
    expect(hasBuff(s.objects['u'])).toBe(true)
    expect(buffCount(s.objects['u'])).toBe(1)
  })

  test('§702.3 每名单位同时只能拥有一个;§426.1.c 再给不会额外获得(返回原引用)', () => {
    const once = grantBuffInState(scene(obj()), OID)
    const twice = grantBuffInState(once, OID)
    expect(twice).toBe(once)                   
    expect(buffCount(twice.objects['u'])).toBe(1)
  })

  test('§703 每枚增益单独提供 +1 战力', () => {
    const s = grantBuffInState(scene(obj()), OID)
    expect(mightOf(s)).toBe(4)         
  })

  test('§426.1.b.2 多次权限长在【物体】上:有权限的单位可叠到上限,每枚各 +1', () => {
                                                 
    let s = scene(obj({ derived: { buffLimit: 3 } as never }))
    s = grantBuffInState(s, OID)
    s = grantBuffInState(s, OID)
    s = grantBuffInState(s, OID)
    expect(buffCount(s.objects['u'])).toBe(3)
    expect(mightOf(s)).toBe(6)             
    expect(grantBuffInState(s, OID)).toBe(s)           
  })

  test('§426.1.b.2 权限【不】由调用方携带:外部增益源打到有权限的单位上照样能叠', () => {
                                                             
                              
    let s = scene(obj({ derived: { buffLimit: 2 } as never }))
    s = grantBuffInState(s, OID)          
    s = grantBuffInState(s, OID)                             
    expect(buffCount(s.objects['u'])).toBe(2)
  })

  test('§476.3 增益消失战力必须【同步回落】,不能悬停', () => {
    const on = grantBuffInState(scene(obj()), OID)
    expect(mightOf(on)).toBe(4)
    const off: GameState = { ...on, objects: { u: { ...on.objects['u']!, counters: {} } } }
    expect(mightOf(off)).toBe(3)
  })

  test('无增益的单位不受影响', () => {
    expect(mightOf(scene(obj()))).toBe(3)
    expect(hasBuff(scene(obj()).objects['u'])).toBe(false)
  })

  test('不存在的物件:安全返回原引用', () => {
    const before = scene(obj())
    expect(grantBuffInState(before, asObjId('nope'))).toBe(before)
  })
})
