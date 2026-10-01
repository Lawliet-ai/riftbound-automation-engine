import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import type { GameEvent } from '../../src/loop/events'

                                                          
                                                     
  
                                                               
                                                                
                                                                    
                                
                                                                          
  
                  
                                                            
                                               
                                        
  
                                                                                  
                                               
                                                                          
  
                                                     
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor }

function obj(id: string, defId: string, ctrl: typeof P1, zone: string, might: number, extra: Record<string, unknown> = {}): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  } as unknown as GameObject
}

                                                                
function scene(): GameState {
  let s = createInitialState([P1, P2], 2)
  const sb1 = Object.values(s.zones).find((z) => z.kind === 'standby' && z.id.includes('1'))!
  const objs = [
    obj('p1a', 'BLK', P1, BF0, 2),
    obj('p2b', 'BLK', P2, BF1, 2),
    obj('cone', 'OGN-097', P1, 'hand:P1', 2),
    obj('mis', 'OGN-097', P1, String(sb1.id), 2, { status: { faceDown: true } }),
  ]
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
  return seedRunes(s, P1, 'blue', 3)
}

function sbZoneId(s: GameState): string {
  return String(Object.values(s.zones).find((z) => z.kind === 'standby' && z.id.includes('1'))!.id)
}
function runesOnBoard(s: GameState): readonly string[] {
  return Object.values(s.objects).filter((o) => o.defId.startsWith('rune:') && String(o.zone).startsWith('base:'))
    .map((o) => String(o.oid)).sort()
}

describe('★963 布置待命全程直改 state ⇒ standbyPlaced 必须触发清理', () => {
  test('前提:错位待命牌真在 BF1 待命区、P1 基地真有三枚符文、PLACE_STANDBY 真可选', () => {
    const g = new InteractiveGame(scene(), DEPS as never)
    expect(g.state.zones[asZoneId(sbZoneId(g.state))]!.contents).toContain(asObjId('mis'))
    expect(runesOnBoard(g.state)).toHaveLength(3)
    const place = g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY')
    expect(place).toBeDefined()
    expect((place as { battlefield: string }).battlefield).toBe(BF0)
  })

  test('★布置这一步真的动了板面:付费回收掉一枚符文(§124 换 oid),手牌那张进了待命区', () => {
    const g = new InteractiveGame(scene(), DEPS as never)
    const before = runesOnBoard(g.state)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY') as never)
    expect(runesOnBoard(g.state), '基地上应少一枚符文').toHaveLength(before.length - 1)
    expect(g.state.zones[asZoneId('hand:P1')]!.contents).toHaveLength(0)
  })

  test('★清理必须跑:BF1 那张错位待命牌被移除到 owner 废牌堆(§323.7 第二分支)', () => {
    const g = new InteractiveGame(scene(), DEPS as never)
    const sb = sbZoneId(g.state)
    g.apply(g.legalActions(P1).find((a) => a.kind === 'PLACE_STANDBY') as never)
    expect(g.state.zones[asZoneId(sb)]!.contents, '修复前它还留在这里').not.toContain(asObjId('mis'))
    expect(g.state.zones[asZoneId(`discard:${P1}`)]!.contents.length, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('白名单层:单发一条 standbyPlaced 也要标记清理(与真实路径两层都钉)', () => {
    let ran = 0
    const deps = { cleanupHooks: { recallAndRemoveMisplaced: (st: GameState) => { ran++; return st } } } as unknown as ReduceDeps
    applyEvents(scene(), [
      { kind: 'standbyPlaced', player: P1, card: asObjId('mis'), battlefield: BF1 } as unknown as GameEvent,
    ], deps)
    expect(ran, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('放开侧:delayedTrigger 不该进名单 —— 它只写延时触发登记表,零物件零区域', () => {
    let ran = 0
    const deps = { cleanupHooks: { recallAndRemoveMisplaced: (st: GameState) => { ran++; return st } } } as unknown as ReduceDeps
    applyEvents(scene(), [
      { kind: 'delayedTrigger', add: { id: 'x', kind: 'noop' } } as unknown as GameEvent,
    ], deps)
                                                         
    expect(ran, '把 delayedTrigger 也加进白名单就会红').toBe(0)
  })
})
