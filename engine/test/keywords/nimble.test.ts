import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { hasNimble, withImpliedKeywords, nimbleAttachTargets, nimbleTriggerCount } from '../../src/keywords/nimble'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: Record<string, GameObject>): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, objects: objs }
}

describe('§819 灵便:权限段([反应])+ 触发段(打出时贴附)', () => {
  test('§819.3 灵便是布尔特性', () => {
    expect(hasNimble(['灵便'])).toBe(true)
    expect(hasNimble(['装配'])).toBe(false)
    expect(hasNimble(undefined)).toBe(false)
  })

  test('§819.1.b 拥有[灵便]的卡【自带[反应]】:时机判定要走蕴含后的关键词', () => {
                                
    expect(withImpliedKeywords(['灵便'])).toContain('反应')
    expect(withImpliedKeywords(['灵便', '装配'])).toEqual(['灵便', '装配', '反应'])
  })

  test('已印[反应]的不重复补(去重)', () => {
    expect(withImpliedKeywords(['灵便', '反应'])).toEqual(['灵便', '反应'])
  })

  test('没有灵便就不补反应', () => {
    expect(withImpliedKeywords(['装配'])).toEqual(['装配'])
    expect(withImpliedKeywords([])).toEqual([])
  })

  test('§819.2 多个[灵便]不分别触发,除第一个外没有任何效果', () => {
    expect(nimbleTriggerCount(['灵便'])).toBe(1)
    expect(nimbleTriggerCount(['灵便', '灵便', '灵便'])).toBe(1)          
    expect(nimbleTriggerCount([])).toBe(0)
  })

  test('§819.2 与"多来源相加"的关键词相反:灵便【不】按份累加', () => {
                                             
    expect(nimbleTriggerCount(['灵便', '灵便'])).toBe(1)
  })

  test('§819.1.d 贴附目标只能是【你控制的】单位', () => {
    const s = scene({
      mine: obj('mine', P1, BF0),
      foe: obj('foe', P2, BF0),
    })
    const t = nimbleAttachTargets(s, P1).map((o) => o.oid)
    expect(t).toEqual(['mine'])
  })

  test('「你控制的」按 controller 判(被夺控的单位归夺控方)', () => {
    const s = scene({
      stolen: obj('stolen', P1, BF0, { owner: P2 }), // owner=P2 但 controller=P1
    })
    expect(nimbleAttachTargets(s, P1).map((o) => o.oid)).toEqual(['stolen'])
    expect(nimbleAttachTargets(s, P2)).toHaveLength(0)
  })

  test('§819.1.d 目标必须是【单位】:装备不能作为灵便的贴附目标', () => {
    const s = scene({
      u: obj('u', P1, BF0),
      eq: obj('eq', P1, BF0, { baseTypes: ['equipment'] } as never),
    })
    expect(nimbleAttachTargets(s, P1).map((o) => o.oid)).toEqual(['u'])
  })

  test('§434.1 目标必须在【场上】:手牌里的不算', () => {
    const s = scene({
      onField: obj('onField', P1, BF0),
      inHand: obj('inHand', P1, 'hand:P1'),
    })
    expect(nimbleAttachTargets(s, P1).map((o) => o.oid)).toEqual(['onField'])
  })

  test('零合法目标:返回空(入链资格由结算链层据此判定)', () => {
    const s = scene({ foe: obj('foe', P2, BF0) })
    expect(nimbleAttachTargets(s, P1)).toHaveLength(0)
  })

  test('基地上的单位也是合法目标(不限于战场)', () => {
    const s = scene({ b: obj('b', P1, 'base:P1') })
    expect(nimbleAttachTargets(s, P1).map((o) => o.oid)).toEqual(['b'])
  })
})
