import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { checkTrigger } from '../../src/dsl/trigger'
import { activatedFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
import { VEN_155, VEN_155_SPEC, VEN_155_GRANT, makeRageHeartTrigger } from '../../data/cards/VEN-155'

                                                          
                              
                                                
  
           
                                                         
                                                                   
                                                       
                                            
                                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('rh')

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const rage = (): GameObject =>
  ({ ...obj('rh', P1, `legend:${P1}`), defId: 'VEN-155', baseTypes: ['legend'] } as GameObject)

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

const trigU = makeRageHeartTrigger(SELF, P1, 'playUnit')
const trigS = makeRageHeartTrigger(SELF, P1, 'playSpell')
const pu = (player: PlayerId, fromZoneKind?: string): GameEvent =>
  ({ kind: 'playUnit', unit: asObjId('x'), player, ...(fromZoneKind !== undefined ? { fromZoneKind } : {}) } as unknown as GameEvent)
const ps = (player: PlayerId, fromZoneKind?: string): GameEvent =>
  ({ kind: 'playSpell', player, cardOid: asObjId('sp'), ...(fromZoneKind !== undefined ? { fromZoneKind } : {}) } as unknown as GameEvent)

describe('★★★★★★★ ①②③句①触发', () => {
  test('★★★★★★废牌堆/待命/牌堆打出响;**手牌不响**(主反例);缺字段保守不响;法术档同形', () => {
    const s = scene([rage()])
    for (const k of ['discard', 'standby', 'mainDeck']) {
      expect(checkTrigger(trigU, pu(P1, k), s, P1), `★单位从 ${k}`).toBe(true)
      expect(checkTrigger(trigS, ps(P1, k), s, P1), `★法术从 ${k}`).toBe(true)
    }
    expect(checkTrigger(trigU, pu(P1, 'hand'), s, P1), '★「手牌以外」⇒ 手牌不响').toBe(false)
    expect(checkTrigger(trigS, ps(P1, 'hand'), s, P1)).toBe(false)
    expect(checkTrigger(trigU, pu(P1), s, P1), '★缺字段=来源不明 ⇒ 保守不响(㊼ SFD-029)').toBe(false)
  })

  test('★★★★★③by you:对手从牌堆打出不响;④effect=[empower 我],落地幂等(§441);离场空', () => {
    const s = scene([rage()])
    expect(checkTrigger(trigU, pu(P2, 'discard'), s, P2), '★打出的人是对手').toBe(false)
    expect(trigU.effect(s, pu(P1, 'discard'), {})).toEqual([{ kind: 'empower', target: 'rh' }])
    expect(trigU.effect(scene([]), pu(P1, 'discard'), {})).toEqual([])
    const once = applyEvents(s, trigU.effect(s, pu(P1, 'discard'), {}) as never, {}).state
    expect(once.objects['rh' as never]!.counters[EMPOWER_COUNTER]).toBe(1)
    const twice = applyEvents(once, [{ kind: 'empower', target: SELF }] as never, {}).state
    expect(twice.objects['rh' as never]!.counters[EMPOWER_COUNTER], '★已强化再强化=无操作').toBe(1)
  })
})

describe('★★★★★★★ ⑤句②:迅捷>解除强化+横置 ⇒ 给强攻2', () => {
  test('★★★★★★spec 形状:费用双件+[迅捷]+零资源费;「一名单位」敌我/基地全在;装备不在', () => {
    expect(VEN_155_SPEC.keywords).toEqual(['迅捷'])
    expect(VEN_155_SPEC.tapSelf, '★「{{横置}}」').toBe(true)
    expect(VEN_155_SPEC.unempowerSelf, '★「解除我的强化」(§442 同时是可用性闸)').toBe(true)
    expect(VEN_155_SPEC.cost, '★冒号前没有资源符号').toEqual({})
    const s = scene([obj('mine', P1, BF0), obj('foe', P2, BF0), obj('atBase', P2, `base:${P2}`),
      { ...obj('gear', P1, BF0), baseTypes: ['equipment'] } as GameObject])
    expect(VEN_155_SPEC.legalTargets!(s, P1, 'rh')).toEqual(['atBase', 'foe', 'mine'])
  })

  test('★★★★★★resolve=grantKeyword 强攻2 thisTurn;E2E derived.keywords 含强攻2 回合内;目标离场空', () => {
    const s = scene([obj('u', P1, BF0)])
    const evs = VEN_155_SPEC.makeResolve({ selfOid: SELF, controller: P1, target: 'u' } as never)(s, {} as never, undefined as never) as unknown as readonly { kind: string, effect?: { duration: string, modification: { kind: string, keyword?: string } } }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('addEffect')
    expect(evs[0]!.effect!.duration, '★「在本回合内」').toBe('thisTurn')
    expect(evs[0]!.effect!.modification).toEqual({ kind: 'grantKeyword', keyword: VEN_155_GRANT })
    expect(VEN_155_GRANT, '★㊶ 整串钉字面量').toBe('强攻2')
    const after = recomputeContinuous(applyEvents(s, evs as never, {}).state)
    expect(after.objects['u' as never]!.derived?.keywords).toContain('强攻2')
    expect(VEN_155_SPEC.makeResolve({ selfOid: SELF, controller: P1 } as never)(s, {} as never, undefined as never)).toEqual([])
  })
})

describe('★ 前提:登记(正典折叠)', () => {
  test('★★★★★传奇 0费 紫+黄、双号一组、keywords 双号空、TRIGGERS 两条+ACTIVATED 折叠一条', () => {
    expect(CARD_COSTS['VEN-155']).toEqual({ mana: 0, pips: 0, colors: ['purple', 'yellow'] })
    expect(cardKind('VEN-155')).toBe('legend')
    expect(VARIANT_GROUPS['VEN-155']).toEqual(['VEN-155', 'VEN-197'])
    for (const no of ['VEN-155', 'VEN-197']) expect(cardKeywords(no), no).toEqual([])
    expect(activatedFor('VEN-155')).toHaveLength(1)
    expect(activatedFor('VEN-197'), '★折叠').toHaveLength(1)
    expect(VEN_155.energy).toBe(0)
  })
})
