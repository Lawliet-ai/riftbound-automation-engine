import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardKind, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { empowerActivationSpecs } from '../../src/loop/empowerActivation'
import {
  VEN_194_SPECS, VEN_194_SECOND_KEY, VEN_194_CARD_EFFECT, gearCandidates, isEmpowered,
} from '../../data/cards/VEN-194'

                                                          
                                            
                                            
  
           
                                                               
                                                    
                                    
                                                                         
                                               
                                           
                                                   
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const gear = (oid: string, who: PlayerId, zone: string, tapped = true): GameObject => ({
  oid: asObjId(oid), defId: `G-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {},
  status: tapped ? { tapped: true } : {},
} as GameObject)
const legend = (oid: string, emp: number): GameObject => ({
  oid: asObjId(oid), defId: 'VEN-194', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0,
  counters: emp > 0 ? { empower: emp } : {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  void bfs
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const BF0 = 'battlefield:shared:0'

const SPEC_ONE = VEN_194_SPECS[0]!
const SPEC_TWO = VEN_194_SPECS[1]!

describe('★ 前提:传奇 / 双印次 / [强化2AA] 工厂 / 接线', () => {
  test('★★★★★上游:两个号都是 legend、0费0pip、蓝+橙;variantAliases 同组;卡文限定语在', () => {
    expect(cardKind('VEN-194')).toBe('legend')
    expect(cardKind('VEN-149')).toBe('legend')
    expect(CARD_COSTS['VEN-194']).toEqual({ mana: 0, pips: 0, colors: ['blue', 'orange'] })
    expect(VARIANT_GROUPS['VEN-194']).toEqual(['VEN-149', 'VEN-194'])
    expect(VEN_194_CARD_EFFECT).toContain('让一件装备变为活跃状态')
    expect(VEN_194_CARD_EFFECT).toContain('{{已强化>}}')
  })

  test('★★★★★★③接线:两个号都拿到 3 条(两条手写 + 工厂[强化2AA]);印刷表登了强化', () => {
    expect(cardKeywords('VEN-194'), '★纯资源费 ⇒ 登表交工厂(★627 分野)').toEqual(['强化2AA'])
    const specs = activatedFor('VEN-194')
    expect(specs, '★两条手写 + 一条工厂强化').toHaveLength(3)
                                                             
    const sig = (xs: readonly { key: string, cost: unknown }[]): unknown[] => xs.map((x) => [x.key, x.cost])
    expect(sig(activatedFor('VEN-149') as never), '★双印次自证:另一个号折叠过来').toEqual(sig(specs as never))
                                       
    const emp = empowerActivationSpecs(['强化2AA']).specs
    expect(emp).toHaveLength(1)
    expect(emp[0]!.cost, '★2 法力 + 两枚任意 pip(㊶ 数个数)').toEqual({ mana: 2, pips: [[], []] })
  })

  test('★★★★★①费用同:两条都是 mana1+横置;第二条才有 available 闸', () => {
    expect(SPEC_ONE.cost).toEqual({ mana: 1 })
    expect(SPEC_TWO.cost).toEqual({ mana: 1 })
    expect(SPEC_ONE.tapSelf).toBe(true)
    expect(SPEC_TWO.tapSelf).toBe(true)
    expect(SPEC_ONE.available, '★第一条无条件').toBeUndefined()
    expect(SPEC_TWO.available, '★第二条带 {已强化>} 闸').toBeDefined()
  })
})

describe('★★★★★★★ {已强化>} = §727/§828 依赖性(化神FAQ L385-409)', () => {
  test('★★★★★★②未强化 ⇒ 第二条不可激活;已强化 ⇒ 可;第一条**恒可**(两条不互斥)', () => {
    const cold = scene([legend('jayce', 0), gear('g1', P1, BF0), gear('g2', P1, BF0)])
    const hot = scene([legend('jayce', 1), gear('g1', P1, BF0), gear('g2', P1, BF0)])
    expect(isEmpowered(cold, 'jayce')).toBe(false)
    expect(isEmpowered(hot, 'jayce')).toBe(true)
    expect(SPEC_TWO.available!(cold, P1, 'jayce'), '★条件未满足 ⇒ 技能存在但不生效(§727.1.b.1)').toBe(false)
    expect(SPEC_TWO.available!(hot, P1, 'jayce')).toBe(true)
    expect(SPEC_ONE.available, '★已强化后第一条照样在(FAQ 没说互斥)').toBeUndefined()
  })
})

describe('★★★★★★★ 候选:④没写「你的」/位置/横置态;⑤「两件」要选满', () => {
  test('★★★★★★④敌方装备、基地里的、已活跃的都在候选(★586/593 看没写的词)', () => {
    const s = scene([
      gear('mine', P1, BF0), // 我的,战场,横置
      gear('foes', P2, `base:${P2}`), // ★敌方 + 基地
      gear('awake', P1, `base:${P1}`, false), // ★已活跃(没写「已横置的」⇒ 不滤)
    ])
    expect(gearCandidates(s)).toEqual(['awake', 'foes', 'mine'])
  })

  test('★★★★★⑤第二条要选满两件:只有一件 ⇒ legalTargets 空;第一条一件就够', () => {
    const one = scene([legend('jayce', 1), gear('g1', P1, BF0)])
    expect(SPEC_TWO.legalTargets!(one, P1, 'jayce'), '★§355.1 目标组合要齐').toEqual([])
    expect(SPEC_ONE.legalTargets!(one, P1, 'jayce')).toEqual(['g1'])
    const zero = scene([legend('jayce', 1)])
    expect(SPEC_ONE.legalTargets!(zero, P1, 'jayce'), '★一件都没有 ⇒ 第一条也不可宣告').toEqual([])
  })

  test('★★★★问链:第二条问第二件,排掉第一件;答过不再问;第一条不问', () => {
    const s = scene([legend('jayce', 1), gear('g1', P1, BF0), gear('g2', P1, BF0)])
    const next = SPEC_TWO.makeNextChoice!({ selfOid: 'jayce', controller: P1, target: 'g1' })
    const q = next(s, {})!
    expect(q.key).toBe(VEN_194_SECOND_KEY)
    expect(q.candidates.map((c) => c.id), '★「两件」= 两件不同的 ⇒ 排掉 g1').toEqual(['g2'])
    expect(next(s, { [VEN_194_SECOND_KEY]: 'g2' })).toBeNull()
    expect(SPEC_ONE.makeNextChoice, '★第一条没有第二问').toBeUndefined()
  })
})

describe('★★★★★★★ 结算:⑥解 tapped(装备,不是 dormant);㊺ 复验', () => {
  test('★★★★★★第一条:一条 statusChange tapped=false;第二条:两条', () => {
    const s = scene([legend('jayce', 1), gear('g1', P1, BF0), gear('g2', P1, BF0)])
    const one = SPEC_ONE.makeResolve({ selfOid: 'jayce', controller: P1, target: 'g1' })(s) as readonly { kind: string, target?: string, key?: string, value?: boolean }[]
    expect(one).toHaveLength(1)
    expect(one[0]).toMatchObject({ kind: 'statusChange', target: 'g1', key: 'tapped', value: false })
    const two = SPEC_TWO.makeResolve({ selfOid: 'jayce', controller: P1, target: 'g1' })(s, { [VEN_194_SECOND_KEY]: 'g2' }) as readonly { target?: string, key?: string }[]
    expect(two).toHaveLength(2)
    expect(two.map((e) => e.target).sort()).toEqual(['g1', 'g2'])
    expect(two.every((e) => e.key === 'tapped'), '★装备解的是 tapped(单位才 dormant)').toBe(true)
  })

  test('★★★★★㊺复验:结算时第一件已离场 ⇒ 只解第二件;没答第二件 ⇒ 只解第一件', () => {
    const s = scene([legend('jayce', 1), gear('g1', P1, BF0), gear('g2', P1, BF0)])
    const gone = {
      ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'g1')),
    } as GameState
    const evs = SPEC_TWO.makeResolve({ selfOid: 'jayce', controller: P1, target: 'g1' })(gone, { [VEN_194_SECOND_KEY]: 'g2' }) as readonly { target?: string }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]!.target).toBe('g2')
    const noAnswer = SPEC_TWO.makeResolve({ selfOid: 'jayce', controller: P1, target: 'g1' })(s, {}) as readonly { target?: string }[]
    expect(noAnswer.map((e) => e.target)).toEqual(['g1'])
  })
})
