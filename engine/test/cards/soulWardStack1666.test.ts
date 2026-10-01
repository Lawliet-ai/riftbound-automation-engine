   
                                                                                                  
  
          
                                                                                          
                                                            
                                                                                
                                                                     
                                                              
                                                                                                
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { cardPassives } from '../../data/registry'
import { deflectSurcharge, deflectValue } from '../../src/keywords/deflect'

setCardPassiveProvider(cardPassives)
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const mk = (oid: string, defId: string, types: GameObject['baseTypes'], kws: readonly string[], buff: number): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId('base:P1'),
  baseMight: 2, baseKeywords: kws, baseTypes: types, damage: 0, counters: buff > 0 ? { buff } : {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, priority: P1, phase: 'main', feprPasses: 0, objects, zones } as unknown as GameState)
}

describe('🔴★1666 缺陷 214(已修):魂佑只给未拥有法盾的单位', () => {
  const units = [
    mk('shielded', 'BLK', ['unit'], ['法盾'], 1), // 已有法盾 + 有增益
    mk('shielded2', 'BLK', ['unit'], ['法盾2'], 1), // 已有法盾2 + 有增益
    mk('plain', 'BLK', ['unit'], [], 1), // 无法盾 + 有增益
    mk('nobuff', 'BLK', ['unit'], [], 0), // 无法盾 + 无增益
  ]
  const tax = (s: GameState, oid: string): number => deflectSurcharge(s, asObjId(oid), P2)

  test('① 🛑对照组:没有魂佑 ⇒ 1 / 2 / 0 / 0', () => {
    const s = scene(units)
    expect(['shielded', 'shielded2', 'plain', 'nobuff'].map((o) => tax(s, o))).toEqual([1, 2, 0, 0])
  })

  test('② 🔴★★★★★【魂佑在场:未拥有的才获得 ⇒ [1, 2, 1, 0](修前 [2, 3, 1, 0])】', () => {
    const s = scene([...units, mk('ward', 'OGN-063', ['equipment'], [], 0)])
    const got = ['shielded', 'shielded2', 'plain', 'nobuff'].map((o) => tax(s, o))
    expect(got, `实测 ${JSON.stringify(got)}`).toEqual([1, 2, 1, 0])
  })

  test('③ 🔴★★★【派生关键词那条路同口径:deflectValue(derived)与加费读数一致】', () => {
    const s = scene([...units, mk('ward', 'OGN-063', ['equipment'], [], 0)])
    for (const o of ['shielded', 'shielded2', 'plain', 'nobuff']) {
      expect(deflectValue(s.objects[asObjId(o)]!), `★${o} 派生读口 = 加费读口`).toBe(tax(s, o))
    }
  })

  test('④ 🔴★★★【普通授予照样相加(§809.2);丰碑先给了法盾,魂佑就不再给】', () => {
    const monument = mk('monu', 'SFD-104', ['equipment'], [], 0)                                 
    const s = scene([...units, monument])
    expect(['shielded', 'shielded2', 'plain', 'nobuff'].map((o) => tax(s, o)), '★丰碑照加:1+1 / 2+1 / 0+1 / 0+1').toEqual([2, 3, 1, 1])
    const both = scene([...units, monument, mk('ward', 'OGN-063', ['equipment'], [], 0)])
    expect(['shielded', 'shielded2', 'plain', 'nobuff'].map((o) => tax(both, o)), '★丰碑 + 魂佑:魂佑看到已有法盾 ⇒ 不再给').toEqual([2, 3, 1, 1])
  })
})
