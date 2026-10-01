import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { OGN_266_SPEC } from '../../data/cards/OGN-266'

                                                              
               
                                                          
               
  
           
                                                              
                                          
                                                          
                                                               
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
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

type Ev = { kind: string, effect?: { id: string, duration?: string, modification: { kind: string, delta?: number, floor?: number } } }
const resolveWith = (s: GameState, target?: string): readonly Ev[] =>
  OGN_266_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, {} as never) as unknown as readonly Ev[]

describe('★ 前提:①登记/②战场目标', () => {
  test('★★★★★2费 1pip 一枚双色蓝/黄、[反应] 两份、target custom、不登触发区', () => {
    expect(CARD_COSTS['OGN-266']).toEqual({ mana: 2, pips: 1, colors: ['blue', 'yellow'] })
    expect(OGN_266_SPEC.cost, '★㊶ 双色单 pip = 一枚双色').toEqual({ mana: 2, pips: [['blue', 'yellow']] })
    expect(cardKind('OGN-266')).toBe('spell')
    expect(cardKeywords('OGN-266')).toEqual(['反应'])
    expect(playSpecFor('OGN-266')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('OGN-266')
  })

  test('★★★★★②legalTargets = 战场 zone(基地不在候选里)', () => {
    const s = scene([])
    const zones = OGN_266_SPEC.legalTargets(s, P1)
    expect(zones.length).toBeGreaterThan(0)
    expect(zones.every((z) => z.startsWith('battlefield:')), '★「选择一个战场」⇒ 只有战场').toBe(true)
  })
})

describe('★★★★★★★ ③④结算:双向分条+floor', () => {
  test('★★★★★★③友方两名各 +1(不带 floor);敌方两名各 -1 **floor:1**;duration thisTurn', () => {
    const s = scene([obj('m1', P1, BF0), obj('m2', P1, BF0), obj('f1', P2, BF0), obj('f2', P2, BF0)])
    const evs = resolveWith(s, BF0)
    expect(evs).toHaveLength(4)
    expect(evs.every((e) => e.kind === 'addEffect' && e.effect!.duration === 'thisTurn'), '★「直到回合结束」').toBe(true)
    const ally = evs.filter((e) => e.effect!.id.includes('ally'))
    const foe = evs.filter((e) => e.effect!.id.includes('foe'))
    expect(ally).toHaveLength(2)
    expect(foe).toHaveLength(2)
    for (const e of ally) expect(e.effect!.modification, '★友方 +1,不带 floor(下限只管减)').toEqual({ kind: 'addMight', delta: 1 })
    for (const e of foe) expect(e.effect!.modification, '★敌方 -1 不得低于1 = floor 档(㊼ OGN-090)').toEqual({ kind: 'addMight', delta: -1, floor: 1 })
  })

  test('★★★★★④筛:该处装备不吃;别的战场不动;夺控单位按 controller 分敌我;没答目标 ⇒ 空', () => {
                                                         
    const stolen = { ...obj('st', P2, BF0), controller: P1 } as GameObject
    const s = scene([stolen, { ...obj('eq', P1, BF0), baseTypes: ['equipment'] } as GameObject, obj('far', P2, BF1)])
    const evs = resolveWith(s, BF0)
    expect(evs).toHaveLength(1)
    expect(evs[0]!.effect!.id).toContain('ally')
    expect(evs[0]!.effect!.id).toContain('st')
    expect(resolveWith(s, undefined)).toEqual([])
  })
})
