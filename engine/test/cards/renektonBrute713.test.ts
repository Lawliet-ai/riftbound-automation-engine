import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { activatedFor, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
import { empoweredPassives } from '../../data/cards/empowered-passives'
import { VEN_092_SPEC, RENEKTON_BRUTE_MIN, makeRenektonBruteTrigger } from '../../data/cards/VEN-092'

                                                                        
                                          
                                                
                                  
  
                       
                                                    
                                                        
                                                     
                                      
                                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = asObjId('rk')

const obj = (oid: string, who: PlayerId, zone: string, might = 3, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

                                    
const buff = (target: string, delta: number): GameEvent => ({
  kind: 'addEffect',
  effect: {
    id: `t:${target}:${delta}`, duration: 'thisTurn', fromPassive: false,
    predicate: (x: { oid: string }) => x.oid === target,
    modification: { kind: 'addMight', delta },
  },
} as unknown as GameEvent)
const crossedOf = (evs: readonly GameEvent[]): readonly { kind: string, unit?: string, from?: number, to?: number }[] =>
  (evs as readonly { kind: string, unit?: string, from?: number, to?: number }[]).filter((e) => e.kind === 'mightCrossed')

describe('★★★★★★★ ★713 通道:applyEvents 尾稳定态比对', () => {
  test('★★★★★★上行发通知(from=批前稳定态3,to=批尾10);一批两单位各上行各一条', () => {
    const s = scene([obj('a', P1, BF0), obj('b', P2, BF0, 5)])
    const r = applyEvents(s, [buff('a', 7), buff('b', 1)] as never, {})
    const got = crossedOf(r.events)
    expect(got).toHaveLength(2)
    expect(got.find((e) => e.unit === 'a')).toMatchObject({ from: 3, to: 10 })
    expect(got.find((e) => e.unit === 'b'), '★5→6 也报(阈值判据在触发端)').toMatchObject({ from: 5, to: 6 })
  })

  test('★★★★★★②进场批不发(L275:4 战力进场吃 aura 变高≠「变为」)——before 不在场 ⇒ 跳过', () => {
    const s = scene([obj('h', P1, `hand:${P1}`)])
    const r = applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('h'), to: asZoneId(BF0) } as unknown as GameEvent, buff('h', 7)] as never, {})
    expect(crossedOf(r.events), '★批前在手牌(非场上)⇒ 本批不算「变为」').toEqual([])
    // 🔒语义锚(★713 刀①结论):真实引擎跨界搬移**必换 oid**(mutations.ts freshOid)⇒ 进场
    // 单位以「before 无此 oid」形态被挡,beforeKind 判是**第二道防线**(防未来改动/直造场景)。
    // 能红的刀=「无 before 用 0 兜底」(进场恒报 0→X 的近似实现,本档抓它);
    // 「去掉 beforeKind 判」是真等价刀,已标锚撤刀。
  })

  test('★★★★★下行不发;纹丝不动不发;非单位(装备)不发', () => {
    const s = scene([obj('a', P1, BF0, 6), obj('idle', P1, BF0),
      obj('gear', P1, BF0, 0, { baseTypes: ['equipment'] } as Partial<GameObject>)])
    const r = applyEvents(s, [buff('a', -2), buff('gear', 9)] as never, {})
    expect(crossedOf(r.events), '★6→4 下行、idle 不动、装备上行都不报').toEqual([])
  })
})

const trig = makeRenektonBruteTrigger(SELF, P1)
const mc = (unit: string, from: number, to: number): GameEvent =>
  ({ kind: 'mightCrossed', unit: asObjId(unit), controller: P1, from, to } as unknown as GameEvent)

