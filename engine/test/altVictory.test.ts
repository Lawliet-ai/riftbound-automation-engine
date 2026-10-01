import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { checkAltVictory, type VictoryCondition } from '../src/scoring/altVictory'
import { runCleanupOnce } from '../src/loop/cleanup'
import { burnOut } from '../src/scoring/burnout'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function fourUnits(): GameState {
  const objects: Record<string, GameObject> = {}
  for (let i = 0; i < 4; i++) {
    const id = `u${i}`
    objects[id] = { oid: asObjId(id), defId: 'U', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'), baseMight: 3, damage: 0, counters: {}, status: {} }
  }
  return { ...createInitialState([P1, P2]), objects }
}

                                                 
                                               
describe('卡无关「效果指示获胜」WIN_GAME(§195,blocker2 修)', () => {
  test('倾颓宫殿式条件:全场恰4单位→立即赢(独立于分数,分数0也赢)', () => {
    const vc: VictoryCondition = {
      id: 'unl-088',
      player: P1,
      kind: 'win',
      predicate: (st) => Object.keys(st.objects).length === 4, // 卡无关谓词(实例化倾颓宫殿"合计4单位"的一半)
    }
    const s: GameState = { ...fourUnits(), victoryConditions: [vc] }
    expect(s.scores['P1']).toBe(0)           
    expect(checkAltVictory(s).winner).toBe(P1)         
  })
  test('条件不满足(3单位)→ 不判胜', () => {
    const vc: VictoryCondition = { id: 'x', player: P1, kind: 'win', predicate: (st) => Object.keys(st.objects).length === 4 }
    const s: GameState = { ...createInitialState([P1, P2]), victoryConditions: [vc] }
    expect(checkAltVictory(s).winner).toBeNull()
  })
  test('LOSE_GAME(2人局):P1判负→P2胜', () => {
    const vc: VictoryCondition = { id: 'lose', player: P1, kind: 'lose', predicate: () => true }
    const s: GameState = { ...createInitialState([P1, P2]), victoryConditions: [vc] }
    expect(checkAltVictory(s).winner).toBe(P2)
  })
})

describe('三条胜利入口', () => {
  test('①分数胜利 §472:清理判胜', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 8, P2: 2 }, winTarget: 8 }
    expect(runCleanupOnce(s).winner).toBe(P1)
  })
  test('②卡无关「效果指示获胜」§195:清理时判胜(分数未达标也胜)', () => {
    const vc: VictoryCondition = { id: 'alt', player: P1, kind: 'win', predicate: () => true }
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 0 }, victoryConditions: [vc] }
    expect(runCleanupOnce(s).winner).toBe(P1)                            
  })
  test('③燃尽即时胜 §431.3.c.1:不等清理立即胜', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 1 }, winTarget: 3 }
    expect(burnOut(s, P1).winner).toBe(P2)
  })
})
