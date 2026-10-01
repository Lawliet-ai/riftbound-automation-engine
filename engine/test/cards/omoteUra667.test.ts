import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { applyEvents } from '../../src/loop/reduce'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { recursionCostOptions } from '../../src/keywords/recursion'
import { VEN_012_SPEC, VEN_012_ASSAULT } from '../../data/cards/VEN-012'

                                                               
                                                 
  
           
                                                                          
                                      
                                                                             
                                                       
                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

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

type Ev = { kind: string, target?: string, key?: string, value?: boolean, effect?: { id: string, duration?: string, modification: { kind: string, keyword?: string } } }
const resolveWith = (s: GameState, target?: string): readonly Ev[] =>
  VEN_012_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, {} as never) as unknown as readonly Ev[]

describe('★ 前提:①登记/②目标', () => {
  test('★★★★★3费 1红pip、[流转3红色] 两份且 §829 解析出 {mana:3,pips:[[red]]}、target custom、不登触发区', () => {
    expect(CARD_COSTS['VEN-012']).toEqual({ mana: 3, pips: 1, colors: ['red'] })
    expect(VEN_012_SPEC.cost).toEqual({ mana: 3, pips: [['red']] })
    expect(cardKind('VEN-012')).toBe('spell')
    expect(cardKeywords('VEN-012')).toEqual(['流转3红色'])
    expect(recursionCostOptions(cardKeywords('VEN-012'))).toEqual([{ mana: 3, pips: [['red']] }])
    expect(playSpecFor('VEN-012')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('VEN-012')
  })

  test('★★★★★★②「一名单位」零限定词:敌我/基地全量;装备不在', () => {
    const s = scene([obj('mine', P1, BF0), obj('foe', P2, BF0), obj('atBase', P2, `base:${P2}`),
      { ...obj('gear', P1, BF0), baseTypes: ['equipment'] } as GameObject])
    expect([...VEN_012_SPEC.legalTargets(s, P1)]).toEqual(['atBase', 'foe', 'mine'])
  })
})

describe('★★★★★★★ ③④结算', () => {
  test('★★★★★★③两条:statusChange dormant:false + grantKeyword 强攻3 thisTurn;敌方目标同样可以', () => {
    const s = scene([{ ...obj('t', P2, BF0), status: { dormant: true } } as GameObject])
    const evs = resolveWith(s, 't')
    expect(evs.map((e) => e.kind)).toEqual(['statusChange', 'addEffect'])
    expect(evs[0]).toMatchObject({ kind: 'statusChange', target: 't', key: 'dormant', value: false })
    expect(evs[1]!.effect!.duration, '★「在本回合内」').toBe('thisTurn')
    expect(evs[1]!.effect!.modification, '★强攻3 带 N(写成裸强攻少 2 点)').toEqual({ kind: 'grantKeyword', keyword: VEN_012_ASSAULT })
    expect(VEN_012_ASSAULT).toBe('强攻3')
  })

  test('★★★★★③端到端:挂上后 derived.keywords 含 强攻3;活跃单位也可选(幂等)', () => {
    const s = scene([obj('t', P1, BF0)])                    
    const evs = resolveWith(s, 't')
    const after = applyEvents(s, evs as never, {}).state
    const view = recomputeContinuous(after)
    expect(view.objects[asObjId('t')]!.derived?.keywords).toContain('强攻3')
  })

  test('★★★★★④没答目标 ⇒ 空;结算时目标没了 ⇒ 空(§355.8)', () => {
    const s = scene([obj('t', P1, BF0)])
    expect(resolveWith(s, undefined)).toEqual([])
    expect(resolveWith(s, 'gone')).toEqual([])
  })
})
