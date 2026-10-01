import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { recursionCostOptions } from '../../src/keywords/recursion'
import { ENEMY_MOVE_DEFIDS, VEN_148_SPEC, VEN_148_DEST, shadowBindDests, myUnitsAt } from '../../data/cards/enemy-move'

                                                                
               
                                         
                                        
  
           
                                                                          
                                                
                                 
                                          
                                                          
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

type Ev = { kind: string, obj?: string, to?: string, unit?: string, effect?: { id: string, duration?: string, modification: { kind: string, delta?: number } } }
const resolveWith = (s: GameState, target: string | undefined, chosen: Record<string, string>): readonly Ev[] =>
  VEN_148_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen) as unknown as readonly Ev[]
const ask = (s: GameState, target: string, chosen: Record<string, string> = {}) =>
  VEN_148_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target } as never)(s, chosen)

describe('★ 前提:①登记/②目标与落点', () => {
  test('★★★★★2费 1pip 一枚双色绿/黄、[流转5AA] 解析两枚任意、族闸 4→5、不登触发区', () => {
    expect(CARD_COSTS['VEN-148']).toEqual({ mana: 2, pips: 1, colors: ['green', 'yellow'] })
    expect(VEN_148_SPEC.cost, '★㊶ 双色单 pip = 一枚双色').toEqual({ mana: 2, pips: [['green', 'yellow']] })
    expect(cardKind('VEN-148')).toBe('spell')
    expect(cardKeywords('VEN-148')).toEqual(['流转5AA'])
    expect(recursionCostOptions(cardKeywords('VEN-148')), '★AA=两枚任意').toEqual([{ mana: 5, pips: [[], []] }])
    expect(playSpecFor('VEN-148')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('VEN-148')
    expect([...ENEMY_MOVE_DEFIDS], '★族闸 4→5 收编').toContain('VEN-148')
  })

  test('★★★★★★②目标=敌方(我方不在);落点=你有单位的战场(没我单位/当前位置不在);没得去不问', () => {
                                      
    const s = scene([obj('foe', P2, BF0), obj('m1', P1, BF1)])
    expect(VEN_148_SPEC.legalTargets(s, P1), '★「敌方单位」我方不在').toEqual(['foe'])
    expect(shadowBindDests(s, P1, 'foe'), '★BF0=当前位置排除;BF1 我有单位 ⇒ 在').toEqual([BF1])
    const q = ask(s, 'foe')!
    expect(q.key).toBe(VEN_148_DEST)
    expect(q.candidates.map((c) => c.id)).toEqual([BF1])
    expect(ask(scene([obj('foe', P2, BF0)]), 'foe'), '★没有我有单位的战场 ⇒ 问不出').toBeNull()
  })
})

describe('★★★★★★★ ③移动+④恰2 三档', () => {
  test('★★★★★★③双发+④恰2:我在 BF1 两名 ⇒ 各 +1 thisTurn;被移来的敌方不吃', () => {
    const s = scene([obj('foe', P2, BF0), obj('m1', P1, BF1), obj('m2', P1, BF1)])
    const evs = resolveWith(s, 'foe', { [VEN_148_DEST]: BF1 })
    expect(evs.map((e) => e.kind), '★§446.1 双发+两条 pump').toEqual(['zoneChange', 'unitMoved', 'addEffect', 'addEffect'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'foe', to: BF1 })
    expect(evs[1]).toMatchObject({ kind: 'unitMoved', unit: 'foe' })
    const pumped = evs.slice(2).map((e) => e.effect!.id)
    expect(pumped.some((i) => i.includes('m1')) && pumped.some((i) => i.includes('m2')), '★打我那两名').toBe(true)
    expect(pumped.every((i) => !i.includes('foe')), '★被移来的敌方不吃(「你在该处」不含它)').toBe(true)
    expect(evs.slice(2).every((e) => e.effect!.duration === 'thisTurn' && e.effect!.modification.delta === 1)).toBe(true)
  })

  test('★★★★★★④㉙三档:1 名 ⇒ 零 pump(移动照走);3 名 ⇒ 零 pump;没答落点 ⇒ 空', () => {
    const one = scene([obj('foe', P2, BF0), obj('m1', P1, BF1)])
    expect(resolveWith(one, 'foe', { [VEN_148_DEST]: BF1 }).map((e) => e.kind), '★1 名不满恰2').toEqual(['zoneChange', 'unitMoved'])
    const three = scene([obj('foe', P2, BF0), obj('m1', P1, BF1), obj('m2', P1, BF1), obj('m3', P1, BF1)])
    expect(resolveWith(three, 'foe', { [VEN_148_DEST]: BF1 }).map((e) => e.kind), '★3 名超了「有且仅有」').toEqual(['zoneChange', 'unitMoved'])
    expect(resolveWith(one, 'foe', {})).toEqual([])
    expect(resolveWith(one, undefined, { [VEN_148_DEST]: BF1 })).toEqual([])
  })

  test('★★★★★myUnitsAt 只数我控单位(敌方/装备不算)', () => {
    const s = scene([obj('m1', P1, BF1), obj('f1', P2, BF1), { ...obj('eq', P1, BF1), baseTypes: ['equipment'] } as GameObject])
    expect(myUnitsAt(s, P1, BF1)).toEqual(['m1'])
  })
})
