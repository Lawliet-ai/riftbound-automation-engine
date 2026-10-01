import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VEN_034_SPEC, VEN_034_PICK, VEN_034_PUMP, echoMovables } from '../../data/cards/VEN-034'

                                                               
                                                      
                                  
  
           
                                                       
                                                   
                                  
                                                                         
                        

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
                                                                                     
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    battlefieldControl: { [BF0]: P1 } } as unknown as GameState
}

type Ev = { kind: string, obj?: string, to?: string, unit?: string, effect?: { duration?: string, modification: { kind: string, delta?: number } } }
const ask = (s: GameState, target: string, chosen: Record<string, string> = {}) =>
  VEN_034_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target } as never)(s, chosen)
const resolveWith = (s: GameState, target: string | undefined, chosen: Record<string, string>): readonly Ev[] =>
  VEN_034_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:①登记/②候选', () => {
  test('★★★★★2费 1绿pip、[待命][反应] 两份、target custom(主目标=我控战场)、不登触发区', () => {
    expect(CARD_COSTS['VEN-034']).toEqual({ mana: 2, pips: 1, colors: ['green'] })
    expect(VEN_034_SPEC.cost).toEqual({ mana: 2, pips: [['green']] })
    expect(cardKind('VEN-034')).toBe('spell')
    expect(cardKeywords('VEN-034')).toEqual(['待命', '反应'])
    expect(playSpecFor('VEN-034')!.target).toBe('custom')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('VEN-034')
    const s = scene([])
    expect(VEN_034_SPEC.legalTargets(s, P1), '★「受你控制的战场」只有 BF0').toEqual([BF0])
  })

  test('★★★★★★②q2:我控+其他位置(所选战场里的排掉、敌方不在、基地在);isTarget;没得移不问', () => {
    const s = scene([obj('inDest', P1, BF0), obj('other', P1, BF1), obj('atBase', P1, `base:${P1}`), obj('foe', P2, BF1)])
    expect(echoMovables(s, P1, BF0), '★「位于其他位置」排掉 BF0 里的;敌方不在;基地在').toEqual(['atBase', 'other'])
    const q = ask(s, BF0)!
    expect(q.key).toBe(VEN_034_PICK)
    expect(q.candidates.map((c) => c.id)).toEqual(['atBase', 'other'])
    expect((q as { isTarget?: boolean }).isTarget, '★§355.6 第二个也是目标').toBe(true)
    expect(ask(scene([obj('inDest', P1, BF0)]), BF0), '★没有其他位置的我控单位 ⇒ 问不出').toBeNull()
  })
})

describe('★★★★★★★ ③结算', () => {
  test('★★★★★★[zoneChange, unitMoved 双发, pump+2 thisTurn];两目标缺一 ⇒ 空;单位没了 ⇒ 空', () => {
    const s = scene([obj('mv', P1, BF1)])
    const evs = resolveWith(s, BF0, { [VEN_034_PICK]: 'mv' })
    expect(evs.map((e) => e.kind), '★§446.1 双发+pump').toEqual(['zoneChange', 'unitMoved', 'addEffect'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'mv', to: BF0 })
    expect(evs[1]).toMatchObject({ kind: 'unitMoved', unit: 'mv', to: BF0 })
    expect(evs[2]!.effect!.duration, '★「在本回合内」').toBe('thisTurn')
    expect(evs[2]!.effect!.modification).toMatchObject({ kind: 'addMight', delta: VEN_034_PUMP })
    expect(VEN_034_PUMP).toBe(2)
    expect(resolveWith(s, BF0, {}), '★没答单位 ⇒ 空').toEqual([])
    expect(resolveWith(s, undefined, { [VEN_034_PICK]: 'mv' })).toEqual([])
    expect(resolveWith(s, BF0, { [VEN_034_PICK]: 'gone' }), '★单位结算时没了 ⇒ 空').toEqual([])
  })

  test('★★★★★基地出发也照移;敌方单位冒充答案 ⇒ 空(㉖ 复验 controller)', () => {
    const s = scene([obj('ab', P1, `base:${P1}`), obj('foe', P2, BF1)])
    const evs = resolveWith(s, BF0, { [VEN_034_PICK]: 'ab' })
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved', 'addEffect'])
    expect(resolveWith(s, BF0, { [VEN_034_PICK]: 'foe' }), '★敌方不是合法答案').toEqual([])
  })
})
