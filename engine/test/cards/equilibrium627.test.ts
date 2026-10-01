import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardKind, cardCost, cardKeywords, cardPassives, activatedFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VEN_093, VEN_093_CARD_EFFECT } from '../../data/cards/empower-grants'

                                                       
                                                             
                                             
  
                                   
                                                          
                                                   
                                                               
                                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'ferry'

setCardPassiveProvider(cardPassives)                                   

                                                  
const ferryman = (emp: number, oid = SELF): GameObject => ({
  oid: asObjId(oid), defId: 'VEN-093', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0,
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
const derivedOf = (s: GameState, oid = SELF) => recomputeContinuous(s).objects[asObjId(oid)]!
const mightOf = (s: GameState, oid = SELF): number => effectiveMight(derivedOf(s, oid)).actual
const kwOf = (s: GameState, oid = SELF): readonly string[] => derivedOf(s, oid).derived?.keywords ?? []

describe('🔴🔴🔴★★★★★★627 均衡渡命人:前提与接线', () => {
  test('★前提:单位 4费 **0pip** 紫 4战力、**单印次**、卡文一字不差', () => {
    expect(cardKind('VEN-093')).toBe('unit')
                                                                               
    expect(CARD_COSTS['VEN-093']).toEqual({ mana: 4, pips: 0, colors: ['purple'] })
    expect(CARD_COSTS['VEN-093a'], '★单印次:没有 a 号').toBeUndefined()
    expect(VEN_093.energy).toBe(4)
    expect(VEN_093.power).toBe(4)
    expect(VEN_093_CARD_EFFECT).toBe(
      '{{强化2}}（支付{{2}}：强化我。仅在未强化时可用。）\n'
      + '{{已强化>}} 我获得{{S}}+1和{{游走}}。（我可以向其他战场进行移动。）')
  })

  test('🔴🔴🔴★★★★★★【会换答案】[强化2] 是**纯资源费** ⇒ **必须登** `CARD_KEYWORDS`,由通用工厂生成技能', () => {
                                                             
    expect(cardKeywords('VEN-093'), '★★★漏登 ⇒ 这张卡的强化技能压根点不出来').toEqual(['强化2'])
    expect(activatedFor('VEN-093').length, '★★★通用工厂据 CARD_KEYWORDS 生成那条主动技能')
      .toBeGreaterThan(0)
    expect(cardCost('VEN-093'), '★★★4费 0pip;凭空加 pip 会让它贵一枚符能').toEqual({ mana: 4 })
  })
})

describe('🔴🔴🔴★★★★★★627 「{已强化>} 我获得{S}+1和{游走}」——两张表都要登', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】**只登一张表会静默少半个效果**', () => {
    const on = scene([ferryman(1)])
                                      
    expect(mightOf(on), '★★★4 + 1 = 5').toBe(5)
                                          
    expect(kwOf(on), '★★★[游走]那半在另一张表里,漏了不报错、只是静默少半个效果').toContain('游走')
  })

  test('🔴🔴🔴★★★★★★【会换答案·两头压】**未强化时两半都不给**(§828.1.c 是持续条件)', () => {
    const off = scene([ferryman(0)])
    expect(mightOf(off), '★★★未强化 ⇒ 还是 4(判据漏了"我已强化"就成无条件加成)').toBe(4)
    expect(kwOf(off), '★★★未强化 ⇒ 没有[游走]').not.toContain('游走')
  })

  test('🔴🔴🔴★★★★★★【会换答案】只作用于**我自己**;同场别人不沾光', () => {
    const s = scene([ferryman(1), { ...ferryman(1, 'mate'), defId: 'OGN-012' } as GameObject])
    expect(mightOf(s), '★我 4+1').toBe(5)
    expect(mightOf(s, 'mate'), '★★★别人是别的卡,不该被加(predicate 写宽这条当场红)').toBe(4)
  })

  test('🔴🔴★★★★★★数额钉住卡面:是 **+1** 不是 +2(VEN-070 那张才是 +2)', () => {
    expect(mightOf(scene([ferryman(1)])) - 4).toBe(1)
  })
})
