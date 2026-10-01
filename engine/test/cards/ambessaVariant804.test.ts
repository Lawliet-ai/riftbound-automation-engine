                                         
  
                                                                          
                                                            
                                                 
                                                         
  
                                             
                                                               
                                                                           
import { describe, expect, test } from 'vitest'
import { cardPassives } from '../../data/registry'
import { installProviders } from '../../data/gameDeps'
import { createInitialState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
import type { GameObject } from '../../src/state/object'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                   
function passivesOf(defId: string): string[] {
  installProviders()
  const base = createInitialState([P1, P2], 2)
  const o = {
    oid: asObjId('amb'), defId, owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'),
    baseMight: 5, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: { [EMPOWER_COUNTER]: 1 }, status: {},
  } as unknown as GameObject
  const st = { ...base, objects: { amb: o } } as never
  return cardPassives(o, st).map((e) => JSON.stringify((e as { modification?: unknown }).modification))
}

describe('★804 安蓓萨异画的已强化被动', () => {
  test('VEN-136 / VEN-136a / VEN-187 三个印次拿到的常驻被动完全一致', () => {
    const canon = passivesOf('VEN-136')
    expect(canon.some((m) => m.includes('强攻2')), '前提:本体确实给 [强攻2]').toBe(true)
    for (const alt of ['VEN-136a', 'VEN-187']) {
      expect([...passivesOf(alt)].sort(), `${alt} 必须与本体拿到同一批被动(修之前 VEN-187 一条都没有)`)
        .toEqual([...canon].sort())
    }
  })

  test('反面:没强化就不该给(别把它修成无条件加成)', () => {
    installProviders()
    const base = createInitialState([P1, P2], 2)
    const o = {
      oid: asObjId('amb'), defId: 'VEN-187', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'),
      baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    } as unknown as GameObject
    const fx = cardPassives(o, { ...base, objects: { amb: o } } as never)
                                               
    for (const e of fx) {
      const pred = (e as { predicate?: (x: GameObject, s: never) => boolean }).predicate
      if (pred) expect(pred(o, { ...base, objects: { amb: o } } as never), '未强化 ⇒ predicate 不该命中').toBe(false)
    }
  })
})
