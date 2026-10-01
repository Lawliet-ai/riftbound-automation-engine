import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { StaticEffect } from '../../src/effects/continuousView'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind, cardCost, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_FACTS } from '../../data/cardFacts'
import { recomputeContinuous } from '../../src/effects/continuousView'
import {
  SFD_028, SFD_028_CARD_EFFECT, SFD_028_KEYWORDS, SFD_028_ASK,
  lucianBoldValue, makeLucianAttackTrigger,
} from '../../data/cards/SFD-028'

                                                               
                            
                                                   
                                                          
                                                      
  
                                
                                                           
                                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'lucian'

const unit = (oid: string, ctrl = P2, zone = BF0, kws: readonly string[] = []): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                               
const lucian = (zone = BF0, kws: readonly string[] = ['强攻']): GameObject =>
  ({ ...unit(SELF, P1, zone, kws), defId: 'SFD-028', baseMight: 2 } as GameObject)

function scene(objs: readonly GameObject[], effects: readonly StaticEffect[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(effects.length > 0 ? { continuousEffects: effects } : {}),
  } as GameState)
}
                                    
const grantBold = (target: string, kw: string): StaticEffect => ({
  id: `grant:${target}:${kw}`, duration: 'permanent', fromPassive: false, timestamp: 1,
  predicate: (x: GameObject) => (x.oid as string) === target,
  modification: { kind: 'grantKeyword', keyword: kw },
} as unknown as StaticEffect)

const trig = () => makeLucianAttackTrigger(asObjId(SELF), P1)
const fire = (s: GameState, foe: string | undefined) =>
  trig().effect(s, { kind: 'attack', unit: asObjId(SELF), player: P1 } as unknown as GameEvent,
    foe === undefined ? {} : { [SFD_028_ASK]: foe }) as readonly GameEvent[]

describe('🔴🔴🔴★★★★★★610 卢锡安:前提与接线', () => {
  test('★前提:英雄单位 3费 **0pip** 红 2[S]、印刷[强攻]、**两印次**、卡文一字不差', () => {
    expect(CARD_COSTS['SFD-028']).toEqual({ mana: 3, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['SFD-028a']).toEqual({ mana: 3, pips: 0, colors: ['red'] })
    expect(cardKind('SFD-028')).toBe('unit')
    expect(CARD_FACTS['SFD-028']?.heroUnit).toBe(true)
    expect(SFD_028.energy).toBe(3)
    expect(SFD_028.power).toBe(2)
    expect(SFD_028.domains).toEqual(['red'])
    expect(SFD_028_CARD_EFFECT).toBe(
      '{{强攻}}（如果我是进攻方，则{{S}}+1。）\n当我进攻时，对此处的一名敌方单位造成等同于我{{强攻}}数值的伤害。')
  })

  test('🔴🔴🔴★★★★★★【会换答案】接线:印刷[强攻]登进 `CARD_KEYWORDS`(漏了伤害数额直接变 0)', () => {
    expect(SFD_028_KEYWORDS).toEqual(['强攻'])
    for (const id of ['SFD-028', 'SFD-028a']) {
      expect(cardKeywords(id), `★★★${id} 漏登 ⇒ 第二句静默失效`).toContain('强攻')
    }
    expect(cardCost('SFD-028'), '★★★登了触发就得登费用(★597/606/607 三次栽过)').toEqual({ mana: 3 })
  })

  test('🔴🔴🔴★★★★★★接线:触发表**两个卡号都查得到**,且**只有 attack 一个时机**', () => {
    for (const id of ['SFD-028', 'SFD-028a']) {
      const s = scene([{ ...lucian(), defId: id } as GameObject])
      const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'SFD-028')
      expect(mine.length, `★★★${id} 登记漏了 ⇒ 第二句是死的`).toBe(1)
      expect(mine[0]!.event).toBe('attack')
    }
    expect(trig().abilityKey, '★只有一个时机 ⇒ 不该设 abilityKey(那是一卡多时机才要的)').toBeUndefined()
  })
})

