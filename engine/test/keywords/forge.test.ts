import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  hasForge, forgeTriggerCount, forgeChoices, reduceByOneAnyPip, forgePayableCost, forgeAttachTarget,
} from '../../src/keywords/forge'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, ctrl: typeof P1, zone: string, defId = 'BLK'): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: Record<string, GameObject>): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, objects: objs }
}
                                 
const tagged = (ids: string[]) => (defId: string, tag: string): boolean =>
  tag === '武装' && ids.includes(defId)

describe('§821 百炼:打出效果,不是"激活装配的另一条路"', () => {
  test('§821.3 是单位的特性', () => {
    expect(hasForge(['百炼'])).toBe(true)
    expect(hasForge(['装配'])).toBe(false)
  })

  test('§821.1.d 多个[百炼]【分别】触发(与 §819.2 灵便"只算第一个"正好相反)', () => {
    expect(forgeTriggerCount(['百炼'])).toBe(1)
    expect(forgeTriggerCount(['百炼', '百炼'])).toBe(2)          
    expect(forgeTriggerCount(['百炼', '百炼', '百炼'])).toBe(3)
    expect(forgeTriggerCount([])).toBe(0)
  })

  test('§821.1.c 可选的是【你控制的】带[武装]标签的卡', () => {
    const s = scene({
      mine: obj('mine', P1, 'base:P1', 'ARM'),
      foe: obj('foe', P2, 'base:P2', 'ARM'),
      plain: obj('plain', P1, 'base:P1', 'PLAIN'),
    })
    expect(forgeChoices(s, P1, tagged(['ARM'])).map((o) => o.oid)).toEqual(['mine'])
  })

  test('§821.1.c.1 无论武装有没有[装配]技能都可以【选择】它', () => {
                                           
    const s = scene({ noEquip: obj('noEquip', P1, 'base:P1', 'ARM-NO-EQUIP') })
    expect(forgeChoices(s, P1, tagged(['ARM-NO-EQUIP']))).toHaveLength(1)
  })

  test('必须在场上;手牌里的武装不可选', () => {
    const s = scene({ h: obj('h', P1, 'hand:P1', 'ARM') })
    expect(forgeChoices(s, P1, tagged(['ARM']))).toHaveLength(0)
  })

  test('§821.1.c 费用【减少[A]】:扣掉一枚任意特性符能', () => {
                                     
    expect(reduceByOneAnyPip({ mana: 2, pips: [[], ['blue']] })).toEqual({ mana: 2, pips: [['blue']] })
  })

  test('§821.1.c.3 费用【不包含[A]】时仍可支付,但【不会减少】', () => {
    const c = { mana: 3, pips: [['red'], ['red']] }
    expect(reduceByOneAnyPip(c)).toEqual(c)      
  })

  test('§821.1.c 只减【一枚】[A],多枚不全减', () => {
    expect(reduceByOneAnyPip({ mana: 1, pips: [[], []] })).toEqual({ mana: 1, pips: [[]] })
  })

  test('§821.1.c.4 所选卡牌【没有[装配]费用】→ 无法支付(返回 null)', () => {
    expect(forgePayableCost('X', () => undefined)).toBeNull()
  })

  test('有装配费用时:返回减少[A]后的费用', () => {
    const cost = forgePayableCost('X', () => ({ mana: 2, pips: [[], ['blue']] }))
    expect(cost).toEqual({ mana: 2, pips: [['blue']] })
  })

  test('§821.1.b/§821.1.c 贴附方向【固定】=贴到拥有百炼的那个单位身上', () => {
                                   
    expect(forgeAttachTarget(asObjId('forgeUnit'))).toBe('forgeUnit')
  })
})
