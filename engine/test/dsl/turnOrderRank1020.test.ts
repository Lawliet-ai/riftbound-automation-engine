import { describe, expect, test } from 'vitest'
import { turnOrderRank } from '../../src/dsl/trigger'
import { asPlayerId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'

                                     
  
                                                
                                         
  
                                                          
                                                           
                                                    
                                            
                                                 
  
                                                  

const [P1, P2, P3] = [asPlayerId('P1'), asPlayerId('P2'), asPlayerId('P3')]
const st = (players: readonly string[], active: string): GameState =>
  ({ players: players.map(asPlayerId), activePlayer: asPlayerId(active) } as unknown as GameState)

describe('★★★★★★★ ★1020 §383.3.d.1 回合顺序判据', () => {
  test('🔴回合玩家排 0,其余按回合顺序往后', () => {
    const s = st(['P1', 'P2', 'P3'], 'P2')
    expect(turnOrderRank(s, P2), '★回合玩家最先').toBe(0)
    expect(turnOrderRank(s, P3), '★下一名').toBe(1)
    expect(turnOrderRank(s, P1), '★再下一名(绕回队首)').toBe(2)
  })

  test('🔴2 人局:回合玩家 0、对手 1', () => {
    const s = st(['P1', 'P2'], 'P1')
    expect(turnOrderRank(s, P1)).toBe(0)
    expect(turnOrderRank(s, P2)).toBe(1)
  })

  test('🔴🔴哨兵:3 人局里【二值排序分不出来】的那一对,这里分得出来', () => {
                                                                
                                                             
                                       
    const s = st(['P1', 'P2', 'P3'], 'P2')
    const 二值 = (p: typeof P1): number => (p === P2 ? 1 : 0)
    expect(二值(P3) - 二值(P1), '★二值排序:这两个人分不出先后').toBe(0)
    expect(turnOrderRank(s, P3) < turnOrderRank(s, P1), '★完整轮转:P3 在 P1 之前').toBe(true)
  })

  test('🔴兜底:不在名单里的玩家排最后,不参与轮转', () => {
    const s = st(['P1', 'P2'], 'P1')
    expect(turnOrderRank(s, P3)).toBe(2)
  })
})
