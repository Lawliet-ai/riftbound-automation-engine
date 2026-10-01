import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import type { GameEvent } from '../../src/loop/events'

                                                   
                                                          
                                                                     
  
            
                                                      
                                                 
                                                        
  
                                                                            
                                                 
  
                                                                    
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

let cleanupRan = 0
const DEPS = {
  cleanupHooks: { recallAndRemoveMisplaced: (st: GameState) => { cleanupRan++; return st } },
} as unknown as ReduceDeps

                                   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const bz = zones[`base:${P1}` as never] as { readonly contents: readonly string[] }
  const ids: string[] = []
  for (let i = 0; i < 4; i++) {
    const r = {
      oid: asObjId(`r${i}`), defId: 'rune:green', owner: P1, controller: P1,
      zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
      damage: 0, counters: {}, status: {},
    } as unknown as GameObject
    objects[r.oid] = r
    ids.push(String(r.oid))
  }
  zones[`base:${P1}` as never] = { ...bz, contents: [...bz.contents, ...ids] } as never
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

function stateOf(r: unknown): GameState {
  return (r as { state?: GameState }).state ?? (r as GameState)
}

describe('★962 spend 走付费通道改板面 ⇒ 必须触发清理', () => {
  test('前提:布景里 P1 基地真有四枚活跃符文', () => {
    const s = scene()
    for (const o of ['r0', 'r1', 'r2', 'r3']) {
      expect(s.objects[asObjId(o)]?.zone).toBe(asZoneId(`base:${P1}`))
      expect(s.objects[asObjId(o)]?.status.tapped).not.toBe(true)
    }
  })

  test('★符能费(回收符文=离开场地 §319.6)⇒ 清理被标记并执行', () => {
    cleanupRan = 0
    const out = stateOf(applyEvents(scene(), [
      { kind: 'spend', player: P1, cost: { pips: [['green']] } } as unknown as GameEvent,
    ], DEPS))
                                              
    expect(out.objects[asObjId('r0')], '这一枚应已被回收出场').toBeUndefined()
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('★纯法力费(横置符文=「活跃」状态改变 §319.7 / §124.2)⇒ 清理被标记并执行', () => {
    cleanupRan = 0
    const out = stateOf(applyEvents(scene(), [
      { kind: 'spend', player: P1, cost: { mana: 1 } } as unknown as GameEvent,
    ], DEPS))
    expect(out.objects[asObjId('r0')]?.status.tapped, '这一枚应已被横置').toBe(true)
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('对照:同一枚符文改走 recycle 事件,本来就触发清理(证明观测口有效)', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'recycle', player: P1, objs: [asObjId('r0')] } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan).toBeGreaterThan(0)
  })

  test('放开侧:extraTurn 不该进名单 —— 它只往回合队列插一项,零物件零状态', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'extraTurn', player: P1 } as unknown as GameEvent,
    ], DEPS)
                                                                                       
    expect(cleanupRan, '把 extraTurn 也加进白名单就会红').toBe(0)
  })

  test('SFD-136 的赎金是纯法力 { mana: 2 } 且整批只发一条 spend —— 钉住"会单独发"这个前提', async () => {
    const mod = await import('../../../engine/data/cards/SFD-136')
    expect((mod as { SFD_136_RANSOM: { mana?: number } }).SFD_136_RANSOM).toEqual({ mana: 2 })
  })
})
