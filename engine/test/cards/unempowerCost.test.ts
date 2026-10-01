import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { isEmpowered } from '../../src/keywords/empower'
import { cardTagsOf } from '../../data/cardTagQuery'                  

                                                 
                                                      
  
        
                                            
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 0, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function unit(oid: string, extra: Partial<GameObject> = {}): GameObject {
  return { ...obj(oid, 'BLK', BF0), baseMight: 2, baseTypes: ['unit'], ...extra }
}
function scene(objs: GameObject[], mana = 5, pips: Record<string, number> = { blue: 3 }): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana, runes: pips } },
  }
}
const realDeps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }
const actsOf = (g: InteractiveGame, oid: string, key: string): InteractiveAction[] =>
  g.legalActions(P1).filter(
    (a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === oid && (a as { ability: string }).ability === key,
  )
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 16 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}

describe('★可疑之书 VEN-054 第二条:解除强化+{1}+横置 → 抽一张牌', () => {
  test('真 registry 现在给它【两条】技能(强化 + 抽牌)', () => {
    const keys = activatedFor('VEN-054').map((s) => s.key)
    expect(keys.some((k) => k.includes('empower'))).toBe(true)
    expect(keys).toContain('VEN-054:draw')
  })

  test('★未强化 → 抽牌那条根本不出现(否则白付 1 法力+横置换 §442.1.a.1 的"无任何效果")', () => {
    const g = new InteractiveGame(scene([obj('b', 'VEN-054', `base:${P1}`)]), realDeps)
    expect(actsOf(g, 'b', 'VEN-054:draw')).toHaveLength(0)
  })

  test('★已强化 → 出得来;结算后【真的抽到牌、真的解除了强化、真的横置了】', () => {
    const st = scene([obj('b', 'VEN-054', `base:${P1}`, { counters: { empower: 1 } })])
                 
    const deckId = `mainDeck:${P1}`                                           
    const card = obj('c1', 'BLK', deckId)
    const withDeck: GameState = {
      ...st,
      objects: { ...st.objects, c1: card },
      zones: { ...st.zones, [deckId]: { ...st.zones[deckId]!, contents: [...st.zones[deckId]!.contents, asObjId('c1')] } },
    }
    const g = new InteractiveGame(withDeck, realDeps)
    const acts = actsOf(g, 'b', 'VEN-054:draw')
    expect(acts).toHaveLength(1)
    const handBefore = g.state.zones[`hand:${P1}`]!.contents.length
    g.apply(acts[0]!)
    expect(isEmpowered(g.state.objects['b']!)).toBe(false)                     
    expect(g.state.objects['b']!.status.tapped).toBe(true)
    expect(g.state.runePools[P1]!.mana).toBe(4)
    settle(g)
    expect(g.state.zones[`hand:${P1}`]!.contents.length).toBe(handBefore + 1)            
  })

  test('法力不足 {1} → 不出现(三项费用缺一不可)', () => {
    const g = new InteractiveGame(
      scene([obj('b', 'VEN-054', `base:${P1}`, { counters: { empower: 1 } })], 0, {}),
      realDeps,
    )
    expect(actsOf(g, 'b', 'VEN-054:draw')).toHaveLength(0)
  })

  test('已横置 → 不出现', () => {
    const g = new InteractiveGame(
      scene([obj('b', 'VEN-054', `base:${P1}`, { counters: { empower: 1 }, status: { tapped: true } })]),
      realDeps,
    )
    expect(actsOf(g, 'b', 'VEN-054:draw')).toHaveLength(0)
  })

  test('★服务端权威:未强化时硬发这条动作 → 拒绝,盘面一点没动', () => {
    const ok = new InteractiveGame(scene([obj('b', 'VEN-054', `base:${P1}`, { counters: { empower: 1 } })]), realDeps)
    const legit = actsOf(ok, 'b', 'VEN-054:draw')[0]!
    const g = new InteractiveGame(scene([obj('b', 'VEN-054', `base:${P1}`)]), realDeps)         
    const before = g.state
    g.apply(legit)
    expect(g.state).toBe(before)
  })
})

