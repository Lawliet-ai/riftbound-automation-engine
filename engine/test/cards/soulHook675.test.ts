import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { applyEvents } from '../../src/loop/reduce'
import { activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { makeDamTriggers, VEN_079_PICK } from '../../data/cards/VEN-079'

                                                              
                                    
                                                   
                                    
  
           
                                                              
                                               
                                              
                 
                                                                    
                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, might = 3, emp = 0): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0,
  counters: emp > 0 ? { empower: emp } : {}, status: {},
} as unknown as GameObject)

const dam = (zone: string, emp: number): GameObject => ({ ...obj('dm', P1, zone, 5, emp), defId: 'VEN-079' } as GameObject)

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

const [atk, dfd] = makeDamTriggers(asObjId('dm'), P1)
const attack = (unit: string): GameEvent => ({ kind: 'attack', unit: asObjId(unit) } as unknown as GameEvent)
const defend = (unit: string): GameEvent => ({ kind: 'defend', unit: asObjId(unit) } as unknown as GameEvent)

describe('★ 前提:①登记/②触发', () => {
  test('★★★★★5费 0pip 橙 5[S]、强化5橙色 登了(工厂生成技能)、UNIT_COST', () => {
    expect(CARD_COSTS['VEN-079']).toEqual({ mana: 5, pips: 0, colors: ['orange'] })
    expect(cardKind('VEN-079')).toBe('unit')
    expect(cardKeywords('VEN-079')).toEqual(['强化5橙色'])
    expect(cardCost('VEN-079')).toEqual({ mana: 5 })
    expect(activatedFor('VEN-079').length, '★工厂据 CARD_KEYWORDS 生成').toBeGreaterThan(0)
  })

  test('★★★★★★②已强化:攻/防都响;**未强化不响**(§828 触发时判);别的单位攻不响', () => {
    const on = scene([dam(BF0, 1), obj('ally', P1, BF0)])
    expect(checkTrigger(atk!, attack('dm'), on, P1)).toBe(true)
    expect(checkTrigger(dfd!, defend('dm'), on, P1), '★「或防守」').toBe(true)
    const off = scene([dam(BF0, 0)])
    expect(checkTrigger(atk!, attack('dm'), off, P1), '★未强化 {已强化>} 不在').toBe(false)
    expect(checkTrigger(dfd!, defend('dm'), off, P1)).toBe(false)
    expect(checkTrigger(atk!, attack('ally'), on, P1), '★别的单位进攻不响').toBe(false)
  })
})

describe('★★★★★★★ ③候选+④结算', () => {
  test('★★★★★★③勘误零限定:敌我/比我弱/我自己都在;我在基地 ⇒ 不问', () => {
    const s = scene([dam(BF0, 1), obj('weak', P2, BF0, 1), obj('mine', P1, BF0, 9)])
    const q = atk!.nextChoice!(s, attack('dm'), {})!
    expect(q.key).toBe(VEN_079_PICK)
    expect(q.candidates.map((c) => c.id).sort(), '★errata:「战力大于我」已移除 ⇒ 1[S] 的 weak 也在;含我自己').toEqual(['dm', 'mine', 'weak'])
    const atBase = scene([dam(`base:${P1}`, 1)])
    expect(atBase.zones[`base:${P1}` as never] ? (makeDamTriggers(asObjId('dm'), P1)[0]!.nextChoice!(atBase, attack('dm'), {})) : null, '★「此处」=战场;基地不问').toBeNull()
  })

  test('★★★★★★④[setMight 参照现值, pump+1];端到端 derived=参照+1;参照离场 ⇒ 空', () => {
                                                                
    const withDerived = { ...obj('mine', P1, BF0, 9), derived: { might: 11, keywords: [] } } as unknown as GameObject
    const s = scene([dam(BF0, 1), withDerived])
    const evs = atk!.effect(s, attack('dm'), { [VEN_079_PICK]: 'mine' }) as unknown as readonly { kind: string, effect?: { modification: { kind: string, value?: number, delta?: number } } }[]
    expect(evs.map((e) => e.kind)).toEqual(['addEffect', 'addEffect'])
    expect(evs[0]!.effect!.modification, '★「提升至」= setMight 参照结算现值 11').toEqual({ kind: 'setMight', value: 11 })
    expect(evs[1]!.effect!.modification).toMatchObject({ kind: 'addMight', delta: 1 })
                                         
    const plain = scene([dam(BF0, 1), obj('mine', P1, BF0, 9)])
    const evs2 = atk!.effect(plain, attack('dm'), { [VEN_079_PICK]: 'mine' })
    const after = recomputeContinuous(applyEvents(plain, evs2 as never, {}).state)
    expect(effectiveMight(after.objects[asObjId('dm')]!).actual, '★9(setMight)+1(然后)=10').toBe(10)
    expect(atk!.effect(s, attack('dm'), { [VEN_079_PICK]: 'gone' }), '★参照已离场 ⇒ 空').toEqual([])
    expect(atk!.effect(s, attack('dm'), {})).toEqual([])
  })
})
