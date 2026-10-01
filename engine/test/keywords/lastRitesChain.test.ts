import { describe, expect, test } from 'vitest'
import { gearLastRitesEffect } from '../../data/cards/gear-triggers'
import { banishedBy } from '../../src/actions/banish'
import { collectLastRites } from '../../src/keywords/lastRites'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import type { DeathSnapshot } from '../../src/keywords/lastRites'
import { effectiveMight } from '../../src/state/might'

                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: ['绝念'], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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
                     
const drawOnDeath = (s: DeathSnapshot): readonly GameEvent[] => [{ kind: 'draw', player: s.controller, count: 1 }]
                       
const lethal = (target: string): GameEvent => ({ kind: 'damage', target: asObjId(target), amount: 2 })

describe('接线位置:走 applyEvents 的路径都覆盖', () => {
  test('单位被致命伤害打死 → 绝念作为【待处理】项目入链', () => {
    const s = applyEvents(scene(obj('dead')), [lethal('dead')], { lastRitesEffect: drawOnDeath }).state
    expect(s.chain).toHaveLength(1)
    expect(s.chain[0]!.status).toBe('pending')
    expect(s.chain[0]!.sourceDefId).toBe('D-dead')
    expect(s.chain[0]!.controller).toBe(P1)
  })

  test('链项目结算产出卡文效果(按死前快照,不查已离场的物件)', () => {
    const s = applyEvents(scene(obj('dead')), [lethal('dead')], { lastRitesEffect: drawOnDeath }).state
    const item = s.chain[0]!
    expect(item.resolve(s, {}, item)).toEqual([{ kind: 'draw', player: P1, count: 1 }])
  })

  test('★不提供 lastRitesEffect ⇒ 通道关闭,行为与接线前完全一致', () => {
    const s = applyEvents(scene(obj('dead')), [lethal('dead')], {}).state
    expect(s.chain).toHaveLength(0)
    expect(s.objects['dead' as never]).toBeUndefined()        
  })

  test('没有绝念的单位死了不入链', () => {
    const s = applyEvents(scene(obj('plain', { baseKeywords: [] })), [lethal('plain')], { lastRitesEffect: drawOnDeath }).state
    expect(s.chain).toHaveLength(0)
  })
})

describe('§808.1.d.1 与守护天使的交互(替换摧毁 → 触发作废)', () => {
  test('摧毁被替换成"清伤+召回"→ 绝念【不】入链', () => {
                                         
    const saveHook = (st: GameState, oid: string) => {
      const o = st.objects[oid as never]
      if (!o) return null
      return {
        ...st,
        objects: { ...st.objects, [oid]: { ...o, damage: 0, zone: asZoneId(`base:${P1}`), status: { dormant: true as const } } },
      }
    }
    const s = applyEvents(scene(obj('saved')), [lethal('saved')], {
      lastRitesEffect: drawOnDeath,
      cleanupHooks: { replaceDestroy: (st, oid) => saveHook(st, oid as string) },
    }).state
    expect(s.objects['saved' as never]).toBeDefined()       
    expect(s.chain).toHaveLength(0)                           
  })
})

describe('§808.2 多个绝念 / §808.2.a 顺序', () => {
  test('一个单位两个绝念 → 两条项目分别入链', () => {
    const s = applyEvents(scene(obj('dead', { baseKeywords: ['绝念', '绝念'] })), [lethal('dead')], { lastRitesEffect: drawOnDeath }).state
    expect(s.chain).toHaveLength(2)
  })

  test('§808.2.a 回合玩家的绝念先入链', () => {
    const mine = obj('mine')
    const theirs = obj('theirs', { owner: P2, controller: P2 })
    const s = applyEvents(scene(mine, theirs), [lethal('theirs'), lethal('mine')], { lastRitesEffect: drawOnDeath }).state
    expect(s.chain).toHaveLength(2)
    expect(s.chain.map((i) => i.controller)).toEqual([P1, P2])                     
  })

  test('同一次清理里死两个:各自一条,互不吞并', () => {
    const s = applyEvents(scene(obj('a'), obj('b')), [lethal('a'), lethal('b')], { lastRitesEffect: drawOnDeath }).state
    expect(s.chain.map((i) => i.sourceDefId).sort()).toEqual(['D-a', 'D-b'])
  })
})

describe('快照内容可被效果引用(§808.1.d.3)', () => {
  test('效果读死前战力:5 力单位死后按 5 结算,而不是 0', () => {
    const big = obj('big', { baseMight: 5 })
    const s0 = scene(big)
    expect(effectiveMight(s0.objects['big' as never]!).reference).toBe(5)
    const s = applyEvents(s0, [{ kind: 'damage', target: asObjId('big'), amount: 5 }], {
      lastRitesEffect: (snap) => [{ kind: 'draw', player: snap.controller, count: snap.might }],
    }).state
    const item = s.chain[0]!
    expect(item.resolve(s, {}, item)).toEqual([{ kind: 'draw', player: P1, count: 5 }])
  })
})

