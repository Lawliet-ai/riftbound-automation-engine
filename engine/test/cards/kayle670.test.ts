import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { deflectSurcharge } from '../../src/keywords/deflect'
import { empowerLimitOf } from '../../src/keywords/empower'
import { cardKind, cardCost, cardKeywords, cardPassives, activatedFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VEN_134 } from '../../data/cards/empower-grants'

                                                         
                                                            
                                                      
                                               
  
           
                                                  
                                                        
                                                            
                                      
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'ky'

setCardPassiveProvider(cardPassives)          

const kayle = (emp: number): GameObject => ({
  oid: asObjId(SELF), defId: 'VEN-134', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: emp > 0 ? { empower: emp } : {}, status: {},
} as unknown as GameObject)

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
const viewOf = (emp: number) => recomputeContinuous(scene([kayle(emp)]))
const derivedOf = (emp: number) => viewOf(emp).objects[asObjId(SELF)]!
const mightOf = (emp: number): number => effectiveMight(derivedOf(emp)).actual
const kwOf = (emp: number): readonly string[] => derivedOf(emp).derived?.keywords ?? []

describe('★ 前提:①登记/②上限权限与可叠加档', () => {
  test('★★★★★英雄单位 3费 0pip 黄 3[S]、单印次、[强化3] 登了、工厂生成技能', () => {
    expect(CARD_COSTS['VEN-134']).toEqual({ mana: 3, pips: 0, colors: ['yellow'] })
    expect(CARD_COSTS['VEN-134a'], '★单印次').toBeUndefined()
    expect(cardKind('VEN-134')).toBe('unit')
    expect(cardKeywords('VEN-134')).toEqual(['强化3'])
    expect(cardCost('VEN-134')).toEqual({ mana: 3 })
    expect(VEN_134.power).toBe(3)
    expect(activatedFor('VEN-134').length, '★工厂据 CARD_KEYWORDS 生成').toBeGreaterThan(0)
  })

  test('★★★★★★②derived.empowerLimit=3(**未强化也常驻**);emp=3 技能仍可激活(FAQ 逐字)', () => {
    expect(empowerLimitOf(derivedOf(0)), '★「我最多可以拥有3个」= 上限权限,emp=0 也在').toBe(3)
    expect(empowerLimitOf(derivedOf(3))).toBe(3)
    const spec = activatedFor('VEN-134')[0]!
    expect(spec.available!(viewOf(3), P1, SELF), '★满3仍可激活(结算无效果由原语兜底)').toBe(true)
  })
})

describe('★★★★★★★ ③每层+2/④满3两关键词', () => {
  test('★★★★★★③emp=0/1/2/3 四档:3/5/7/9 战力(每 1 个 +2 现算)', () => {
    expect(mightOf(0), '★emp=0:印刷 3').toBe(3)
    expect(mightOf(1), '★3+2').toBe(5)
    expect(mightOf(2), '★3+4').toBe(7)
    expect(mightOf(3), '★3+6').toBe(9)
  })

  test('★★★★★★④满3 ⇒ [法盾3]+[游走];emp=2 都没有(「拥有3个」才给)', () => {
    expect(kwOf(3)).toContain('法盾3')
    expect(kwOf(3)).toContain('游走')
    expect(kwOf(2), '★emp=2 不满').not.toContain('法盾3')
    expect(kwOf(2)).not.toContain('游走')
    expect(kwOf(0)).not.toContain('游走')
  })

  test('★★★★★④端到端:满3后对手把我选作目标 ⇒ 加费 **3**(法盾3 认 N);emp=2 ⇒ 0', () => {
    expect(deflectSurcharge(viewOf(3), asObjId(SELF), P2), '★「支付{A}{A}{A}」…法盾3 ⇒ +3').toBe(3)
    expect(deflectSurcharge(viewOf(2), asObjId(SELF), P2)).toBe(0)
    expect(deflectSurcharge(viewOf(3), asObjId(SELF), P1), '★§809.1.c 只对对手').toBe(0)
  })
})
