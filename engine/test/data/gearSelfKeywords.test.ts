import { describe, expect, test } from 'vitest'
import { GEAR_CARDS } from '../../data/gearCards'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { specLookup } from '../../data/decks'
import { hasEphemeral, runEphemeralStep } from '../../src/keywords/ephemeral'

                                                   
                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

describe('生成器:从补录补出装备自身关键词', () => {
  test('★旋转飞斧 SFD-186 的 [瞬息] 进了表(上游文本里根本没有它)', () => {
    expect(GEAR_CARDS['SFD-186']!.keywords).toContain('瞬息')
  })

  test('装配与灵便照旧从上游来,没被覆盖掉', () => {
    const k = GEAR_CARDS['SFD-186']!.keywords
    expect(k).toContain('灵便')
    expect(k).toContain('装配A')
  })

  test('★没有自身关键词的装备不被误加(只按白名单收)', () => {
    expect(GEAR_CARDS['SFD-022']!.keywords).not.toContain('瞬息')      
  })

  test('★授予类关键词【不】混进自身关键词(分工:grants 走 §718.3 注入穿戴者)', () => {
                                            
    expect(GEAR_CARDS['SFD-064']!.grants).toContain('坚守2')
    expect(GEAR_CARDS['SFD-064']!.keywords).not.toContain('坚守2')
  })
})

describe('★端到端:进了表就要真生效', () => {
  test('specLookup 把瞬息带到物件的印刷关键词上', () => {
    expect(specLookup('SFD-186').baseKeywords).toContain('瞬息')
  })

  test('★场上的旋转飞斧在其控制者的开始阶段真的被摧毁', () => {
    const base = createInitialState([P1, P2], 2)
    const spec = specLookup('SFD-186')
    const o: GameObject = {
      oid: asObjId('axe'), defId: 'SFD-186', owner: P1, controller: P1,
      zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: spec.baseKeywords,
      baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
    }
    expect(hasEphemeral(o)).toBe(true)
    const z = base.zones[`base:${P1}`]!
    const s = {
      ...base, activePlayer: P1, objects: { axe: o },
      zones: { ...base.zones, [z.id]: { ...z, contents: [asObjId('axe')] } },
    }
    const after = runEphemeralStep(s, P1)
    expect(after.objects['axe' as never]).toBeUndefined()
    expect(after.zones[`discard:${P1}`]!.contents).toHaveLength(1)
  })
})
