import { afterEach, describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { empoweredPassives } from '../../data/cards/empowered-passives'
import { effectiveMight } from '../../src/state/might'
import { isEmpowered } from '../../src/keywords/empower'

                                                            
                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, defId: string, zone = BF0): GameObject {
  return {
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}
const on = (): void => setCardPassiveProvider(empoweredPassives)
afterEach(() => setCardPassiveProvider(null))                          

const mightOf = (s: GameState, id: string): number => effectiveMight(s.objects[id as never]!).reference
const empowerIt = (s: GameState, id: string): GameState =>
  applyEvents(s, [{ kind: 'empower', target: asObjId(id) }]).state

describe('★通道本身:不注册就完全不生效(行为与接线前一致)', () => {
  test('没注册供给 → 强化了也不加成', () => {
    const s = empowerIt(scene(obj('u', 'VEN-028')), 'u')
    expect(isEmpowered(s.objects['u' as never])).toBe(true)
    expect(mightOf(s, 'u')).toBe(3)              
  })
})

describe('§828.1.c 只要【处于】已强化状态就生效', () => {
  test('未强化 → 没有加成', () => {
    on()
    expect(mightOf(scene(obj('u', 'VEN-028')), 'u')).toBe(3)
  })

  test('★强化后 → 悲悯见证者 +2(3 → 5)', () => {
    on()
    expect(mightOf(empowerIt(scene(obj('u', 'VEN-028')), 'u'), 'u')).toBe(5)
  })

  test('★解除强化后加成【立刻消失】(不是做成 thisTurn 加成)', () => {
    on()
    let s = empowerIt(scene(obj('u', 'VEN-028')), 'u')
    expect(mightOf(s, 'u')).toBe(5)
    s = applyEvents(s, [{ kind: 'disempower', target: asObjId('u') }]).state
    expect(mightOf(s, 'u')).toBe(3)
  })

  test('霜衣狼母 +3', () => {
    on()
    expect(mightOf(empowerIt(scene(obj('u', 'VEN-032')), 'u'), 'u')).toBe(6)
  })

  test('★只加【自己】:同场另一张强化了的别的卡不受它影响', () => {
    on()
    let s = scene(obj('a', 'VEN-028'), obj('b', 'VEN-032'))
    s = empowerIt(s, 'a')
    expect(mightOf(s, 'a')).toBe(5)      
    expect(mightOf(s, 'b')).toBe(3)          
  })

  test('没登记 §828 的卡不受影响', () => {
    on()
    expect(mightOf(empowerIt(scene(obj('u', 'PLAIN')), 'u'), 'u')).toBe(3)
  })
})

describe('§828 授予关键词一族(巴凯旋沙者 VEN-001:法盾 + 强攻2)', () => {
  test('未强化 → 没有那两个关键词', () => {
    on()
    const s = scene(obj('u', 'VEN-001'))
    expect(s.objects['u' as never]!.derived?.keywords ?? []).not.toContain('法盾')
  })

  test('★强化后 → 法盾与强攻2 都出现在派生关键词里', () => {
    on()
    const s = empowerIt(scene(obj('u', 'VEN-001')), 'u')
    const kws = s.objects['u' as never]!.derived?.keywords ?? []
    expect(kws).toContain('法盾')
    expect(kws).toContain('强攻2')
  })
})

describe('§828.1.c 只对【场上】物件生效', () => {
  test('手牌里的牌不吃这条被动', () => {
    on()
    const s = scene(obj('h', 'VEN-028', `hand:${P1}`))
    expect(mightOf(s, 'h')).toBe(3)
  })
})
