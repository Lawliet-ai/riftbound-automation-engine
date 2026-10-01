import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardCost, cardKind, cardPassives, handPlaySpecs, playSpecFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { LONGTAIL6_DEFIDS } from '../../data/cards/longtail-6'

                                                              
  
                                                                            
                                                         
                                                  

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

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                                                 
function moveTargets(st: GameState, oid: string): string[] {
  const g = new InteractiveGame(recomputeContinuous(st), { getTriggers: activeTriggers, handPlaySpecs })
  return g.legalActions(P1)
    .filter((a) => a.kind === 'MOVE' && (a as { oid: string }).oid === oid)
    .map((a) => (a as { to: string }).to).sort()
}

describe('★引擎:derived.restrictions 现在真的会被执行(第158轮)', () => {
  test('★★没有限制时:基地→战场、战场→自己基地都能走(基线)', () => {
    const onBf = scene([plain('u')])
    expect(moveTargets(onBf, 'u')).toContain(`base:${P1}`)
    const inBase = scene([plain('u', P1, { zone: asZoneId(`base:${P1}`) })])
    expect(moveTargets(inBase, 'u')).toEqual([BF0, BF1].sort())
  })

  test("★★'move' 限制:一步都不许动(薇古丝 UNL-150 靠它才真生效)", () => {
    const st = scene([plain('u', P1, { zone: asZoneId(`base:${P1}`) })])
    const locked = recomputeContinuous({
      ...st,
      continuousEffects: [{
        id: 'nomove', duration: 'thisTurn', fromPassive: false, timestamp: 1,
        predicate: (o: GameObject) => o.oid === asObjId('u'),
        modification: { kind: 'addRestriction', restriction: 'move' },
      }] as never,
    })
    expect(locked.objects['u']!.derived?.restrictions).toContain('move')
    expect(moveTargets(locked, 'u')).toEqual([])                           
  })

  test("★★'moveToBase' 只锁【终点是基地】那一半,战场↔战场不受影响", () => {
    const st = scene([plain('u', P1, { baseKeywords: ['游走'] })])              
    const limited = recomputeContinuous({
      ...st,
      continuousEffects: [{
        id: 'nobase', duration: 'permanent', fromPassive: false, timestamp: 1,
        predicate: (o: GameObject) => o.oid === asObjId('u'),
        modification: { kind: 'addRestriction', restriction: 'moveToBase' },
      }] as never,
    })
    const dests = moveTargets(limited, 'u')
    expect(dests).not.toContain(`base:${P1}`)         
    expect(dests).toContain(BF1)                                   
  })
})

describe('★移动限制的一对:UNL-111(只锁我) vs SFD-014(锁所有)', () => {
  test('★★坚定的哨兵 UNL-111:只锁我自己,别人照常回基地', () => {
    const st = scene([obj('sentry', 'UNL-111'), plain('mate')])
    expect(moveTargets(st, 'sentry')).not.toContain(`base:${P1}`)
    expect(moveTargets(st, 'mate')).toContain(`base:${P1}`)                   
  })

  test('★★牛头人清算者 SFD-014:锁【所有】单位,含我自己和敌方', () => {
    const st = scene([obj('minotaur', 'SFD-014'), plain('mate'), plain('foe', P2)])
    expect(moveTargets(st, 'minotaur')).not.toContain(`base:${P1}`)
    expect(moveTargets(st, 'mate')).not.toContain(`base:${P1}`)               
    const view = recomputeContinuous(st)
    expect(view.objects['foe']!.derived?.restrictions).toContain('moveToBase')        
  })

  test('★对照组:场上没有这两张时,谁都能回基地', () => {
    const st = scene([plain('a'), plain('b', P2)])
    expect(moveTargets(st, 'a')).toContain(`base:${P1}`)
    expect(recomputeContinuous(st).objects['b']!.derived?.restrictions ?? []).toHaveLength(0)
  })
})

describe('★【长尾批次·六】(第158轮)', () => {
  test('前提:登记齐,费用照卡面实测取', () => {
    expect(LONGTAIL6_DEFIDS.slice().sort()).toEqual(['OGN-043', 'OGN-123'])
    expect(cardKind('OGN-123')).toBe('spell')
    expect(cardCost('OGN-123')).toEqual({ mana: 7, pips: [['blue'], ['blue']] })
    expect(cardCost('OGN-043')).toEqual({ mana: 1, pips: [['green']] })
    expect(cardCost('UNL-111').mana).toBe(1)
    expect(cardCost('SFD-014').mana).toBe(5)
  })

  test('★★过载能量 OGN-123:两句的【范围不同】——休眠只友方(含基地),伤害只战场(含敌方)', () => {
    const st = scene([
      plain('mineBf', P1, { baseMight: 20 }), plain('mineBase', P1, { baseMight: 20, zone: asZoneId(`base:${P1}`) }),
      plain('foeBf', P2, { baseMight: 20 }), plain('foeBase', P2, { baseMight: 20, zone: asZoneId(`base:${P2}`) }),
    ])
    const evs = playSpecFor('OGN-123')!.makeResolve({ movedCardOid: 'x', controller: P1 } as never)(st, {}, undefined as never)
    const after = applyEvents(st, evs, {}).state
                    
    expect(after.objects['mineBf']!.status.dormant).toBe(true)
    expect(after.objects['mineBase']!.status.dormant).toBe(true)
    expect(after.objects['foeBf']!.status.dormant).not.toBe(true)
                       
    expect(after.objects['mineBf']!.damage).toBe(12)
    expect(after.objects['foeBf']!.damage).toBe(12)
    expect(after.objects['mineBase']!.damage).toBe(0)                  
    expect(after.objects['foeBase']!.damage).toBe(0)
  })

  test('★★魅惑妖术 OGN-043:目标只有敌方单位;落点结算期问,且答过不再问', () => {
    const st = scene([plain('foe', P2), plain('mine')])
    const spec = playSpecFor('OGN-043')!
    expect([...spec.legalTargets!(st, P1)]).toEqual(['foe'])        
    const ctx = { movedCardOid: 'x', controller: P1, target: 'foe' } as never
    const req = spec.makeNextChoice!(ctx)(st, {})!
    expect(req.controller).toBe(P1)          
                                                
    expect(req.candidates.map((c) => c.id).sort()).toEqual([BF1, `base:${P2}`].sort())
    expect(spec.makeNextChoice!(ctx)(st, { charmDest: BF1 })).toBeNull()           
                        
    const evs = spec.makeResolve(ctx)(st, { charmDest: BF1 }, undefined as never)
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
    expect(applyEvents(st, evs, {}).state.objects['foe']!.zone).toBe(BF1)
  })
})
