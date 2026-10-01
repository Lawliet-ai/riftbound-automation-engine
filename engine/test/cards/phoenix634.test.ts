import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKeywords, cardKind, TRIGGER_ZONE_DEFIDS } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { landEvent } from '../../src/loop/events'
import { takeDestroyed } from '../../src/loop/cleanup'
import { OGN_037_COST, anySpellIn, makePhoenixTrigger } from '../../data/cards/OGN-037'

                                                          
                                                     
  
           
                                                             
                                                                  
                                                              
                                                       
                                  
                                                          
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
})

function scene(objs: readonly GameObject[], runes = 3): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
                                                             
  const all = [...objs, ...Array.from({ length: runes }, (_, i) => ({
    oid: asObjId(`rune${i}`), defId: 'rune:red', owner: P1, controller: P1,
    zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'],
    damage: 0, counters: {}, status: {},
  } as unknown as GameObject))]
  for (const o of all) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

                                                                   
const spellObj = (oid: string): GameObject =>
  obj(oid, 'OGN-085', `chain:shared`, { baseTypes: ['spell'] })

describe('★ 前提与判据单元', () => {
  test('★★★★★上游:单位 3费1红pip、[强攻2] 进印刷表、触发区清单含 OGN-037', () => {
    expect(cardKind('OGN-037')).toBe('unit')
    expect(CARD_COSTS['OGN-037']).toEqual({ mana: 3, pips: 1, colors: ['red'] })
    expect(cardKeywords('OGN-037')).toEqual(['强攻2'])
    expect(TRIGGER_ZONE_DEFIDS).toContain('OGN-037')
    expect(OGN_037_COST).toEqual({ mana: 1, pips: [['red']] })
                                                             
    expect(makePhoenixTrigger(asObjId('phx'), P1).mayChoose).toBe(true)
  })

  test('★★★★★①「使用法术」那格:byCards 有法术才 true;单位号/空/缺省都 false', () => {
    expect(anySpellIn(['OGN-085'])).toBe(true)                
    expect(anySpellIn(['OGN-037'])).toBe(false)           
    expect(anySpellIn([])).toBe(false)
    expect(anySpellIn(undefined)).toBe(false)
  })

  test('★★★★★★①判据三件套逐格:缺任何一格都不响(直调 when)', () => {
    const trig = makePhoenixTrigger(asObjId('phx'), P1)
    const okEv = {
      kind: 'destroyed', victim: { oid: asObjId('v'), types: ['unit'] },
      responsible: [P1], byCards: ['OGN-085'],
    } as unknown as GameEvent
    const fire = (ev: GameEvent): boolean => trig.filter?.(ev, scene([])) ?? true
    expect(fire(okEv), '★三格齐 ⇒ 响').toBe(true)
    expect(fire({ ...okEv, byCards: ['OGN-037'] } as GameEvent), '★摧毁者不是法术 ⇒ 不响').toBe(false)
    expect(fire({ ...okEv, byCards: undefined } as unknown as GameEvent), '★无归因卡 ⇒ 不响').toBe(false)
    expect(fire({ ...okEv, responsible: [P2] } as GameEvent), '★对手的法术摧毁 ⇒ 不响').toBe(false)
    expect(fire({ ...okEv, victim: { oid: asObjId('v'), types: ['equipment'] } } as unknown as GameEvent),
      '★死的是装备 ⇒ 不响(「一名单位」)').toBe(false)
  })
})

describe('★★★ ②★634 引擎补齐:destroy 指示死的 destroyed 信号带 byCards', () => {
  test('★★★★★★带 source 的 destroy 落地 ⇒ 记录带 byCards=[那张卡];不带 source ⇒ 不带', () => {
    const s = scene([obj('victim', 'U-V', BF0), spellObj('sp')])
    landEvent(s, { kind: 'destroy', target: asObjId('victim'), source: asObjId('sp'), sourcePlayer: P1 } as GameEvent)
    const recs = takeDestroyed()
    expect(recs).toHaveLength(1)
    expect((recs[0] as { byCards?: readonly string[] }).byCards, '★处决路也能回指到具体卡').toEqual(['OGN-085'])
                                          
    const s2 = scene([obj('victim2', 'U-V', BF0)])
    landEvent(s2, { kind: 'destroy', target: asObjId('victim2'), sourcePlayer: P1 } as GameEvent)
    const recs2 = takeDestroyed()
    expect((recs2[0] as { byCards?: readonly string[] }).byCards).toBeUndefined()
  })
})

