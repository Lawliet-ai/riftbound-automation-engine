import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { makeLastRitesItems, snapshotOnDeath, lastRitesStillValid, type DeathSnapshot } from '../../src/keywords/lastRites'

                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(id: string, zone: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: ['绝念'], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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
  return { ...base, objects, zones }
}
   
                                                                      
  
                                              
                                                
                                                       
                                              
   
function crossedInto(kind: 'discard' | 'exile', snap: DeathSnapshot, oid = `${snap.oid}#${kind}`): GameObject {
  return obj(oid, `${kind}:${snap.owner}`, snap.controller, { defId: snap.defId })
}

                       
const drawEffect = (s: DeathSnapshot): readonly GameEvent[] => [{ kind: 'draw', player: s.controller, count: 1 }]

describe('§808.1.d.1 事后校验:没真进废牌堆的不入链', () => {
  test('确实进了废牌堆(原 oid 已不存在)→ 入链', () => {
    const snap = snapshotOnDeath(obj('dead', 'battlefield:shared:0'))
                                                       
    const after = scene(crossedInto('discard', snap))
    expect(after.objects['dead']).toBeUndefined()                
    expect(after.zones[`discard:${P1}`]!.contents).toContain('dead#discard')             
    expect(makeLastRitesItems([snap], after, drawEffect)).toHaveLength(1)
  })

  test('★缺陷98 原 oid 同样已不存在,但牌进的是【放逐区】→ 触发作废,不入链', () => {
                                                             
                                                
                                                                     
    const snap = snapshotOnDeath(obj('banished', 'battlefield:shared:0'))
    const after = scene(crossedInto('exile', snap))
    expect(after.objects['banished']).toBeUndefined()
    expect(after.zones[`exile:${P1}`]!.contents).toContain('banished#exile')
    expect(after.zones[`discard:${P1}`]!.contents).toHaveLength(0)
    expect(lastRitesStillValid(snap, after)).toBe(false)
    expect(makeLastRitesItems([snap], after, drawEffect)).toEqual([])
  })

  test('★被守护天使救下(还在场上)→ 触发作废,不入链', () => {
    const snap = snapshotOnDeath(obj('saved', 'battlefield:shared:0'))
                                    
    const after = scene(obj('saved', `base:${P1}`, P1, { status: { dormant: true }, damage: 0 }))
    expect(makeLastRitesItems([snap], after, drawEffect)).toEqual([])
  })

  test('人在废牌堆里(同 oid)→ 视为有效', () => {
    const snap = snapshotOnDeath(obj('d', 'battlefield:shared:0'))
    const after = scene(obj('d', `discard:${P1}`))
    expect(makeLastRitesItems([snap], after, drawEffect)).toHaveLength(1)
  })
})

describe('入链项目的形状与结算', () => {
  test('项目带控制者/来源卡号/待处理状态;结算产出卡文效果', () => {
    const snap = snapshotOnDeath(obj('dead', 'battlefield:shared:0'))
                                           
    const [item] = makeLastRitesItems([snap], scene(crossedInto('discard', snap)), drawEffect)
    expect(item!.controller).toBe(P1)
    expect(item!.sourceDefId).toBe('D-dead')
    expect(item!.status).toBe('pending')
    expect(item!.kind).toBe('ability')
    expect(item!.resolve(scene(), {}, item!)).toEqual([{ kind: 'draw', player: P1, count: 1 }])
  })

  test('结算只认死前快照,不查已离场的来源物件(它已换 oid 进了废牌堆)', () => {
    const snap = snapshotOnDeath(obj('dead', 'battlefield:shared:0'))
    const discarded = crossedInto('discard', snap)
    const items = makeLastRitesItems([snap], scene(discarded), (s) => [{ kind: 'draw', player: s.controller, count: s.might }])
    const [item] = items
                                   
    expect(item!.resolve(scene(), {}, item!)).toEqual([{ kind: 'draw', player: P1, count: 3 }])
                                                   
    const moved = scene({ ...discarded, baseMight: 99 })
    expect(item!.resolve(moved, {}, item!)).toEqual([{ kind: 'draw', player: P1, count: 3 }])
  })

  test('data 层没登记该卡的绝念效果 → 不入一条空转项目', () => {
    const snap = snapshotOnDeath(obj('dead', 'battlefield:shared:0'))
                                                
                                               
    expect(makeLastRitesItems([snap], scene(crossedInto('discard', snap)), () => [])).toEqual([])
  })
})

describe('§808.2 / §808.2.a 多条与顺序', () => {
  test('一个单位两个绝念 → 两条项目(分别触发),id 不撞', () => {
    const o = obj('dead', 'battlefield:shared:0', P1, { baseKeywords: ['绝念', '绝念'] })
    const snaps = [snapshotOnDeath(o), snapshotOnDeath(o)]
                                    
    const items = makeLastRitesItems(snaps, scene(crossedInto('discard', snaps[0]!)), drawEffect)
    expect(items).toHaveLength(2)
    expect(new Set(items.map((i) => i.id)).size).toBe(2)
  })

  test('§808.2.a 确定性序:回合玩家的先入链', () => {
    const mine = snapshotOnDeath(obj('a', 'battlefield:shared:0', P1))
    const theirs = snapshotOnDeath(obj('b', 'battlefield:shared:0', P2))
                                       
    const after = scene(crossedInto('discard', mine), crossedInto('discard', theirs))
    const items = makeLastRitesItems([theirs, mine], after, drawEffect, P1)
    expect(items.map((i) => i.controller)).toEqual([P1, P2])
  })

  test('不传回合玩家 → 保持产出顺序(稳定,不擅自重排)', () => {
    const a = snapshotOnDeath(obj('a', 'battlefield:shared:0', P1))
    const b = snapshotOnDeath(obj('b', 'battlefield:shared:0', P2))
    const after = scene(crossedInto('discard', a), crossedInto('discard', b))
    expect(makeLastRitesItems([b, a], after, drawEffect).map((i) => i.controller)).toEqual([P2, P1])
  })
})
