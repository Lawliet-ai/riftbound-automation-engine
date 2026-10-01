import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { runEscapeHatch } from '../src/dsl/escapeHatch'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function withUnit(id: string, baseMight: number, damage = 0): GameState {
  const o: GameObject = { oid: asObjId(id), defId: 'U', owner: P1, controller: P1, zone: BF0, baseMight, damage, counters: {}, status: {} }
  const base = createInitialState([P1, P2])
  const z = base.zones[BF0]!
  return { ...base, objects: { [id]: o }, zones: { ...base.zones, [BF0]: { ...z, contents: [asObjId(id)] } } }
}

describe('逃生舱纪律', () => {
  test('白名单原语产出事件 → 经同一事件总线落地(伤害致命 → 清理摧毁)', () => {
    const s = withUnit('a', 3)
    const { state } = runEscapeHatch(s, (api) => api.damage(asObjId('a'), 3), null)
    expect(state.objects['a']).toBeUndefined()                            
    expect(state.zones['discard:P1']!.contents).toHaveLength(1)
  })

  test('非致命伤害经总线落地', () => {
    const s = withUnit('a', 5)
    const { state, events } = runEscapeHatch(s, (api) => api.damage(asObjId('a'), 2), null)
    expect(state.objects['a']!.damage).toBe(2)
    expect(events.some((e) => e.kind === 'damage')).toBe(true)
  })

  test('禁直接改 state:ctx.state 冻结,赋值抛错', () => {
    const s = withUnit('a', 3)
    expect(() =>
      runEscapeHatch(s, (_api, ctx) => {
        // @ts-expect-error 故意违规直接改 state(应被冻结拦下)
        ctx.state.winner = P1
      }, null),
    ).toThrow()
  })

  test('WIN_GAME 原语:卡无关替代胜利立即声明', () => {
    const s = withUnit('a', 3)
    const { state } = runEscapeHatch(s, (api) => api.winGame(P1), null)
    expect(state.winner).toBe(P1)
  })

  test('applyRestriction 原语:限制效果并入 continuousEffects', () => {
    const s = withUnit('a', 3)
    const { state } = runEscapeHatch(s, (api) =>
      api.applyRestriction({ duration: 'thisTurn', fromPassive: false, predicate: () => true, modification: { kind: 'addRestriction', restriction: 'move' }, id: 'r1' }),
    null)
    expect(state.continuousEffects).toHaveLength(1)
    expect(state.continuousEffects[0]!.timestamp).toBeGreaterThan(0)                
  })

  test('触发照常:逃生舱的事件也走替换层(Skip 得分否定)', () => {
    const s = createInitialState([P1, P2])
    const deps = { replacement: { shields: [{ id: 'skip', source: null, controller: P2, intercepts: 'gainPoint' as const, predicate: () => true, rewrite: () => null }] } }
    const { state } = runEscapeHatch(s, (api) => api.gainPoint(P1, 1), null, deps)
    expect(state.scores['P1']).toBe(0)                    
  })
})
