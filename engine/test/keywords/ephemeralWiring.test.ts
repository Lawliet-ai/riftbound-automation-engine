import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { hasEphemeral, runEphemeralStep } from '../../src/keywords/ephemeral'

                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, zone: string, ctrl = P1, kws: readonly string[] = ['瞬息']): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: kws, baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}

describe('§816.3 特性判定', () => {
  test('印着瞬息 → true', () => {
    expect(hasEphemeral(obj('a', BF0))).toBe(true)
  })

  test('没印 → false', () => {
    expect(hasEphemeral(obj('a', BF0, P1, []))).toBe(false)
  })
})

describe('§816.1.b/c 在【控制者的】开始阶段摧毁', () => {
  test('我的瞬息牌在我的开始阶段被摧毁', () => {
    const s = runEphemeralStep(scene(obj('a', BF0)), P1)
    expect(s.objects['a' as never]).toBeUndefined()
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(1)
  })

  test('★【对手的】瞬息牌在我的开始阶段【不】被摧毁(条件是其控制者的开始阶段)', () => {
    const s = runEphemeralStep(scene(obj('t', BF0, P2)), P1)
    expect(s.objects['t' as never]).toBeDefined()
  })

  test('没印瞬息的牌不受影响', () => {
    const s = runEphemeralStep(scene(obj('a', BF0, P1, [])), P1)
    expect(s.objects['a' as never]).toBeDefined()
  })

  test('基地里的也摧毁(§816.1.a 常驻牌,不限战场)', () => {
    const s = runEphemeralStep(scene(obj('a', `base:${P1}`)), P1)
    expect(s.objects['a' as never]).toBeUndefined()
  })

  test('★手牌/废牌堆里的不摧毁(只对【场上】的常驻牌生效)', () => {
    const s = runEphemeralStep(scene(obj('h', `hand:${P1}`), obj('d', `discard:${P1}`)), P1)
    expect(s.objects['h' as never]).toBeDefined()
    expect(s.objects['d' as never]).toBeDefined()
  })

  test('场上没有瞬息牌 → 原样返回(不白跑一次清理)', () => {
    const s0 = scene(obj('a', BF0, P1, []))
    expect(runEphemeralStep(s0, P1)).toBe(s0)
  })

  test('★§816.2 印了两个瞬息也只摧毁一次(牌只有一张,自然满足)', () => {
    const s = runEphemeralStep(scene(obj('a', BF0, P1, ['瞬息', '瞬息'])), P1)
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(1)
  })

  test('多张一起摧毁', () => {
    const s = runEphemeralStep(scene(obj('a', BF0), obj('b', `base:${P1}`)), P1)
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(2)
  })
})

describe('接线证据:摧毁走的是真事件通道', () => {
  test('不带 deps → 只摧毁,不入链(通道关闭时行为可预期)', () => {
    const s = runEphemeralStep(scene(obj('a', BF0, P1, ['瞬息', '绝念'])), P1)
    expect(s.objects['a' as never]).toBeUndefined()
    expect(s.chain).toHaveLength(0)
  })

                                                        
  test('★被 destroy 事件摧毁的牌也触发绝念(§808.1.d;第60轮修复)', () => {
    const s = runEphemeralStep(scene(obj('a', BF0, P1, ['瞬息', '绝念'])), P1, {
      lastRitesEffect: () => [{ kind: 'draw', player: P1, count: 1 }],
    })
    expect(s.chain).toHaveLength(1)
  })
})
