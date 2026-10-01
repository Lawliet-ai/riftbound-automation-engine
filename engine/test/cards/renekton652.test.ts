import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeRenekton019Trigger, VEN_019_DAMAGE } from '../../data/cards/VEN-019'

                                                               
                                      
                                                
                
  
           
                                               
                                                                  
                                                           
                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
} as GameObject)

                                                                     
const rune = (oid: string, who: PlayerId): GameObject =>
  ({ ...obj(oid, who, `base:${who}`, ['rune']), defId: 'rune:红色' } as GameObject)

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

const trig = makeRenekton019Trigger(asObjId('rk'), P1)
const attack = (unit: string): GameEvent => ({ kind: 'attack', unit: asObjId(unit) } as unknown as GameEvent)
const runes = (n: number): GameObject[] => Array.from({ length: n }, (_, i) => rune(`r${i}`, P1))

describe('★ 前提:①登记/双印次', () => {
  test('★★★★★英雄单位 6费 0pip 红 6[S]、[急速] 两号都登、UNIT_COST 登了、variant 两号一组', () => {
    expect(CARD_COSTS['VEN-019']).toEqual({ mana: 6, pips: 0, colors: ['red'] })
    expect(cardKind('VEN-019')).toBe('unit')
    expect(VARIANT_GROUPS['VEN-019']).toEqual(['VEN-019', 'VEN-019a'])
    expect(cardKeywords('VEN-019')).toEqual(['急速'])
    expect(cardKeywords('VEN-019a'), '★异画号同登(§805 登了才真生效)').toEqual(['急速'])
    expect(cardCost('VEN-019')).toEqual({ mana: 6 })
  })
})

describe('★★★★★★★ ②③触发条件', () => {
  test('★★★★★★②「不超过四枚」= ≤4:4 枚响、**5 枚不响**(㉙ 边界);0 枚也响', () => {
    const me = obj('rk', P1, BF0)
    expect(checkTrigger(trig, attack('rk'), scene([me, ...runes(4)]), P1), '★恰好 4 枚 ⇒ 响').toBe(true)
    expect(checkTrigger(trig, attack('rk'), scene([me, ...runes(5)]), P1), '★5 枚 ⇒ 不响').toBe(false)
    expect(checkTrigger(trig, attack('rk'), scene([me]), P1)).toBe(true)
  })

  test('★★★★★③别的单位进攻不响(subjectIsSelf);对手符文数不算进我的账', () => {
    const s = scene([obj('rk', P1, BF0), obj('ally', P1, BF0), ...Array.from({ length: 9 }, (_, i) => rune(`fr${i}`, P2))])
    expect(checkTrigger(trig, attack('ally'), s, P1), '★队友进攻 ⇒ 不响').toBe(false)
    expect(checkTrigger(trig, attack('rk'), s, P1), '★对手 9 枚符文不算「你控制的」⇒ 照响').toBe(true)
  })
})

describe('★★★★★★★ ④AoE:此处敌方各2点', () => {
  test('★★★★★★此处敌方两名各一条(带两归因);此处我方/别处敌方都不炸', () => {
    const s = scene([obj('rk', P1, BF0), obj('e1', P2, BF0), obj('e2', P2, BF0),
      obj('mine', P1, BF0), obj('far', P2, BF1)])
    const evs = trig.effect(s, attack('rk'), {}) as unknown as readonly { kind: string, target?: string, amount?: number, source?: string, sourcePlayer?: string }[]
    expect(evs).toHaveLength(2)
    expect(evs.map((e) => e.target).sort()).toEqual(['e1', 'e2'])
    expect(evs[0]).toMatchObject({ kind: 'damage', amount: VEN_019_DAMAGE, source: 'rk', sourcePlayer: P1 })
  })

  test('★★★★★我已离场 ⇒ 空;此处没有敌方 ⇒ 空', () => {
    expect(trig.effect(scene([obj('e1', P2, BF0)]), attack('rk'), {})).toEqual([])
    expect(trig.effect(scene([obj('rk', P1, BF0), obj('mine', P1, BF0)]), attack('rk'), {})).toEqual([])
  })
})
