import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { standardMoveAllowed } from '../../src/session/interactiveGame'

                                            
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const NEST = 'battlefield:token:巢穴:1'

const unit = (oid: string, zone: string, kws: readonly string[] = [], restrictions?: readonly string[]): GameObject => ({
  oid: asObjId(oid), defId: 'U-x', owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [...kws], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...(restrictions ? { derived: { might: 3, keywords: [...kws], restrictions: [...restrictions] } } : {}),
} as GameObject)

function scene(withNest: boolean): GameState {
  const base = createInitialState([P1, P2], 2)
  const zones = withNest ? {
    ...base.zones,
    [asZoneId(NEST)]: { id: asZoneId(NEST), kind: 'battlefield', owner: null, contents: [] },
  } : base.zones
  return {
    ...base, activePlayer: P1, phase: 'main', zones,
    ...(withNest ? { battlefieldCards: { [NEST]: { defId: 'token:男爵巢穴', owner: P1 } } } : {}),
  } as GameState
}

describe('★★★★★★★ 巢穴移动授权(★708)', () => {
  test('★★★★★★无游走单位:战场→普通战场 false;战场→**巢穴** true(任意位置来);基地→巢穴 true', () => {
    const s = scene(true)
    const u = unit('u', BF0)
    expect(standardMoveAllowed(s, u, BF1, P1), '★无游走战场↔战场=禁(§810.1.b)').toBe(false)
    expect(standardMoveAllowed(s, u, NEST, P1), '★★目的地是巢穴 ⇒ 免游走').toBe(true)
    expect(standardMoveAllowed(s, unit('b', `base:${P1}`), NEST, P1), '★基地→巢穴(原本就许)').toBe(true)
  })

  test('★★★★★★只放宽「到此处」:从巢穴出去仍走标准规则;禁止面压过授权;身份判据不认 zone id 前缀', () => {
    const s = scene(true)
    expect(standardMoveAllowed(s, unit('u', NEST), BF0, P1), '★从巢穴→别的战场无游走=仍禁').toBe(false)
    expect(standardMoveAllowed(s, unit('u', NEST), `base:${P1}`, P1), '★巢穴→自己基地(标准许)').toBe(true)
    const chained = unit('c', BF0, [], ['move'])
    expect(standardMoveAllowed(s, chained, NEST, P1), '★「无法移动」仍压过巢穴授权').toBe(false)
                                                                     
    const fake = { ...scene(true), battlefieldCards: { [NEST]: { defId: 'token:草丛', owner: P1 } } } as GameState
    expect(standardMoveAllowed(fake, unit('u', BF0), NEST, P1), '★别的战场指示物不放行').toBe(false)
  })
})
