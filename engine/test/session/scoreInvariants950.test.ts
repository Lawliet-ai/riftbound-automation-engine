import { describe, expect, test } from 'vitest'
import { asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { assertInvariants } from '../../src/test/invariants'

                                                 
                                                
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const good = (): GameState => ({ ...createInitialState([P1, P2], 2), activePlayer: P1 })

describe('★950 得分/对决不变量', () => {
  test('合法态不抛', () => {
    expect(() => assertInvariants(good())).not.toThrow()
  })

  test('§470 得分记录含非战场 ⇒ 抛(★949 那条 bug 的正规记账版探测器)', () => {
    const s = good()
    const bad = { ...s, scoredBattlefieldsThisTurn: { ...s.scoredBattlefieldsThisTurn, [P1]: [asZoneId('base:P1') as unknown as ObjId] } }
    expect(() => assertInvariants(bad as GameState)).toThrow(/得分记录含非战场/)
  })

                                             
                                                    
                                                         
                                                    
                                                            
                                                
                                          
                                                              
                                                       
                                  
                                                                      
  test('§195 效果指示获胜不看分数 ⇒ 判了胜者但分数不够【不抛】(★950 那条判据被 ★1002 推翻)', () => {
    const s = good()
    expect(() => assertInvariants({ ...s, winner: P1, scores: { ...s.scores, [P1]: 1 } } as GameState)).not.toThrow()
  })

  test('⚠️分数【超过】胜利分不抛 —— §431.3.a 燃尽连送 + §194.2「大于或等于」', () => {
    const s = good()
                                                
    expect(() => assertInvariants({ ...s, winner: P1, scores: { ...s.scores, [P1]: s.winTarget + 1 } } as GameState)).not.toThrow()
  })

  test('§344 duelBattlefield 非战场 ⇒ 抛', () => {
    const s = good()
    expect(() => assertInvariants({ ...s, spellDuelActive: true, duelBattlefield: 'base:P1' } as unknown as GameState)).toThrow(/duelBattlefield 非战场/)
  })

  test('spellDuelActive 与 duelBattlefield 必须成对 ⇒ 两个方向都抛', () => {
    const s = good()
    expect(() => assertInvariants({ ...s, spellDuelActive: true } as GameState)).toThrow(/没有 duelBattlefield/)
    expect(() => assertInvariants({ ...s, duelBattlefield: 'battlefield:shared:0' } as unknown as GameState)).toThrow(/没在对决却留着/)
  })
})
