import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { resourceCapacity, canPayFromState, payFromState, refreshRunePool } from '../../src/game/economy'
import type { RestrictedGrant } from '../../src/state/runePool'

                                                    
                           
                                                                                   
                                                                
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const grant = (mana: number, purposes: readonly string[], energy: Record<string, number> = {}): RestrictedGrant =>
  ({ mana, energy, purposes })

function scene(restricted: readonly RestrictedGrant[], mana = 0, runes: Record<string, number> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, activePlayer: P1, phase: 'main',
    runePools: { ...base.runePools, [P1]: { mana, runes, ...(restricted.length > 0 ? { restricted } : {}) } } } as GameState
}

describe('★★★★★★★ ①capacity:purpose 匹配才计入', () => {
  test('★★★★★★匹配计入/不匹配不计入/**缺省不计入**(零改动兼容);符能笔同理;多用途笔 includes', () => {
    const s = scene([grant(2, ['playSpell']), grant(1, ['playGear', 'gearAbility'], { orange: 1 })])
    expect(resourceCapacity(s, P1, 'playSpell').mana, '★匹配的 2 计入').toBe(2)
    expect(resourceCapacity(s, P1, 'playUnit').mana, '★不匹配一分不计').toBe(0)
    expect(resourceCapacity(s, P1).mana, '★缺省=不计入(老调用面保守)').toBe(0)
    expect(resourceCapacity(s, P1, 'gearAbility').mana, '★多用途笔 includes 匹配').toBe(1)
    expect(resourceCapacity(s, P1, 'gearAbility').energy['orange'], '★受限符能同计').toBe(1)
    expect(resourceCapacity(s, P1, 'playSpell').energy['orange'] ?? 0, '★符能笔不匹配不计').toBe(0)
  })

  test('★★★★★★canPay 随 purpose:2 费法术=受限{2,playSpell}可付;不传/错传付不起', () => {
    const s = scene([grant(2, ['playSpell'])])
    expect(canPayFromState(s, P1, { mana: 2 }, 'playSpell')).toBe(true)
    expect(canPayFromState(s, P1, { mana: 2 }), '★缺省付不起').toBe(false)
    expect(canPayFromState(s, P1, { mana: 2 }, 'playUnit')).toBe(false)
  })
})

describe('★★★★★★★ ②pay:优先花受限+不匹配笔一分不动', () => {
  test('★★★★★★受限2+通用1 付 2 费(playSpell):受限先花光、通用不动;剩余笔清出', () => {
    const s = scene([grant(2, ['playSpell'])], 1)
    const r = payFromState(s, P1, { mana: 2 }, 'playSpell')
    expect(r.ok).toBe(true)
    const pool = r.state.runePools[P1]!
    expect(pool.mana, '★通用 1 分文未动(受限优先=不花掉清池就浪费)').toBe(1)
    expect(pool.restricted ?? [], '★受限笔花光清出').toEqual([])
  })

  test('★★★★★★半花:受限{3,playSpell}付 2 ⇒ 笔剩 1;不匹配 purpose 的笔原样保留', () => {
    const s = scene([grant(3, ['playSpell']), grant(2, ['playUnit'])], 0)
    const r = payFromState(s, P1, { mana: 2 }, 'playSpell')
    expect(r.ok).toBe(true)
    const kept = r.state.runePools[P1]!.restricted!
    expect(kept, '★匹配笔剩1+不匹配笔原样').toEqual([
      { mana: 1, energy: {}, purposes: ['playSpell'] },
      { mana: 2, energy: {}, purposes: ['playUnit'] },
    ])
  })

  test('★★★★★不传 purpose 付费 ⇒ 受限笔一分不动(从通用扣)', () => {
    const s = scene([grant(2, ['playSpell'])], 3)
    const r = payFromState(s, P1, { mana: 2 })
    expect(r.ok).toBe(true)
    expect(r.state.runePools[P1]!.mana).toBe(1)
    expect(r.state.runePools[P1]!.restricted, '★受限笔原封').toEqual([grant(2, ['playSpell'])])
  })
})

describe('★★★★★★★ ③gainResource 落池+清池丢弃', () => {
  test('★★★★★★gainResource restricted 笔追加;refreshRunePool(§316.3)整组丢弃', () => {
    const s0 = scene([])
    const s1 = applyEvents(s0, [{ kind: 'gainResource', player: P1, restricted: grant(2, ['playSpell']) }] as never, {}).state
    expect(s1.runePools[P1]!.restricted).toEqual([grant(2, ['playSpell'])])
    const s2 = applyEvents(s1, [{ kind: 'gainResource', player: P1, restricted: grant(1, ['playGear'], { red: 1 }) }] as never, {}).state
    expect(s2.runePools[P1]!.restricted, '★第二笔追加不合并').toHaveLength(2)
    const cleared = refreshRunePool(s2, P1)
    expect(cleared.runePools[P1]!.restricted, '★清池=整组丢弃(§316.3 未消耗完全丢失)').toBeUndefined()
    const plain = applyEvents(s0, [{ kind: 'gainResource', player: P1, mana: 2 }] as never, {}).state
    expect(plain.runePools[P1]!.restricted, '★普通获得不长 restricted 字段(老行为不变)').toBeUndefined()
  })
})
