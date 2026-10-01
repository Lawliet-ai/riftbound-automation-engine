import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { isEmpowered } from '../../src/keywords/empower'
import { EGG_EMPOWER_SPEC, PORO_EMPOWER_SPEC, TAP_EMPOWER_SPEC } from '../../data/cards/empower-nonresource'

                                         
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const GEAR_IDS: ReadonlySet<string> = new Set(['VEN-054', 'VEN-087', 'VEN-075'])                
function obj(id: string, defId: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: GEAR_IDS.has(defId) ? ['equipment'] : ['unit']                                       , damage: 0, counters: {}, status: {}, ...extra,
  }
}
function handCard(id: string): GameObject {
  return {
    oid: asObjId(id), defId: 'HAND', owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 1, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
    runePools: { ...base.runePools, [P1]: { mana, runes: {} } },
  }
}
const deps = (spec: unknown, defId: string) => ({
  getTriggers: () => [],
  handPlaySpecs: () => [],
  activatedFor: (d: string) => (d === defId ? [spec as never] : []),
  cardKeywords: () => [],
})
const acts = (g: InteractiveGame) => g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE')
   
                                                     
                                    
                                                      
   
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 12 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}
const empowered = { counters: { empower: 1 } }

describe('★「仅在未强化时可用」必须落到动作枚举上', () => {
  test('未强化 → 列得出这条强化技能', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-054')]), deps(TAP_EMPOWER_SPEC, 'VEN-054'))
    expect(acts(g).length).toBeGreaterThan(0)
  })

  test('★已强化 → 【一条都不列】(否则玩家会白付费用换个无操作)', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-054', empowered)]), deps(TAP_EMPOWER_SPEC, 'VEN-054'))
    expect(acts(g)).toEqual([])
  })
})

describe('形态①「[强化] — [横置]」', () => {
  test('已横置 → 付不起,不列', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-054', { status: { tapped: true } })]), deps(TAP_EMPOWER_SPEC, 'VEN-054'))
    expect(acts(g)).toEqual([])
  })

  test('★激活后:我变为已强化,且自己被横置', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-054')]), deps(TAP_EMPOWER_SPEC, 'VEN-054'))
    g.apply(acts(g)[0]!)
    expect(g.state.objects['u' as never]!.status.tapped).toBe(true)          
    settle(g)                         
    expect(isEmpowered(g.state.objects['u' as never])).toBe(true)
  })

  test('冒号前没有资源费 ⇒ cost 为空', () => {
    expect(TAP_EMPOWER_SPEC['cost']).toEqual({})
  })
})

describe('形态②「[强化] — 支付{1},[横置]」', () => {
  test('钱不够 → 不列', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-075')], 0), deps(EGG_EMPOWER_SPEC, 'VEN-075'))
    expect(acts(g)).toEqual([])
  })

  test('★激活后真的扣了 1 法力', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-075')], 3), deps(EGG_EMPOWER_SPEC, 'VEN-075'))
    g.apply(acts(g)[0]!)
    expect(g.state.runePools[P1]!.mana).toBe(2)          
    settle(g)
    expect(isEmpowered(g.state.objects['u' as never])).toBe(true)
  })
})

describe('形态③「[强化] — 弃置一张手牌」(拳拳魄罗 VEN-007)', () => {
  test('★手牌为空 → 弃不出来,不列', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-007')]), deps(PORO_EMPOWER_SPEC, 'VEN-007'))
    expect(acts(g)).toEqual([])
  })

  test('★激活后:手牌少一张、废牌堆多一张、我变为已强化', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-007'), handCard('h')]), deps(PORO_EMPOWER_SPEC, 'VEN-007'))
    g.apply(acts(g)[0]!)
    expect(g.state.zones[`hand:${P1}`]!.contents).toHaveLength(0)          
    expect(g.state.zones[`discard:${P1}`]!.contents).toHaveLength(1)
    settle(g)
    expect(isEmpowered(g.state.objects['u' as never])).toBe(true)
  })

  test('手里两张 → 逐张展开成两条候选(弃哪张是玩家的选择)', () => {
    const g = new InteractiveGame(scene([obj('u', 'VEN-007'), handCard('h1'), handCard('h2')]), deps(PORO_EMPOWER_SPEC, 'VEN-007'))
    expect(acts(g)).toHaveLength(2)
  })
})