describe('★★★★★★★ 句②触发:「变为10或以上」', () => {
  test('★★★★★★③9→10 响;**10→11 不响**(L597 此前必须低于10);9→12 响;别人 9→10 不响;缺字段不响', () => {
    const s = scene([obj('rk', P1, BF0, 9)])
    expect(checkTrigger(trig, mc('rk', 9, 10), s, P1)).toBe(true)
    expect(checkTrigger(trig, mc('rk', 10, 11), s, P1), '★一直≥10 ⇒ 没有「变为」').toBe(false)
    expect(checkTrigger(trig, mc('rk', 9, 12), s, P1), '★一步跨过也算').toBe(true)
    expect(checkTrigger(trig, mc('other', 9, 10), s, P1), '★「我的战力」subjectIsSelf').toBe(false)
    expect(RENEKTON_BRUTE_MIN, '★阈值钉字面量').toBe(10)
  })

  test('★★★★★effect=[empower 我];离场 ⇒ 空;E2E:9 场上+1 ⇒ 通道报 9→10+empower 落地(§441 幂等)', () => {
    const s = scene([obj('rk', P1, BF0, 9)])
    expect(trig.effect(s, mc('rk', 9, 10), {})).toEqual([{ kind: 'empower', target: 'rk' }])
    expect(trig.effect(scene([]), mc('rk', 9, 10), {})).toEqual([])
    const r = applyEvents(s, [buff('rk', 1)] as never, {})
    expect(crossedOf(r.events)).toEqual([{ kind: 'mightCrossed', unit: 'rk', controller: P1, from: 9, to: 10 }])
    const after = applyEvents(r.state, trig.effect(r.state, crossedOf(r.events)[0] as never, {}) as never, {}).state
    expect(after.objects['rk' as never]!.counters[EMPOWER_COUNTER], '★强化落地').toBe(1)
    const again = applyEvents(after, trig.effect(after, mc('rk', 9, 10) as never, {}) as never, {}).state
    expect(again.objects['rk' as never]!.counters[EMPOWER_COUNTER], '★已强化再强化=无操作(§441)').toBe(1)
  })
})

describe('★★★★★★★ 句①③+登记', () => {
  test('★★★★★①付{1}给我本回合+1:resolve=addEffect(thisTurn/addMight/+1);离场=[];cost {mana:1} 无横置', () => {
    const s = scene([obj('rk', P1, BF0, 9)])
    const evs = VEN_092_SPEC.makeResolve({ selfOid: SELF, controller: P1 } as never)(s, {} as never, undefined as never) as unknown as readonly { kind: string, effect?: { duration: string, modification: { kind: string, delta: number } } }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('addEffect')
    expect(evs[0]!.effect!.duration).toBe('thisTurn')
    expect(evs[0]!.effect!.modification).toEqual({ kind: 'addMight', delta: 1 })
    expect(VEN_092_SPEC.makeResolve({ selfOid: SELF, controller: P1 } as never)(scene([]), {} as never, undefined as never)).toEqual([])
    expect(VEN_092_SPEC.cost).toEqual({ mana: 1 })
    expect(VEN_092_SPEC.tapSelf, '★卡文没写横置').toBeUndefined()
  })

  test('★★★★★★④「已强化>」法盾+游走:三号都登(表直查不折叠);未强化 predicate 假', () => {
    for (const defId of ['VEN-092', 'VEN-092a', 'VEN-177']) {
      const o = { ...obj('rk', P1, BF0, 4, { defId }), counters: { [EMPOWER_COUNTER]: 1 } } as GameObject
      const fx = empoweredPassives(o).filter((f) => f.id.startsWith(`${defId}:empowered:kw`))
      expect(fx.map((f) => (f.modification as { keyword?: string }).keyword).sort(), defId).toEqual(['法盾', '游走'].sort())
      expect(fx.every((f) => f.predicate!(o, undefined as never)), `${defId} 已强化 ⇒ 命中`).toBe(true)
      const plain = { ...o, counters: {} } as GameObject
      expect(fx.some((f) => f.predicate!(plain, undefined as never)), `${defId} 未强化 ⇒ 不命中`).toBe(false)
    }
  })

  test('★★★★★登记:5费橙、unit、三号一组、keywords 三号空、activated 正典折叠一条', () => {
    expect(CARD_COSTS['VEN-092']).toEqual({ mana: 5, pips: 0, colors: ['orange'] })
    expect(cardKind('VEN-092')).toBe('unit')
    expect(VARIANT_GROUPS['VEN-092']).toEqual(['VEN-092', 'VEN-092a', 'VEN-177'])
    for (const no of ['VEN-092', 'VEN-092a', 'VEN-177']) expect(cardKeywords(no), no).toEqual([])
    expect(activatedFor('VEN-092')).toHaveLength(1)
    expect(activatedFor('VEN-177'), '★折叠:符文传说号查得到同一条').toHaveLength(1)
    expect(activatedFor('VEN-092')[0]!.key).toBe('VEN-092:pump')
  })
})
