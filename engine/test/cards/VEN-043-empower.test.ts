import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { CARD_FACTS } from '../../data/cardFacts'
import { isEmpowered } from '../../src/keywords/empower'
import { deflectValue } from '../../src/keywords/deflect'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'

                                      
const might = (o: GameObject): number => effectiveMight(o).actual

                                               
                                                           
  
                            
                            
                                                                       
                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function claw(oid = 'c', zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-043')
  return {
    oid: asObjId(oid), defId: 'VEN-043', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], mana = 20): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana, runes: { green: 9, red: 9 } } },
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
const empowerAction = (g: InteractiveGame, oid: string): InteractiveAction | undefined =>
  g.legalActions(P1).find(
    (a): a is Extract<InteractiveAction, { kind: 'ACTIVATE' }> =>
      a.kind === 'ACTIVATE' && a.oid === oid && a.ability.startsWith('empower'),
  )

describe('★§827 [强化7] 主动技能:第一张真卡真的强化得了', () => {
  test('真 registry 给 VEN-043 出了强化规格(不是只有通用工厂自己的单测绿着)', () => {
    expect(activatedFor('VEN-043').some((s) => s.key.startsWith('empower'))).toBe(true)
  })

  test('★场上的钢爪 → ACTIVATE 强化 → 结算后【真的处于已强化状态】', () => {
    const g = new InteractiveGame(scene([claw()]), realDeps)
    expect(isEmpowered(g.state.objects['c']!)).toBe(false)
    const act = empowerAction(g, 'c')
    expect(act).toBeDefined()             
    g.apply(act!)
    settle(g)                    
    expect(isEmpowered(g.state.objects['c']!)).toBe(true)           
  })

  test('§827.1.c 费用是{7}:法力不够时这个动作根本不出现', () => {
    const g = new InteractiveGame(scene([claw()], 6), realDeps)
    expect(empowerAction(g, 'c')).toBeUndefined()
  })

  test('付了费:强化后法力真的少了 7', () => {
    const g = new InteractiveGame(scene([claw()], 20), realDeps)
    g.apply(empowerAction(g, 'c')!)
    expect(g.state.runePools[P1]!.mana).toBe(13)                     
  })

  test('★§441.1.b 已强化的物件不再出第二份强化动作', () => {
    const g = new InteractiveGame(scene([claw()], 20), realDeps)
    g.apply(empowerAction(g, 'c')!)
    settle(g)
    expect(empowerAction(g, 'c')).toBeUndefined()
  })
})

describe('★§828 [已强化>] 我获得{S}+7:是【持续条件】不是一次性加成', () => {
  const derive = (st: GameState): GameState => {
    setCardPassiveProvider(cardPassives)
    return recomputeContinuous(st)
  }

  test('未强化时战力是印刷值 0(没有无条件白送 +7)', () => {
    const st = derive(scene([claw()]))
    expect(might(st.objects['c']!)).toBe(0)
  })

  test('★已强化时战力 0+7=7', () => {
    const st = derive(scene([claw('c', BF0, { counters: { empower: 1 } })]))
    expect(might(st.objects['c']!)).toBe(7)
  })

  test('★解除强化 → 加成必须跟着消失(§828.1.c「只要处于」)', () => {
    const on = derive(scene([claw('c', BF0, { counters: { empower: 1 } })]))
    expect(might(on.objects['c']!)).toBe(7)
                                    
    const off = derive({ ...on, objects: { ...on.objects, c: { ...on.objects['c']!, counters: {} } } })
    expect(might(off.objects['c']!)).toBe(0)
  })

  test('★端到端串起来:ACTIVATE 强化 → settle → 战力从 0 变成 7', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([claw()], 20), realDeps)
    expect(might(g.state.objects['c']!)).toBe(0)
    g.apply(empowerAction(g, 'c')!)
    settle(g)
    expect(might(g.state.objects['c']!)).toBe(7)                   
  })
})

describe('§809 [法盾]:第三段技能也没漏', () => {
  test('钢爪身上有法盾值 1(§809.1.b.3 裸[法盾]=1)', () => {
    expect(deflectValue(claw())).toBe(1)
  })
})

describe('现状快照:强化通道不再是零真卡', () => {
                                           
                                          
                                              
                            
  test('★带[强化]印刷关键词的已实现卡 = 这些', () => {
    const withEmpower = Object.keys(CARD_FACTS).filter((no) =>
      cardKeywords(no).some((k) => k.startsWith('强化') && !k.startsWith('已强化')),
    )
                                                                    
                                                           
                                            
                                                
                                                            
                                                                          
    expect([...withEmpower].sort()).toEqual([
      'VEN-018', 'VEN-021', 'VEN-021a', 'VEN-043', 'VEN-045', 'VEN-046', 'VEN-046a', 'VEN-047', 'VEN-055', 'VEN-069', 'VEN-069a', 'VEN-070',
                                                                    
      'VEN-077',
      'VEN-079', // ★675 夺魂钩妲姆(纯资源费[强化5橙色]+已强化>攻防 setMight,本轮实现)
      'VEN-084', 'VEN-084a', // ★644 恶狼意志双印次([强化3橙色] 纯资源费走工厂)
      'VEN-086', // ★645 普朗克异画([强化橙色橙色];正典号 VEN-181 在下面)
      'VEN-093',
      'VEN-104',
      'VEN-114', // ★696 卡洛克斯([强化6紫色紫色] 双色后缀走工厂,本轮实现)
      'VEN-122', // ★665 烈阳之鹰(纯资源费[强化2]+已强化>+1[S]/法盾2 双表,本轮实现)
      'VEN-128', 'VEN-133',
      'VEN-134', // ★670 凯尔(可叠加档[强化3],本轮实现)
      'VEN-136', 'VEN-136a',
      'VEN-139', // ★637 离群之刺([强化3A];正典号 VEN-189 在下面)
      'VEN-149', // ★635 未来守护者([强化2AA] 纯资源费走工厂;正典号 VEN-194 在下面)
      'VEN-181', // ★645 普朗克正典号
      'VEN-187',
      'VEN-189', // ★637 离群之刺正典号
      'VEN-194', // ★635 未来守护者正典号
    ])
  })
})
