import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { SFD_111_SPEC, SFD_111_PICK, SFD_111_DEST, SFD_111_SKIP, unitsInHand } from '../../data/cards/SFD-111'

                                                                
                    
                                                           
  
           
                                                   
                                                         
                           
                                                                   
                                                      
                                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
} as GameObject)

                                                   
const rune = (oid: string, color: string): GameObject =>
  ({ ...obj(oid, `rune:${color}`, P1, `base:${P1}`, ['rune']), baseMight: 0 } as GameObject)

                                                                   
function scene(objs: readonly GameObject[], controlBf = true): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = controlBf ? [...objs, obj('guard', 'U-guard', P1, BF0)] : [...objs]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const s = { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
                                                               
                                                       
                                                          
  return s
}

type Ev = { kind: string, unit?: string, player?: string, play?: { card?: string, to?: string, cost?: { mana: number, pips?: readonly (readonly string[])[] }, by?: string } }
const ask = (s: GameState, chosen: Record<string, string> = {}) =>
  SFD_111_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>): readonly Ev[] =>
  SFD_111_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:①登记/②问链', () => {
  test('★★★★★2费 1橙pip、[待命][迅捷] 两份、target none、不登触发区', () => {
    expect(CARD_COSTS['SFD-111']).toEqual({ mana: 2, pips: 1, colors: ['orange'] })
    expect(SFD_111_SPEC.cost).toEqual({ mana: 2, pips: [['orange']] })
    expect(cardKind('SFD-111')).toBe('spell')
    expect(cardKeywords('SFD-111')).toEqual(['待命', '迅捷'])
    expect(playSpecFor('SFD-111')!.target).toBe('none')
    expect(TRIGGER_ZONE_DEFIDS).not.toContain('SFD-111')
  })

  test('★★★★★★②pick=手牌单位+skip(法术不在);dest=我控战场;无我控战场 ⇒ 不问', () => {
    const s = scene([obj('h1', 'OGN-013', P1, `hand:${P1}`), obj('h2', 'OGN-266', P1, `hand:${P1}`)])
    expect(unitsInHand(s, P1), '★OGN-266 是法术不在').toEqual(['h1'])
    const q = ask(s)!
    expect(q.key).toBe(SFD_111_PICK)
    expect(q.candidates.map((c) => c.id), '★「你可以选择」⇒ skip 档').toEqual(['h1', SFD_111_SKIP])
    const q2 = ask(s, { [SFD_111_PICK]: 'h1' })!
    expect(q2.key).toBe(SFD_111_DEST)
    expect(q2.candidates.map((c) => c.id), '★我控战场只有 BF0').toEqual([BF0])
    expect(ask(scene([obj('h1', 'OGN-013', P1, `hand:${P1}`)], false)), '★无我控战场 ⇒ 那句落空不问').toBeNull()
    expect(ask(s, { [SFD_111_PICK]: SFD_111_SKIP }), '★skip 了不问落点').toBeNull()
  })
})

describe('★★★★★★★ ③④结算', () => {
  test('★★★★★★③真卡钉两档:OGN-013(1费)⇒ mana 0 下限;OGN-107(5费)⇒ mana 2;playUnit 形状齐', () => {
                                                                 
    const s = scene([obj('h1', 'OGN-013', P1, `hand:${P1}`), obj('h2', 'OGN-107', P1, `hand:${P1}`), rune('r0', 'blue'), rune('r1', 'blue')])
    const evs = resolveWith(s, { [SFD_111_PICK]: 'h1', [SFD_111_DEST]: BF0 })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'playUnit', unit: 'h1', player: P1 })
    expect(evs[0]!.play).toMatchObject({ card: 'h1', to: BF0, by: 'sp' })
    expect(evs[0]!.play!.cost!.mana, '★1-3 下限 0(㊶)').toBe(0)
                              
    const evs2 = resolveWith(s, { [SFD_111_PICK]: 'h2', [SFD_111_DEST]: BF0 })
    expect(evs2[0]!.play!.cost!.mana, '★5-3=2 付费路(⚠️不是 playFree)').toBe(2)
    expect(evs2[0]!.kind, '★㊶ reduceMana 走付费路').toBe('playUnit')
  })

  test('★★★★★④skip/没答 ⇒ 空;付不起 ⇒ 空;牌不在手/落点失控 ⇒ 空(㉖)', () => {
                                                                            
    const s = scene([obj('h2', 'OGN-107', P1, `hand:${P1}`)])
    expect(resolveWith(s, { [SFD_111_PICK]: 'h2', [SFD_111_DEST]: BF0 }), '★零符文付不起减后 2 法力 ⇒ §419.3.c 空').toEqual([])
    expect(resolveWith(s, { [SFD_111_PICK]: SFD_111_SKIP, [SFD_111_DEST]: BF0 })).toEqual([])
    expect(resolveWith(s, {})).toEqual([])
    expect(resolveWith(s, { [SFD_111_PICK]: 'nothand', [SFD_111_DEST]: BF0 })).toEqual([])
    const noCtrl = scene([obj('h1', 'OGN-013', P1, `hand:${P1}`)], false)
    expect(resolveWith(noCtrl, { [SFD_111_PICK]: 'h1', [SFD_111_DEST]: BF0 }), '★落点已失控 ⇒ 空').toEqual([])
  })
})
