import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { assertStructuralInvariants } from '../../src/test/invariants'

                                                   
                                                              
                               
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                                       
function goodState(): GameState {
  const base = createInitialState([P1, P2], 2)
  const o = {
    oid: asObjId('u1'), defId: 'D', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, objects: { u1: o },
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: [...z.contents, o.oid] } },
  } as GameState
}

describe('★944 结构性不变量', () => {
  test('合法态不抛', () => {
    expect(() => assertStructuralInvariants(goodState())).not.toThrow()
  })

  test('物件在两个区的 contents 里同时出现 ⇒ 抛(移区忘了从旧区摘掉的典型形态)', () => {
    const s = goodState()
    const other = asZoneId('base:P1')
    const z = s.zones[other]!
    const bad = { ...s, zones: { ...s.zones, [other]: { ...z, contents: [...z.contents, asObjId('u1')] } } }
    expect(() => assertStructuralInvariants(bad as GameState)).toThrow(/同时挂在/)
  })

  test('物件的 zone 字段与收着它的区对不上 ⇒ 抛(只改了一半的移区)', () => {
    const s = goodState()
    const bad = { ...s, objects: { u1: { ...s.objects.u1!, zone: asZoneId('base:P1') } } }
    expect(() => assertStructuralInvariants(bad as GameState)).toThrow(/zone 字段/)
  })

  test('区里列了不存在的 oid ⇒ 抛(物件已删但索引没清)', () => {
    const s = goodState()
    const bad = { ...s, objects: {} }
    expect(() => assertStructuralInvariants(bad as GameState)).toThrow(/不存在的 oid/)
  })

  test('派生战力非有限数 ⇒ 抛(NaN/Infinity 会一路静默传染到分伤和胜负判定)', () => {
    const s = goodState()
    const o = s.objects.u1!
    const bad = { ...s, objects: { u1: { ...o, derived: { might: Number.NaN, keywords: [], restrictions: [], controller: P1 } } } }
    expect(() => assertStructuralInvariants(bad as GameState)).toThrow(/非有限数/)
  })
})
