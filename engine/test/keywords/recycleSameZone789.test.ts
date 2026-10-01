                                                             
  
                                                     
                                 
  
                        
                                                  
                                              
                                                        
                                            
  
                                                   
                                      
import { describe, expect, test } from 'vitest'
import { recycleObjects } from '../../src/keywords/insight'
import { createInitialState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'

const P1 = asPlayerId('P1')

function sceneWith(zone: string, extra: Partial<GameObject> = {}): { state: GameState; oid: string } {
  const base = createInitialState([P1, asPlayerId('P2')], 2)
  const oid = asObjId('card1')
  const o = {
    oid, defId: 'OGN-175', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
  const z = base.zones[zone]!
  return {
    state: { ...base, objects: { [oid]: o }, zones: { ...base.zones, [zone]: { ...z, contents: [...z.contents, oid] } } } as GameState,
    oid: oid as string,
  }
}

describe('★789 回收:同区不换 oid,跨区才换', () => {
  test('★★★ 牌堆内部回收(洞察那条):oid 原样保留', () => {
    const { state, oid } = sceneWith(`mainDeck:${P1}`)
    const after = recycleObjects(state, [asObjId(oid)])
    expect(after.objects[oid], '同区回收后这张卡还得是它自己').toBeDefined()
    expect(String(after.objects[oid]!.zone), '仍在主牌堆').toBe(`mainDeck:${P1}`)
                            
    expect(after.zones[`mainDeck:${P1}`]!.contents[0], '置底').toBe(oid)
    expect(after.nextOid, '没换身份就不该消耗 oid 计数器').toBe(state.nextOid)
  })

  test('★★★ 跨区回收(废牌堆→主牌堆):照旧换新 oid,并清临时状态', () => {
    const { state, oid } = sceneWith(`discard:${P1}`, { damage: 2, counters: { buff: 1 } })
    const after = recycleObjects(state, [asObjId(oid)])
    expect(after.objects[oid], '旧身份应当消失').toBeUndefined()
    const now = Object.values(after.objects)[0]!
    expect(String(now.zone)).toBe(`mainDeck:${P1}`)
    expect(now.oid, '§124 跨区 ⇒ 新对象').not.toBe(oid)
    expect(now.damage, '§124.1 跨界清伤害').toBe(0)
    expect(now.counters, '§124.1 跨界清指示物').toEqual({})
  })
})
