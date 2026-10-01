import { describe, expect, test } from 'vitest'
import { reorderBatchFirst, addItems, type ChainItem } from '../../src/loop/chain'
import { asPlayerId } from '../../src/state/ids'

                                       
  
                                              
                                                     
                                     
                                                         
                         
  
                                             
                                                
                                        
                                                               
                                           

const P1 = asPlayerId('P1')
const it = (id: string, batchId?: string): ChainItem =>
  ({ id, controller: P1, kind: 'trigger', status: 'pending', ...(batchId ? { batchId } : {}) } as unknown as ChainItem)
const ids = (c: readonly ChainItem[]): string[] => c.map((x) => x.id)

describe('★★★★★★★ ★1021 批内重排', () => {
  test('🔴选中的挪到这一批【最后】= 最先结算(LIFO)', () => {
    const chain = [it('a', 'B1'), it('b', 'B1'), it('c', 'B1')]
    expect(ids(reorderBatchFirst(chain, 'B1', 'a')), '★选 a 先结算 ⇒ a 排到最后').toEqual(['b', 'c', 'a'])
    expect(ids(reorderBatchFirst(chain, 'B1', 'b'))).toEqual(['a', 'c', 'b'])
  })

  test('🔴🔴只动这一批,别的批次一个位置都不许挪', () => {
                                                     
    const chain = [it('x', 'B1'), it('y', 'B1'), it('p', 'B2'), it('q', 'B2')]
    const out = reorderBatchFirst(chain, 'B2', 'p')
    expect(ids(out), '★B1 原封不动,只有 B2 内部换了').toEqual(['x', 'y', 'q', 'p'])
  })

  test('🔴🔴批次【不连续】时也只写回它自己占的那些下标', () => {
                              
    const chain = [it('a', 'B1'), it('p', 'B2'), it('b', 'B1'), it('q', 'B2')]
    const out = reorderBatchFirst(chain, 'B1', 'a')
    expect(ids(out), '★B1 占 0 与 2 两格,内部换序;B2 占的 1 与 3 一动不动').toEqual(['b', 'p', 'a', 'q'])
    expect(out[1]!.id).toBe('p')
    expect(out[3]!.id).toBe('q')
  })

                             
  test('🔴已经在最后了 ⇒ 原样返回同一个引用(不造无谓的新数组)', () => {
    const chain = [it('a', 'B1'), it('b', 'B1')]
    expect(reorderBatchFirst(chain, 'B1', 'b')).toBe(chain)
  })

  test('🔴批里只有一条 ⇒ 没得选,原样返回', () => {
    const chain = [it('a', 'B1'), it('p', 'B2')]
    expect(reorderBatchFirst(chain, 'B1', 'a')).toBe(chain)
  })

  test('🔴答案指向别的批 / 不存在的项目 ⇒ 原样返回,不炸', () => {
    const chain = [it('a', 'B1'), it('b', 'B1'), it('p', 'B2')]
    expect(reorderBatchFirst(chain, 'B1', 'p'), '★p 不属于 B1').toBe(chain)
    expect(reorderBatchFirst(chain, 'B1', '不存在')).toBe(chain)
  })

  test('🔴没有批号的项目不参与(绝念、§388.1 内嵌触发那两条绕行路)', () => {
    const chain = [it('a'), it('b')]
    expect(reorderBatchFirst(chain, 'B1', 'a')).toBe(chain)
  })
})

describe('★★★★★★★ ★1021 批号是"同时触发"的唯一凭据', () => {
  test('🔴🔴不同批不许混成一批 —— 那会问出规则没给的选择权', () => {
                                                           
                                    
    const chain = [it('x', 'B1'), it('p', 'B2')]
    const sameBatch = (id: string): number => chain.filter((c) => c.batchId === id).length
    expect(sameBatch('B1'), '★B1 只有一条').toBe(1)
    expect(sameBatch('B2'), '★B2 也只有一条').toBe(1)
    expect(chain.length, '★但全链 pending 有两条 —— 按这个判就问错了').toBe(2)
  })

  test('🔴addItems 之后批号跟着项目走', () => {
    const chain = addItems([], [it('a', 'B1'), it('b', 'B1')])
    expect(chain.every((c) => c.batchId === 'B1')).toBe(true)
  })
})
