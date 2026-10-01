import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { runCleanupToFixpoint, type CleanupHooks } from '../../src/loop/cleanup'

                                                       
  
                                           
                                          
                                                
                                           
  
                                           
                                                       
                                
  
                                                      
                                                
                                                   
                                                                  
                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const base = createInitialState([P1, P2], 2)
const BF = zonesByKind(base, 'battlefield')[0]!.id as string

                               
function scene(names: readonly string[]): GameState {
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const oid of names) {
    const o = {
      oid: asObjId(oid), defId: `U-${oid}`, owner: P1, controller: P1, zone: asZoneId(BF),
      baseMight: 2, baseKeywords: [], baseTypes: ['unit'] as never, damage: 2, counters: {}, status: {},
    } as GameObject
    objects[oid] = o
    const z = zones[BF]!
    zones[BF] = { ...z, contents: [...z.contents, asObjId(oid) as ObjId] }
  }
  return { ...base, objects, zones } as GameState
}
const onField = (s: GameState, oid: string): boolean => s.objects[asObjId(oid)]?.zone === BF

                                    
function saveNTimes(budget: number, log: string[]): CleanupHooks {
  let left = budget
  return {
    replaceDestroy: (s, oid) => {
      log.push(String(oid))
      if (left <= 0) return null
      left--
      const o = s.objects[oid]
      if (!o) return null
      return { ...s, objects: { ...s.objects, [oid]: { ...o, damage: 0 } } }             
    },
  }
}

describe('★★★★★★★ ★1011 清理不动点循环的重入安全性(选择权通道的地基)', () => {
  test('前提自证:没有任何替换时,带致命伤的都会进废牌堆', () => {
    const s = runCleanupToFixpoint(scene(['a', 'b']), {})
    expect(onField(s, 'a'), '前提:a 不该还在场上').toBe(false)
    expect(onField(s, 'b'), '前提:b 不该还在场上').toBe(false)
  })

  test('🔴地基一:每个对象只被问一次 —— 被救下的【不会】再被问一遍', () => {
    const log: string[] = []
    const s = runCleanupToFixpoint(scene(['a', 'b']), saveNTimes(1, log))
    expect(log.length, '前提自证:hook 真的被调用了').toBeGreaterThan(0)
    expect(new Set(log).size, '★问过的对象数 == 调用次数 ⇒ 没有任何对象被重复问')
      .toBe(log.length)
                                  
    expect(onField(s, log[0]!), '★先被问的那个被救下了').toBe(true)
    expect(onField(s, log[1]!), '★后一个没救成').toBe(false)
  })

  test('🔴地基二:对已收敛的状态再跑清理,一个都不再问(幂等)', () => {
    const first = runCleanupToFixpoint(scene(['a', 'b']), saveNTimes(1, []))
    const log2: string[] = []
    const second = runCleanupToFixpoint(first, saveNTimes(1, log2))
    expect(log2, '★已收敛的状态不该再问任何人').toEqual([])
    expect(onField(second, 'a'), '结果也不该变(a)').toBe(onField(first, 'a'))
    expect(onField(second, 'b'), '结果也不该变(b)').toBe(onField(first, 'b'))
  })

  test('🔴地基三(重入的根源):救下来靠的是【状态本身不再致命】,不是靠记账', () => {
                                        
                                                
                                                   
                                          
                                                   
    const log: string[] = []
    let tick = 0
    const changeButStillLethal: CleanupHooks = {
      replaceDestroy: (s, oid) => {
        log.push(String(oid))
        const o = s.objects[oid]
        if (!o) return null
        tick += 1
                                           
        return { ...s, objects: { ...s.objects, [oid]: { ...o, counters: { probe: tick } } } }
      },
    }
    expect(() => runCleanupToFixpoint(scene(['a']), changeButStillLethal), '★"救了但仍致命"会让循环撞上限')
      .toThrow(/未在 \d+ 轮内收敛/)
    expect(log.length, '★同一个对象被反复问 ⇒ 佐证没有"已处理表"在去重').toBeGreaterThan(1)
    expect(new Set(log).size, '★而且反复问的就是同一个对象').toBe(1)
  })

  test('⚠️细节:已收敛状态再跑的返回值【引用不同但内容不变】—— 别拿引用相等当判据', () => {
    const first = runCleanupToFixpoint(scene(['a', 'b']), saveNTimes(1, []))
    const second = runCleanupToFixpoint(first, saveNTimes(1, []))
    expect(second === first, '★引用不同(recomputeContinuous 每次产生新对象)').toBe(false)
    expect(onField(second, 'a'), '但内容不变').toBe(onField(first, 'a'))
  })

  test('放开侧:钱够救两个时,两个都活(证明上面的"只救一个"不是因为循环坏了)', () => {
    const log: string[] = []
    const s = runCleanupToFixpoint(scene(['a', 'b']), saveNTimes(2, log))
    expect(onField(s, 'a'), '★a 活').toBe(true)
    expect(onField(s, 'b'), '★b 也活').toBe(true)
  })
})