describe('★★★ 真流程:废牌堆里的凤凰', () => {
  const phoenixInDiscard = (): GameObject => obj('phx', 'OGN-037', `discard:${P1}`)

  const chainAfter = (st: GameState, ev: GameEvent): number =>
    landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {}).chain.length

  test('★★★★★★我的法术处决场上单位 ⇒ 触发入链(④对照:凤凰在场上 ⇒ 不响)', () => {
    const st = scene([phoenixInDiscard(), obj('victim', 'U-V', BF0), spellObj('sp')])
    expect(chainAfter(st, { kind: 'destroy', target: asObjId('victim'), source: asObjId('sp'), sourcePlayer: P1 } as GameEvent))
      .toBe(1)
                                 
    const onField = scene([obj('phx', 'OGN-037', BF0), obj('victim', 'U-V', BF0), spellObj('sp')])
    expect(chainAfter(onField, { kind: 'destroy', target: asObjId('victim'), source: asObjId('sp'), sourcePlayer: P1 } as GameEvent))
      .toBe(0)
  })

  test('★★★★★★③QA L219:我的法术摧毁的是【凤凰自己】⇒ 死后在废牌堆里照样响', () => {
    const st = scene([obj('phx', 'OGN-037', BF0), spellObj('sp')])
    expect(chainAfter(st, { kind: 'destroy', target: asObjId('phx'), source: asObjId('sp'), sourcePlayer: P1 } as GameEvent))
      .toBe(1)
  })

  test('★★★★对手的法术摧毁 / 无 source 的摧毁 ⇒ 都不响', () => {
    const st = scene([phoenixInDiscard(), obj('victim', 'U-V', BF0), spellObj('sp')])
    const foeSpell = { ...st.objects['sp' as never] as GameObject, controller: P2, owner: P2 }
    const st2 = { ...st, objects: { ...st.objects, sp: foeSpell } } as GameState
    expect(chainAfter(st2, { kind: 'destroy', target: asObjId('victim'), source: asObjId('sp'), sourcePlayer: P2 } as GameEvent))
      .toBe(0)
    expect(chainAfter(st, { kind: 'destroy', target: asObjId('victim'), sourcePlayer: P1 } as GameEvent))
      .toBe(0)
  })
})

describe('★★★ 效果:付费 + playFree', () => {
  const ev = {
    kind: 'destroyed', victim: { oid: asObjId('v'), types: ['unit'] },
    responsible: [P1], byCards: ['OGN-085'],
  } as unknown as GameEvent

  test('★★★★★★⑤⑥付得起 ⇒ spend{1+红pip} + playFree(**不传 ready**,休眠进场);付不起 ⇒ 空', () => {
    const trig = makePhoenixTrigger(asObjId('phx'), P1)
    const rich = scene([obj('phx', 'OGN-037', `discard:${P1}`)])
    const evs = trig.effect(rich, ev, {}) as readonly { kind: string, obj?: string, player?: string, cost?: unknown, ready?: boolean }[]
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'spend', player: P1, cost: { mana: 1, pips: [['red']] } })
    expect(evs[1]).toMatchObject({ kind: 'playFree', obj: 'phx', player: P1 })
    expect(evs[1]!.ready, '★卡文没写「活跃」⇒ 字段压根不给').toBeUndefined()
                                               
    const broke = scene([obj('phx', 'OGN-037', `discard:${P1}`)], 0)
    expect(trig.effect(broke, ev, {})).toEqual([])
  })
})
