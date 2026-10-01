import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { attachCard, detachCard } from '../../src/state/attach'
import { deflectSurcharge } from '../../src/keywords/deflect'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `U-${id}`, owner: P1, controller: P1, zone: BF0,
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function gear(id: string, grants: string[], extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `G-${id}`, owner: P1, controller: P1, zone: BF0,
    baseMight: 0, baseKeywords: ['装配红色'], baseTags: ['武装'], baseTypes: ['equipment'],
    baseGrants: grants, damage: 0, counters: {}, status: {}, ...extra,
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
const kwsOf = (s: GameState, oid: string): readonly string[] =>
  recomputeContinuous(s).objects[oid]!.derived!.keywords
const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[oid]!).reference

describe('§718.3 贴附授予关键词进顶部卡牌的规则文本', () => {
  test('贴上才有,卸下即无(§137.3.a 同构:现算不悬停)', () => {
    const s0 = scene(unit('u'), gear('g', ['壁垒']))
    expect(kwsOf(s0, 'u')).not.toContain('壁垒')
    const s1 = attachCard(s0, asObjId('g'), asObjId('u'))
    expect(kwsOf(s1, 'u')).toContain('壁垒')
    expect(kwsOf(detachCard(s1, asObjId('g')), 'u')).not.toContain('壁垒')
  })

  test('授予落在【顶部卡牌】,武装自己不长这个关键词', () => {
    const s = attachCard(scene(unit('u'), gear('g', ['壁垒'])), asObjId('g'), asObjId('u'))
    expect(kwsOf(s, 'g')).not.toContain('壁垒')
  })

  test('锯齿短匕:授予[强攻2]→ 穿戴者进攻时 +2(valuedKeywordTotal 逐源计入)', () => {
    let s = scene(unit('u', { status: { attacking: true } }), gear('dirk', ['强攻2'], { basePowerBonus: 0 }))
    s = attachCard(s, asObjId('dirk'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(5)                 
  })

  test('§807.2 授予的强攻与自带的强攻【相加】(逐源,不是去重后只算一个)', () => {
    let s = scene(unit('u', { baseKeywords: ['强攻1'], status: { attacking: true } }), gear('dirk', ['强攻2']))
    s = attachCard(s, asObjId('dirk'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(6)             
  })

  test('不进攻就不加(强攻是身份开关的持续被动,授予不改变这一点)', () => {
    let s = scene(unit('u'), gear('dirk', ['强攻2'], { basePowerBonus: 0 }))
    s = attachCard(s, asObjId('dirk'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(3)
  })

  test('布甲:授予[坚守2] + 战力加成 0,防守时 3+2', () => {
    let s = scene(unit('u', { status: { defending: true } }), gear('cloth', ['坚守2'], { basePowerBonus: 0 }))
    s = attachCard(s, asObjId('cloth'), asObjId('u'))
    expect(mightOf(s, 'u')).toBe(5)
  })

  test('海克斯饮魔刀:授予[法盾]→ 对手选穿戴者为目标要加付 1', () => {
    let s = scene(unit('u'), gear('hex', ['法盾'], { basePowerBonus: 1 }))
    expect(deflectSurcharge(recomputeContinuous(s), asObjId('u'), P2)).toBe(0)
    s = attachCard(s, asObjId('hex'), asObjId('u'))
    const rs = recomputeContinuous(s)
    expect(deflectSurcharge(rs, asObjId('u'), P2)).toBe(1)                    
    expect(deflectSurcharge(rs, asObjId('u'), P1)).toBe(0)          
  })

  test('战力加成与授予并行:布甲把[坚守2]和 +0 一起带来,轻灵之靴把[游走]和 +2 一起带来', () => {
    let s = scene(unit('u'), gear('boots', ['游走'], { basePowerBonus: 2 }))
    s = attachCard(s, asObjId('boots'), asObjId('u'))
    expect(kwsOf(s, 'u')).toContain('游走')
    expect(mightOf(s, 'u')).toBe(5)         
  })
})
