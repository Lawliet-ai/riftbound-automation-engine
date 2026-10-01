import { describe, expect, test } from 'vitest'
import { asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import type { GameEvent } from '../../src/loop/events'

                                                                        
                                                          
                                                       
                                                                              
                                                     
  
                                                        
                                                              
  
                                                                  
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

let cleanupRan = 0
const DEPS = {
  cleanupHooks: { recallAndRemoveMisplaced: (st: GameState) => { cleanupRan++; return st } },
} as unknown as ReduceDeps

                                                      
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  return {
    ...base, activePlayer: P1, phase: 'main',
    battlefieldCards: { [BF0]: { defId: 'OGN-291', owner: P1 } },
  } as unknown as GameState
}

describe('★956 §319.7 换战场卡身份 ⇒ 必须触发清理', () => {
  test('前提:布景真有身份表项(白板战场 reducer 会保守无操作,那样验不到)', () => {
    expect(scene().battlefieldCards?.[BF0]?.defId).toBe('OGN-291')
  })

  test('★单独发一条 replaceBattlefieldCard(草丛换回那一路)⇒ 清理被标记并执行', () => {
    cleanupRan = 0
    const out = applyEvents(scene(), [
      { kind: 'replaceBattlefieldCard', zoneId: asZoneId(BF0), defId: 'token:草丛', owner: P1 } as unknown as GameEvent,
    ], DEPS)
    expect(out.state.battlefieldCards?.[BF0]?.defId, '身份确实换了').toBe('token:草丛')
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('⚠️放开侧:`addBattlefieldZone` 查完【不该】加进名单', () => {
                                                           
                                                         
                                                                 
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'addBattlefieldZone', zoneId: asZoneId('battlefield:shared:9'), defId: 'X', owner: P1 } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan, '别一股脑加:规则没命中就不加').toBe(0)
  })

  test('⚠️放开侧:身份表里没有该战场时 reducer 保守无操作(不该凭空建表项)', () => {
    const bare = { ...createInitialState([P1, P2], 2), activePlayer: P1 } as GameState
    const out = applyEvents(bare, [
      { kind: 'replaceBattlefieldCard', zoneId: asZoneId(BF0), defId: 'token:草丛', owner: P1 } as unknown as GameEvent,
    ], DEPS)
    expect(out.state.battlefieldCards?.[BF0]).toBeUndefined()
  })
})
