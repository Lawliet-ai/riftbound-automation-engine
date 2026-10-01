import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import {
  CLEANUP_ITERATION_CAP,
  hasLethalDamage,
  runCleanupOnce,
  runCleanupToFixpoint,
  shouldDeferCleanup,
  type CleanupHooks,
} from '../src/loop/cleanup'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, over: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id),
    defId: 'U',
    owner: P1,
    controller: P1,
    zone: BF0,
    baseMight: 3,
    damage: 0,
    counters: {},
    status: {},
    ...over,
  }
}

                                                      
function place(base: GameState, objs: GameObject[]): GameState {
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects, zones }
}

describe('致命伤害(§142.4.b,DK)', () => {
  test('非零且≥战力才致命', () => {
    expect(hasLethalDamage(5, 5)).toBe(true)
    expect(hasLethalDamage(4, 5)).toBe(false)
    expect(hasLethalDamage(3, 3)).toBe(true)
    expect(hasLethalDamage(1, 0)).toBe(true)                   
    expect(hasLethalDamage(0, 0)).toBe(false)                        
  })
})

describe('task1 判胜负(§323.1)', () => {
  test('分数≥胜利分且高于所有对手 → 获胜', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 8, P2: 3 }, winTarget: 8 }
    expect(runCleanupOnce(s).winner).toBe(P1)
  })
  test('达标但未高于对手(平分)→ 不判胜', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 8, P2: 8 }, winTarget: 8 }
    expect(runCleanupOnce(s).winner).toBeNull()
  })
})

describe('3b 摧毁致命伤害单位(§323.5)', () => {
  test('致命单位移入拥有者废牌堆并换新 oid', () => {
    let s = createInitialState([P1, P2])
    s = place(s, [unit('a', { baseMight: 3, damage: 3 })])      
    const after = runCleanupOnce(s)
                                
    expect(after.objects['a']).toBeUndefined()
    expect(after.zones['battlefield:shared:0']!.contents).toHaveLength(0)
    expect(after.zones['discard:P1']!.contents).toHaveLength(1)
  })

  test('3a 绝念钩子在 3b 摧毁前、带将死 oid 触发', () => {
    let s = createInitialState([P1, P2])
    s = place(s, [unit('a', { baseMight: 2, damage: 2 })])
    const seen: { oidAliveAtDeathTrigger?: boolean } = {}
    const hooks: CleanupHooks = {
      fireDeathTriggers: (st, dying) => {
        expect(dying).toContain(asObjId('a'))
        seen.oidAliveAtDeathTrigger = st.objects['a'] !== undefined                
        return st
      },
    }
    const after = runCleanupOnce(s, hooks)
    expect(seen.oidAliveAtDeathTrigger).toBe(true)                       
    expect(after.objects['a']).toBeUndefined()         
  })
})

describe('§322 不动点(连环清理,QA5.1)', () => {
  test('摧毁加成来源使另一单位随之致命 → 连锁收敛', () => {
    let s = createInitialState([P1, P2])
                                                 
    s = place(s, [
      unit('A', { baseMight: 1, damage: 1 }), // 致命
      unit('B', { baseMight: 5, damage: 3 }), // A 在时 5 战力不致命;A 走后视为 2 战力 → 3 伤害致命
    ])
    const hooks: CleanupHooks = {
      referenceMight: (st, o) => {
        if (o.oid === asObjId('B')) return st.objects[asObjId('A')] ? 5 : 2
        return Math.max(0, o.baseMight)
      },
    }
    const after = runCleanupToFixpoint(s, hooks)
    expect(after.objects['A']).toBeUndefined()
    expect(after.objects['B']).toBeUndefined()        
    expect(after.zones['discard:P1']!.contents).toHaveLength(2)
  })

  test('不收敛的病态清理超 cap 即抛(非静默死循环)', () => {
    let s = createInitialState([P1, P2])
    s = place(s, [unit('x', { baseMight: 3, damage: 0 })])
                                                         
    const evil: CleanupHooks = {
      recallAndRemoveMisplaced: (st) => ({ ...st, nextOid: st.nextOid + 1 }), // 永远返回新 state
    }
    expect(() => runCleanupToFixpoint(s, evil)).toThrow(/不动点未在/)
  }, 10_000)
})

describe('§321.1 结算期清理延迟入队', () => {
  test('结算链项目结算期间 → 延迟入队,不立即清理', () => {
    expect(shouldDeferCleanup(true)).toBe(true)
    expect(shouldDeferCleanup(false)).toBe(false)
  })
  test('iteration-cap 是有限正整数', () => {
    expect(CLEANUP_ITERATION_CAP).toBeGreaterThan(0)
  })
})
