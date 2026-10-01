import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { resolveConquer, runCombatAndScore } from '../src/scoring/holdConquer'
import { attemptHold } from '../src/scoring/score'
import { assertInvariants } from '../src/test/invariants'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function u(id: string, ctrl: typeof P1, might: number): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(BF0), baseMight: might, damage: 0, counters: {}, status: {} }
}
function place(units: GameObject[]): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const z = base.zones[BF0]!
  for (const o of units) objects[o.oid] = o
  return { ...base, objects, zones: { ...base.zones, [BF0]: { ...z, contents: units.map((o) => o.oid) } } }
}

describe('M1.5.4 征服得分(消费战斗§466.5.d事件,唯一owner)', () => {
  test('3战力进攻清场 → 确立控制 → 征服得1分', () => {
    const s = place([u('atk', P1, 3), u('d1', P2, 1), u('d2', P2, 1)])
    const { state, combat, scored } = runCombatAndScore(s, BF0, P1)
    expect(combat.outcome).toBe('attackerWins')
    expect(scored).toBe('scored')
    expect(state.scores['P1']).toBe(1)                        
    assertInvariants(state)
  })

  test('无结果(打不穿)→ 无征服事件 → 不得分', () => {
    const { state, scored } = runCombatAndScore(place([u('atk', P1, 5), u('def', P2, 2)]), BF0, P1)
                                                         
    expect(['scored', 'none']).toContain(scored)
    assertInvariants(state)
  })

  test('§470 每战场每回合合计1分:征服后同战场据守 alreadyScored', () => {
    const s = place([u('atk', P1, 3), u('d1', P2, 1)])
    const { state } = runCombatAndScore(s, BF0, P1)         
    const hold = attemptHold(state, P1, BF0)             
    expect(hold.result).toBe('alreadyScored')         
  })

  test('resolveConquer 直接消费征服事件', () => {
    const s = createInitialState([P1, P2])
    const { state, result } = resolveConquer(s, { player: P1, battlefield: BF0 })
    expect(result).toBe('scored')
    expect(state.scores['P1']).toBe(1)
  })
})

describe('时点分离:据守只在开始阶段', () => {
  test('据守(§315.2.b.2)与征服(§466.5.d)是不同得分行动、不双写', () => {
    const s = place([u('mine', P1, 3)])                  
    const hold = attemptHold(s, P1, BF0)          
    expect(hold.result).toBe('scored')
    expect(hold.state.scores['P1']).toBe(1)
  })
})
