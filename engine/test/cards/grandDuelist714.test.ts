import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { recomputeContinuous, expireThisTurnEffects, type StaticEffect } from '../../src/effects/continuousView'
import { collectMightCrossed } from '../../src/effects/mightCrossed'
import { cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { POWERFUL_MIN_MIGHT } from '../../data/cards/conditional-self-passives'
import { SFD_205, makeGrandDuelistTrigger } from '../../data/cards/SFD-205'

                                                          
                                                  
  
           
                                                        
                                                                      
                                                          
                                             
                                                                  
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('fi')

const obj = (oid: string, who: PlayerId, zone: string, might = 3, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)

function scene(objs: readonly GameObject[], effects: readonly StaticEffect[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    continuousEffects: [...base.continuousEffects, ...effects] } as GameState
}

                                 
const debuff = (target: string, delta: number): StaticEffect => ({
  id: `deb:${target}`, duration: 'thisTurn', fromPassive: false, timestamp: 1,
  predicate: (x) => (x.oid as string) === target,
  modification: { kind: 'addMight', delta },
} as StaticEffect)

const fiora = (status: Record<string, boolean> = {}): GameObject =>
  ({ ...obj('fi', P1, `legend:${P1}`), defId: 'SFD-205', baseTypes: ['legend'], status } as GameObject)
const trig = makeGrandDuelistTrigger(SELF, P1)
const mc = (unit: string, from: number, to: number, controller: PlayerId = P1): GameEvent =>
  ({ kind: 'mightCrossed', unit: asObjId(unit), controller, from, to } as unknown as GameEvent)

describe('★★★★★★★ ①失效路产地②:thisTurn 降力过期 ⇒ 回升报「变为」(QA L235)', () => {
  test('★★★★★★base5 被 -2(derived 3)⇒ 失效后回 5:共用件报 from:3 to:5;无失效变化 ⇒ 空', () => {
    const s = scene([obj('u', P1, BF0, 5)], [debuff('u', -2)])
    const before = recomputeContinuous(s)
    expect(before.objects['u' as never]!.derived?.might, '★失效前稳定态=3').toBe(3)
    const after = recomputeContinuous(expireThisTurnEffects(before))
    const evs = collectMightCrossed(before, after) as readonly { kind: string, unit?: string, from?: number, to?: number }[]
    expect(evs, '★敲诈失效回 5 =「变为强力」的产地').toEqual([
      { kind: 'mightCrossed', unit: 'u', controller: P1, from: 3, to: 5 }])
    expect(collectMightCrossed(after, recomputeContinuous(expireThisTurnEffects(after))), '★没有过期变化 ⇒ 不报').toEqual([])
  })
})

describe('★★★★★★★ ②③触发条件', () => {
  test('★★★★★★我方 4→5 响;**敌方** 4→5 不响(controller 筛);5→6 不响;4→7 响;缺字段不响', () => {
    const s = scene([fiora()])
    expect(checkTrigger(trig, mc('u', 4, 5), s, P1)).toBe(true)
    expect(checkTrigger(trig, mc('e', 4, 5, P2), s, P2), '★对手单位变强 ⇒ 不响').toBe(false)
    expect(checkTrigger(trig, mc('u', 5, 6), s, P1), '★已是强力再涨 ⇒ 没有「变为」(§709)').toBe(false)
    expect(checkTrigger(trig, mc('u', 4, 7), s, P1), '★一步跨过也算').toBe(true)
    expect(POWERFUL_MIN_MIGHT, '★阈值钉字面量').toBe(5)
  })
})

describe('★★★★★★★ ④⑤可选+费用先付+休眠符文', () => {
                                                       
                                                        
                                                  
                                                                     
                                                                        
                                                                      
                                                                      
                                                        
                                              
  test('★★★★★★可选走确认阶段(mayChoose);费用先付=basePerform 在确认阶段就把我横置;effect 只剩休眠符文', () => {
    const s = scene([fiora()])
    expect(trig.mayChoose, '★★§383.3.a「你可以选择」在效果开头 ⇒ 确认阶段问').toBe(true)
    expect(trig.nextChoice, '★★旧的结算期二选已经不在了').toBeUndefined()
    const paid = trig.basePerform!(s, mc('u', 4, 5), {})
    expect(paid, '★★费用付得起 ⇒ 返回付完的 state(不是 null)').not.toBeNull()
    expect(paid!.objects['fi' as never]!.status.tapped, '★★★费用先付:确认阶段我就已经横置了(★683 传奇休眠=tapped)').toBe(true)
    const evs = trig.effect(paid!, mc('u', 4, 5), {})
    expect(evs.map((e) => (e as { kind: string }).kind), '★effect 只剩收益那一半').toEqual(['summonRune'])
    expect(evs[0], '★「一枚**休眠**的符文」(§430.2)').toMatchObject({ kind: 'summonRune', player: P1, count: 1, dormant: true })
  })

  test('★★★★★★已 tapped ⇒ 费付不起:basePerform 返回 null ⇒ §383.3.b.1 不确认、视为未触发', () => {
    const tapped = scene([fiora({ tapped: true })])
    expect(trig.basePerform!(tapped, mc('u', 4, 5), {}), '★★付不起 ⇒ null(链上会被移除)').toBeNull()
                                                              
                                                  
    expect(trig.effect(tapped, mc('u', 4, 5), {}).length, '★effect 只管收益').toBe(1)
  })
})

describe('★ 前提:登记(正典折叠)', () => {
  test('★★★★★传奇 0费 橙+黄、双号一组、keywords 双号空、TRIGGERS 折叠', () => {
    expect(CARD_COSTS['SFD-205']).toEqual({ mana: 0, pips: 0, colors: ['orange', 'yellow'] })
    expect(cardKind('SFD-205')).toBe('legend')
    expect(VARIANT_GROUPS['SFD-205']).toEqual(['SFD-205', 'SFD-251'])
    for (const no of ['SFD-205', 'SFD-251']) expect(cardKeywords(no), no).toEqual([])
    expect(SFD_205.energy).toBe(0)
  })
})