describe('★铁血狼母 VEN-153/196 第二条:解除强化+{A}+横置 → 让一名单位变为活跃', () => {
  test('真 registry 出得来(两个卡号都要有)', () => {
    expect(activatedFor('VEN-153').some((s) => s.key === 'VEN-153:ready')).toBe(true)
    expect(activatedFor('VEN-196').some((s) => s.key === 'VEN-153:ready')).toBe(true)
  })

  test('★费用是【一枚任意特性符能】不是 1 点法力', () => {
    const spec = activatedFor('VEN-153').find((s) => s.key === 'VEN-153:ready')!
    expect(spec.cost).toEqual({ mana: 0, pips: [[]] })
  })

  test('★有符能且已强化 → 结算后目标单位真的不再休眠', () => {
    const g = new InteractiveGame(
      scene(
        [obj('L', 'VEN-153', `legend:${P1}`, { counters: { empower: 1 } }), unit('u', { status: { dormant: true } })],
        0,
        { orange: 2 },
      ),
      realDeps,
    )
    const acts = actsOf(g, 'L', 'VEN-153:ready')
    expect(acts.length).toBeGreaterThan(0)
    const pick = acts.find((a) => (a as { target?: string }).target === 'u')!
    expect(pick).toBeDefined()
    g.apply(pick)
    settle(g)
    expect(g.state.objects['u']!.status.dormant).toBe(false)
    expect(isEmpowered(g.state.objects['L']!)).toBe(false)            
  })

  test('未强化 → 不出现', () => {
    const g = new InteractiveGame(
      scene([obj('L', 'VEN-153', `legend:${P1}`), unit('u')], 0, { orange: 2 }),
      realDeps,
    )
    expect(actsOf(g, 'L', 'VEN-153:ready')).toHaveLength(0)
  })

  test('★没有符能 → 不出现(法力再多也不行,[A] 要的是 pip)', () => {
    const g = new InteractiveGame(
      scene([obj('L', 'VEN-153', `legend:${P1}`, { counters: { empower: 1 } }), unit('u')], 9, {}),
      realDeps,
    )
    expect(actsOf(g, 'L', 'VEN-153:ready')).toHaveLength(0)
  })
})

describe('★海克斯圆盘 VEN-087 第二条:解除强化+{1}+横置 → 打出一名3[S]机器人到基地', () => {
  test('真 registry 现在给它【两条】技能', () => {
    const keys = activatedFor('VEN-087').map((s) => s.key)
    expect(keys.some((k) => k.includes('empower'))).toBe(true)
    expect(keys).toContain('VEN-087:robot')
  })

  test('未强化 → 不出现', () => {
    const g = new InteractiveGame(scene([obj('d', 'VEN-087', `base:${P1}`)]), realDeps)
    expect(actsOf(g, 'd', 'VEN-087:robot')).toHaveLength(0)
  })

  test('★已强化 → 结算后基地真的多了一个 3[S] 的机器人', () => {
    const g = new InteractiveGame(
      scene([obj('d', 'VEN-087', `base:${P1}`, { counters: { empower: 1 } })]),
      realDeps,
    )
    const acts = actsOf(g, 'd', 'VEN-087:robot')
    expect(acts).toHaveLength(1)
    g.apply(acts[0]!)
    settle(g)
    const robots = Object.values(g.state.objects).filter((o) => o.defId === 'token:机器人')
    expect(robots).toHaveLength(1)
    expect(robots[0]!.baseMight).toBe(3)
    expect(robots[0]!.zone).toBe(`base:${P1}`)
  })

  test('★它是【休眠】进场的(§359.2.c 单位指示物默认休眠,卡文没写"活跃的")', () => {
    const g = new InteractiveGame(
      scene([obj('d', 'VEN-087', `base:${P1}`, { counters: { empower: 1 } })]),
      realDeps,
    )
    g.apply(actsOf(g, 'd', 'VEN-087:robot')[0]!)
    settle(g)
    const robot = Object.values(g.state.objects).find((o) => o.defId === 'token:机器人')!
    expect(robot.status.dormant).toBe(true)
  })

                                             
                                                        
                                                        
                                                          
                                                                           
                                                                    
  test('★"机器人"同时记成 §150 标签「机械」(只给名字,按标签选目标的卡会找不到它)', () => {
    const g = new InteractiveGame(
      scene([obj('d', 'VEN-087', `base:${P1}`, { counters: { empower: 1 } })]),
      realDeps,
    )
    g.apply(actsOf(g, 'd', 'VEN-087:robot')[0]!)
    settle(g)
    const robot = Object.values(g.state.objects).find((o) => o.defId === 'token:机器人')!
    expect(robot.baseTags).toContain('机械')
    expect(cardTagsOf('token:机器人'), '★776 真正被查的那一口').toContain('机械')
  })

  test('三项费用都真付了:解除强化 + 少 1 法力 + 自身横置', () => {
    const g = new InteractiveGame(
      scene([obj('d', 'VEN-087', `base:${P1}`, { counters: { empower: 1 } })]),
      realDeps,
    )
    g.apply(actsOf(g, 'd', 'VEN-087:robot')[0]!)
    expect(isEmpowered(g.state.objects['d']!)).toBe(false)
    expect(g.state.runePools[P1]!.mana).toBe(4)
    expect(g.state.objects['d']!.status.tapped).toBe(true)
  })
})

