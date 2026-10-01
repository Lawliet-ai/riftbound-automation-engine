import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { compileEffect } from '../../src/dsl/effectSpec'

                                                      
                                                          
  
                       
                                               
                                                               
                         
                                                  
                                                
                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, might: number): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: P1, controller: P1, zone: asZoneId(BF0),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState)
}

                                                                    
const weaken = (s: GameState, oid: string, delta: number, floor: number, id: string): GameState => {
  const eff = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'chosen', key: 'k' }, delta, floor, duration: 'thisTurn', id }],
  })
  const evs = eff({ state: s, selfOid: asObjId('src'), controller: P1, ev: {} as GameEvent, chosen: { k: oid } } as never)
  return recomputeContinuous(applyEvents(s, evs, {}).state)
}
                     
const pump = (s: GameState, oid: string, delta: number, id: string): GameState => {
  const eff = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'chosen', key: 'k' }, delta, duration: 'thisTurn', id }],
  })
  const evs = eff({ state: s, selfOid: asObjId('src'), controller: P1, ev: {} as GameEvent, chosen: { k: oid } } as never)
  return recomputeContinuous(applyEvents(s, evs, {}).state)
}
const mightOf = (s: GameState, oid: string): number => effectiveMight(s.objects[asObjId(oid)]!).actual
const effIds = (s: GameState): string[] => s.continuousEffects.map((e) => e.id)

describe('🔴🔴🔴★★★★★★568【C6】§477.3.b floor 快照', () => {
  test('★前提:只施加一次时两种写法【同解】—— 所以这条验不出东西,别拿它当验收', () => {
    const s = weaken(scene([unit('u', 2)]), 'u', -4, 1, 'w1')
    expect(mightOf(s, 'u'), '2 战力吃「-4 不得低于1」⇒ 1').toBe(1)
  })

  test('🔴🔴🔴★★★★★★【承重】减完之后又被加上去 ⇒ 只减当初钳出来的那 1 点', () => {
                                   
                                                
                                               
    let s = weaken(scene([unit('u', 2)]), 'u', -4, 1, 'w1')
    expect(mightOf(s, 'u'), '★前提:先被钳到 1').toBe(1)
    s = pump(s, 'u', 6, 'p1')
    expect(mightOf(s, 'u'), '★★★写死的 -1 + 加的 6 ⇒ 7(活钳制会给 4)').toBe(7)
  })

  test('🔴🔴★★★★★★钳完就**不许再留 floor** —— 否则之后被减下去时会二次钳制', () => {
                                               
                                                                  
                          
                                                     
                                                            
    let s = weaken(scene([unit('u', 2)]), 'u', -4, 1, 'w1')
    s = pump(s, 'u', -3, 'p3')
    expect(mightOf(s, 'u'), '★★★写死的 -1 再叠 -3 ⇒ -2(留 floor 会被抬起来)').toBe(-2)
  })

  test('🔴🔴★★★★★★有效增量为 0 ⇒ **一条 addEffect 都不发**(与 566 幂等门同族)', () => {
                                                 
    const s = weaken(scene([unit('u', 1)]), 'u', -4, 1, 'zero')
    expect(mightOf(s, 'u'), '战力不变').toBe(1)
    expect(effIds(s).filter((id) => id.startsWith('zero')), '★★★层里不该多出空壳').toEqual([])
  })

  test('🔴★★★★★★不带 floor 的减值一字不变(别把普通减值也快照了)', () => {
                                                            
    let s = pump(scene([unit('u', 2)]), 'u', -4, 'plain')
    expect(mightOf(s, 'u'), '没有 floor ⇒ 老实减到 -2').toBe(-2)
    s = pump(s, 'u', 6, 'p2')
    expect(mightOf(s, 'u'), '再加 6 ⇒ 4').toBe(4)
  })
})
