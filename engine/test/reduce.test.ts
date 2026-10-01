import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { reduce } from '../src/loop/reduce'
import { legalActions } from '../src/loop/legalActions'
import { EMPTY_REPLACEMENT_REGISTRY, interceptEvent } from '../src/effects/replacementRegistry'
import { recomputeContinuous } from '../src/effects/continuousView'
import type { DamageEvent } from '../src/loop/events'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, baseMight: number, damage = 0): GameObject {
  return {
    oid: asObjId(id),
    defId: 'U',
    owner: P1,
    controller: P1,
    zone: BF0,
    baseMight,
    damage,
    counters: {},
    status: {},
  }
}

function withUnit(o: GameObject): GameState {
  const base = createInitialState([P1, P2])
  const z = base.zones[BF0]!
  return {
    ...base,
    objects: { [o.oid]: o },
    zones: { ...base.zones, [BF0]: { ...z, contents: [o.oid] } },
  }
}

describe('接缝空实现(M0.6a)', () => {
  test('空替换注册表:事件原样透传(同引用)', () => {
    const ev: DamageEvent = { kind: 'damage', target: asObjId('x'), amount: 1 }
    expect(interceptEvent(ev, createInitialState([P1, P2]), EMPTY_REPLACEMENT_REGISTRY)).toBe(ev)
  })
  test('无持续效果:recompute 内容等价(不再要求同引用;见 layers.test 悬停派生用例)', () => {
    const s = createInitialState([P1, P2])
    expect(recomputeContinuous(s).objects).toEqual(s.objects)
  })
})

describe('reduce 三段:apply → cleanup-fixpoint → recompute', () => {
  test('致命伤害:apply 落地伤害后 cleanup 摧毁(相序 apply<cleanup)', () => {
    const s = withUnit(unit('a', 3, 0))
    const { state } = reduce(s, { kind: 'DEV_DEAL_DAMAGE', player: P2, target: asObjId('a'), amount: 3 })
                                         
    expect(state.objects['a']).toBeUndefined()
    expect(state.zones['discard:P1']!.contents).toHaveLength(1)
  })

  test('非致命伤害:apply 落地,cleanup 不摧毁,单位留存带伤', () => {
    const s = withUnit(unit('a', 3, 0))
    const { state, events } = reduce(s, { kind: 'DEV_DEAL_DAMAGE', player: P2, target: asObjId('a'), amount: 2 })
    expect(state.objects['a']!.damage).toBe(2)
    expect(events).toHaveLength(1)
    expect(events[0]!.kind).toBe('damage')
  })

  test('§319 触发清理判胜(§323.1):加分达标 → 判胜者', () => {
    const base: GameState = { ...createInitialState([P1, P2]), scores: { P1: 7, P2: 3 }, winTarget: 8 }
    const { state } = reduce(base, { kind: 'DEV_GAIN_POINT', player: P1, amount: 1 })
    expect(state.scores['P1']).toBe(8)
    expect(state.winner).toBe(P1)
  })

  test('PASS:无事件 → 不触发清理,状态实质不变', () => {
    const s = withUnit(unit('a', 3, 0))
    const { state, events } = reduce(s, { kind: 'PASS', player: P1 })
    expect(events).toHaveLength(0)
    expect(state.objects['a']).toBeDefined()
    expect(state.winner).toBeNull()
  })
})

describe('legalActions 白名单骨架', () => {
  test('回合玩家至少可 PASS', () => {
    const acts = legalActions(createInitialState([P1, P2]), P1)
    expect(acts).toEqual([{ kind: 'PASS', player: P1 }])
  })
})