describe('§718.3 武装的绝念注入穿戴者(循环第41轮)', () => {
  const gear = (id: string, defId: string, host: string): GameObject => ({
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 0, baseKeywords: ['装配黄色'], baseTags: ['武装'], baseTypes: ['equipment'],
    baseGrants: ['绝念'], damage: 0, counters: {}, status: { attachedTo: asObjId(host) },
  })

  test('穿戴神圣剪刀的单位死掉 → 绝念触发(关键词由武装授予)', () => {
    const host = obj('host', { baseKeywords: [] })              
    const s0 = scene(host, gear('sc', 'SFD-172', 'host'))
    const s = applyEvents(s0, [lethal('host')], { lastRitesEffect: gearLastRitesEffect as never }).state
    expect(s.chain).toHaveLength(1)
    const item = s.chain[0]!
    expect(item.resolve(s, {}, item)).toEqual([{ kind: 'draw', player: P1, count: 1 }])
  })

  test('快照记下死时贴着谁——data 层靠它分辨绝念来自哪张武装', () => {
    const host = obj('host', { baseKeywords: [] })
    const s0 = scene(host, gear('sc', 'SFD-172', 'host'))
    const [snap] = collectLastRites(s0, [asObjId('host')])
    expect(snap!.attachedDefIds).toContain('SFD-172')
    expect(snap!.defId).toBe('D-host')                   
  })

                                                           
                                         
  test('未登记效果的武装 → 不入一条空转项目', () => {
    const host = obj('host', { baseKeywords: [] })
    const s0 = scene(host, gear('zd', 'SFD-999', 'host'))
    const s = applyEvents(s0, [lethal('host')], { lastRitesEffect: gearLastRitesEffect as never }).state
    expect(s.chain).toHaveLength(0)
  })
})

describe('Z型驱动 SFD-090「绝念 — 放逐我」全链路(循环第43轮)', () => {
  const zdrive = (id: string, host: string): GameObject => ({
    oid: asObjId(id), defId: 'SFD-090', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 0, baseKeywords: ['装配1蓝色'], baseTags: ['武装'], baseTypes: ['equipment'],
    baseGrants: ['绝念'], damage: 0, counters: {}, status: { attachedTo: asObjId(host) },
  })

  test('穿戴者死 → 绝念放逐【穿戴者】(§718.5.g「我」=顶部卡牌),并记进驱动的账本', () => {
    const host = obj('host', { baseKeywords: [] })
    const s0 = scene(host, zdrive('zd', 'host'))
    let s = applyEvents(s0, [lethal('host')], { lastRitesEffect: gearLastRitesEffect as never }).state
    expect(s.chain).toHaveLength(1)
           
    const item = s.chain[0]!
    s = applyEvents(s, item.resolve(s, {}, item)).state
    expect(s.zones[`exile:${P1}`]!.contents).toHaveLength(1)
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(0)           
                                                     
    expect(s.objects['zd' as never]).toBeDefined()
    expect(banishedBy(s, asObjId('zd'))).toHaveLength(1)
  })

  test('§435.4.b 顶部卡离场 → 驱动留在原场地位置且【不换 oid】(账本的键因此活着)', () => {
    const s0 = scene(obj('host', { baseKeywords: [] }), zdrive('zd', 'host'))
    const s = applyEvents(s0, [lethal('host')], {}).state
    const zd = s.objects['zd' as never]
    expect(zd).toBeDefined()
    expect(zd!.zone).toBe(BF0)
    expect((zd!.status as { attachedTo?: string }).attachedTo).toBeUndefined()       
  })

  test('★§427.3.a 两张同名驱动各记各的账,不会并成一本', () => {
    const s0 = scene(
      obj('h1', { baseKeywords: [] }), zdrive('z1', 'h1'),
      obj('h2', { baseKeywords: [] }), zdrive('z2', 'h2'),
    )
    let s = applyEvents(s0, [lethal('h1'), lethal('h2')], { lastRitesEffect: gearLastRitesEffect as never }).state
    expect(s.chain).toHaveLength(2)
    for (const it of s.chain) s = applyEvents(s, it.resolve(s, {}, it)).state
    expect(banishedBy(s, asObjId('z1'))).toHaveLength(1)
    expect(banishedBy(s, asObjId('z2'))).toHaveLength(1)
    expect(banishedBy(s, asObjId('z1'))[0]).not.toBe(banishedBy(s, asObjId('z2'))[0])
  })

  test('快照带回废牌堆里的新身份 postDeathOid(§124 换了 oid,不能拿死前的那个)', () => {
                                                          
                                                             
    const seen: DeathSnapshot[] = []
    const s0 = scene(obj('host', { baseKeywords: ['绝念'] }))
    const s = applyEvents(s0, [lethal('host')], {
      lastRitesEffect: (snap) => { seen.push(snap); return [{ kind: 'draw', player: P1, count: 1 }] },
    }).state
    expect(seen.length).toBeGreaterThan(0)
    expect(seen[0]!.postDeathOid).toBeDefined()
    expect(seen[0]!.postDeathOid).not.toBe('host')              
    expect(s.zones[`discard:${P1}`]!.contents).toContain(seen[0]!.postDeathOid)
  })
})
