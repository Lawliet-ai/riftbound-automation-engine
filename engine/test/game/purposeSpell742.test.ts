import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { RestrictedGrant } from '../../src/state/runePool'
import { playCard } from '../../src/loop/playCard'

                                            
                                                                      
                                                    
                                                                              
                                    
  
                                                            
                                                      
                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const grant = (mana: number, purposes: readonly string[]): RestrictedGrant =>
  ({ mana, energy: {}, purposes } as unknown as RestrictedGrant)

function scene(restricted: readonly RestrictedGrant[], mana = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const card: GameObject = {
    oid: asObjId('sp'), defId: 'SPELL-X', owner: P1, controller: P1,
    zone: asZoneId(`hand:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['spell'],
    damage: 0, counters: {}, status: {},
  } as GameObject
  const hand = base.zones[`hand:${P1}` as never]!
  return { ...base, activePlayer: P1, phase: 'main',
    objects: { sp: card },
    zones: { ...base.zones, [`hand:${P1}` as never]: { ...hand, contents: [asObjId('sp')] } },
    runePools: { ...base.runePools, [P1]: { mana, runes: {}, ...(restricted.length > 0 ? { restricted } : {}) } } } as GameState
}

const req = (purpose?: string) => ({
  cardOid: asObjId('sp'), controller: P1, cost: { mana: 2 },
  keywords: [], kind: 'spell' as const, isChainStarter: true,
  ...(purpose !== undefined ? { purpose } : {}),
  makeResolve: () => () => [],
})

describe('★★★★★★★ ★742 法术打出路接 purpose', () => {
  test('★★★★★★①受限 playSpell 法力经 playCard 打法术真付得出(修前这里 !ok=真缺口)', () => {
    const s = scene([grant(2, ['playSpell'])])
    const r = playCard(s, req('playSpell') as never)
    expect(r.ok, '★★受限笔计入 playSpell 用途 ⇒ 付得出').toBe(true)
    if (r.ok) expect(r.state.runePools[P1]!.restricted ?? [], '★受限笔真被花掉').toEqual([])
  })

  test('★★★★★★②purpose 不合 ⇒ 仍付不出(反档:保守方向仍在,刀=不传 purpose 就红)', () => {
    const s = scene([grant(2, ['playSpell'])])
    expect(playCard(s, req('playUnit') as never).ok, '★受限 playSpell 不给 playUnit 用').toBe(false)
    expect(playCard(s, req() as never).ok, '★不传 purpose=受限笔不参与(★724 缺省)').toBe(false)
  })

  test('★★★★★③普通法力照常(回归:purpose 有无都付得出)', () => {
    expect(playCard(scene([], 2), req('playSpell') as never).ok).toBe(true)
    expect(playCard(scene([], 2), req() as never).ok).toBe(true)
  })
})
