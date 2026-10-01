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
const DEPS = {
  cleanupHooks: { recallAndRemoveMisplaced: (st: GameState) => { cleanupRan++; return st } },
} as unknown as ReduceDeps

                                                           
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const u: GameObject = {
    oid: asObjId('u'), defId: 'U', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const objects: Record<string, GameObject> = { u }
  const zones = { ...base.zones }
  const bf = zones[asZoneId(BF0)]!
  zones[asZoneId(BF0)] = { ...bf, contents: [...bf.contents, u.oid] }
  const rz = zones[`runeDeck:${P1}` as never] as { readonly id: string; readonly contents: readonly string[] } | undefined
  if (rz) {
    const ids: string[] = []
    for (let i = 0; i < 2; i++) {
      const r = { ...u, oid: asObjId(`r${i}`), defId: 'rune:green', zone: asZoneId(`runeDeck:${P1}`), baseTypes: ['rune'] } as unknown as GameObject
      objects[r.oid] = r
      ids.push(String(r.oid))
    }
    zones[`runeDeck:${P1}` as never] = { ...rz, contents: [...rz.contents, ...ids] } as never
  }
                                                                  
                                                             
                                                                        
                                                  
                                                               
  for (const p of [P1, P2]) {
    const dz = zones[`mainDeck:${p}` as never] as { readonly contents: readonly string[] } | undefined
    if (!dz) continue
    const dids: string[] = []
    for (let i = 0; i < 5; i++) {
      const c = { ...u, oid: asObjId(`d-${p}-${i}`), defId: 'BLK', owner: p, controller: p,
        zone: asZoneId(`mainDeck:${p}`) } as unknown as GameObject
      objects[c.oid] = c
      dids.push(String(c.oid))
    }
    zones[`mainDeck:${p}` as never] = { ...dz, contents: [...dz.contents, ...dids] } as never
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

describe('★959 §319.6 进出场地 ⇒ 必须触发清理', () => {
  test('前提:布景里战场上真有单位、符文牌堆里真有符文', () => {
    const s = scene()
    expect(s.zones[asZoneId(BF0)]!.contents).toContain(asObjId('u'))
    expect((s.zones[`runeDeck:${P1}` as never] as { readonly contents: readonly string[] }).contents.length).toBeGreaterThanOrEqual(2)
  })

  test('★单独发一条 recycle(SFD-018 那一路)⇒ 清理被标记并执行', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'recycle', player: P1, objs: [asObjId('u')] } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('★单独发一条 summonRune(OGN-155 选符文那一路)⇒ 清理被标记并执行', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'summonRune', player: P1, count: 1, dormant: true } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan, '修复前这里是 0').toBeGreaterThan(0)
  })

  test('对照:同族的 insight(回收到牌堆底)本来就触发清理', () => {
    cleanupRan = 0
    applyEvents(scene(), [
      { kind: 'insight', player: P1, oids: [] } as unknown as GameEvent,
    ], DEPS)
    expect(cleanupRan).toBeGreaterThan(0)
  })

  test('⚠️放开侧:`draw` 查完【不该】加 —— 牌堆与手牌都不在场地内', () => {
                                               
                                                 
                                                           
    cleanupRan = 0
    applyEvents(scene(), [{ kind: 'draw', player: P1, count: 1 } as unknown as GameEvent], DEPS)
    expect(cleanupRan, '别一股脑加:规则没命中就不加').toBe(0)
  })
})
