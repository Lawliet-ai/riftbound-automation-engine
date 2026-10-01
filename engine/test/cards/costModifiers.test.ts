import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { computeCost } from '../../src/game/costPipeline'
import { apprenticeCostMods, homeostasisCostMods } from '../../data/cards/cost-modifiers'

                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, defId: string, zone: string, ctrl = P1): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], scores: Record<string, number> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones, scores: { ...base.scores, ...scores } }
}
const isSpell = (d: string): boolean => d.startsWith('SPELL')

describe('踊跃的学徒 OGN-084:法术的【法力】费用减1,不得低于1', () => {
  test('在战场上 → 出一条 part=mana、floor=1 的减费', () => {
    const mods = apprenticeCostMods(scene([obj('a', 'OGN-084', BF0)]), P1, 'SPELL-X', isSpell)
    expect(mods).toHaveLength(1)
    expect(mods[0]).toMatchObject({ kind: 'reduce', part: 'mana', mana: 1, floor: 1 })
  })

  test('★在基地里【不生效】(卡文写的是"位于战场上")', () => {
    expect(apprenticeCostMods(scene([obj('a', 'OGN-084', `base:${P1}`)]), P1, 'SPELL-X', isSpell)).toEqual([])
  })

  test('★只减【法术】,单位/装备不吃', () => {
    expect(apprenticeCostMods(scene([obj('a', 'OGN-084', BF0)]), P1, 'UNIT-Y', isSpell)).toEqual([])
  })

  test('对手的学徒不给我减费', () => {
    expect(apprenticeCostMods(scene([obj('a', 'OGN-084', BF0, P2)]), P1, 'SPELL-X', isSpell)).toEqual([])
  })

  test('★场上两个学徒 = 两条【各带下限】的减费,不是"减2"', () => {
    const mods = apprenticeCostMods(scene([obj('a', 'OGN-084', BF0), obj('b', 'OGN-084', BF0)]), P1, 'SPELL-X', isSpell)
    expect(mods).toHaveLength(2)
                                                             
    expect(computeCost({ mana: 3 }, mods).mana).toBe(1)
  })

  test('已在下限的法术不再被压低', () => {
    const mods = apprenticeCostMods(scene([obj('a', 'OGN-084', BF0)]), P1, 'SPELL-X', isSpell)
    expect(computeCost({ mana: 1 }, mods).mana).toBe(1)
  })
})

describe('御衡守念 OGN-047:对手离胜利≤3分时,此法术费用减2', () => {
  test('对手离胜利 3 分 → 减2(总费用,无下限)', () => {
    const s = scene([], { [P2]: 5 })                   
    const mods = homeostasisCostMods(s, P1, 'OGN-047')
    expect(mods).toHaveLength(1)
    expect(mods[0]).toMatchObject({ kind: 'reduce', part: 'total', mana: 2 })
    expect(computeCost({ mana: 3 }, mods).mana).toBe(1)
  })

  test('对手离胜利 4 分 → 不减', () => {
    expect(homeostasisCostMods(scene([], { [P2]: 4 }), P1, 'OGN-047')).toEqual([])
  })

  test('★读的是【对手】的分,不是自己的', () => {
                         
    expect(homeostasisCostMods(scene([], { [P1]: 7, [P2]: 0 }), P1, 'OGN-047')).toEqual([])
  })

  test('只作用于它自己这张卡', () => {
    expect(homeostasisCostMods(scene([], { [P2]: 6 }), P1, 'SPELL-OTHER')).toEqual([])
  })
})
