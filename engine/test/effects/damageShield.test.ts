import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { DAMAGE_SHIELD_COUNTER, damageShields, grantDamageShield } from '../../data/cards/damage-shields'

                                                
                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, ctrl = P1): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
const deps = { replacementShields: damageShields }
const hit = (id: string, n = 2) => ({ kind: 'damage' as const, target: asObjId(id), amount: n })
const dmg = (s: GameState, id: string): number => s.objects[id as never]?.damage ?? -1
const shieldsLeft = (s: GameState, id: string): number =>
  s.objects[id as never]?.counters[DAMAGE_SHIELD_COUNTER] ?? 0

describe('★通道本身:不提供护盾就完全不生效', () => {
  test('没接 replacementShields → 伤害照常落地', () => {
    const s = applyEvents(scene(obj('u')), [hit('u')]).state
    expect(dmg(s, 'u')).toBe(2)
  })

  test('接了但该单位没护盾 → 也照常落地', () => {
    const s = applyEvents(scene(obj('u')), [hit('u')], deps).state
    expect(dmg(s, 'u')).toBe(2)
  })
})

describe('§443 抵挡下一次伤害 = 把该事件替换为【无】', () => {
  test('★有护盾 → 这次伤害不发生', () => {
    const s0 = grantDamageShield(scene(obj('u')), asObjId('u'))
    const s = applyEvents(s0, [hit('u')], deps).state
    expect(dmg(s, 'u')).toBe(0)
  })

  test('★用掉即失效:第二次伤害照常落地', () => {
    let s = grantDamageShield(scene(obj('u')), asObjId('u'))
    s = applyEvents(s, [hit('u')], deps).state
    expect(shieldsLeft(s, 'u')).toBe(0)               
    s = applyEvents(s, [hit('u', 3)], deps).state
    expect(dmg(s, 'u')).toBe(3)
  })

  test('两层护盾 → 挡两次', () => {
    let s = grantDamageShield(grantDamageShield(scene(obj('u')), asObjId('u')), asObjId('u'))
    s = applyEvents(s, [hit('u')], deps).state
    s = applyEvents(s, [hit('u')], deps).state
    expect(dmg(s, 'u')).toBe(0)
    s = applyEvents(s, [hit('u')], deps).state
    expect(dmg(s, 'u')).toBe(2)          
  })

  test('★只护【自己】:同场另一个单位照挨打', () => {
    let s = grantDamageShield(scene(obj('a'), obj('b')), asObjId('a'))
    s = applyEvents(s, [hit('a'), hit('b')], deps).state
    expect(dmg(s, 'a')).toBe(0)
    expect(dmg(s, 'b')).toBe(2)
  })

  test('★§431.3.b 标了 exempt 的事件不可被防止', () => {
    const s0 = grantDamageShield(scene(obj('u')), asObjId('u'))
    const s = applyEvents(s0, [{ ...hit('u'), exempt: true }], deps).state
    expect(dmg(s, 'u')).toBe(2)         
    expect(shieldsLeft(s, 'u')).toBe(1)            
  })
})

describe('护盾是从当前态【现算】的', () => {
  test('单位离场后不再产出护盾(状态不会凭空复活)', () => {
    const s0 = grantDamageShield(scene(obj('u')), asObjId('u'))
    expect(damageShields(s0)).toHaveLength(1)
    const gone = scene()
    expect(damageShields(gone)).toHaveLength(0)
  })
})
