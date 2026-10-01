import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { computeCost } from '../../src/game/costPipeline'
import { controlledBattlefields, controlsBattlefield } from '../../src/state/battlefieldControl'
import { chompCostMods, lawkeeperCostMods } from '../../data/cards/cost-modifiers'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function unit(id: string, zone: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}

describe('战场控制权(挪到 state 层的近似实现)', () => {
  test('有己方单位且无敌方单位 → 控制', () => {
    expect(controlledBattlefields(scene(unit('a', BF0)), P1)).toEqual([BF0])
  })

  test('敌方也有单位 → 近似判为不控制(★与 §190.4.a 的已知偏差,见模块头注)', () => {
    expect(controlledBattlefields(scene(unit('a', BF0), unit('t', BF0, P2)), P1)).toEqual([])
  })

  test('§190.4/§323.6 只看【单位】:装备在战场上不算占据', () => {
    const gear = unit('g', BF0)
    const s = scene({ ...gear, baseTypes: ['equipment'] })
    expect(controlledBattlefields(s, P1)).toEqual([])
  })

  test('controlsBattlefield 与列表一致', () => {
    const s = scene(unit('a', BF0))
    expect(controlsBattlefield(s, P1, BF0)).toBe(true)
    expect(controlsBattlefield(s, P1, BF1)).toBe(false)
  })
})

describe('律法守护者 VEN-119:控制着"有且仅有两名单位"的战场 → 减{2}和{黄}', () => {
  test('恰好两名单位 → 减费(法力一条 + pip 一条,共两条)', () => {
    const s = scene(unit('a', BF0), unit('b', BF0))
    const mods = lawkeeperCostMods(s, P1, 'VEN-119')
    expect(mods).toHaveLength(2)
    expect(computeCost({ mana: 5, pips: [['yellow']] }, mods)).toEqual({ mana: 3 })
  })

  test('只有一名单位 → 不减', () => {
    expect(lawkeeperCostMods(scene(unit('a', BF0)), P1, 'VEN-119')).toEqual([])
  })

  test('三名单位 → 不减("有且仅有"是精确等于二)', () => {
    const s = scene(unit('a', BF0), unit('b', BF0), unit('c', BF0))
    expect(lawkeeperCostMods(s, P1, 'VEN-119')).toEqual([])
  })

  test('★数的是那处战场【全部】单位,不分敌我——但敌方在场时本身就判为不控制', () => {
                                              
    const s = scene(unit('a', BF0), unit('t', BF0, P2))
    expect(lawkeeperCostMods(s, P1, 'VEN-119')).toEqual([])
  })

  test('另一处战场满足条件也算', () => {
    const s = scene(unit('a', BF1), unit('b', BF1))
    expect(lawkeeperCostMods(s, P1, 'VEN-119')).toHaveLength(2)
  })

  test('只作用于它自己这张卡', () => {
    const s = scene(unit('a', BF0), unit('b', BF0))
    expect(lawkeeperCostMods(s, P1, 'OGN-999')).toEqual([])
  })
})

describe('啃啃 UNL-035:对手控制着被眩晕的单位 → 减2', () => {
  test('对手有被眩晕单位 → 减2(6费→4)', () => {
    const s = scene(unit('t', BF0, P2, { status: { stunned: true } }))
    expect(computeCost({ mana: 6 }, chompCostMods(s, P1, 'UNL-035')).mana).toBe(4)
  })

  test('对手的单位没被眩晕 → 不减', () => {
    expect(chompCostMods(scene(unit('t', BF0, P2)), P1, 'UNL-035')).toEqual([])
  })

  test('★被眩晕的是【我自己】的单位 → 不减(卡文说的是"对手控制着")', () => {
    const s = scene(unit('a', BF0, P1, { status: { stunned: true } }))
    expect(chompCostMods(s, P1, 'UNL-035')).toEqual([])
  })
})
