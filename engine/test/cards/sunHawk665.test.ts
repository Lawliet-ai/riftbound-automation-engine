import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { deflectSurcharge } from '../../src/keywords/deflect'
import { cardKind, cardCost, cardKeywords, cardPassives, activatedFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VEN_122, VEN_122_CARD_EFFECT } from '../../data/cards/empower-grants'

                                                                 
                                
                                                          
  
                                    
                                                           
                                                        
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'hawk'

setCardPassiveProvider(cardPassives)                                   

const hawk = (emp: number): GameObject => ({
  oid: asObjId(SELF), defId: 'VEN-122', owner: P1, controller: P1, zone: asZoneId(BF0),
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
const derivedOf = (s: GameState) => recomputeContinuous(s).objects[asObjId(SELF)]!
const mightOf = (s: GameState): number => effectiveMight(derivedOf(s)).actual
const kwOf = (s: GameState): readonly string[] => derivedOf(s).derived?.keywords ?? []

describe('★ 前提:登记/通用工厂', () => {
  test('★★★★★单位 3费 0pip 黄 3战力、单印次、卡文一字不差', () => {
    expect(cardKind('VEN-122')).toBe('unit')
    expect(CARD_COSTS['VEN-122']).toEqual({ mana: 3, pips: 0, colors: ['yellow'] })
    expect(CARD_COSTS['VEN-122a'], '★单印次:没有 a 号').toBeUndefined()
    expect(VEN_122.energy).toBe(3)
    expect(VEN_122.power).toBe(3)
    expect(VEN_122_CARD_EFFECT).toBe(
      '{{强化2}}（支付{{2}}：强化我。仅在未强化时可用。）\n'
      + '{{已强化>}} 我获得{{S}}+1和{{法盾2}}。（对手必须支付{{A}}{{A}}才能将我选作法术或技能的目标。）')
  })

  test('★★★★★★[强化2] 纯资源费 ⇒ 登 CARD_KEYWORDS,通用工厂生成技能;UNIT_COST 登了', () => {
    expect(cardKeywords('VEN-122'), '★漏登 ⇒ 强化技能点不出来').toEqual(['强化2'])
    expect(activatedFor('VEN-122').length, '★通用工厂据 CARD_KEYWORDS 生成').toBeGreaterThan(0)
    expect(cardCost('VEN-122'), '★3费 0pip').toEqual({ mana: 3 })
  })
})

describe('★★★★★★★ 「已强化>」双表+法盾2 端到端', () => {
  test('★★★★★★已强化 ⇒ 3+1=4 战力 + 法盾2(双表;漏一张静默少半个效果)', () => {
    const on = scene([hawk(1)])
    expect(mightOf(on), '★3 + 1 = 4').toBe(4)
    expect(kwOf(on), '★法盾那半在 EMPOWERED_KEYWORDS 表').toContain('法盾2')
  })

  test('★★★★★★emp=0 ⇒ 两半都没有(§828.1.c 持续条件,不是一次性触发)', () => {
    const off = scene([hawk(0)])
    expect(mightOf(off), '★未强化:印刷 3').toBe(3)
    expect(kwOf(off)).not.toContain('法盾2')
  })

  test('★★★★★③端到端:已强化后对手把我选作目标 ⇒ 加费 **2**(deflectValue 认 N);我自己指向不加', () => {
    const s = recomputeContinuous(scene([hawk(1)]))
    expect(deflectSurcharge(s, asObjId(SELF), P2), '★「支付{A}{A}」= 法盾2 ⇒ +2').toBe(2)
    expect(deflectSurcharge(s, asObjId(SELF), P1), '★§809.1.c 只对对手加费').toBe(0)
    const off = recomputeContinuous(scene([hawk(0)]))
    expect(deflectSurcharge(off, asObjId(SELF), P2), '★未强化无法盾').toBe(0)
  })
})
