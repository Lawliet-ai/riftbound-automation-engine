import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind, cardPassives, playSpecFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import type { GameEvent } from '../../src/loop/events'
import { LONGTAIL3_DEFIDS } from '../../data/cards/longtail-3'

                             
  
                                          
                                             
                                               

setCardPassiveProvider(cardPassives)                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: specLookup(defId).baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
const plain = (oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject =>
  ({ ...obj(oid, 'BLK', ctrl, extra), baseMight: extra.baseMight ?? 3 })

function scene(objs: GameObject[], deck = 4): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const all = [...objs, ...Array.from({ length: deck }, (_, i) =>
    plain(`d${i}`, P1, { zone: asZoneId(`mainDeck:${P1}`) }))]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
function run(st: GameState, ev: GameEvent, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const might = (s: GameState, oid: string) => effectiveMight(recomputeContinuous(s).objects[oid]!).reference
const handSize = (s: GameState, p = P1) => s.zones[`hand:${p}`]?.contents.length ?? 0
const expOf = (s: GameState, p = P1) => s.experience[p] ?? 0
const moved = (unit: string, from: string, to: string, p = P1): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player: p, from: asZoneId(from), to: asZoneId(to) })
                                             
const died = (o: GameObject): GameEvent => ({
  kind: 'destroyed',
  victim: {
    oid: o.oid, defId: o.defId, controller: o.controller, owner: o.owner, zone: o.zone,
    might: o.baseMight, damage: 0, keywords: [], counters: {}, status: {}, types: ['unit'],
  } as never,
})

describe('★【长尾批次·三】(第152轮)', () => {
  test('前提:登记齐,战力/费用照卡面实测取', () => {
                                                 
                                                      
    expect(LONGTAIL3_DEFIDS.slice().sort())
      .toEqual(['SFD-048', 'SFD-137', 'SFD-159', 'UNL-068', 'UNL-129', 'UNL-180'])
    expect(cardKind('UNL-180')).toBe('spell')
    expect(cardCost('UNL-180')).toEqual({ mana: 9, pips: [['yellow'], ['yellow'], ['yellow']] })
                                                
                                                        
    expect(playSpecFor('UNL-159')!.cost).toEqual({ mana: 2, pips: [['yellow']] })
    for (const [d, m, p] of [['SFD-048', 4, 3], ['SFD-137', 4, 4], ['UNL-068', 6, 5],
      ['UNL-129', 5, 5], ['SFD-159', 2, 2]] as const) {
      expect(cardKind(d), d).toBe('unit')
      expect(cardCost(d).mana, d).toBe(m)
      expect(specLookup(d).baseMight, d).toBe(p)
    }
  })

  test('★破败之咒 UNL-180:摧毁【所有】单位(含我方、含基地),装备不算', () => {
    const st = scene([plain('a'), plain('b', P2), plain('inBase', P1, { zone: asZoneId(`base:${P1}`) }),
      plain('gear', P1, { baseTypes: ['equipment'] })])
    const evs = playSpecFor('UNL-180')!.makeResolve({ movedCardOid: 'x', controller: P1 } as never)(st, {}, undefined as never)
                                    
    expect(evs.map((e) => (e as { target: string }).target).sort()).toEqual(['a', 'b', 'inBase'])
    expect(evs.every((e) => e.kind === 'destroy')).toBe(true)               
  })

  test('★狩魂 UNL-159:三重限定各压一条(战场上 / ≤3[M] / 敌我不限)', () => {
    const st = scene([plain('small', P2, { baseMight: 3 }), plain('big', P2, { baseMight: 4 }),
      plain('mineSmall', P1, { baseMight: 1 }), plain('inBase', P2, { baseMight: 1, zone: asZoneId(`base:${P2}`) })])
    const cands = [...playSpecFor('UNL-159')!.legalTargets!(st, P1)].sort()
    expect(cands).toEqual(['mineSmall', 'small'])                        
  })

  test('★狩魂:「不高于3」按【当前】战力,被增益抬上去就不再是合法目标', () => {
    const st = scene([plain('u', P2, { baseMight: 3 })])
    const boosted = recomputeContinuous({
      ...st,
      continuousEffects: [{
        id: 't', duration: 'permanent', fromPassive: false, timestamp: 1,
        predicate: (o: GameObject) => o.oid === asObjId('u'),
        modification: { kind: 'addMight', delta: 2 },
      }] as never,
    })
    expect(might(boosted, 'u')).toBe(5)
    expect([...playSpecFor('UNL-159')!.legalTargets!(boosted, P1)]).not.toContain('u')
  })

  test('★★移动一对:天角牧者【任何移动都算】,猎海小队【只算从战场出发】', () => {
    const st = scene([obj('horn', 'SFD-048'), obj('hunt', 'SFD-137')])
                    
    expect(handSize(run(st, moved('horn', `base:${P1}`, BF0)))).toBe(1)
    expect(handSize(run(st, moved('horn', BF0, BF1)))).toBe(1)
                   
    expect(might(run(st, moved('hunt', BF0, BF1)), 'hunt')).toBe(6)       
                                            
    expect(might(run(st, moved('hunt', `base:${P1}`, BF0)), 'hunt')).toBe(4)
                            
    expect(handSize(run(st, moved('hunt', BF0, BF1)))).toBe(0)
  })

  test('★★死亡一对:半人马给【战力】,颚鱼给【经验】,判据同一组', () => {
    const st = scene([obj('cent', 'UNL-068'), obj('fish', 'UNL-129'), plain('mate'), plain('foe', P2)])
    const afterMate = run(st, died(st.objects['mate']!))
    expect(might(afterMate, 'cent')).toBe(7)         
    expect(expOf(afterMate)).toBe(1)                    
    expect(might(afterMate, 'fish')).toBe(5)                

                       
    const afterFoe = run(st, died(st.objects['foe']!))
    expect(might(afterFoe, 'cent')).toBe(5)
    expect(expOf(afterFoe)).toBe(0)
                       
    const selfDeath = run(st, died(st.objects['cent']!))
    expect(might(selfDeath, 'cent')).toBe(5)
  })

  test('★★可靠攻城犬 SFD-159:「此处 / 你的 / 其他」三半各压一条', () => {
    const alone = scene([obj('dog', 'SFD-159')])
    expect(might(alone, 'dog')).toBe(2)                    
    expect(might(scene([obj('dog', 'SFD-159'), plain('mate')]), 'dog')).toBe(3)
                  
    expect(might(scene([obj('dog', 'SFD-159'), plain('foe', P2)]), 'dog')).toBe(2)
                  
    expect(might(scene([obj('dog', 'SFD-159'), plain('far', P1, { zone: asZoneId(BF1) })]), 'dog')).toBe(2)
             
    expect(might(scene([obj('dog', 'SFD-159'), plain('gear', P1, { baseTypes: ['equipment'] })]), 'dog')).toBe(2)
  })
})
