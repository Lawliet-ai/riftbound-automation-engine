import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { cardKind, cardCost, activatedFor, cardPassives } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { CARD_COSTS } from '../../data/cardCosts'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
import {
  VEN_124, VEN_124_CARD_EFFECT, VEN_124_EMPOWER_SPEC, VEN_124_EMPOWERED_BONUS, greybackFodder,
} from '../../data/cards/VEN-124'

                                                        
                                                   
                           
                                       
  
                          
                                                                
                                                                            
                                                                
                                                      

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'grey'

const obj = (
  oid: string, ctrl = P1, zone = BF0, defId = 'OGN-012', extra: Partial<GameObject> = {},
): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as unknown as GameObject)
   
                                          
                                                                          
                                                                                  
                                                 
   
const greyback = (empowered = false, zone = BF0): GameObject =>
  obj(SELF, P1, zone, 'VEN-124', empowered ? { counters: { [EMPOWER_COUNTER]: 1 } } : {})

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({ ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState)
}
const might = (s: GameState, oid: string): number => effectiveMight(s.objects[asObjId(oid)]!).reference
const xc = VEN_124_EMPOWER_SPEC.extraCost!

describe('🔴🔴🔴★★★★★★608 脱逃的灰背:前提与接线', () => {
  test('★前提:单位 3费 **0pip** 黄 3[S]、**单印次**、卡文一字不差', () => {
    expect(CARD_COSTS['VEN-124']).toEqual({ mana: 3, pips: 0, colors: ['yellow'] })
    expect(CARD_COSTS['VEN-124a'], '★单印次:没有 a 号').toBeUndefined()
    expect(cardKind('VEN-124')).toBe('unit')
    expect(VEN_124.energy).toBe(3)
    expect(VEN_124.power).toBe(3)
    expect(VEN_124.domains).toEqual(['yellow'])
    expect(VEN_124_CARD_EFFECT).toBe(
      '{{强化}} — 摧毁一名友方单位（支付此费用：强化我。仅在未强化时可用。）\n{{已强化>}} 我获得{{S}}+2。')
  })

  test('🔴🔴🔴★★★★★★【会换答案】接线:`UNIT_COST` 登了 3费 **0pip**(★597/606/607 三次栽过)', () => {
    expect(cardCost('VEN-124')).toEqual({ mana: 3 })
  })

  test('🔴🔴🔴★★★★★★接线:主动技能表里查得到(漏了 ⇒ 第一句在真对局里激活不了)', () => {
                                                              
                                                          
    const specs = activatedFor('VEN-124')
    expect(specs.map((sp) => sp.key)).toContain('VEN-124:empower')
    const mine = specs.find((sp) => sp.key === 'VEN-124:empower')!
    expect(mine.extraCost?.label, '★★★第⑤种形态:非资源费用走 extraCost').toBe('摧毁一名友方单位')
  })
})

