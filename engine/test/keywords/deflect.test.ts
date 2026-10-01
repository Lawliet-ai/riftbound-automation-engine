import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { deflectSurcharge, deflectValue, totalDeflectSurcharge } from '../../src/keywords/deflect'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(id: string, ctrl: typeof P1, keywords: string[]): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId('battlefield:shared:0'), baseKeywords: keywords, baseMight: 3, damage: 0, counters: {}, status: {} }
}
function withObj(o: GameObject): GameState {
  return { ...createInitialState([P1, P2]), objects: { [o.oid]: o } }
}

describe('法盾值 §809.1.b/§809.2', () => {
  test('"法盾"=1(§809.1.b.3 X缺省1)', () => {
    expect(deflectValue(obj('a', P1, ['法盾']))).toBe(1)
  })
  test('"法盾2"=2', () => {
    expect(deflectValue(obj('a', P1, ['法盾2']))).toBe(2)
  })
  test('§809.2 多来源相加', () => {
    expect(deflectValue(obj('a', P1, ['法盾', '法盾2']))).toBe(3)
  })
  test('无法盾=0', () => {
    expect(deflectValue(obj('a', P1, ['据守']))).toBe(0)
  })
})

describe('法盾额外费用 §809.1.c(费用tax非免疫)', () => {
  test('对手将其选为目标 → 额外费用=法盾值', () => {
    const s = withObj(obj('t', P1, ['法盾2']))            
    expect(deflectSurcharge(s, asObjId('t'), P2)).toBe(2)                    
  })
  test('§809.1.c "由对手控制":自己选自己的法盾单位不加费', () => {
    const s = withObj(obj('t', P1, ['法盾2']))
    expect(deflectSurcharge(s, asObjId('t'), P1)).toBe(0)               
  })
  test('§766-767 抑制 → 额外费用0', () => {
    const s = withObj(obj('t', P1, ['法盾2']))
    expect(deflectSurcharge(s, asObjId('t'), P2, true)).toBe(0)
  })
  test('§197 星落式:同一法盾单位被选两次 → 付两次(per-target非去重)', () => {
    const s = withObj(obj('t', P1, ['法盾']))
    expect(totalDeflectSurcharge(s, [asObjId('t'), asObjId('t')], P2)).toBe(2)           
  })
})
