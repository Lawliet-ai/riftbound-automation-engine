                                            
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { project } from '../../src/net/project'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function unit(oid: string, ctrl: typeof P1, zone: string): GameObject {
  return { oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: 2, damage: 0, counters: {}, status: {} }
}

describe('战场控制权', () => {
  test('只有己方单位=你控制;双方都有=无人控制;空=无人控制', () => {
    let s = createInitialState([P1, P2], 2)
    const objs = [unit('a', P1, BF0), unit('b', P1, BF1), unit('c', P2, BF1)]
    const objects: Record<string, GameObject> = {}
    const zones = { ...s.zones }
    for (const o of objs) {
      objects[o.oid] = o
      zones[o.zone] = { ...zones[o.zone]!, contents: [...zones[o.zone]!.contents, o.oid] }
    }
    s = { ...s, objects, zones }
    const v = project(s, P1)
    expect(v.battlefieldControl![BF0]).toBe(P1)             
    expect(v.battlefieldControl![BF1]).toBe(null)                  
  })

  test('双方视角看到的控制权一致(公开信息)', () => {
    let s = createInitialState([P1, P2], 2)
    const o = unit('a', P2, BF0)
    s = { ...s, objects: { [o.oid]: o }, zones: { ...s.zones, [BF0]: { ...s.zones[BF0]!, contents: [o.oid] } } }
    expect(project(s, P1).battlefieldControl).toEqual(project(s, P2).battlefieldControl)
    expect(project(s, P1).battlefieldControl![BF0]).toBe(P2)
  })
})
