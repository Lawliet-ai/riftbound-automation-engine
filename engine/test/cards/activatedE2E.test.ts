import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activatedFor, cardKeywords } from '../../data/registry'
import { isEmpowered } from '../../src/keywords/empower'
import { buffCount } from '../../src/keywords/buff'
import { effectiveMight } from '../../src/state/might'

                                           
                                                      
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, defId: string, zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], mana = 5): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana, runes: { yellow: 3, orange: 3 } } },
  }
}
                                                 
const realDeps = { getTriggers: () => [], handPlaySpecs: () => [], activatedFor, cardKeywords }
const activations = (g: InteractiveGame, p = P1): InteractiveAction[] =>
  g.legalActions(p).filter((a) => a.kind === 'ACTIVATE')
                         
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 12 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}

describe('★瑟提 OGN-164:消耗我的增益 → 本回合 +4(走真 registry 与结算链)', () => {
  test('身上有增益 → registry 真的列得出这条技能', () => {
    const g = new InteractiveGame(scene([obj('sett', 'OGN-164', BF0, { counters: { buff: 1 } })]), realDeps)
    expect(activations(g).length).toBeGreaterThan(0)
  })

  test('★没有增益 → 一条都不列(§203.3 付不起)', () => {
    const g = new InteractiveGame(scene([obj('sett', 'OGN-164')]), realDeps)
    expect(activations(g)).toEqual([])
  })

  test('★端到端:激活 → 增益当场被消耗 → 让过结算 → 战力真的 +4', () => {
    const g = new InteractiveGame(scene([obj('sett', 'OGN-164', BF0, { counters: { buff: 1 } })]), realDeps)
    g.apply(activations(g)[0]!)
    expect(buffCount(g.state.objects['sett' as never])).toBe(0)          
    settle(g)
    expect(effectiveMight(g.state.objects['sett' as never]!).reference).toBe(8)         
  })
})

describe('★流光镜影 VEN-151:解除我的强化+横置 → 一名单位本回合 -2', () => {
  const legend = (extra: Partial<GameObject> = {}): GameObject =>
    obj('mirror', 'VEN-151', `legend:${P1}`, extra)

  test('★未强化 → 列不出(§442.1.a.1 解除强化不产生效果 ⇒ 付不起)', () => {
    const g = new InteractiveGame(scene([legend(), obj('t', 'PLAIN')]), realDeps)
    expect(activations(g)).toEqual([])
  })

  test('已强化 → 列得出,且逐个战场单位展开成候选', () => {
    const g = new InteractiveGame(scene([legend({ counters: { empower: 1 } }), obj('t', 'PLAIN')]), realDeps)
    const a = activations(g)
    expect(a.length).toBeGreaterThan(0)
    expect(a.every((x) => (x as { target?: string }).target === 't')).toBe(true)
  })

  test('★端到端:激活 → 解除强化+横置当场结算 → 让过 → 目标真的 -2', () => {
    const g = new InteractiveGame(scene([legend({ counters: { empower: 1 } }), obj('t', 'PLAIN')]), realDeps)
    g.apply(activations(g)[0]!)
    expect(isEmpowered(g.state.objects['mirror' as never])).toBe(false)           
    expect(g.state.objects['mirror' as never]!.status.tapped).toBe(true)         
    settle(g)
    expect(effectiveMight(g.state.objects['t' as never]!).reference).toBe(2)         
  })

  test('已横置 → 付不起,不列(tapSelf 闸)', () => {
    const g = new InteractiveGame(
      scene([legend({ counters: { empower: 1 }, status: { tapped: true } }), obj('t', 'PLAIN')]),
      realDeps,
    )
    expect(activations(g)).toEqual([])
  })
})