describe('🔴🔴🔴★★★★★★610 伤害数额:「等同于我{强攻}数值」', () => {
  test('🔴🔴🔴★★★★★★【真结算·会换答案】裸[强攻]缺省 X=1 ⇒ 打 **1** 点(**不是**我的 2 战力)', () => {
                                                              
    const s = scene([lucian(), unit('foe')])
    expect(lucianBoldValue(s, s.objects[asObjId(SELF)]!), '★§807.1.c 裸[强攻]缺省 X=1').toBe(1)
    const evs = fire(s, 'foe')
    expect(evs.length).toBe(1)
    expect(evs[0]).toMatchObject({ kind: 'damage', target: 'foe', amount: 1, sourcePlayer: P1 })
  })

  test('🔴🔴🔴★★★★★★【会换答案】§807.2 **逐份来源相加**:再获得一份[强攻2] ⇒ 打 **3** 点', () => {
                                                                            
    const s = scene([lucian(), unit('foe')], [grantBold(SELF, '强攻2')])
    expect(lucianBoldValue(s, s.objects[asObjId(SELF)]!), '★★★1 + 2 = 3').toBe(3)
    expect(fire(s, 'foe')[0]).toMatchObject({ amount: 3 })
  })

  test('🔴🔴🔴★★★★★★【会换答案】**没有**[强攻] ⇒ 数额 0(不是回落成战力)', () => {
    const s = scene([lucian(BF0, []), unit('foe')])
    expect(lucianBoldValue(s, s.objects[asObjId(SELF)]!)).toBe(0)
    expect(fire(s, 'foe')[0], '★★★写成 effectiveMight 这条会算成 2').toMatchObject({ amount: 0 })
  })

  test('🔴🔴★★★★★★数额**结算时现读**(§359.3.f.2):同一条触发在不同盘面给不同答案', () => {
    const plain = scene([lucian(), unit('foe')])
    const buffed = scene([lucian(), unit('foe')], [grantBold(SELF, '强攻2')])
    expect(fire(plain, 'foe')[0]).toMatchObject({ amount: 1 })
    expect(fire(buffed, 'foe')[0]).toMatchObject({ amount: 3 })
  })
})

describe('🔴🔴🔴★★★★★★610 目标与时机', () => {
  test('🔴🔴🔴★★★★★★【会换答案】「当**我**进攻时」——`subjectIsSelf`,队友进攻不响', () => {
    expect(trig().by).toBe('you')
    const s = scene([lucian(), unit('ally', P1), unit('foe')])
    const mateAttacks = { kind: 'attack', unit: asObjId('ally'), player: P1 } as unknown as GameEvent
    expect(trig().filter?.(mateAttacks, s) ?? true, '★★★只写 by:you 队友进攻也会响(★第112轮实锤)').toBe(false)
    expect(trig().filter?.({ kind: 'attack', unit: asObjId(SELF), player: P1 } as unknown as GameEvent, s) ?? false)
      .toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案·验对层】候选是「**此处**的一名**敌方**单位」——问出来的候选集说了算', () => {
                                                             
                                                                       
                                                         
    const s = scene([
      lucian(BF0), unit('foeHere'), unit('foeFar', P2, 'battlefield:shared:1'),
      unit('allyHere', P1),
    ])
    const ev = { kind: 'attack', unit: asObjId(SELF), player: P1 } as unknown as GameEvent
    const q = trig().nextChoice!(s, ev, {})
    expect(q, '★真的会问').not.toBeNull()
    expect(q!.key).toBe(SFD_028_ASK)
    expect(q!.candidates.map((c) => c.id).sort(),
      '★★★漏 atSelfZone 会把别处战场的也列进来;漏 opponent 会把自己人列进来').toEqual(['foeHere'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】没选 / 目标已离场 / 我已离场 ⇒ 一条都不发', () => {
    const s = scene([lucian(), unit('foe')])
    expect(fire(s, undefined), '★没选').toEqual([])
    expect(fire(s, 'ghost'), '★★★目标已离场(§359.3.e.12)').toEqual([])
    const noMe = scene([unit('foe')])                         
    expect(fire(noMe, 'foe'), '★★★我已离场').toEqual([])
  })
})
