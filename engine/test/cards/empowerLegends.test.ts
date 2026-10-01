import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { detectTriggers } from '../../src/dsl/trigger'
import { isEmpowered } from '../../src/keywords/empower'
import { effectiveMight } from '../../src/state/might'
import { makeEmpowerOnOtherTrigger, MIRROR_LEGEND_SPEC } from '../../data/cards/empower-legends'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'

                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, zone = BF0, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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
const trig = () => makeEmpowerOnOtherTrigger(asObjId('me'), P1, 'VEN-151')
const ev = (target: string) => ({ kind: 'empower' as const, target: asObjId(target) })
const empowered = (id: string): Partial<GameObject> => ({ counters: { empower: 1 } })

describe('①「当你强化【其他物体】时,强化我」', () => {
  test('强化了我的别的东西 → 触发', () => {
    const s = scene(obj('me', `legend:${P1}`), obj('other'))
    expect(detectTriggers(s, ev('other'), [trig()], P1)).toHaveLength(1)
  })

  test('★强化的是【我自己】→ 不触发(否则自激成环)', () => {
    const s = scene(obj('me', `legend:${P1}`))
    expect(detectTriggers(s, ev('me'), [trig()], P1)).toHaveLength(0)
  })

  test('★强化的是【对手的】东西 → 不触发("你强化"限己方)', () => {
    const s = scene(obj('me', `legend:${P1}`), obj('theirs', BF0, P2))
    expect(detectTriggers(s, ev('theirs'), [trig()], P1)).toHaveLength(0)
  })

  test('触发结算 → 我变为已强化', () => {
    const s0 = scene(obj('me', `legend:${P1}`), obj('other'))
    const items = detectTriggers(s0, ev('other'), [trig()], P1)
    const s = applyEvents(s0, items[0]!.resolve(s0, {}, items[0]!)).state
    expect(isEmpowered(s.objects['me' as never])).toBe(true)
  })

  test('★两张互相带这条也不会无限循环(各自只认"其他物体",且已强化的不再被强化)', () => {
    const a = makeEmpowerOnOtherTrigger(asObjId('a'), P1, 'VEN-151')
    const b = makeEmpowerOnOtherTrigger(asObjId('b'), P1, 'VEN-195')
    let s = scene(obj('a', `legend:${P1}`), obj('b', `legend:${P1}`), obj('x'))
                       
    const items = detectTriggers(s, ev('x'), [a, b], P1)
    expect(items).toHaveLength(2)
    for (const it of items) s = applyEvents(s, it.resolve(s, {}, it)).state
                                      
    expect(isEmpowered(s.objects['a' as never])).toBe(true)
    expect(isEmpowered(s.objects['b' as never])).toBe(true)
  })
})

describe('②「解除我的强化」作为非资源费用', () => {
                                                                   
                                                     
                                       
  const legendAt = (oid: string, extra: Partial<GameObject> = {}): GameObject => ({
    oid: asObjId(oid), defId: 'VEN-153', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
    baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  })
  const gameWith = (objs: GameObject[]): InteractiveGame => {
    const base = createInitialState([P1, P2], 2)
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of objs) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return new InteractiveGame(
      { ...base, activePlayer: P1, phase: 'main', objects, zones,
        runePools: { ...base.runePools, [P1]: { mana: 5, runes: { orange: 3 } } } },
      { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind },
    )
  }
  const readyActs = (g: InteractiveGame): readonly unknown[] =>
    g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && (a as { ability: string }).ability === 'VEN-153:ready')

  const someUnit: GameObject = {
    oid: asObjId('u'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: { dormant: true },
  }

  test('★未强化 → 这条动作根本不出现(§442.1.a.1 解除无效果 ⇒ 不能让人白付其余费用)', () => {
    expect(readyActs(gameWith([legendAt('me'), someUnit]))).toHaveLength(0)
  })

  test('已强化 → 出得来,发动后变回未强化', () => {
    const g = gameWith([legendAt('me', { counters: { empower: 1 } }), someUnit])
    const acts = readyActs(g)
    expect(acts.length).toBeGreaterThan(0)
    g.apply(acts[0] as never)
    expect(isEmpowered(g.state.objects['me' as never])).toBe(false)
  })

  test('物件已不在 → 自然没有这条动作', () => {
    expect(readyActs(gameWith([someUnit]))).toHaveLength(0)
  })
})

describe('流光镜影 VEN-151 第二半:战场上一名单位本回合 -2', () => {
  test('冒号前【没有】资源费,cost 就该是空的', () => {
    expect(MIRROR_LEGEND_SPEC.cost).toEqual({})
    expect(MIRROR_LEGEND_SPEC.tapSelf).toBe(true)        
  })

  test('★合法目标只在【战场】上(基地里的不算)', () => {
    const s = scene(obj('onBf', BF0), obj('inBase', `base:${P1}`))
    expect(MIRROR_LEGEND_SPEC.legalTargets(s)).toEqual(['onBf'])
  })

  test('效果落地:目标本回合 -2 战力', () => {
    const s0 = scene(obj('t', BF0))
    const evs = MIRROR_LEGEND_SPEC.makeResolve({ selfOid: 'me', controller: P1, target: 't' })()
    const s = applyEvents(s0, evs).state
    expect(effectiveMight(s.objects['t' as never]!).reference).toBe(2)         
  })

  test('没选目标 → 不产生事件', () => {
    expect(MIRROR_LEGEND_SPEC.makeResolve({ selfOid: 'me', controller: P1 })()).toEqual([])
  })
})
