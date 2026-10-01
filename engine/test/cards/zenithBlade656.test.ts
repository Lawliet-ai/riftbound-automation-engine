import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { OGN_262_SPEC, OGN_262_PICK, zenithTargets } from '../../data/cards/OGN-262'

                                                                    
                                               
  
           
                                              
                                                   
                                                                     
                                         
                            

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

type Ev = { kind: string, target?: string, obj?: string, to?: string, unit?: string, player?: string, from?: string }
const ask = (s: GameState, target: string | undefined, chosen: Record<string, string> = {}) =>
  OGN_262_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen)
const resolveWith = (s: GameState, target: string | undefined, chosen: Record<string, string>): readonly Ev[] =>
  OGN_262_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen) as unknown as readonly Ev[]

                                                      
const board = (): GameState => scene([
  obj('foe', P2, BF0), obj('foeBase', P2, `base:${P2}`),
  obj('mineAt', P1, BF0), obj('mineBase', P1, `base:${P1}`), obj('mineFar', P1, BF1),
])

describe('★ 前提:登记/①目标口', () => {
  test('★★★★★专属法术 3费 2pip 一绿一黄、[迅捷]、进 PLAY_SPECS、不进触发区;目标=战场敌方', () => {
    expect(CARD_COSTS['OGN-262']).toEqual({ mana: 3, pips: 2, colors: ['green', 'yellow'] })
    expect(OGN_262_SPEC.cost).toEqual({ mana: 3, pips: [['green'], ['yellow']] })
    expect(cardKind('OGN-262')).toBe('spell')
    expect(cardKeywords('OGN-262')).toEqual(['迅捷'])
    expect(playSpecFor('OGN-262')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('OGN-262')
    expect(zenithTargets(board(), P1), '★①基地敌方/战场我方都不在').toEqual(['foe'])
  })
})

describe('★★★★★★★ ②第二问', () => {
  test('★★★★★★候选=友方(基地/别的战场)**排掉已在该战场的**+skip 档;答过不再问', () => {
    const q = ask(board(), 'foe')!
    expect(q.key).toBe(OGN_262_PICK)
    expect(q.candidates.map((c) => c.id), '★mineAt 已在 BF0 排掉;基地/BF1 的在;带 skip').toEqual(['mineBase', 'mineFar', 'skip'])
    expect(ask(board(), 'foe', { [OGN_262_PICK]: 'skip' })).toBeNull()
    expect(ask(board(), undefined), '★没答目标不问').toBeNull()
  })
})

describe('★★★★★★★ ③④⑤结算', () => {
  test('★★★★★★③选了 mover ⇒ [stun, zoneChange, unitMoved](落点=目标所在 BF0,§446.1 双发)', () => {
    const evs = resolveWith(board(), 'foe', { [OGN_262_PICK]: 'mineBase' })
    expect(evs.map((e) => e.kind)).toEqual(['stun', 'zoneChange', 'unitMoved'])
    expect(evs[0]).toMatchObject({ kind: 'stun', target: 'foe' })
    expect(evs[1]).toMatchObject({ kind: 'zoneChange', obj: 'mineBase', to: BF0 })
    expect(evs[2]).toMatchObject({ kind: 'unitMoved', unit: 'mineBase', player: P1, from: `base:${P1}`, to: BF0 })
  })

  test('★★★★★④skip/没选 ⇒ 只 stun;⑤目标没了 ⇒ 整条空(§355.8)', () => {
    expect(resolveWith(board(), 'foe', { [OGN_262_PICK]: 'skip' }).map((e) => e.kind)).toEqual(['stun'])
    expect(resolveWith(board(), 'foe', {}).map((e) => e.kind)).toEqual(['stun'])
    expect(resolveWith(board(), 'gone', {})).toEqual([])
  })

                                                                                            
                                                            
                                                                                           
                                                           
  test('★★★★★③目标结算时已被弹回**基地** ⇒ 已不是「战场上的敌方单位」⇒ 整张落空(§359.3.e.2 / .e.4 / .e.5)', () => {
                        
    const s = scene([obj('foe', P2, `base:${P2}`), obj('mineBase', P1, `base:${P1}`)])
    const evs = resolveWith(s, 'foe', { [OGN_262_PICK]: 'mineBase' })
    expect(evs.map((e) => e.kind), '★目标已不合法 ⇒ 眩晕与跟随移动都不做').toEqual([])
  })
})
