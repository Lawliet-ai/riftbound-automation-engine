import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { addMana, emptyRunePool } from '../src/state/runePool'
import {
  nextPhase,
  PHASE_ORDER,
  runAwakenPhase,
  runExpirationStep,
  runMainPhaseEntry,
  turnCheckpoints,
} from '../src/loop/turnStructure'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function mkObj(id: string, controller = P1, over: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id),
    defId: 'U',
    owner: P1,
    controller,
    zone: asZoneId('battlefield:shared:0'),
    baseMight: 3,
    damage: 0,
    counters: {},
    status: {},
    ...over,
  }
}

function stateWith(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 3)
  const objects: Record<string, GameObject> = {}
  for (const o of objs) objects[o.oid] = o
  return { ...base, objects }
}

describe('阶段序列(§315-317,DK-11/12/50)', () => {
  test('六阶段顺序,战斗不在其中(是主阶段子结构)', () => {
    expect(PHASE_ORDER).toEqual(['awaken', 'start', 'summon', 'draw', 'main', 'ending'])
    expect(PHASE_ORDER).not.toContain('combat')
  })
  test('nextPhase 链式推进,ending 后为 null', () => {
    expect(nextPhase('awaken')).toBe('start')
    expect(nextPhase('draw')).toBe('main')
    expect(nextPhase('ending')).toBeNull()
  })
  test('承重相序:开始步骤 < 得分计算步骤 < 抽牌', () => {
    const cps = turnCheckpoints()
    const idx = (step: string) => cps.findIndex((c) => c.step === step)
    expect(idx('开始步骤')).toBeLessThan(idx('得分计算步骤'))
    expect(idx('得分计算步骤')).toBeLessThan(idx('抽牌'))
  })
})

describe('唤醒阶段(§315.1.b)', () => {
  test('回合玩家控制的物体变活跃,对手的不动', () => {
    const s = stateWith([mkObj('a', P1), mkObj('b', P2)])
    const after = runAwakenPhase(s)
    expect(after.objects['a']!.status.ready).toBe(true)
    expect(after.objects['b']!.status.ready).toBeUndefined()
  })
})

describe('主阶段进入有序任务(§316.3<§316.4)', () => {
  test('清符文池严格先于主阶段开始时触发', () => {
    let s = stateWith([])
    s = { ...s, runePools: { P1: addMana(emptyRunePool(), 3), P2: addMana(emptyRunePool(), 2) } }
    const seen: { manaAtTrigger?: number } = {}
    const { state, taskOrder } = runMainPhaseEntry(s, (st) => {
                               
      seen.manaAtTrigger = st.runePools['P1']!.mana
      return st
    })
    expect(taskOrder).toEqual(['§316.3-清符文池', '§316.4-主阶段开始时触发'])
    expect(seen.manaAtTrigger).toBe(0)                  
    expect(state.runePools['P1']!.mana).toBe(0)
    expect(state.phase).toBe('main')
  })
})

describe('失效步骤 3c/3d/3e(§317.2.b/c/d,DK-12/16/43)', () => {
  test('3c移伤 / 3d眩晕解除 / 3e清符文池 / 本回合效果失效钩子被调用', () => {
    let s = stateWith([
      mkObj('a', P1, { damage: 4, status: { stunned: true, ready: true } }),
      mkObj('b', P2, { damage: 1, status: { stunned: true } }),
    ])
    s = { ...s, runePools: { P1: addMana(emptyRunePool(), 5), P2: emptyRunePool() } }
    let expireCalled = false
    const after = runExpirationStep(s, (st) => {
      expireCalled = true
      return st
    })
                  
    expect(after.objects['a']!.damage).toBe(0)
    expect(after.objects['b']!.damage).toBe(0)
                                 
    expect(after.objects['a']!.status.stunned).toBe(false)
    expect(after.objects['a']!.status.ready).toBe(true)
    expect(after.objects['b']!.status.stunned).toBe(false)
               
    expect(after.runePools['P1']!.mana).toBe(0)
                             
    expect(expireCalled).toBe(true)
  })
})
