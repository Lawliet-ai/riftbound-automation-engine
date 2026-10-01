import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { reduce } from '../src/loop/reduce'
import { assertInvariants } from '../src/test/invariants'
import { makeRng, randomAction } from '../src/bot/randomBot'
import { burnOut } from '../src/scoring/burnout'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function seedState(): GameState {
  const mk = (id: string, ctrl: typeof P1): GameObject => ({ oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId('battlefield:shared:0'), baseMight: 3, damage: 0, counters: {}, status: {} })
  const objs = [mk('a', P1), mk('b', P2)]
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const z = base.zones['battlefield:shared:0']!
  for (const o of objs) objects[o.oid] = o
  return { ...base, objects, zones: { ...base.zones, 'battlefield:shared:0': { ...z, contents: ['a', 'b'].map(asObjId) } } }
}

describe('random-bot 自我对弈 fuzz(§⑥.4)', () => {
  test('多局随机动作:全程不变量恒成立、不崩', () => {
    let steps = 0
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed)
      let s = seedState()
      for (let i = 0; i < 60; i++) {
        const player = rng() < 0.5 ? P1 : P2
        const action = randomAction(s, player, rng)
        const { state } = reduce(s, action)      
        assertInvariants(state)          
        s = state
        steps++
        if (s.winner) s = seedState()          
      }
    }
    expect(steps).toBe(40 * 60)            
  })
})

describe('M0 DoD:无卡空转到有人燃尽送分获胜', () => {
  test('空牌堆反复燃尽 → 有对手达胜利分、立即获胜,全程不变量成立', () => {
                                                      
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 0 }, winTarget: 3 }
    const final = burnOut(s, P1)
    assertInvariants(final)
    expect(final.winner).toBe(P2)            
    expect(final.scores['P2']).toBeGreaterThanOrEqual(3)
  })
})
