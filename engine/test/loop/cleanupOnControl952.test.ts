import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import type { GameEvent } from '../../src/loop/events'

                                                                
                                                    
                                                   
                                                 
                                                            
  
                                                           
                                                 
                                                    
                                                 
                                                                 
                                            
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
                                                 
                                                                               
                                                                 
                                    
let cleanupRan = 0
const DEPS: ReduceDeps = {
  cleanupHooks: {
    recallAndRemoveMisplaced: (st: GameState) => { cleanupRan++; return st },
  },
} as unknown as ReduceDeps

                                                          
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const stray: GameObject = {
    oid: asObjId('stray'), defId: 'G', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 0, baseKeywords: [], baseTypes: ['gear'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const victim: GameObject = {
    oid: asObjId('victim'), defId: 'U', owner: P2, controller: P2, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {},
  } as GameObject
  return {
    ...base, activePlayer: P1, phase: 'main',
    objects: { stray, victim },
    zones: {
      ...base.zones,
      [asZoneId(BF0)]: { ...base.zones[asZoneId(BF0)]!, contents: [asObjId('stray'), asObjId('victim')] },
    },
  } as GameState
}

describe('★952 §319.7 夺控是状态改变 ⇒ 必须触发清理', () => {
  test('发 changeController 之后,清理被标记为未决并真的执行了', () => {
    cleanupRan = 0
    const out = applyEvents(scene(), [
      { kind: 'changeController', target: asObjId('victim'), player: P1 } as GameEvent,
    ], DEPS)
    expect(out.state.objects['victim']!.controller, '夺控本身生效').toBe(P1)
    expect(cleanupRan, '修复前这里是 0(清理没被标记为未决)').toBeGreaterThan(0)
  })

  test('对照:seize 那半本来就会触发清理(证明观测口选对了)', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'seize', target: asObjId('victim'), newController: P1 } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan).toBeGreaterThan(0)
  })

  test('⚠️放开侧:不改状态的事件不该被顺手拉进清理(recall 仍然不在名单上)', () => {
                                                           
                                              
    cleanupRan = 0
    applyEvents(scene(), [{ kind: 'recall', target: asObjId('victim') } as GameEvent], DEPS)
    expect(cleanupRan, 'recall 三条都不沾 ⇒ 不该触发清理').toBe(0)
  })
})
