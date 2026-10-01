import { describe, expect, test } from 'vitest'
import type { ChainItem } from '../../src/loop/chain'
import { decodeTargetOids, targetsOf } from '../../src/loop/chainTargets'
import { addChosenTarget } from '../../src/loop/chainTargets'
import type { GameState } from '../../src/state/gameState'

                                                          
  
                                                            
                              
                                                                        
                                                
                                                                      
                                 
                                                                       
  
                        
                                                                      
                                        
                                                               
  
                                     
                                                                   
                                                                
                                                                        
                                                                 

const item = (extra: Partial<ChainItem>): ChainItem =>
  ({ id: 'it', controller: 'P1', kind: 'spell', ...extra } as unknown as ChainItem)

describe('🔴🔴🔴★★★★★★555【C3】目标串解码:复合编码要拆得开', () => {
  test('🔴★★★★★普通 oid 原样返回', () => {
    expect(decodeTargetOids('u1')).toEqual(['u1'])
  })

  test("🔴🔴🔴★★★★★★'swap:a:b' ⇒ 【两个】目标(换换乐 SFD-145)", () => {
                                                                
                               
    expect(decodeTargetOids('swap:a:b')).toEqual(['a', 'b'])
  })

  test("🔴🔴★★★★★★'back:x' / 'weak:x' ⇒ 剥掉前缀拿到真 oid", () => {
    expect(decodeTargetOids('back:x')).toEqual(['x'])
    expect(decodeTargetOids('weak:y')).toEqual(['y'])
                                                           
    expect(decodeTargetOids('back:x')[0], '★别把冒号留下').not.toContain(':')
  })

  test("🔴★★★★★'play:...' 是【链项目】不是场上物件 ⇒ 空", () => {
    expect(decodeTargetOids('play:sp1')).toEqual([])
  })

  test('🔴★★★★★没锁目标 ⇒ 空列表(不是 [undefined])', () => {
    expect(decodeTargetOids(undefined)).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★555【C3】targetsOf:列表优先、单格回落', () => {
  test('🔴★★★★★★有 targets ⇒ 直接用它', () => {
    expect(targetsOf(item({ targets: ['a', 'b'], chosenTarget: 'a' }))).toEqual(['a', 'b'])
  })

  test('🔴🔴🔴★★★★★★没有 targets ⇒ 从 chosenTarget **解码**回落,不是原样塞进去', () => {
                                                                  
    expect(targetsOf(item({ chosenTarget: 'swap:a:b' })), '★★★回落也要拆开').toEqual(['a', 'b'])
    expect(targetsOf(item({ chosenTarget: 'back:x' })), '★★★回落也要剥前缀').toEqual(['x'])
  })

  test('🔴★★★★★两个格子都没有 ⇒ 空列表', () => {
    expect(targetsOf(item({}))).toEqual([])
  })

  test('🔴🔴★★★★★★`chosenTarget` 单格【保留原串】—— 两个字段不是一回事,别合并', () => {
                                                      
                                       
    const it = item({ chosenTarget: 'swap:a:b', targets: ['a', 'b'] })
    expect(it.chosenTarget, '★原串一字不动').toBe('swap:a:b')
    expect(targetsOf(it)).toEqual(['a', 'b'])
  })
})


                                                                              
                                            
  
                                       
                                     
                                     
                                                                                 
                                                                              
describe('🔴🔴🔴★★★★★★556【C3】addChosenTarget:结算期选的目标记得回去', () => {
                                                                             
                                                                            
                                                                                                   
                                             
  const FIELD = ['a', 'b', 'x', 'y', 'm', 'n']
  const chained = (items: readonly Partial<import('../../src/loop/chain').ChainItem>[]): GameState =>
    ({
      chain: items.map((x, i) => ({ id: 'i' + i, controller: 'P1', kind: 'spell', ...x })),
      objects: Object.fromEntries(FIELD.map((o) => [o, { oid: o }])),
    } as unknown as GameState)

  test('🔴🔴🔴★★★★★★追加到【当前正在结算的那条】(最新的 confirmed)', () => {
    const s = chained([
      { id: 'old', status: 'confirmed', targets: ['a'] },
      { id: 'cur', status: 'confirmed', targets: ['a'] },
      { id: 'later', status: 'pending' },
    ])
    const after = addChosenTarget(s, 'b')
    expect(after.chain[1]!.targets, '★★★记在 cur 上').toEqual(['a', 'b'])
    expect(after.chain[0]!.targets, '★不该动更早那条').toEqual(['a'])
  })

  test('🔴🔴★★★★★★答案是复合编码时也要拆开', () => {
    const s = chained([{ id: 'cur', status: 'confirmed' }])
    expect(addChosenTarget(s, 'swap:x:y').chain[0]!.targets).toEqual(['x', 'y'])
  })

  test('🔴🔴★★★★★★同一个物件被选两次只算一个(去重)', () => {
    const s = chained([{ id: 'cur', status: 'confirmed', targets: ['a'] }])
    expect(addChosenTarget(s, 'a').chain[0]!.targets, '★卡文允许"可以就是刚才那个"').toEqual(['a'])
  })

  test('🔴★★★★★没有 targets 的老项目 ⇒ 从 chosenTarget 解码后再追加', () => {
    const s = chained([{ id: 'cur', status: 'confirmed', chosenTarget: 'back:m' }])
    expect(addChosenTarget(s, 'n').chain[0]!.targets).toEqual(['m', 'n'])
  })

  test('🔴★★★★★链上没有已确认项目 ⇒ 原样返回(不报错、不新建)', () => {
    const s = chained([{ id: 'p', status: 'pending' }])
    expect(addChosenTarget(s, 'x')).toBe(s)
  })

  test("🔴★★★★★★1778 哨兵答案(keep / __done__ / skip)与不在场的 oid ⇒ 什么都不记", () => {
    const s = chained([{ id: 'cur', status: 'confirmed', targets: ['a'] }])
    for (const ans of ['keep', '__done__', 'skip', 'ghost-not-on-field']) {
      expect(addChosenTarget(s, ans).chain[0]!.targets, `★答「${ans}」不是真实存在的物件`).toEqual(['a'])
    }
  })

  test("🔴★★★★★'play:...' 这种非物件答案 ⇒ 什么都不记", () => {
    const s = chained([{ id: 'cur', status: 'confirmed', targets: ['a'] }])
    expect(addChosenTarget(s, 'play:sp').chain[0]!.targets).toEqual(['a'])
  })
})
