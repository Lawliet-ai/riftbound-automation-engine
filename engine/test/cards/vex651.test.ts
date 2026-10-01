import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeVexTrigger } from '../../data/cards/UNL-055'

                                                                
                                                      
                                                 
                                        
  
           
                                          
                                                
                                            
                                              
                                                       
                         

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

const trig = makeVexTrigger(asObjId('vex'), P1)
const stun = (target: string): GameEvent => ({ kind: 'stun', target: asObjId(target) } as GameEvent)
                                                                        
const fires = (s: GameState, ev: GameEvent, actor: PlayerId): boolean => checkTrigger(trig, ev, s, actor)

describe('★ 前提:①登记/双印次', () => {
  test('★★★★★英雄单位 5费 1绿pip 5[S]、[坚守][壁垒] 两号都登、UNIT_COST 登了;③mayChoose 在', () => {
    expect(CARD_COSTS['UNL-055']).toEqual({ mana: 5, pips: 1, colors: ['green'] })
    expect(cardKind('UNL-055')).toBe('unit')
    expect(VARIANT_GROUPS['UNL-055']).toEqual(['UNL-055', 'UNL-055a'])
    expect(cardKeywords('UNL-055')).toEqual(['坚守', '壁垒'])
    expect(cardKeywords('UNL-055a'), '★异画号同登').toEqual(['坚守', '壁垒'])
    expect(cardCost('UNL-055')).toEqual({ mana: 5, pips: [['green']] })
    expect((trig as unknown as { mayChoose?: boolean }).mayChoose, '★「你可以选择」档').toBe(true)
  })
})

describe('★★★★★★★ ②时机三判', () => {
  const s = scene([obj('vex', P1, `base:${P1}`), obj('foe', P2, BF0), obj('mine', P1, BF0), obj('foeAtBase', P2, `base:${P2}`)])

  test('★★★★★★你眩晕战场上的敌方单位 ⇒ 响;**对手**眩晕同一单位 ⇒ 不响(by you)', () => {
    expect(fires(s, stun('foe'), P1)).toBe(true)
    expect(fires(s, stun('foe'), P2), '★施加者是对手 ⇒ 不响').toBe(false)
  })

  test('★★★★★★我方单位被眩晕 ⇒ 不响(敌方筛);**基地**的敌方被眩晕 ⇒ 不响(★651 战场词)', () => {
    expect(fires(s, stun('mine'), P1)).toBe(false)
    expect(fires(s, stun('foeAtBase'), P1), '★「战场上的」⇒ 基地不算').toBe(false)
  })
})

describe('★★★★★★★ ④效果:移动到该战场', () => {
  test('★★★★★★从基地移到被眩晕者所在战场:zoneChange+unitMoved 双发(§446.1)', () => {
    const s = scene([obj('vex', P1, `base:${P1}`), obj('foe', P2, BF1)])
    const evs = trig.effect(s, stun('foe'), {}) as unknown as readonly { kind: string, obj?: string, to?: string, unit?: string, player?: string, from?: string }[]
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'vex', to: BF1 })
    expect(evs[1]).toMatchObject({ kind: 'unitMoved', unit: 'vex', player: P1, from: `base:${P1}`, to: BF1 })
  })

  test('★★★★★我已在该战场 ⇒ 空(同位置兜底);被眩晕者已消失 ⇒ 空(防御)', () => {
    const s = scene([obj('vex', P1, BF0), obj('foe', P2, BF0)])
    expect(trig.effect(s, stun('foe'), {})).toEqual([])
    expect(trig.effect(s, stun('gone'), {})).toEqual([])
  })
})
