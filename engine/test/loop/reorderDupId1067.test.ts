                                                                                                        
                                                                                                         
import { describe, expect, it } from 'vitest'
import { reorderBatchFirst, type ChainItem } from '../../src/loop/chain'

const item = (id: string, batchId: string): ChainItem => ({ id, batchId, controller: 'P1', kind: 'triggered', status: 'pending', resolve: () => [] } as unknown as ChainItem)
describe('★1067 触发排序遇到同 id 项不能产生 undefined', () => {
  it('两条同 id + 一条别的,把同 id 的提前 ⇒ 长度不变、没有 undefined、被提前的在批末', () => {
    const chain = [item('dup', 'b'), item('other', 'b'), item('dup', 'b')]
    const out = reorderBatchFirst(chain, 'b', 'dup')
    expect(out.length).toBe(3)
    expect(out.every((x) => x !== undefined)).toBe(true)
    expect(out[2]!.id).toBe('dup')
    expect(out.filter((x) => x.id === 'dup').length).toBe(2)
  })
  it('无重复时行为不变:first 排到批末', () => {
    const chain = [item('a', 'b'), item('c', 'b'), item('d', 'b')]
    const out = reorderBatchFirst(chain, 'b', 'a')
    expect(out.map((x) => x.id)).toEqual(['c', 'd', 'a'])
  })
})
