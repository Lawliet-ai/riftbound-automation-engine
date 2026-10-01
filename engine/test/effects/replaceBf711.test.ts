import { describe, expect, test } from 'vitest'
import { asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'

                                               
                                                         
                                                   
                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const base = (bfCards?: Record<string, { defId: string; owner: typeof P1; originalDefId?: string }>): GameState =>
  ({ ...createInitialState([P1, P2], 2), activePlayer: P1, phase: 'main',
     ...(bfCards ? { battlefieldCards: bfCards } : {}) } as GameState)
const swap = (defId: string, zoneId = BF0) => ({ kind: 'replaceBattlefieldCard', zoneId: asZoneId(zoneId), defId, owner: P1 })

describe('★★★★★★★ replaceBattlefieldCard(★711)', () => {
  test('★★★★★★首换:身份换草丛+originalDefId 记原始;zone/单位一概不动', () => {
    const s = base({ [BF0]: { defId: 'UNL-210', owner: P2 } })
    const after = applyEvents(s, [swap('token:草丛')] as never, {}).state
    expect(after.battlefieldCards?.[BF0]).toEqual({ defId: 'token:草丛', owner: P1, originalDefId: 'UNL-210' })
    expect(after.zones[asZoneId(BF0)], '★zone 对象不动').toBe(s.zones[asZoneId(BF0)])
  })

  test('★★★★★★草丛换草丛 ⇒ 继承**最初**(裁定:换回的是原始战场);换回原始 ⇒ 清记忆', () => {
    const s = base({ [BF0]: { defId: 'token:草丛', owner: P1, originalDefId: 'UNL-210' } })
    const again = applyEvents(s, [swap('token:草丛')] as never, {}).state
    expect(again.battlefieldCards?.[BF0], '★新草丛记的还是最初 UNL-210').toEqual({ defId: 'token:草丛', owner: P1, originalDefId: 'UNL-210' })
    const restored = applyEvents(again, [swap('UNL-210')] as never, {}).state
    expect(restored.battlefieldCards?.[BF0], '★换回原始 ⇒ originalDefId 清掉(还原即终点)').toEqual({ defId: 'UNL-210', owner: P1 })
  })

  test('★★★★★无身份表项(白板战场)⇒ 保守无操作', () => {
    const s = base()
    const after = applyEvents(s, [swap('token:草丛')] as never, {}).state
    expect(after.battlefieldCards?.[BF0], '★白板不换').toBeUndefined()
  })
})
