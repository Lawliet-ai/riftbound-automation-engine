import { beforeEach, describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { Trigger } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { takeDestroyed, type CleanupHooks } from '../../src/loop/cleanup'

                          
  
                                                     
                                            
                                                  
  
                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, over: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: 'U', owner: P1, controller: P1, zone: BF0,
    baseMight: 3, baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...over,
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
function scene(objs: GameObject[]): GameState {
  return place(createInitialState([P1, P2], 2), objs)
}
                     
function deaths(events: readonly GameEvent[]): readonly Extract<GameEvent, { kind: 'destroyed' }>[] {
  return events.filter((e): e is Extract<GameEvent, { kind: 'destroyed' }> => e.kind === 'destroyed')
}

                                    
beforeEach(() => { takeDestroyed() })

describe('★§428.1.a.1 主动摧毁(摧毁指示)', () => {
  test('★destroy 事件落地后补发 destroyed,带死前快照', () => {
    const s = scene([unit('a', { status: { stunned: true }, damage: 1 })])
    const { events } = applyEvents(s, [{ kind: 'destroy', target: asObjId('a') }])
    const d = deaths(events)
    expect(d).toHaveLength(1)
    expect(d[0]!.victim.oid).toBe(asObjId('a'))
    expect(d[0]!.victim.controller).toBe(P1)
  })

  test('★快照定格了【死前】的样子——这正是这条通道存在的理由', () => {
    const s = scene([unit('a', { status: { stunned: true }, damage: 1 })])
    const { state: after, events } = applyEvents(s, [{ kind: 'destroy', target: asObjId('a') }])
                                                 
    expect(after.objects['a']).toBeUndefined()
    expect(deaths(events)[0]!.victim.status.stunned).toBe(true)
    expect(deaths(events)[0]!.victim.damage).toBe(1)
  })

  test('★§178 快照带类型:能分辨"摧毁的是单位还是装备"', () => {
    const s = scene([
      unit('u'),
      unit('g', { defId: 'G', baseTypes: ['equipment'], baseMight: 0 }),
    ])
    const { events } = applyEvents(s, [
      { kind: 'destroy', target: asObjId('u') },
      { kind: 'destroy', target: asObjId('g') },
    ])
    const byOid = Object.fromEntries(deaths(events).map((d) => [d.victim.oid as string, d.victim]))
    expect(byOid['u']!.types).toContain('unit')
    expect(byOid['g']!.types).toContain('equipment')
    expect(byOid['g']!.types).not.toContain('unit')
  })
})

describe('★§428.1.a.2 被动摧毁(致命伤害 → 清理 3b)', () => {
  test('★没有任何 destroy 事件,单靠伤害打死也发 destroyed', () => {
    const s = scene([unit('a', { baseMight: 2, status: { stunned: true } })])
    const { state: after, events } = applyEvents(s, [
      { kind: 'damage', target: asObjId('a'), amount: 2 }, // §142.4.b 致命
    ])
    expect(after.objects['a']).toBeUndefined()           
    const d = deaths(events)
    expect(d).toHaveLength(1)
    expect(d[0]!.victim.status.stunned).toBe(true)                        
  })

  test('未达致命的伤害不发(没死就不是摧毁)', () => {
    const s = scene([unit('a', { baseMight: 5 })])
    const { state: after, events } = applyEvents(s, [{ kind: 'damage', target: asObjId('a'), amount: 2 }])
    expect(after.objects['a']).toBeDefined()
    expect(deaths(events)).toHaveLength(0)
  })

  test('★§367 摧毁被替换救下的单位不发(它没真死)', () => {
    const s = scene([unit('a', { baseMight: 2 })])
                             
    const hooks: CleanupHooks = {
      replaceDestroy: (st, oid) => {
        const o = st.objects[oid]
        if (!o || oid !== asObjId('a')) return null
        return { ...st, objects: { ...st.objects, [oid]: { ...o, damage: 0 } } }
      },
    }
    const { state: after, events } = applyEvents(s, [
      { kind: 'damage', target: asObjId('a'), amount: 2 },
    ], { cleanupHooks: hooks })
    expect(after.objects['a']).toBeDefined()             
    expect(deaths(events)).toHaveLength(0)
  })
})

describe('★缓冲区不泄漏(模块级状态最容易出的事故)', () => {
  test('★上一批的死者不会出现在下一批里', () => {
    const s = scene([unit('a', { baseMight: 1 })])
    const first = applyEvents(s, [{ kind: 'destroy', target: asObjId('a') }])
    expect(deaths(first.events)).toHaveLength(1)
               
    const second = applyEvents(first.state, [{ kind: 'gainPoint', player: P1, amount: 1 }])
    expect(deaths(second.events)).toHaveLength(0)
  })
})

describe('★真触发器收得到(端到端)', () => {
                                            
  function watcher(controller = P1): Trigger {
    return {
      id: 'w', sourceOid: asObjId('w'), controller,
      event: 'destroyed', by: 'you',
      filter: (ev) => ev.kind === 'destroyed'
        && ev.victim.types.includes('unit')
        && ev.victim.status.stunned === true
        && ev.victim.controller !== controller,
      effect: () => [{ kind: 'draw', player: controller, count: 1 }],
    }
  }

  test('★被眩晕的敌方单位被摧毁 → 触发入链', () => {
    const s = scene([unit('e', { controller: P2, owner: P2, status: { stunned: true } }), unit('w')])
    const after = landAndEnqueueTriggers(s, [{ kind: 'destroy', target: asObjId('e') }], () => [watcher()], P1)
    expect(after.chain).toHaveLength(1)
  })

  test('★没被眩晕 → 不触发(判据真的读到了快照里的状态)', () => {
    const s = scene([unit('e', { controller: P2, owner: P2 }), unit('w')])
    const after = landAndEnqueueTriggers(s, [{ kind: 'destroy', target: asObjId('e') }], () => [watcher()], P1)
    expect(after.chain).toHaveLength(0)
  })

  test('★死的是自己人 → 不触发(卡文写的是"敌方单位")', () => {
    const s = scene([unit('m', { status: { stunned: true } }), unit('w')])
    const after = landAndEnqueueTriggers(s, [{ kind: 'destroy', target: asObjId('m') }], () => [watcher()], P1)
    expect(after.chain).toHaveLength(0)
  })
})
