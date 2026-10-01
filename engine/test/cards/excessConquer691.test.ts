import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeYetiBruiserTrigger, makeSivirAmbitionTrigger, YETI_EXCESS_MIN, SIVIR_EXCESS_MIN } from '../../data/cards/excess-conquer'

                                                                  
                                                        
                                                            
                                     
  
           
                                                           
                                                 
                                
                                          
                                                       
                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[], excess?: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(excess !== undefined ? { maxExcessDamageThisTurn: { [P1 as string]: excess } } : {}) } as GameState
}

const conquer = (bf: string = BF0, by: PlayerId = P1): GameEvent =>
  ({ kind: 'conquer', player: by, battlefield: bf } as unknown as GameEvent)
const yeti = makeYetiBruiserTrigger(asObjId('yt'), P1)
const sivir = makeSivirAmbitionTrigger(asObjId('sv'), P1)

describe('★ 前提:①登记', () => {
  test('★★★★★两卡登记;SFD-120 [法盾2] 两号都登+双印次组;阈值各写(3/5)', () => {
    expect(CARD_COSTS['UNL-018']).toEqual({ mana: 6, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['SFD-120']).toEqual({ mana: 6, pips: 3, colors: ['orange'] })
    expect(cardKind('UNL-018')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-120']).toEqual(['SFD-120', 'SFD-120a'])
    expect(cardKeywords('SFD-120')).toEqual(['法盾2'])
    expect(cardKeywords('SFD-120a'), '★异画号同登').toEqual(['法盾2'])
    expect(cardKeywords('UNL-018')).toEqual([])
    expect(cardCost('SFD-120')).toEqual({ mana: 6, pips: [['orange'], ['orange'], ['orange']] })
    expect(YETI_EXCESS_MIN).toBe(3)
    expect(SIVIR_EXCESS_MIN).toBe(5)
  })
})

describe('★★★★★★★ ②触发条件', () => {
  test('★★★★★★㉙ 雪人恰3响/2不响;希维尔恰5响/4不响;无账不响', () => {
    const at = (t: 'yt' | 'sv', n?: number) => {
      const s = scene([obj(t, t === 'yt' ? 'UNL-018' : 'SFD-120', P1, BF0)], n)
      return checkTrigger(t === 'yt' ? yeti : sivir, conquer(), s, P1)
    }
    expect(at('yt', 3), '★恰3').toBe(true)
    expect(at('yt', 2)).toBe(false)
    expect(at('sv', 5), '★恰5').toBe(true)
    expect(at('sv', 4)).toBe(false)
    expect(at('yt'), '★无账').toBe(false)
  })

  test('★★★★★我不在被征服的战场不响(hostAtEventBattlefield);对手征服不响', () => {
    const s = scene([obj('yt', 'UNL-018', P1, 'battlefield:shared:1')], 9)
    expect(checkTrigger(yeti, conquer(BF0), s, P1), '★我在别的战场').toBe(false)
    const s2 = scene([obj('yt', 'UNL-018', P1, BF0)], 9)
    expect(checkTrigger(yeti, conquer(BF0, P2), s2, P2), '★对手征服').toBe(false)
  })
})

describe('★★★★★★★ ③④效果', () => {
  test('★★★★★★③雪人:两条 spawnToken 金币 dormant 落我基地', () => {
    const s = scene([obj('yt', 'UNL-018', P1, BF0)], 4)
    const evs = yeti.effect(s, conquer(), {}) as unknown as readonly { kind: string, zone?: string, owner?: string, dormant?: boolean, spec?: { defId: string } }[]
    expect(evs).toHaveLength(2)
    for (const e of evs) {
      expect(e).toMatchObject({ kind: 'spawnToken', zone: `base:${P1}`, owner: P1, dormant: true })
      expect(e.spec!.defId).toBe('token:金币')
    }
  })

  test('★★★★★★④希维尔:问链单选敌方(含基地敌方,我方不在);无敌方不问;damage=账值+两归因;victim 没了空', () => {
    const s = scene([obj('sv', 'SFD-120', P1, BF0), obj('foe', 'U-F', P2, BF0),
      obj('foeBase', 'U-B', P2, `base:${P2}`), obj('mine', 'U-M', P1, BF0)], 7)
    const q = sivir.nextChoice!(s, conquer(), {})!
    expect(q.candidates.map((c) => c.id), '★敌方两名(含基地);我方不在').toEqual(['foe', 'foeBase'])
    expect((q as { isTarget?: boolean }).isTarget).toBe(true)
    expect(sivir.nextChoice!(scene([obj('sv', 'SFD-120', P1, BF0)], 7), conquer(), {}), '★无敌方不问').toBeNull()
    const evs = sivir.effect(s, conquer(), { victim: 'foe' }) as unknown as readonly { kind: string, target?: string, amount?: number, source?: string, sourcePlayer?: string }[]
    expect(evs).toEqual([{ kind: 'damage', target: 'foe', amount: 7, source: 'sv', sourcePlayer: P1 }])
    expect(sivir.effect(s, conquer(), { victim: 'ghost' }), '★victim 结算时没了').toEqual([])
  })
})
