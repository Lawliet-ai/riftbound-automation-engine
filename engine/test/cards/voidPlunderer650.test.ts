import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activatedFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { experienceOf } from '../../src/keywords/level'
import { UNL_201_SPECS, makeVoidPlundererTrigger } from '../../data/cards/UNL-201'

                                                                   
                      
                             
                                           
  
           
                                                                     
                                                        
                                             
                                                 
                                           
                                                            
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, status: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status,
} as GameObject)

function scene(objs: readonly GameObject[], xp: Record<string, number> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    experience: { ...base.experience, ...xp } } as GameState
}

const trig = makeVoidPlundererTrigger(asObjId('vp'), P1)
const battleEnd = (outcome: string, attacker: PlayerId, defender: PlayerId): GameEvent =>
  ({ kind: 'battleEnd', outcome, attacker, defender, participants: [] } as unknown as GameEvent)
const BUFF = UNL_201_SPECS[0]!
const RECALL = UNL_201_SPECS[1]!

describe('★ 前提:①传奇登记/三印次/两条技能形状', () => {
  test('★★★★★传奇 0费、UNIT_COST 登了、keywords 三号都空、variant 三号一组、ACTIVATED 两条', () => {
    expect(CARD_COSTS['UNL-201']).toEqual({ mana: 0, pips: 0, colors: ['orange', 'purple'] })
    expect(cardKind('UNL-201')).toBe('legend')
    expect(VARIANT_GROUPS['UNL-201']).toEqual(['UNL-201', 'UNL-236', 'UNL-236*'])
    for (const no of ['UNL-201', 'UNL-236', 'UNL-236*']) expect(cardKeywords(no), no).toEqual([])
    const specs = activatedFor('UNL-201')
    expect(specs).toHaveLength(2)
    expect(specs.map((s) => s.key)).toEqual(['UNL-201:buff', 'UNL-201:recall'])
    expect(specs.every((s) => s.tapSelf === true), '★两条都要横置').toBe(true)
    expect(specs[0]!.extraCost!.label).toBe('消耗1经验')
    expect(specs[1]!.extraCost!.label).toBe('消耗2经验')
  })

  test('★★★★★⑤extraCost:经验不够 pay=null(§203.3);够则真扣(1 剩 0 / 2 剩 0)', () => {
    const poor = scene([], { P1: 0 })
    expect(BUFF.extraCost!.pay(poor, P1, 'vp')).toBeNull()
    const rich = scene([], { P1: 2 })
    expect(experienceOf(BUFF.extraCost!.pay(rich, P1, 'vp')!, P1)).toBe(1)
    expect(experienceOf(RECALL.extraCost!.pay(rich, P1, 'vp')!, P1)).toBe(0)
    expect(RECALL.extraCost!.pay(scene([], { P1: 1 }), P1, 'vp'), '★2 经验的档 1 点付不起').toBeNull()
  })
})

describe('★★★★★★★ ②触发:你赢得一场战斗 ⇒ 获1经验', () => {
  test('★★★★★★我方赢(攻/防两侧)都触发;输了/无结果不触发;效果=gainResource experience 1', () => {
    const s = scene([])
    expect(trig.filter!(battleEnd('attackerWins', P1, P2), s), '★进攻赢').toBe(true)
    expect(trig.filter!(battleEnd('defenderWins', P2, P1), s), '★防守赢').toBe(true)
    expect(trig.filter!(battleEnd('attackerWins', P2, P1), s), '★对手赢').toBe(false)
    expect(trig.filter!(battleEnd('noResult', P1, P2), s), '★没人赢').toBe(false)
    const evs = trig.effect(s, battleEnd('attackerWins', P1, P2), {}) as unknown as readonly { kind: string, player?: string, experience?: number }[]
    expect(evs).toEqual([{ kind: 'gainResource', player: P1, experience: 1 }])
  })
})

describe('★★★★★★★ ③④两条主动技能', () => {
  test('★★★★★★③技①「一名单位」零限定词:敌我/基地全在;resolve=grantBuff', () => {
    const s = scene([obj('mine', P1, BF0), obj('foe', P2, BF0), obj('atBase', P2, `base:${P2}`)])
    expect(BUFF.legalTargets!(s, P1, 'vp')).toEqual(['atBase', 'foe', 'mine'])
    const evs = BUFF.makeResolve({ selfOid: asObjId('vp'), controller: P1, target: 'foe' } as never)(s, {} as never, undefined as never)
    expect(evs).toEqual([{ kind: 'grantBuff', target: 'foe' }])
  })

  test('★★★★★★④技②三重筛:战场+友方+休眠(活跃友方/休眠敌方/基地休眠都不在)', () => {
    const s = scene([
      obj('ok', P1, BF0, { dormant: true }),
      obj('awake', P1, BF0),
      obj('foeDormant', P2, BF0, { dormant: true }),
      obj('atBase', P1, `base:${P1}`, { dormant: true }),
    ])
    expect(RECALL.legalTargets!(s, P1, 'vp'), '★只有战场上休眠的友方那一个').toEqual(['ok'])
  })

  test('★★★★★★④resolve:「其基地」=该单位**控制者**的基地(夺控单位:owner P2 也回 P1 基地);双发(§446.1)', () => {
                                                                              
    const s = scene([{ ...obj('ok', P1, BF0, { dormant: true }), owner: P2 } as GameObject])
    const evs = RECALL.makeResolve({ selfOid: asObjId('vp'), controller: P1, target: 'ok' } as never)(s, {} as never, undefined as never) as unknown as readonly { kind: string, obj?: string, to?: string, unit?: string, player?: string }[]
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'ok', to: `base:${P1}` })
    expect(evs[1]).toMatchObject({ kind: 'unitMoved', unit: 'ok', player: P1, to: `base:${P1}` })
    expect(RECALL.makeResolve({ selfOid: asObjId('vp'), controller: P1 } as never)(s, {} as never, undefined as never)).toEqual([])
  })
})
