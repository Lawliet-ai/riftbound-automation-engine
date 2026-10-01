import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { selfBattlefield, eventBattlefield } from '../../src/state/selfHere'

                                                      
  
                                       
                                                                         
                                 
                                                                          
                          
                                                   
                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function scene(zone: string): GameState {
  const base = createInitialState([P1, P2], 2)
  const o = {
    oid: asObjId('u'), defId: 'OGN-012', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as unknown as GameObject
  const zones = { ...base.zones }
  const z = zones[o.zone]
  if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  return { ...base, objects: { u: o }, zones } as unknown as GameState
}

describe('🔴🔴🔴★★★★★★569【C7】两档「此处」读口', () => {
  test('🔴🔴🔴★★★★★★【两支必须给出不同答案】事件说 BF0、源人在 BF1', () => {
                                                  
    const s = scene(BF1)
    expect(eventBattlefield({ battlefield: BF0 }), '★锁定档:读事件带来的').toBe(BF0)
    expect(selfBattlefield(s, asObjId('u')), '★★★结算档:读源此刻在哪').toBe(BF1)
    expect(eventBattlefield({ battlefield: BF0 })).not.toBe(selfBattlefield(s, asObjId('u')))
  })

  test('🔴★★★★★锁定档:事件没带战场 ⇒ undefined(不回落去读源)', () => {
    expect(eventBattlefield({}), '★没带就是没带').toBeUndefined()
    expect(eventBattlefield(undefined)).toBeUndefined()
                               
    expect(eventBattlefield({ battlefield: 123 as unknown })).toBeUndefined()
  })

  test('🔴★★★★★结算档:源不在战场上 ⇒ undefined(不回落去读事件)', () => {
    expect(selfBattlefield(scene(`base:${P1}`), asObjId('u')), '★回了基地').toBeUndefined()
    expect(selfBattlefield(scene(BF0), asObjId('nobody')), '★根本不存在').toBeUndefined()
  })
})