describe('★剑头蛟的卵 VEN-075:补齐「休眠进场」与 [反应>] 技能(PARTIAL_IMPL 最后一张)', () => {
  test('先钉住前提:这张卡在真 registry 里是【装备】', () => {
    expect(cardKind('VEN-075')).toBe('equipment')
  })

  test('真 registry 现在给它【两条】技能(强化 + 反应获得资源)', () => {
    const keys = activatedFor('VEN-075').map((s) => s.key)
    expect(keys.some((k) => k.includes('empower'))).toBe(true)
    expect(keys).toContain('VEN-075:gain')
  })

  test('★[反应] 关键词真填进了规格(不是只写在 label 里给人看)', () => {
    const spec = activatedFor('VEN-075').find((s) => s.key === 'VEN-075:gain')!
    expect(spec.keywords).toContain('反应')
  })

  test('★未强化时结算 → 获得{1}', () => {
    const g = new InteractiveGame(scene([obj('e', 'VEN-075', `base:${P1}`)], 0, {}), realDeps)
    const acts = actsOf(g, 'e', 'VEN-075:gain')
    expect(acts).toHaveLength(1)
    g.apply(acts[0]!)
    settle(g)
    expect(g.state.runePools[P1]!.mana).toBe(1)
  })

  test('★已强化时【改为】获得{2}(替换不是叠加:是 2 不是 3)', () => {
    const g = new InteractiveGame(
      scene([obj('e', 'VEN-075', `base:${P1}`, { counters: { empower: 1 } })], 0, {}),
      realDeps,
    )
    g.apply(actsOf(g, 'e', 'VEN-075:gain')[0]!)
    settle(g)
    expect(g.state.runePools[P1]!.mana).toBe(2)
  })

  test('★这条技能【不消耗强化】(别把它当成解除强化那一族)', () => {
    const g = new InteractiveGame(
      scene([obj('e', 'VEN-075', `base:${P1}`, { counters: { empower: 1 } })], 0, {}),
      realDeps,
    )
    g.apply(actsOf(g, 'e', 'VEN-075:gain')[0]!)
    settle(g)
    expect(isEmpowered(g.state.objects['e']!)).toBe(true)          
    expect(g.state.objects['e']!.status.tapped).toBe(true)        
  })

  test('已横置 → 付不出 [E],不出现', () => {
    const g = new InteractiveGame(
      scene([obj('e', 'VEN-075', `base:${P1}`, { status: { tapped: true } })], 0, {}),
      realDeps,
    )
    expect(actsOf(g, 'e', 'VEN-075:gain')).toHaveLength(0)
  })
})
