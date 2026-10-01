import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activatedFor, cardKeywords, cardKind, replacementShieldsFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { empoweredPassives } from '../../data/cards/empowered-passives'
import { wolfAmbessaShields, VEN_084_DEFIDS } from '../../data/cards/VEN-084'

                                                                    
                               
                                                          
  
           
                                                              
                                         
                                                    
                                    
                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const amb = (oid: string, defId: string, emp: number, status: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: emp > 0 ? { empower: emp } : {}, status,
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

const dmg = (target: string, amount: number): GameEvent =>
  ({ kind: 'damage', target: asObjId(target), amount, sourcePlayer: P2 } as GameEvent)

describe('★ 前提:双印次 / 工厂强化 / EMPOWERED_MIGHT 两档', () => {
  test('★★★★★上游:4费0pip 橙、两号同组;[强化3橙色] 工厂出 spec(3法力+1橙pip)', () => {
    expect(CARD_COSTS['VEN-084']).toEqual({ mana: 4, pips: 0, colors: ['orange'] })
    expect(cardKind('VEN-084')).toBe('unit')
    expect(VARIANT_GROUPS['VEN-084']).toEqual(['VEN-084', 'VEN-084a'])
    expect(VEN_084_DEFIDS).toEqual(['VEN-084', 'VEN-084a'])
    expect(cardKeywords('VEN-084')).toEqual(['强化3橙色'])
    expect(cardKeywords('VEN-084a'), '★异画号同登(㊼ VEN-136 先例)').toEqual(['强化3橙色'])
    const specs = activatedFor('VEN-084')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.cost, '★3 法力 + 1 枚橙 pip(㊶ parseCostSuffix)').toEqual({ mana: 3, pips: [['orange']] })
  })

  test('★★★★★★②S+3:emp=1 加、emp=0 不加(§828 持续条件;两号都认)', () => {
    const hot = amb('a', 'VEN-084', 1)
    const cold = amb('b', 'VEN-084a', 0)
    const s = scene([hot, cold])
                                                                        
    const hotEff = empoweredPassives(hot).find((e) => (e as { modification?: { delta?: number } }).modification?.delta === 3)!
    expect(hotEff, '★表里有 +3 那条').toBeDefined()
    expect((hotEff as unknown as { predicate: (x: GameObject) => boolean }).predicate(hot), '★已强化 ⇒ predicate 真').toBe(true)
    const coldEff = empoweredPassives(cold).find((e) => (e as { modification?: { delta?: number } }).modification?.delta === 3)!
    expect((coldEff as unknown as { predicate: (x: GameObject) => boolean }).predicate(cold), '★未强化 ⇒ predicate 假(效果不生效)').toBe(false)
  })
})

describe('★★★★★★★ ③④⑤免伤护盾', () => {
  test('★★★★★★③已强化+不在战斗中 ⇒ 出盾,伤害改写成 0(⑤amount 归 0,事件还在)', () => {
    const s = scene([amb('a', 'VEN-084', 1)])
    const shields = wolfAmbessaShields(s)
    expect(shields).toHaveLength(1)
    expect(shields[0]!.predicate(dmg('a', 5), s)).toBe(true)
    const rewritten = shields[0]!.rewrite(dmg('a', 5), s) as { kind: string, amount: number }
    expect(rewritten).toMatchObject({ kind: 'damage', amount: 0 })
                
    expect(shields[0]!.predicate(dmg('other', 5), s)).toBe(false)
  })

  test('★★★★★★③未强化 ⇒ 盾不存在(§828 依赖性);④在战斗中(攻/防身份)⇒ 盾不出', () => {
    expect(wolfAmbessaShields(scene([amb('a', 'VEN-084', 0)])), '★未强化').toEqual([])
    expect(wolfAmbessaShields(scene([amb('a', 'VEN-084', 1, { attacking: true })])), '★进攻方照常挨打').toEqual([])
    expect(wolfAmbessaShields(scene([amb('a', 'VEN-084', 1, { defending: true })])), '★防守方照常挨打').toEqual([])
  })

  test('★★★★★双印次 084a 也认;接线:replacementShieldsFor 汇总口拿得到', () => {
    const s = scene([amb('a', 'VEN-084a', 1)])
    expect(wolfAmbessaShields(s)).toHaveLength(1)
    const hub = replacementShieldsFor(s).filter((sh) => (sh.id as string).startsWith('VEN-084:immune'))
    expect(hub, '★汇总口并联上了').toHaveLength(1)
  })

  test('★★★★别的单位(非本卡 defId)已强化也不出盾(⑤「只认本卡」摆一张别的)', () => {
    const other = amb('x', 'VEN-136', 1)              
    expect(wolfAmbessaShields(scene([other]))).toEqual([])
  })
})
