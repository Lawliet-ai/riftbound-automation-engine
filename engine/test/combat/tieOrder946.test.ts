import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { assignDamage } from '../../src/combat/damageAssign'
import { runCombat } from '../../src/combat/battle'

                                            
  
                                             
                                         
                                                        
                                         
                                                    
                                                          
                                                
  
                                                  
                                                 
                                        
                                                 
  
                                                      
                                                            
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function u(id: string, ctrl: typeof P1, might: number, over: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: might, damage: 0, counters: {}, status: {}, ...over,
  } as GameObject
}
function place(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  for (const o of objs) objects[o.oid] = o
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, activePlayer: P1, objects,
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: objs.map((o) => o.oid) } },
  } as GameState
}

describe('★946 §465.2.c.7 同优先级:结果必须确定', () => {
                                                    
                                
  const three = () => [
    { oid: asObjId('c'), lethalNeeded: 3 },
    { oid: asObjId('b'), lethalNeeded: 3 },
    { oid: asObjId('a'), lethalNeeded: 3 },
  ]

  test('同一输入调两次,分配逐项相同', () => {
    const m1 = assignDamage(5, three())
    const m2 = assignDamage(5, three())
    expect([...m1.entries()].map(String)).toEqual([...m2.entries()].map(String))
  })

  test('分配依【数组次序】而非 oid 字典序(景故意把 c/b/a 倒着排)', () => {
    const m = assignDamage(5, three())
                                            
    expect(m.get(asObjId('c'))).toBe(3)
    expect(m.get(asObjId('b'))).toBe(2)
    expect(m.get(asObjId('a'))).toBeUndefined()
    // ⚠️ 若实现改成按 oid 排序,这里会变成 a=3 / b=2 / c=undefined —— 上面三条一起红
  })

  test('§465.2.c.3/.4 仍成立:先给一个致命,且不超过其致命最小值', () => {
    const m = assignDamage(5, three())
    const vals = [...m.values()]
    expect(vals.filter((v) => v === 3)).toHaveLength(1)            
    expect(Math.max(...vals)).toBeLessThanOrEqual(3)              
    expect(vals.reduce((a, b) => a + b, 0)).toBe(5)                  
  })
})

describe('★946 整场战斗上的同优先级确定性', () => {
                                          
                                                
  const scene = () => place([u('atk', P1, 5), u('d3', P2, 3), u('d2', P2, 3), u('d1', P2, 3)])

  test('同一初始态跑两次,存活名单与伤害逐位相同', () => {
    const r1 = runCombat(scene(), BF0, P1)
    const r2 = runCombat(scene(), BF0, P1)
    const snap = (s: GameState): string =>
      ['atk', 'd1', 'd2', 'd3']
        .map((id) => `${id}:${s.objects[id] ? `活/${s.objects[id]!.damage}` : '死'}`)
        .join('|')
    expect(snap(r1.state)).toBe(snap(r2.state))
    expect(r1.outcome).toBe(r2.outcome)
  })

  test('死的是到场顺序里的第一个(d3),不是 oid 最小的(d1)', () => {
    const r = runCombat(scene(), BF0, P1)
    expect(r.state.objects['d3'], 'd3 到场最早,先吃到致命').toBeUndefined()
    expect(r.state.objects['d1'], 'd1 到场最晚,这轮碰不到').toBeDefined()
  })
})
