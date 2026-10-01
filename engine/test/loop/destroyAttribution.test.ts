import { beforeEach, describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { Trigger } from '../../src/dsl/trigger'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { takeDestroyed, clearDamageBlame } from '../../src/loop/cleanup'
import { runCombat } from '../../src/combat/battle'

                                      
  
                                                        
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, controller = P1, over: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: 'U', owner: controller, controller, zone: BF0,
    baseMight: 3, baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...over,
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}
function deaths(events: readonly GameEvent[]): readonly Extract<GameEvent, { kind: 'destroyed' }>[] {
  return events.filter((e): e is Extract<GameEvent, { kind: 'destroyed' }> => e.kind === 'destroyed')
}
function deathOf(events: readonly GameEvent[], oid: string) {
  return deaths(events).find((d) => d.victim.oid === asObjId(oid))
}

beforeEach(() => { takeDestroyed(); clearDamageBlame() })

describe('★§428.5.b 主动摧毁的归因', () => {
  test('★摧毁指示带 source → 责任归到那个物件的控制者', () => {
    const s = scene([unit('killer', P2), unit('v', P1)])
    const { events } = applyEvents(s, [{ kind: 'destroy', target: asObjId('v'), source: asObjId('killer') }])
    expect(deathOf(events, 'v')!.responsible).toEqual([P2])
  })

  test('直接指名 sourcePlayer 也算(没有单一来源物件时用)', () => {
    const s = scene([unit('v', P1)])
    const { events } = applyEvents(s, [{ kind: 'destroy', target: asObjId('v'), sourcePlayer: P2 }])
    expect(deathOf(events, 'v')!.responsible).toEqual([P2])
  })

  test('★什么都没给 → 不带 responsible 字段(表示"不知道",不是"没人干")', () => {
    const s = scene([unit('v', P1)])
    const { events } = applyEvents(s, [{ kind: 'destroy', target: asObjId('v') }])
    expect(deathOf(events, 'v')!.responsible).toBeUndefined()
  })
})

describe('★§428.5.c 被动摧毁的归因(伤害溯源)', () => {
  test('★谁打死的就归谁', () => {
    const s = scene([unit('v', P1, { baseMight: 2 })])
    const { events } = applyEvents(s, [
      { kind: 'damage', target: asObjId('v'), amount: 2, sourcePlayer: P2 },
    ])
    expect(deathOf(events, 'v')!.responsible).toEqual([P2])
  })

  test('★§428.5「来源可以是一个或多个」:两人合力打死 → 两人都负责', () => {
    const s = scene([unit('v', P1, { baseMight: 4 })])
    const { events } = applyEvents(s, [
      { kind: 'damage', target: asObjId('v'), amount: 2, sourcePlayer: P2 },
      { kind: 'damage', target: asObjId('v'), amount: 2, sourcePlayer: P1 },
    ])
    expect([...deathOf(events, 'v')!.responsible!].sort()).toEqual([P1, P2])
  })

  test('★同一批里两个方向各归各的(战斗的核心情形)', () => {
    const s = scene([unit('a', P1, { baseMight: 2 }), unit('b', P2, { baseMight: 2 })])
    const { events } = applyEvents(s, [
      { kind: 'damage', target: asObjId('b'), amount: 2, sourcePlayer: P1 },
      { kind: 'damage', target: asObjId('a'), amount: 2, sourcePlayer: P2 },
    ])
    expect(deathOf(events, 'b')!.responsible).toEqual([P1])              
    expect(deathOf(events, 'a')!.responsible).toEqual([P2])              
  })

  test('★账本按批次清:上一批的伤害不算到这一批的死头上', () => {
    const s = scene([unit('v', P1, { baseMight: 5 })])
    const first = applyEvents(s, [{ kind: 'damage', target: asObjId('v'), amount: 2, sourcePlayer: P2 }])
    expect(deaths(first.events)).toHaveLength(0)          
    const second = applyEvents(first.state, [{ kind: 'destroy', target: asObjId('v') }])
    expect(deathOf(second.events, 'v')!.responsible).toBeUndefined()                
  })
})

describe('★触发的 by:you 按归因判,不看批次 actor', () => {
                       
  function watcher(controller: ReturnType<typeof asPlayerId>): Trigger {
    return {
      id: `w:${controller}`, sourceOid: asObjId(`w:${controller}`), controller,
      event: 'destroyed', by: 'you',
      filter: (ev) => ev.kind === 'destroyed' && ev.victim.controller !== controller,
      effect: () => [],
    }
  }

  test('★同一批两个方向:各自的触发只为自己那一个响', () => {
    const s = scene([unit('a', P1, { baseMight: 2 }), unit('b', P2, { baseMight: 2 })])
    const after = landAndEnqueueTriggers(s, [
      { kind: 'damage', target: asObjId('b'), amount: 2, sourcePlayer: P1 },
      { kind: 'damage', target: asObjId('a'), amount: 2, sourcePlayer: P2 },
    ], () => [watcher(P1), watcher(P2)], P1)
                                            
                                          
    expect(after.chain.filter((it) => it.controller === P1)).toHaveLength(1)
    expect(after.chain.filter((it) => it.controller === P2)).toHaveLength(1)
  })

  test('没有归因信息时回落到批次 actor(旧行为不变)', () => {
    const s = scene([unit('b', P2)])
    const after = landAndEnqueueTriggers(s, [{ kind: 'destroy', target: asObjId('b') }], () => [watcher(P1)], P1)
    expect(after.chain).toHaveLength(1)
  })
})

describe('★真战斗里死者信号有没有出口(第106轮实锤的漏接)', () => {
  test('★runCombat 把这场战斗的死者信号带出来了', () => {
                                                   
    const s = scene([unit('atk', P1, { baseMight: 3 }), unit('def', P2, { baseMight: 2 })])
    const r = runCombat(s, BF0, P1)
    expect(r.state.objects['def']).toBeUndefined()            
    const d = deathOf(r.deaths, 'def')
    expect(d).toBeDefined()                                    
    expect(d!.responsible).toEqual([P1])                           
  })

  test('★互相打死:两边的死者各归各的责任人', () => {
    const s = scene([unit('atk', P1, { baseMight: 2 }), unit('def', P2, { baseMight: 2 })])
    const r = runCombat(s, BF0, P1)
    expect(r.state.objects['atk']).toBeUndefined()
    expect(r.state.objects['def']).toBeUndefined()
    expect(deathOf(r.deaths, 'def')!.responsible).toEqual([P1])
    expect(deathOf(r.deaths, 'atk')!.responsible).toEqual([P2])
  })
})
