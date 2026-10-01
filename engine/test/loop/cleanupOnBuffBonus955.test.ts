import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import { buffMightEffects } from '../../src/keywords/buff'
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
  const u: GameObject = {
    oid: asObjId('u'), defId: 'U', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: { buff: 2 }, status: {},
  } as unknown as GameObject
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, activePlayer: P1, phase: 'main',
    objects: { u },
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: [u.oid] } },
  } as GameState
}

describe('★955 §319.7 增益加成改变 ⇒ 必须触发清理', () => {
  test('前提:buffBonus 确实会改变【已有】增益的战力贡献(不是只影响将来的)', () => {
    const s = scene()
    const before = buffMightEffects(s).find((b) => String(b.oid) === 'u')?.delta
    const withBonus = { ...s, buffBonusThisTurn: { [P1 as string]: 1 } } as GameState
    const after = buffMightEffects(withBonus).find((b) => String(b.oid) === 'u')?.delta
    expect(before).toBe(2)               
    expect(after).toBe(4)                                 
  })

  test('★单独发一条 buffBonus(OGN-053 目标失效那一路)⇒ 清理被标记为未决并执行', () => {
    cleanupRan = 0
    const out = applyEvents(scene(), [
      { kind: 'buffBonus', player: P1, delta: 1 } as unknown as GameEvent,
    ], DEPS)
    expect(out.state.buffBonusThisTurn?.[P1 as string], '账确实记上了').toBe(1)
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('对照:同族的 grantBuff 本来就会触发清理(证明观测口选对了)', () => {
    cleanupRan = 0
                                                                        
                                                                  
                                                                   
                                                        
                                                  
    const fresh = { ...scene() }
    const u0 = fresh.objects[asObjId('u')]!
    const s0 = { ...fresh, objects: { ...fresh.objects, [asObjId('u')]: { ...u0, counters: { buff: 0 } } } }
    applyEvents(s0, [{ kind: 'grantBuff', target: asObjId('u') } as GameEvent], DEPS)
    expect(cleanupRan).toBeGreaterThan(0)
  })

  test('⚠️放开侧:纯账本、不改任何物件状态的事件不该被顺手拉进清理', () => {
                                                                 
    cleanupRan = 0
    applyEvents(scene(), [{ kind: 'gainResource', player: P1, mana: 1 } as unknown as GameEvent], DEPS)
    expect(cleanupRan, '别把"改了 state 就触发清理"当判据').toBe(0)
  })
})