describe('🔴🔴🔴★★★★★★608 第①句:「{强化} — 摧毁一名友方单位」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·看没写的词】候选**含我自己**(卡文没写「其他」)', () => {
                                                       
    const s = scene([greyback(), obj('ally')])
    expect(greybackFodder(s, P1), '★★★写成排除自己就是另一张卡').toEqual([SELF, 'ally'].sort())
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**友方**」——对手的单位不能拿来烧', () => {
    const s = scene([greyback(), obj('foe', P2)])
    expect(greybackFodder(s, P1)).toEqual([SELF])
  })

  test('🔴🔴★★★★★★卡文没写位置 ⇒ **基地里的友方也算**(㊼ 与 `fieldedUnits` 同口径)', () => {
    const s = scene([greyback(), obj('atBase', P1, `base:${P1}`)])
    expect(greybackFodder(s, P1)).toEqual([SELF, 'atBase'].sort())
  })

  test('🔴🔴🔴★★★★★★【会换答案】`options` 与判据同源;付不出就 `pay` 返 null(枚举侧与 apply 侧同一道门)', () => {
    const s = scene([greyback(), obj('ally')])
    expect(xc.options!(s, P1, SELF).map((c) => c.id).sort()).toEqual([SELF, 'ally'].sort())
    expect(xc.pay(s, P1, SELF, undefined), '★没选 ⇒ 付不出').toBeNull()
    expect(xc.pay(s, P1, SELF, 'ghost'), '★★★选了个不在候选里的 ⇒ 付不出').toBeNull()
    expect(xc.pay(s, P1, SELF, 'foeNotHere'), '★对手的/不存在的都不行').toBeNull()
                                       
    const empty = scene([obj('foe', P2)])
    expect(xc.options!(empty, P1, SELF)).toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案·验对层】`pay` **不动 state**,真摧毁走 `payEvents` 的 destroy 事件', () => {
                                                                
                                                 
    const s = scene([greyback(), obj('ally')])
    const after = xc.pay(s, P1, SELF, 'ally')
    expect(after, '★付得出').not.toBeNull()
    expect(after!.objects[asObjId('ally')], '★★★pay 阶段它还活着').toBeDefined()
    const evs = xc.payEvents!(s, P1, SELF, 'ally') as readonly GameEvent[]
    expect(evs.length).toBe(1)
    expect(evs[0]).toMatchObject({ kind: 'destroy', target: 'ally' })
    expect(xc.payEvents!(s, P1, SELF, undefined), '★没选就不发').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**仅在未强化时可用**」= §441.1.b 的可用性闸(枚举侧就拦)', () => {
    const fresh = scene([greyback(false), obj('ally')])
    const done = scene([greyback(true), obj('ally')])
    expect(VEN_124_EMPOWER_SPEC.available!(fresh, P1, SELF), '★未强化 ⇒ 可用').toBe(true)
    expect(VEN_124_EMPOWER_SPEC.available!(done, P1, SELF), '★★★已强化 ⇒ 列不出来').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【真结算】效果是「**强化我**」(§827.1.b.1 源不是目标)', () => {
    const evs = VEN_124_EMPOWER_SPEC.makeResolve!({ selfOid: SELF, controller: P1 } as never)(
      scene([greyback(), obj('ally')]), {} as never) as readonly GameEvent[]
    expect(evs).toEqual([{ kind: 'empower', target: SELF }])
    expect(VEN_124_EMPOWER_SPEC.target, '§827.1.b.1 不选目标').toBe('none')
  })
})

describe('🔴🔴🔴★★★★★★608 第②句:「{已强化>} 我获得{S}+2」', () => {
  test('🔴🔴🔴★★★★★★【真结算·端到端】已强化 ⇒ 派生战力 3 → **5**', () => {
    expect(VEN_124_EMPOWERED_BONUS).toBe(2)
    const s = scene([greyback(true)])
    expect(might(s, SELF), '★★★登漏 EMPOWERED_MIGHT 这条当场红').toBe(3 + VEN_124_EMPOWERED_BONUS)
  })

  test('🔴🔴🔴★★★★★★【会换答案】**未**强化 ⇒ 还是 3(不是无条件 +2)', () => {
    expect(might(scene([greyback(false)]), SELF), '★★★写成无条件加成这条当场红').toBe(3)
  })

  test('🔴🔴🔴★★★★★★【会换答案·场景要造到位】加成**只打我自己** —— 连**同样已强化**的友方也不给', () => {
                                              
                                                                     
                                                   
    const s = scene([greyback(true), obj('ally', P1, BF0, 'OGN-012', { counters: { [EMPOWER_COUNTER]: 1 } })])
    expect(might(s, SELF), '★前提:我自己吃到了').toBe(5)
    expect(might(s, 'ally'), '★★★它也已强化,但那是【我的】印刷被动,不外溢').toBe(3)
  })
})
