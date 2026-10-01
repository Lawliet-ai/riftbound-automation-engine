import { describe, expect, test } from 'vitest'
import { passFocusAfterChainClose } from '../../src/loop/priorityFocus'
import { asPlayerId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'

                                                   
  
          
                                               
                                   
                                                    
                               
  
                                                               
                    
                                      
                                                      
                                                                 
                                      
                                           

const P1 = asPlayerId('P1'), P2 = asPlayerId('P2')
const st = (focus: string | null): GameState =>
  ({ players: [P1, P2], activePlayer: P1, focus: focus === null ? null : asPlayerId(focus), priority: focus === null ? null : asPlayerId(focus) } as unknown as GameState)

describe('★★★★★★★ ★1024 §346 / §346.1 焦点传递', () => {
  test('🔴§346 正常情形:链关闭 ⇒ 焦点与优先权一起传给下一名', () => {
    const out = passFocusAfterChainClose(st('P1'), false)
    expect(String(out.focus), '★传给下一名').toBe('P2')
    expect(String(out.priority), '★§346「同时获得焦点与优先行动权」').toBe('P2')
  })

  test('🔴🔴§346.1 例外:触发/[获得]开的链 ⇒ 焦点【不动】', () => {
    const before = st('P1')
    const out = passFocusAfterChainClose(before, true)
    expect(out, '★原样返回,一个字节都不改').toBe(before)
  })

  test('🔴没有焦点持有者时不动(普通状态 §313.5 本来就无焦点)', () => {
    const before = st(null)
    expect(passFocusAfterChainClose(before, false)).toBe(before)
  })

  test('🔴🔴两条分支给出【不同】结果 —— 这个例外有判别力', () => {
    const a = passFocusAfterChainClose(st('P1'), false)
    const b = passFocusAfterChainClose(st('P1'), true)
    expect(String(a.focus)).not.toBe(String(b.focus))
  })
})
