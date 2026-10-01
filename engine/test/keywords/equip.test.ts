import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { attachCard, detachCard } from '../../src/state/attach'
import { attachmentBonuses } from '../../src/effects/attachmentMight'
import {
  armamentsOn, equipDefaultTargets, hasEquipAbility, isArmament, isGeared,
} from '../../src/keywords/equip'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')
const BF1 = asZoneId('battlefield:shared:1')
const BASE1 = asZoneId('base:P1')
const HAND1 = asZoneId('hand:P1')

                                  
function unit(oid: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: `U-${oid}`, owner: P1, controller: P1, zone: BF0,
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
                           
function gear(oid: string, bonus: number, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: `G-${oid}`, owner: P1, controller: P1, zone: BF0,
    baseMight: 0, baseKeywords: ['装配红色'], baseTags: ['武装'], baseTypes: ['equipment'],
    basePowerBonus: bonus, damage: 0, counters: {}, status: {}, ...extra,
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
  return { ...base, objects, zones }
}
const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[oid]!).reference

describe('§137.3 战力加成调整【所贴附卡牌】的战力', () => {
  test('贴上就加,数值走第3层(§477.3.d)', () => {
    const s = scene(unit('u'), gear('g', 2))
    expect(mightOf(s, 'u')).toBe(3)          
    const after = attachCard(s, asObjId('g'), asObjId('u'))
    expect(mightOf(after, 'u')).toBe(5)         
  })

  test('§137.3.a 卸除后【即刻】失效,不悬停', () => {
    const s = attachCard(scene(unit('u'), gear('g', 2)), asObjId('g'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(5)
    expect(mightOf(detachCard(s, asObjId('g')), 'u')).toBe(3)
  })

  test('加成加在【顶部卡牌】身上,不加在武装自己身上', () => {
    const s = attachCard(scene(unit('u'), gear('g', 2)), asObjId('g'), asObjId('u'))
    expect(mightOf(s, 'g')).toBe(0)                      
  })

  test('多张武装贴同一名单位 → 各自生效、相加(§137.3 是逐卡属性,没有"只算一次")', () => {
    let s = scene(unit('u'), gear('g1', 2), gear('g2', 1))
    s = attachCard(s, asObjId('g1'), asObjId('u'))
    s = attachCard(s, asObjId('g2'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(6)             
  })

  test('§434.1.f 改贴到别的单位 → 加成跟着走,旧宿主回落', () => {
    let s = scene(unit('a'), unit('b'), gear('g', 2))
    s = attachCard(s, asObjId('g'), asObjId('a'))
    expect([mightOf(s, 'a'), mightOf(s, 'b')]).toEqual([5, 3])
    s = attachCard(s, asObjId('g'), asObjId('b'))
    expect([mightOf(s, 'a'), mightOf(s, 'b')]).toEqual([3, 5])
  })

  test('§137.2 加成可以为 +0:贴上不改战力,但确实在生效', () => {
    const s = attachCard(scene(unit('u'), gear('g', 0)), asObjId('g'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(3)
                                  
    expect(attachmentBonuses(s).map((b) => [b.sourceOid, b.delta])).toEqual([['g', 0]])
  })

  test('§137.3.b 贴在【没有战力数值】的卡牌上 → 无视该加成', () => {
                                        
    let s = scene(unit('u'), gear('host', 1), gear('g', 2))
    s = attachCard(s, asObjId('host'), asObjId('u'))
    s = attachCard(s, asObjId('g'), asObjId('host'))
                                                   
    expect(mightOf(s, 'u')).toBe(4)                   
    expect(attachmentBonuses(s).map((b) => b.sourceOid)).toEqual(['host'])
  })

  test('0 战力的单位【有】战力数值,武装照常生效(别拿 baseMight===0 当"没有战力")', () => {
    const s = attachCard(scene(unit('u', { baseMight: 0 }), gear('g', 2)), asObjId('g'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(2)
  })

  test('没有战力加成的已贴附卡牌不产出任何效果', () => {
    const plain = gear('p', 0, { basePowerBonus: undefined })
    const s = attachCard(scene(unit('u'), plain), asObjId('p'), asObjId('u'))
    expect(attachmentBonuses(s)).toEqual([])
    expect(mightOf(s, 'u')).toBe(3)
  })
})

describe('§818.3 配装状态', () => {
  test('§818.3.b 身上有一张武装即为配装', () => {
    const s = attachCard(scene(unit('u'), gear('g', 2)), asObjId('g'), asObjId('u'))
    expect(isGeared(s, asObjId('u'))).toBe(true)
    expect(armamentsOn(s, asObjId('u')).map((o) => o.oid)).toEqual(['g'])
  })

  test('配装看【标签】不看加成大小:+0 的武装照样让宿主配装', () => {
    const s = attachCard(scene(unit('u'), gear('g', 0)), asObjId('g'), asObjId('u'))
    expect(isGeared(s, asObjId('u'))).toBe(true)
  })

  test('贴附的不是武装 → 不配装(已贴附 ≠ 配装)', () => {
    const notArm = gear('n', 2, { baseTags: [] })
    const s = attachCard(scene(unit('u'), notArm), asObjId('n'), asObjId('u'))
    expect(isGeared(s, asObjId('u'))).toBe(false)
                               
    expect(mightOf(s, 'u')).toBe(5)
  })

  test('没贴任何东西 → 不配装', () => {
    expect(isGeared(scene(unit('u'), gear('g', 2)), asObjId('u'))).toBe(false)
  })

  test('卸除后不再配装', () => {
    const s = attachCard(scene(unit('u'), gear('g', 2)), asObjId('g'), asObjId('u'))
    expect(isGeared(detachCard(s, asObjId('g')), asObjId('u'))).toBe(false)
  })
})

describe('§150 / §818.5 武装标签与[装配]特性', () => {
  test('§150.1 带[武装]标签的才是武装', () => {
    expect(isArmament(gear('g', 1))).toBe(true)
    expect(isArmament(unit('u'))).toBe(false)
    expect(isArmament(undefined)).toBe(false)
  })

  test('§818.5 有没有[装配]取【印刷】关键词,写法带费用也认', () => {
    expect(hasEquipAbility(gear('a', 1, { baseKeywords: ['装配'] }))).toBe(true)
    expect(hasEquipAbility(gear('b', 1, { baseKeywords: ['装配1蓝色'] }))).toBe(true)
    expect(hasEquipAbility(gear('c', 1, { baseKeywords: ['灵便'] }))).toBe(false)
  })

  test('§150.3 是武装 ≠ 有装配:只带[灵便]的武装仍是武装', () => {
    const nimbleArm = gear('n', 2, { baseKeywords: ['灵便'] })
    expect(isArmament(nimbleArm)).toBe(true)
    expect(hasEquipAbility(nimbleArm)).toBe(false)
  })
})

describe('§818.1.c.2 [装配]的默认目标 = 你控制的一名单位', () => {
  test('只枚举【自己控制的】【单位】', () => {
    const s = scene(
      unit('mine'),
      unit('theirs', { controller: P2, owner: P2 }),
      gear('other', 1, { oid: asObjId('other') }),
      gear('g', 2),
    )
    expect(equipDefaultTargets(s, P1, asObjId('g'))).toEqual(['mine'])
  })

  test('跨战场也算:限定是"你控制的",不是"同一个位置"', () => {
    const s = scene(unit('here'), unit('there', { zone: BF1 }), unit('home', { zone: BASE1 }), gear('g', 2))
    expect([...equipDefaultTargets(s, P1, asObjId('g'))].sort()).toEqual(['here', 'home', 'there'])
  })

  test('§434.1 手牌里的单位不是合法目标(贴附双方都得在场上)', () => {
    const s = scene(unit('inHand', { zone: HAND1 }), gear('g', 2))
    expect(equipDefaultTargets(s, P1, asObjId('g'))).toEqual([])
  })

  test('§434.1.g 当前顶部卡牌不再是合法目标(贴上去不产生任何效果,不能让人白付费)', () => {
    let s = scene(unit('u'), unit('v'), gear('g', 2))
    s = attachCard(s, asObjId('g'), asObjId('u'))
    expect(equipDefaultTargets(s, P1, asObjId('g'))).toEqual(['v'])
  })

  test('装备自己不在场上 → 没有目标', () => {
    const s = scene(unit('u'), gear('g', 2, { zone: HAND1 }))
    expect(equipDefaultTargets(s, P1, asObjId('g'))).toEqual([])
  })
})
