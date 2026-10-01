import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { ChainItem } from '../../src/loop/chain'
import { rechooseChainItem, seizeAndRechoose, seizeControl } from '../../src/keywords/seize'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function chainWith(item: Partial<ChainItem>): GameState {
  const full: ChainItem = { id: 'ci', controller: P2, kind: 'spell', status: 'confirmed', resolve: () => [], ...item }
  return { ...createInitialState([P1, P2]), chain: [full] }
}

describe('夺控 seize §751', () => {
  test('夺取链上法术控制权:controller 改为夺控者', () => {
    const s = chainWith({ controller: P2 })          
    const after = seizeControl(s, 'ci', P1)
    expect(after.chain[0]!.controller).toBe(P1)            
  })
})

describe('另做选择 §750-755', () => {
  test('§752.1 重选目标 → 写入 rechoice;§754 新目标 retargeted', () => {
    const s = chainWith({ rechoice: { target: asObjId('old') } })
    const { state, retargeted } = rechooseChainItem(s, 'ci', { target: asObjId('new') })
    expect(state.chain[0]!.rechoice!.target).toBe(asObjId('new'))
    expect(retargeted).toBe(true)                    
  })
  test('§752.1 重选模式/地点/终点(合并保留)', () => {
    const s = chainWith({})
    const { state } = rechooseChainItem(s, 'ci', { mode: 'B', location: 'battlefield:shared:1' })
    expect(state.chain[0]!.rechoice).toMatchObject({ mode: 'B', location: 'battlefield:shared:1' })
  })
  test('目标未变 → 不算 retargeted(§754 仅新目标才触发)', () => {
    const s = chainWith({ rechoice: { target: asObjId('t') } })
    const { retargeted } = rechooseChainItem(s, 'ci', { target: asObjId('t') })
    expect(retargeted).toBe(false)
  })
})

describe('灵魂折镜式:夺控+重选一步', () => {
  test('付A夺取控制权并重选目标', () => {
    const s = chainWith({ controller: P2 })
    const { state, retargeted } = seizeAndRechoose(s, 'ci', P1, { target: asObjId('newTarget') })
    expect(state.chain[0]!.controller).toBe(P1)
    expect(state.chain[0]!.rechoice!.target).toBe(asObjId('newTarget'))
    expect(retargeted).toBe(true)
  })
})
