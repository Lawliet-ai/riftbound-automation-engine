import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { activatedFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { specLookup } from '../../data/decks'
import { VEN_125, VEN_125_SPEC } from '../../data/cards/VEN-125'

                                                                       
                                        
                                       
  
           
                                                                     
                                                              
                                                             
                                              
                                                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
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

const targeted = (chooser: PlayerId, target: string): GameEvent =>
  ({ kind: 'targeted', chooser, target: asObjId(target), sourceKind: 'spell' } as unknown as GameEvent)

describe('★★★★★★★ ①chosenEnemyUnitThisTurn 账', () => {
  test('★★★★★★选敌方单位 ⇒ 账立(幂等);选敌方**装备**不立(两本账);选友方不立', () => {
    const s = scene([obj('foe', P2, BF0), obj('mine', P1, BF0),
      { ...obj('foeGear', P2, BF0), baseTypes: ['equipment'] } as GameObject])
    const a = applyEvents(s, [targeted(P1, 'foe')] as never, {}).state
    expect(a.chosenEnemyUnitThisTurn?.[P1 as string], '★选敌方单位 ⇒ 立').toBe(true)
    const b = applyEvents(s, [targeted(P1, 'foeGear')] as never, {}).state
    expect(b.chosenEnemyUnitThisTurn?.[P1 as string], '★敌方装备不算「敌方单位」').toBeUndefined()
    expect(b.enemyTargetedThisTurn?.[P1]?.spell, '★探险家那本照记(两本各记各的)').toBe(1)
    const c = applyEvents(s, [targeted(P1, 'mine')] as never, {}).state
    expect(c.chosenEnemyUnitThisTurn?.[P1 as string], '★友方不立').toBeUndefined()
  })
})

describe('★★★★★★★ ②③冰原饿狼', () => {
  test('★★★★★★available:账未立不可用/立了可用;oncePerTurn+费色钉字面量', () => {
    const cold = scene([obj('w', P1, BF0, { defId: 'VEN-125' } as Partial<GameObject>)])
    expect(VEN_125_SPEC.available!(cold, P1, 'w'), '★没选过 ⇒ 不可用(§827.1.c.1)').toBe(false)
    const hot = applyEvents(scene([obj('w', P1, BF0, { defId: 'VEN-125' } as Partial<GameObject>), obj('foe', P2, BF0)]), [targeted(P1, 'foe')] as never, {}).state
    expect(VEN_125_SPEC.available!(hot, P1, 'w')).toBe(true)
    expect((VEN_125_SPEC as { oncePerTurn?: true }).oncePerTurn, '★「每回合仅限使用一次」').toBe(true)
    expect(VEN_125_SPEC.cost, '★「支付{{黄色}}」=一枚黄符能(㊼ SFD-180)').toEqual({ mana: 0, pips: [['yellow']] })
  })

  test('★★★★★★resolve=[dormant:false, pump+1](单位=dormant 不是 tapped);E2E 活跃+derived 4+1;离场空', () => {
    const s = scene([obj('w', P1, BF0, { defId: 'VEN-125', baseMight: 4, status: { dormant: true } } as Partial<GameObject>)])
    const evs = VEN_125_SPEC.makeResolve({ selfOid: asObjId('w'), controller: P1 } as never)(s, {} as never, undefined as never)
    expect((evs as readonly { kind: string }[]).map((e) => e.kind)).toEqual(['statusChange', 'addEffect'])
    expect(evs[0]).toMatchObject({ target: 'w', key: 'dormant', value: false })
    const after = recomputeContinuous(applyEvents(s, evs as never, {}).state)
    expect(after.objects['w' as never]!.status.dormant, '★「让我变为活跃」').toBe(false)
    expect(after.objects['w' as never]!.derived?.might, '★本回合 +1').toBe(5)
    expect(VEN_125_SPEC.makeResolve({ selfOid: asObjId('w'), controller: P1 } as never)(scene([]), {} as never, undefined as never)).toEqual([])
  })
})

describe('★ 前提:登记(单位面,无组实证)', () => {
  test('★★★★★4费黄 4[S] unit、无组、keywords 空、ACTIVATED 一条、CARDS 有肉', () => {
    expect(CARD_COSTS['VEN-125']).toEqual({ mana: 4, pips: 0, colors: ['yellow'] })
    expect(cardKind('VEN-125')).toBe('unit')
    expect(VARIANT_GROUPS['VEN-125'], '★无组实证').toBeUndefined()
    expect(cardKeywords('VEN-125')).toEqual([])
    expect(activatedFor('VEN-125')).toHaveLength(1)
    expect(specLookup('VEN-125').baseMight, '★decks CARDS 有肉(空壳闸姿势)').toBe(4)
    expect(VEN_125.power).toBe(4)
  })
})
