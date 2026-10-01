import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { computeCost } from '../../src/game/costPipeline'
import { cardCost, cardKeywords, cardKind, costModsFor, activatedFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { vexBattleCostMods, pragmaticResearcherCostMods } from '../../data/cards/cost-modifiers'

                                            
                                                          
                                                   
                                                             
                            
  
           
                                                     
                                                              
                                    
                                                       
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const isSpell = (d: string): boolean => d.startsWith('SP')
const vex = (extra: Partial<GameObject> = {}, ctrl: PlayerId = P1): GameObject =>
  obj('vx', 'SFD-146', ctrl, BF0, { status: { attacking: true }, ...extra })

describe('★ 前提:①登记', () => {
  test('★★★★★两卡登记;VEN-055 [强化3] 通用工厂真产强化技能;SFD-146 零关键词', () => {
    expect(CARD_COSTS['SFD-146']).toEqual({ mana: 5, pips: 1, colors: ['purple'] })
    expect(CARD_COSTS['VEN-055']).toEqual({ mana: 4, pips: 0, colors: ['blue'] })
    expect(cardKind('SFD-146')).toBe('unit')
    expect(cardKeywords('SFD-146')).toEqual([])
    expect(cardKeywords('VEN-055')).toEqual(['强化3'])
    expect(activatedFor('VEN-055').some((s) => s.key.startsWith('empower')), '★[强化3]工厂真产技能').toBe(true)
    expect(cardCost('SFD-146')).toEqual({ mana: 5, pips: [['purple']] })
    expect(cardCost('VEN-055')).toEqual({ mana: 4 })
  })
})

describe('★★★★★★★ ②③薇古丝:战斗中友减敌增', () => {
  test('★★★★★★战斗中(攻/防两档):友方法术两条 reduce、敌方两条 increase;不在战斗=空;非法术=空', () => {
    const atk = scene([vex()])
    const mine = vexBattleCostMods(atk, P1, 'SP-1', isSpell)
    expect(mine.map((m) => `${m.kind}:${m.part}`)).toEqual(['reduce:mana', 'reduce:pips'])
    expect(mine[0]).toMatchObject({ mana: 1, floor: 1 })
    const foe = vexBattleCostMods(atk, P2, 'SP-1', isSpell)
    expect(foe.map((m) => `${m.kind}:${m.part}`)).toEqual(['increase:mana', 'increase:pips'])
    const def = scene([vex({ status: { defending: true } })])
    expect(vexBattleCostMods(def, P1, 'SP-1', isSpell), '★防守方也算「战斗中」').toHaveLength(2)
    const idle = scene([obj('vx', 'SFD-146', P1, BF0)])
    expect(vexBattleCostMods(idle, P1, 'SP-1', isSpell), '★不在战斗 ⇒ 不罩').toEqual([])
    expect(vexBattleCostMods(atk, P1, 'U-1', isSpell), '★「法术」限定:单位不吃').toEqual([])
  })

  test('★★★★★两个战斗中的薇古丝 ⇒ 各一份(QA L357);端到端:3费1pip 友方 ⇒ 2费0pip;1费 ⇒ floor 撑住', () => {
    const two = scene([vex(), obj('vx2', 'SFD-146', P1, BF0, { status: { defending: true } })])
    expect(vexBattleCostMods(two, P1, 'SP-1', isSpell)).toHaveLength(4)
    const one = scene([vex()])
    const mods = vexBattleCostMods(one, P1, 'SP-1', isSpell)
    expect(computeCost({ mana: 3, pips: [['purple']] }, mods)).toEqual({ mana: 2 })
    expect(computeCost({ mana: 1, pips: [['purple']] }, mods), '★「不得低于{1}」floor 只修饰法力;pip 减光合法(语义锚)').toEqual({ mana: 1 })
    const foeMods = vexBattleCostMods(one, P2, 'SP-1', isSpell)
    const up = computeCost({ mana: 3, pips: [['purple']] }, foeMods)
    expect(up.mana).toBe(4)
    expect(up.pips, '★增的 pip=任意域(空数组)').toEqual([['purple'], []])
  })
})

describe('★★★★★★★ ④⑤实干研究员+聚合', () => {
  test('★★★★★★已强化+在场+我控三判:正样两条;未强化/敌方的/手牌里 全空', () => {
    const emp = scene([obj('re', 'VEN-055', P1, `base:${P1}`, { counters: { empower: 1 } })])
    expect(pragmaticResearcherCostMods(emp, P1, 'SP-1', isSpell)).toHaveLength(2)
    const plain = scene([obj('re', 'VEN-055', P1, `base:${P1}`)])
    expect(pragmaticResearcherCostMods(plain, P1, 'SP-1', isSpell), '★未强化').toEqual([])
    expect(pragmaticResearcherCostMods(emp, P2, 'SP-1', isSpell), '★「你的法术」=控制者的').toEqual([])
    const inHand = scene([obj('re', 'VEN-055', P1, `hand:${P1}`, { counters: { empower: 1 } })])
    expect(pragmaticResearcherCostMods(inHand, P1, 'SP-1', isSpell), '★手牌里不罩').toEqual([])
  })

  test('★★★★★⑤聚合:costModsFor 真吐(战斗中薇古丝罩真法术卡号)', () => {
    const s = scene([vex()])
    const mods = costModsFor(s, P1, 'OGN-115')
    expect(mods.filter((m) => m.source?.includes('SFD-146')), '★allCostMods 挂了才算数').toHaveLength(2)
  })
})
