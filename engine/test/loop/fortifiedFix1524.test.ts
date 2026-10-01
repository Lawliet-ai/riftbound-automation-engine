   
                                             
  
                                    
                                                                  
                                                        
                                                               
                                                              
                                                                                         
                                                     
                                 
                                            
                                                                              
                                                   
                                             
                                                                               
                                                                                                      
  
                                                                        
                                        
   
import { describe, expect, it } from 'vitest'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { makeFortifiedPositionTrigger } from '../../data/cards/battlefields-teemo'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { currentKeywords } from '../../src/state/object'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const unit = (id: string, zone: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
})
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const zones = { ...base.zones }
  const objects: Record<string, GameObject> = {}
  for (const o of objs) {
    objects[o.oid as string] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
   
                                         
                                                                             
   
const defendEv = (): GameEvent => ({ kind: 'defend', player: P1, battlefield: BF0 } as unknown as GameEvent)

describe('★1524 缺陷 201 已修:OGN-279 三处', () => {
  it('① 🔴㈠候选是【全场】—— 别处战场、基地、敌方单位都进候选', () => {
    const st = scene([
      unit('here', BF0),                        // 此处
      unit('far', BF1),                         // 别处战场
      unit('atBase', `base:${P1 as string}`),   // 自己基地
      unit('foe', BF0, P2),                     // 敌方(卡文没写敌我)
    ])
    const t = makeFortifiedPositionTrigger(BF0, P1)
    const req = t.nextChoice!(st, defendEv(), {})
    expect(req).not.toBeNull()
    expect(req!.candidates.map((c) => c.id).sort()).toEqual(['atBase', 'far', 'foe', 'here'])
  })

  it('② 🔴㈠的另一半:此处【没有】单位而别处有时,照样要问', () => {
                                                                 
    const st = scene([unit('far', BF1), unit('atBase', `base:${P1 as string}`)])
    const t = makeFortifiedPositionTrigger(BF0, P1)
    const req = t.nextChoice!(st, defendEv(), {})
    expect(req, '此处无单位也该问').not.toBeNull()
    expect(req!.candidates.map((c) => c.id).sort()).toEqual(['atBase', 'far'])
  })

  it('③ ⭐㈢真授予了 [坚守2] 这个【特性】(§814.3 可被别的效果引用)', () => {
    const st = scene([unit('d', BF0, P1, { status: { defending: true } })])
    const t = makeFortifiedPositionTrigger(BF0, P1)
    const evs = t.effect(st, defendEv(), { unit: 'd' })
    const after = recomputeContinuous(applyEvents(st, evs).state)
    expect(currentKeywords(after.objects['d']!)).toContain('坚守2')
  })

  it('④ ⭐战力只在【防守方】身上 +2(§814.1.c 由引擎自己算,不是我们裸加)', () => {
    const t = makeFortifiedPositionTrigger(BF0, P1)
                
    const stD = scene([unit('d', BF0, P1, { status: { defending: true } })])
    const afterD = recomputeContinuous(applyEvents(stD, t.effect(stD, defendEv(), { unit: 'd' })).state)
    expect(effectiveMight(afterD.objects['d']!).actual).toBe(3 + 2)
                                           
    const stN = scene([unit('n', BF0, P1)])
    const afterN = recomputeContinuous(applyEvents(stN, t.effect(stN, defendEv(), { unit: 'n' })).state)
    expect(effectiveMight(afterN.objects['n']!).actual).toBe(3)
    expect(currentKeywords(afterN.objects['n']!)).toContain('坚守2')
  })

  it('⑤ ⭐㈡时限是 thisCombat(§466.7.c),不是 thisTurn', () => {
    const st = scene([unit('d', BF0, P1, { status: { defending: true } })])
    const t = makeFortifiedPositionTrigger(BF0, P1)
                                                                              
                                                         
    const after = applyEvents(st, t.effect(st, defendEv(), { unit: 'd' })).state
    const eff = after.continuousEffects.find((e) => e.id.startsWith('OGN-279-deflect:'))
    expect(eff, '效果要在清单里').toBeDefined()
    expect(eff!.duration).toBe('thisCombat')
  })
})
