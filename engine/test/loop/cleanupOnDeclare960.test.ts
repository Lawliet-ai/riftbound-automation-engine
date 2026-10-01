import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import { objectCardTags, GAINED_TAG_KEY } from '../../data/cardTagQuery'
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
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 2, counters: {}, status: {},
  } as unknown as GameObject
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, activePlayer: P1, phase: 'main',
    objects: { u },
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: [...z.contents, u.oid] } },
  } as GameState
}

describe('★960 declare:宣告标签会改派生态 ⇒ 必须触发清理', () => {
  test('前提:declared[GAINED_TAG_KEY] 确实会并进物件标签(这是"改派生态"的那一跳)', () => {
    const bare = { defId: 'U' }
    const gained = { defId: 'U', declared: { [GAINED_TAG_KEY]: '机械' } }
    expect(objectCardTags(bare)).not.toContain('机械')
    expect(objectCardTags(gained)).toContain('机械')
  })

  test('★单独发一条 declare(UNL-177 那一路)⇒ 清理被标记并执行', () => {
    cleanupRan = 0
    const out = applyEvents(scene(), [
      { kind: 'declare', target: asObjId('u'), key: GAINED_TAG_KEY, value: '机械' } as unknown as GameEvent,
    ], DEPS)
    expect(out.state.objects['u']!.declared?.[GAINED_TAG_KEY], '宣告确实写上了').toBe('机械')
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })
})

describe('★960 removeDamage:查完【不该】加(同族两个方向,后果不对称)', () => {
  test('⚠️放开侧:移除伤害不触发清理', () => {
    cleanupRan = 0
    const out = applyEvents(scene(), [
      { kind: 'removeDamage', target: asObjId('u') } as unknown as GameEvent,
    ], DEPS)
    expect(out.state.objects['u']!.damage, '伤害确实被移除了(不是事件没落地)').toBe(0)
    expect(cleanupRan, '§124.1 把伤害与状态并列 ⇒ §319.7 不覆盖;且反向不制造致命').toBe(0)
  })

  test('对照:反方向的 `damage` 本来就触发清理(它会制造致命,§323.5 要判摧毁)', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'damage', target: asObjId('u'), amount: 1 } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan, '这条对照证明"不对称"是刻意的,不是漏列').toBeGreaterThan(0)
  })
})
