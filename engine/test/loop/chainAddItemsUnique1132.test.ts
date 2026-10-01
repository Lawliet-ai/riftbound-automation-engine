                                                          
  
                                                              
                                                                        
                                                                           
                                                                     
                                                 
                                      
import { describe, expect, it } from 'vitest'
import { addItems, type ChainItem } from '../../src/loop/chain'
import { asPlayerId } from '../../src/state/ids'

const P1 = asPlayerId('P1')
const item = (id: string): ChainItem => ({
  id, controller: P1, kind: 'triggered', status: 'pending', resolve: () => [],
} as unknown as ChainItem)

describe('★1132 addItems:入链口保证 id 唯一', () => {
  it('🔴 不撞时逐字不变(顺序、条数、id 全一样)', () => {
    const chain = [item('a'), item('b')]
    const out = addItems(chain, [item('c'), item('d')])
    expect(out.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('🔴🔴 与链上已有的撞 ⇒ 给新来的加后缀(老的不动)', () => {
    const chain = [item('x'), item('y')]
    const out = addItems(chain, [item('x')])
    expect(out.map((i) => i.id)).toEqual(['x', 'y', 'x#2'])
  })

  it('🔴 同一批**内部**撞也要错开(调用方一次塞两个同 id)', () => {
    const out = addItems([], [item('z'), item('z'), item('z')])
    expect(out.map((i) => i.id)).toEqual(['z', 'z#2', 'z#3'])
    expect(new Set(out.map((i) => i.id)).size).toBe(3)
  })

  it('🔴 后缀会往下数(链上已经有 #2 了就用 #3)', () => {
    const out = addItems([item('k'), item('k#2')], [item('k')])
    expect(out.map((i) => i.id)).toEqual(['k', 'k#2', 'k#3'])
  })

  it('🔴 内嵌触发那条路(§388.1 enqueueItem)也受这道防线保护', () => {
                                                                               
    const embedded = 'UNL-081-embed-copy:o42'
    const out = addItems([item(embedded)], [item(embedded)])
    expect(out.map((i) => i.id)).toEqual([embedded, `${embedded}#2`])
    expect(new Set(out.map((i) => i.id)).size, '链上出现了重复 id').toBe(out.length)
  })
})
