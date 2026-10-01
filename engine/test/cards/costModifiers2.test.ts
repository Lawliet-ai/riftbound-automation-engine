import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { computeCost } from '../../src/game/costPipeline'
import { CARD_TAGS } from '../../data/cardTags'
import {
  dragonCallerCostMods, focusCostMods, noxianRecruitCostMods, surgeCostMods,
} from '../../data/cards/cost-modifiers'

          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, defId: string, zone: string, ctrl = P1): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], extra: Partial<GameState> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones, ...extra }
}

describe('标签表(生成物)', () => {
  test('唤龙使者要用的"龙"标签查得到', () => {
    const dragons = Object.entries(CARD_TAGS).filter(([, t]) => t === '龙')
    expect(dragons.length).toBeGreaterThan(0)
  })

  test('诺克萨斯新兵的标签是崔法利(抽查一条,确认表没串行)', () => {
    expect(CARD_TAGS['OGN-012']).toBe('崔法利')
  })

  test('无标签的卡查不到(不收空串)', () => {
    expect(Object.values(CARD_TAGS).some((t) => t === '')).toBe(false)
  })
})

describe('诺克萨斯新兵 OGN-012:[鼓舞]—我的费用减少2', () => {
  test('本回合还没确认过牌 → 不减', () => {
    expect(noxianRecruitCostMods(scene([]), P1, 'OGN-012')).toEqual([])
  })

  test('本回合确认过牌 → 减2', () => {
    const s = scene([], { confirmedThisTurn: { [P1]: 1 } })
    expect(computeCost({ mana: 4 }, noxianRecruitCostMods(s, P1, 'OGN-012')).mana).toBe(2)
  })

  test('★算的是【我自己】本回合的确认数,对手打牌不给我开鼓舞', () => {
    const s = scene([], { confirmedThisTurn: { [P2]: 3 } })
    expect(noxianRecruitCostMods(s, P1, 'OGN-012')).toEqual([])
  })

  test('只作用于它自己这张卡', () => {
    const s = scene([], { confirmedThisTurn: { [P1]: 1 } })
    expect(noxianRecruitCostMods(s, P1, 'OGN-999')).toEqual([])
  })
})

describe('唤龙使者 OGN-140:你的"龙"单位法力费用减2,不得低于1', () => {
  const dragonDef = Object.entries(CARD_TAGS).find(([, t]) => t === '龙')![0]

  test('场上有唤龙使者 → 龙单位法力减2(下限1)', () => {
    const s = scene([obj('dc', 'OGN-140', BF0)])
    const mods = dragonCallerCostMods(s, P1, dragonDef)
    expect(mods).toHaveLength(1)
    expect(computeCost({ mana: 5 }, mods).mana).toBe(3)
  })

  test('★下限:2费的龙只降到1,不降到0', () => {
    const s = scene([obj('dc', 'OGN-140', BF0)])
    expect(computeCost({ mana: 2 }, dragonCallerCostMods(s, P1, dragonDef)).mana).toBe(1)
  })

  test('★非"龙"标签的单位不吃', () => {
    const s = scene([obj('dc', 'OGN-140', BF0)])
    expect(dragonCallerCostMods(s, P1, 'OGN-012')).toEqual([])
  })

  test('唤龙使者还在手上(不在场地)→ 不生效', () => {
    const s = scene([obj('dc', 'OGN-140', `hand:${P1}`)])
    expect(dragonCallerCostMods(s, P1, dragonDef)).toEqual([])
  })

  test('对手的唤龙使者不给我减费', () => {
    const s = scene([obj('dc', 'OGN-140', BF0, P2)])
    expect(dragonCallerCostMods(s, P1, dragonDef)).toEqual([])
  })

  test('两个唤龙使者 = 两条各带下限的减费(6费龙 → 2)', () => {
    const s = scene([obj('a', 'OGN-140', BF0), obj('b', 'OGN-140', BF0)])
    expect(computeCost({ mana: 6 }, dragonCallerCostMods(s, P1, dragonDef)).mana).toBe(2)
  })
})

describe('产量激增 SFD-076:控制"机械"单位则减2', () => {
  const mechDef = Object.entries(CARD_TAGS).find(([, t]) => t === '机械')![0]

  test('控制着机械 → 减2', () => {
    const s = scene([obj('m', mechDef, BF0)])
    expect(computeCost({ mana: 4 }, surgeCostMods(s, P1, 'SFD-076')).mana).toBe(2)
  })

  test('没有机械 → 不减', () => {
    expect(surgeCostMods(scene([]), P1, 'SFD-076')).toEqual([])
  })

  test('★对手的机械不算数("你控制着")', () => {
    const s = scene([obj('m', mechDef, BF0, P2)])
    expect(surgeCostMods(s, P1, 'SFD-076')).toEqual([])
  })
})

describe('★聚心凝神 UNL-091:等级11 的"改为"是【替换】不是叠加', () => {
  const at = (exp: number): GameState => scene([], { experience: { [P1]: exp } })

  test('经验不足6 → 不减', () => {
    expect(focusCostMods(at(5), P1, 'UNL-091')).toEqual([])
  })

  test('经验6 → 减2(5费→3)', () => {
    expect(computeCost({ mana: 5 }, focusCostMods(at(6), P1, 'UNL-091')).mana).toBe(3)
  })

  test('★经验11 → 只减4(5费→1),【不是】2+4=6 减到 0', () => {
    const mods = focusCostMods(at(11), P1, 'UNL-091')
    expect(mods).toHaveLength(1)                
    expect(computeCost({ mana: 5 }, mods).mana).toBe(1)
  })

  test('读的是自己的经验', () => {
    const s = scene([], { experience: { [P2]: 20 } })
    expect(focusCostMods(s, P1, 'UNL-091')).toEqual([])
  })
})
