import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { drawCard, runTurn } from '../src/goldfish/singleSeat'
import { controlledBattlefields } from '../src/state/battlefieldControl'
import { assertInvariants } from '../src/test/invariants'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function unit(id: string, zone: string, ctrl: typeof P1): GameObject {
  return { oid: asObjId(id), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 3, damage: 0, counters: {}, status: {} }
}

                                          
function goldfishState(): GameState {
  const base = createInitialState([P1, P2])
  const objs = [unit('mine', 'battlefield:shared:0', P1), unit('d1', 'mainDeck:P1', P1), unit('d2', 'mainDeck:P1', P1)]
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, objects, zones }
}

describe('§188 控制(简化)', () => {
  test('有己方无敌方 → 控制;有敌方 → 不控制', () => {
    const s = goldfishState()
    expect(controlledBattlefields(s, P1)).toEqual(['battlefield:shared:0'])
                         
    const contested = { ...s, objects: { ...s.objects, enemy: unit('enemy', 'battlefield:shared:0', P2) } }
    const z = contested.zones['battlefield:shared:0']!
    const s2 = { ...contested, zones: { ...contested.zones, 'battlefield:shared:0': { ...z, contents: [...z.contents, asObjId('enemy')] } } }
    expect(controlledBattlefields(s2, P1)).toEqual([])
  })
})

describe('§315.4.b 抽牌', () => {
  test('抽一张:主牌堆顶 → 手牌', () => {
    const s = goldfishState()
    const after = drawCard(s, P1)
    expect(after.zones['hand:P1']!.contents).toHaveLength(1)
    expect(after.zones['mainDeck:P1']!.contents).toHaveLength(1)
  })
  test('主牌堆空 → 燃尽(§315.4.b.1)', () => {
    const s: GameState = { ...createInitialState([P1, P2]), scores: { P1: 0, P2: 2 }, winTarget: 3 }
    const after = drawCard(s, P1)               
    expect(after.scores['P2']).toBeGreaterThanOrEqual(3)
  })
})

describe('单座回合:走通回合结构 + 据守记分 + 抽牌', () => {
  test('runTurn:据守控制战场得1分、抽1张、交接回合、不变量成立', () => {
    const s = goldfishState()
    const after = runTurn(s)
    assertInvariants(after)
    expect(after.scores['P1']).toBe(1)                         
    expect(after.zones['hand:P1']!.contents).toHaveLength(1)        
    expect(after.activePlayer).toBe(P2)               
    expect(after.scoredBattlefieldsThisTurn).toEqual({})             
  })
  test('多回合连跑不崩、不变量恒成立', () => {
    let s = goldfishState()
    for (let i = 0; i < 6; i++) {
      s = runTurn(s)
      assertInvariants(s)
    }
    expect(s).toBeDefined()
  })
})
