import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { hasEphemeral, runEphemeralStep } from '../../src/keywords/ephemeral'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, ctrl: typeof P1, keywords: string[]): GameObject {
  return { oid: asObjId(id), defId: 'C', owner: ctrl, controller: ctrl, zone: asZoneId(BF0), baseKeywords: keywords, baseMight: 1, damage: 0, counters: {}, status: {} }
}
function place(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  const z = base.zones[BF0]!
  for (const o of objs) objects[o.oid] = o
  return { ...base, objects, zones: { ...base.zones, [BF0]: { ...z, contents: objs.map((o) => o.oid) } } }
}

describe('瞬息 §816', () => {
  test('hasEphemeral 识别关键词', () => {
    expect(hasEphemeral(obj('a', P1, ['瞬息']))).toBe(true)
    expect(hasEphemeral(obj('b', P1, ['据守']))).toBe(false)
  })

  test('§816.1.b/c 控制者开始阶段摧毁其瞬息牌;对手的不摧毁', () => {
    const s = place([obj('mine', P1, ['瞬息']), obj('theirs', P2, ['瞬息']), obj('plain', P1, [])])
    const after = runEphemeralStep(s, P1)           
    expect(after.objects['mine']).toBeUndefined()              
    expect(after.objects['theirs']).toBeDefined()                    
    expect(after.objects['plain']).toBeDefined()          
    expect(after.zones['discard:P1']!.contents).toHaveLength(1)           
  })

  test('§816.2 一张牌只摧毁一次', () => {
    const s = place([obj('e', P1, ['瞬息', '据守'])])
    const after = runEphemeralStep(s, P1)
    expect(after.objects['e']).toBeUndefined()
    expect(after.zones['discard:P1']!.contents).toHaveLength(1)           
  })

  test('无瞬息牌:恒等', () => {
    const s = place([obj('plain', P1, [])])
    expect(runEphemeralStep(s, P1)).toBe(s)
  })
})
