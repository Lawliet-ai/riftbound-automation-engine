import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { isEmpowered, empowerCount } from '../../src/keywords/empower'

                                                 
                                                      
                                                                            
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const GEAR_IDS: ReadonlySet<string> = new Set(['VEN-054', 'VEN-087', 'VEN-075'])                
function obj(oid: string, defId: string, zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: GEAR_IDS.has(defId) ? ['equipment'] : ['unit']                                       ,
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], hand: GameObject[] = [], mana = 9): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, ...hand]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana, runes: { red: 5 } } },
  }
}
const realDeps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 16 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}
const empowerActs = (g: InteractiveGame, oid: string): InteractiveAction[] =>
  g.legalActions(P1).filter(
    (a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === oid && (a as { ability: string }).ability.includes('empower'),
  )

describe('★拳拳魄罗 VEN-007:[强化] — 弃置一张手牌', () => {
  test('真 registry 出得来这条规格(不是只有工厂的单测绿着)', () => {
    expect(activatedFor('VEN-007').some((s) => s.key === 'VEN-007:empower')).toBe(true)
  })

  test('★手上有牌 → 激活 → settle → 真的已强化,且那张手牌真的进了弃牌堆', () => {
    const g = new InteractiveGame(
      scene([obj('p', 'VEN-007')], [obj('h1', 'BLK', `hand:${P1}`)]),
      realDeps,
    )
    const acts = empowerActs(g, 'p')
    expect(acts.length).toBeGreaterThan(0)
    g.apply(acts[0]!)
    settle(g)
    expect(isEmpowered(g.state.objects['p']!)).toBe(true)          
    expect(g.state.zones[`discard:${P1}`]!.contents.length).toBe(1)          
  })

  test('§203.3 手上没牌 → 这条动作根本不出现(弃不出就不是合法激活)', () => {
    const g = new InteractiveGame(scene([obj('p', 'VEN-007')]), realDeps)
    expect(empowerActs(g, 'p')).toHaveLength(0)
  })

  test('★§827.1.c.1「仅在未强化时」:已强化后不再列出(否则白弃一张牌换无操作)', () => {
    const g = new InteractiveGame(
      scene([obj('p', 'VEN-007', BF0, { counters: { empower: 1 } })], [obj('h1', 'BLK', `hand:${P1}`)]),
      realDeps,
    )
    expect(empowerActs(g, 'p')).toHaveLength(0)
  })
})

describe('★可疑之书 VEN-054 / 海克斯圆盘 VEN-087:[强化] — [横置]', () => {
  test('未横置未强化 → 激活 → 真的已强化', () => {
    const g = new InteractiveGame(scene([obj('b', 'VEN-054')]), realDeps)
    const acts = empowerActs(g, 'b')
    expect(acts.length).toBeGreaterThan(0)
    g.apply(acts[0]!)
    settle(g)
    expect(isEmpowered(g.state.objects['b']!)).toBe(true)
    expect(g.state.objects['b']!.status.tapped).toBe(true)              
  })

  test('已横置 → 付不出 [E] ⇒ 不列出', () => {
    const g = new InteractiveGame(scene([obj('b', 'VEN-087', BF0, { status: { tapped: true } })]), realDeps)
    expect(empowerActs(g, 'b')).toHaveLength(0)
  })
})

describe('剑头蛟的卵 VEN-075:[强化] — 支付{1},[横置]', () => {
  test('法力不足 {1} ⇒ 不列出', () => {
    const g = new InteractiveGame(scene([obj('e', 'VEN-075')], [], 0), realDeps)
    expect(empowerActs(g, 'e')).toHaveLength(0)
  })

  test('付得起 → 强化成功,法力少 1 且自身横置', () => {
    const g = new InteractiveGame(scene([obj('e', 'VEN-075')], [], 3), realDeps)
    g.apply(empowerActs(g, 'e')[0]!)
    settle(g)
    expect(isEmpowered(g.state.objects['e']!)).toBe(true)
    expect(g.state.runePools[P1]!.mana).toBe(2)
    expect(g.state.objects['e']!.status.tapped).toBe(true)
  })
})

describe('★§441.1.c.1 多次强化权限:本轮迁移前后【行为真的不同】的那一格', () => {
                                                 
                                                               
                                                                 
                                                                
  test('缺省上限 1:已强化 1 层 ⇒ 到顶,不再列出(与旧行为一致)', () => {
    const g = new InteractiveGame(
      scene([obj('b', 'VEN-054', BF0, { counters: { empower: 1 } })]),
      realDeps,
    )
    expect(empowerCount(g.state.objects['b']!)).toBe(1)
    expect(empowerActs(g, 'b')).toHaveLength(0)
  })

  test('未强化 ⇒ 未到顶,列得出(两种判据在这一格同答案)', () => {
    const g = new InteractiveGame(scene([obj('b', 'VEN-054')]), realDeps)
    expect(empowerActs(g, 'b').length).toBeGreaterThan(0)
  })

  test.todo('★等卡池里出现真正带「我最多可以拥有3个已强化」的卡(如凯尔 VEN-134),补:已强化1层仍可再强化')
})
