import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { assignDamage } from '../src/combat/damageAssign'
import { runCombat } from '../src/combat/battle'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function u(id: string, ctrl: typeof P1, might: number, over: Partial<GameObject> = {}): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(BF0), baseMight: might, damage: 0, counters: {}, status: {}, ...over }
}
function place(units: GameObject[]): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const z = base.zones[BF0]!
  for (const o of units) objects[o.oid] = o
  return { ...base, objects, zones: { ...base.zones, [BF0]: { ...z, contents: units.map((o) => o.oid) } } }
}

describe('§465.2.c 伤害分配', () => {
  test('§465.2.c.3/.4:3伤害对两个2战力单位 → 2+1(先致命,不超最小)', () => {
    const m = assignDamage(3, [
      { oid: asObjId('a'), lethalNeeded: 2 },
      { oid: asObjId('b'), lethalNeeded: 2 },
    ])
    expect(m.get(asObjId('a'))).toBe(2)          
    expect(m.get(asObjId('b'))).toBe(1)                  
  })
  test('§465.2.c.6 壁垒先/后排后', () => {
    const m = assignDamage(2, [
      { oid: asObjId('back'), lethalNeeded: 1, backline: true },
      { oid: asObjId('bar'), lethalNeeded: 1, barrier: true },
      { oid: asObjId('norm'), lethalNeeded: 1 },
    ])
    expect(m.get(asObjId('bar'))).toBe(1)        
    expect(m.get(asObjId('norm'))).toBe(1)       
    expect(m.get(asObjId('back'))).toBeUndefined()              
  })
})

describe('战斗三步(H4:伤害分配在结算前,§463)', () => {
  test('3战力进攻 vs 两个1战力防守:防守方被摧毁、进攻方存活 → attackerWins + 征服事件', () => {
    const s = place([u('atk', P1, 3), u('d1', P2, 1), u('d2', P2, 1)])
    const r = runCombat(s, BF0, P1)
                                                 
    expect(r.state.objects['d1']).toBeUndefined()
    expect(r.state.objects['d2']).toBeUndefined()
    expect(r.state.objects['atk']).toBeDefined()
    expect(r.state.objects['atk']!.damage).toBe(0)                            
    expect(r.outcome).toBe('attackerWins')
    expect(r.conquer).toEqual({ player: P1, battlefield: BF0 })                            
  })

  test('§466.1.a.2 打不穿召回:进攻方被眩晕(不贡献战力§423.1.b)→ 防守方存活 → 召回进攻方、无结果', () => {
    const s = place([u('atk', P1, 5, { status: { stunned: true } }), u('def', P2, 2)])
    const r = runCombat(s, BF0, P1)
                                                          
    expect(r.state.zones['base:P1']!.contents).toContain(asObjId('atk'))            
    expect(r.state.zones[BF0]!.contents).not.toContain(asObjId('atk'))
    expect(r.outcome).toBe('noResult')                       
    expect(r.conquer).toBeNull()
  })
})
