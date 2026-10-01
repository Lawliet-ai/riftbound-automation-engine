import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'

                                                  
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, kws: readonly string[] = ['绝念'], extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: kws, baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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
const draw = { lastRitesEffect: () => [{ kind: 'draw' as const, player: P1, count: 1 }] }
const destroy = (id: string) => ({ kind: 'destroy' as const, target: asObjId(id) })

describe('★destroy 事件也触发绝念(本轮修复的缺口)', () => {
  test('指定摧毁一个带绝念的单位 → 入链', () => {
    const s = applyEvents(scene(obj('a')), [destroy('a')], draw).state
    expect(s.chain).toHaveLength(1)
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(1)            
  })

  test('没有绝念的牌被摧毁 → 不入链', () => {
    const s = applyEvents(scene(obj('a', [])), [destroy('a')], draw).state
    expect(s.chain).toHaveLength(0)
  })

  test('§808.2 两个绝念 → 两条项目分别入链', () => {
    const s = applyEvents(scene(obj('a', ['绝念', '绝念'])), [destroy('a')], draw).state
    expect(s.chain).toHaveLength(2)
  })

  test('不提供 lastRitesEffect ⇒ 通道关闭,照常摧毁不入链', () => {
    const s = applyEvents(scene(obj('a')), [destroy('a')], {}).state
    expect(s.chain).toHaveLength(0)
    expect(s.objects['a' as never]).toBeUndefined()
  })

  test('一次摧毁多个 → 各自一条', () => {
    const s = applyEvents(scene(obj('a'), obj('b')), [destroy('a'), destroy('b')], draw).state
    expect(s.chain).toHaveLength(2)
  })

  test('★快照带回废牌堆里的新身份(「绝念—放逐我」这类要指着自己动手)', () => {
    const seen: { postDeathOid?: string }[] = []
    const s = applyEvents(scene(obj('a')), [destroy('a')], {
      lastRitesEffect: (snap) => { seen.push(snap as never); return [{ kind: 'draw', player: P1, count: 1 }] },
    }).state
    expect(seen[0]!.postDeathOid).toBeDefined()
    expect(seen[0]!.postDeathOid).not.toBe('a')              
    expect(s.zones[`discard:${P1}`]!.contents).toContain(seen[0]!.postDeathOid)
  })

  test('★§367 被守护天使救下的不入链(替换在 landEvent 之前拦截,不会多采快照)', () => {
    const s = applyEvents(scene(obj('a')), [destroy('a')], {
      ...draw,
      cleanupHooks: {
        replaceDestroy: (st, oid) => {
          const o = st.objects[oid]
          return o ? { ...st, objects: { ...st.objects, [oid]: { ...o, damage: 0 } } } : null
        },
      },
    }).state
    expect(s.objects['a' as never]).toBeDefined()       
    expect(s.chain).toHaveLength(0)                           
  })

  test('致命伤害那条老路仍然照常(没被本次改动挤掉)', () => {
    const s = applyEvents(scene(obj('a')), [{ kind: 'damage', target: asObjId('a'), amount: 3 }], draw).state
    expect(s.chain).toHaveLength(1)
  })

  test('★两条路一起来也不会重复入链(同一张牌只死一次)', () => {
                             
    const s = applyEvents(scene(obj('a')), [
      { kind: 'damage', target: asObjId('a'), amount: 1 },
      destroy('a'),
    ], draw).state
    expect(s.chain).toHaveLength(1)
  })
})
