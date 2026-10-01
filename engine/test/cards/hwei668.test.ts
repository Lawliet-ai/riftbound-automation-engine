import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { activeTriggers, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { makeHweiMoveTrigger, makeHweiPaintItem, UNL_080_DISCARD, UNL_080_RUNES, UNL_080_STOP, UNL_080_PUMP } from '../../data/cards/UNL-080'

                                                                    
                                               
                                                         
  
           
                                      
                                                                          
                                           
                                               
                                                               
                                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit'], status: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status,
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

                                                                               
const inHand = (oid: string, defId: string): GameObject => obj(oid, defId, P1, `hand:${P1}`)
const rune = (oid: string, tapped: boolean): GameObject =>
  ({ ...obj(oid, 'rune:blue', P1, `base:${P1}`, ['rune']), status: tapped ? { tapped: true } : {} } as GameObject)
const HWEI = obj('hw', 'UNL-080', P1, BF0)

type Ev = { kind: string, player?: string, count?: number, item?: { id: string }, obj?: string, to?: string, target?: string, key?: string, value?: boolean, effect?: { modification: { delta?: number } } }
const trig = makeHweiMoveTrigger(asObjId('hw'), P1)
const ITEM = makeHweiPaintItem(asObjId('hw'), P1)
const moved = (unit: string): GameEvent => ({ kind: 'unitMoved', unit: asObjId(unit), player: P1 } as unknown as GameEvent)

describe('★ 前提:①登记/②触发', () => {
  test('★★★★★英雄单位 5费 1蓝pip、无印刷关键词、TRIGGERS 接线一条', () => {
    expect(CARD_COSTS['UNL-080']).toEqual({ mana: 5, pips: 1, colors: ['blue'] })
    expect(cardKind('UNL-080')).toBe('unit')
    expect(cardKeywords('UNL-080')).toEqual([])
    expect(cardCost('UNL-080')).toEqual({ mana: 5, pips: [['blue']] })
    const ids = activeTriggers(scene([HWEI])).map((t) => t.id)
    expect(ids.some((i) => i.startsWith('UNL-080:moved')), '★TRIGGERS 表接线').toBe(true)
  })

  test('★★★★★★②我移动响、队友移动不响;resolve=[draw, enqueueItem](先抽后弃内嵌姿势)', () => {
    const s = scene([HWEI, obj('ally', 'U-ally', P1, BF0)])
    expect(checkTrigger(trig, moved('hw'), s, P1)).toBe(true)
    expect(checkTrigger(trig, moved('ally'), s, P1), '★队友移动 ⇒ 不响').toBe(false)
    const evs = trig.effect(s, moved('hw'), {}) as unknown as readonly Ev[]
    expect(evs.map((e) => e.kind), '★draw 先落地,弃牌走内嵌').toEqual(['draw', 'enqueueItem'])
    expect(evs[0]).toMatchObject({ kind: 'draw', player: P1, count: 1 })
    expect(evs[1]!.item!.id).toBe('UNL-080-embed-paint:hw')
  })
})

describe('★★★★★★★ ③内嵌问链', () => {
  test('★★★★★★弃牌必选无 skip;手牌空不问;弃装备 ⇒ 续问符文带停止档;弃法术/单位 ⇒ 不续问', () => {
    const s = scene([HWEI, inHand('h1', 'OGN-266'), inHand('h2', 'SFD-009'), rune('r1', true), rune('r2', true)])
    const q = ITEM.nextChoice!(s, {})!
    expect(q.key).toBe(UNL_080_DISCARD)
    expect(q.candidates.map((c) => c.id), '★必选:没有 skip 档').toEqual(['h1', 'h2'])
    expect(ITEM.nextChoice!(scene([HWEI]), {}), '★手牌空 ⇒ 没得弃').toBeNull()
    const q2 = ITEM.nextChoice!(s, { [UNL_080_DISCARD]: 'h2' })!
    expect(q2.key, '★弃的是装备 ⇒ 续问符文').toBe(UNL_080_RUNES[0])
    expect(q2.candidates.map((c) => c.id), '★候选=tapped 符文+停止档(「最多」)').toEqual(['r1', 'r2', UNL_080_STOP])
    expect(ITEM.nextChoice!(s, { [UNL_080_DISCARD]: 'h1' }), '★弃的是法术 ⇒ 不续问').toBeNull()
    expect(ITEM.nextChoice!(s, { [UNL_080_DISCARD]: 'h2', [UNL_080_RUNES[0]]: UNL_080_STOP }), '★停了不再问').toBeNull()
  })
})

describe('★★★★★★★ ④三分型结算', () => {
  test('★★★★★★法术档:弃 OGN-266 ⇒ [弃置, draw 1]', () => {
    const s = scene([HWEI, inHand('h1', 'OGN-266')])
    const evs = ITEM.resolve(s, { [UNL_080_DISCARD]: 'h1' }) as unknown as readonly Ev[]
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'draw'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'h1', to: `discard:${P1}` })
    expect(evs[1]).toMatchObject({ kind: 'draw', player: P1, count: 1 })
  })

  test('★★★★★★装备档:弃 SFD-009+选两符文 ⇒ [弃置, tapped:false ×2];选1停1 ⇒ ×1;活跃符文不在候选', () => {
    const s = scene([HWEI, inHand('h2', 'SFD-009'), rune('r1', true), rune('r2', true), rune('r3', false)])
    expect(ITEM.nextChoice!(s, { [UNL_080_DISCARD]: 'h2' })!.candidates.map((c) => c.id), '★r3 已活跃不在').toEqual(['r1', 'r2', UNL_080_STOP])
    const evs = ITEM.resolve(s, { [UNL_080_DISCARD]: 'h2', [UNL_080_RUNES[0]]: 'r1', [UNL_080_RUNES[1]]: 'r2' }) as unknown as readonly Ev[]
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'statusChange', 'statusChange'])
    expect(evs[1]).toMatchObject({ kind: 'statusChange', target: 'r1', key: 'tapped', value: false })
    const one = ITEM.resolve(s, { [UNL_080_DISCARD]: 'h2', [UNL_080_RUNES[0]]: 'r1', [UNL_080_RUNES[1]]: UNL_080_STOP }) as unknown as readonly Ev[]
    expect(one.map((e) => e.kind), '★「最多」选一枚也合法').toEqual(['zoneChange', 'statusChange'])
  })

  test('★★★★★★单位档:弃 OGN-013 ⇒ [弃置, 我 pump +3];我已离场 ⇒ 只弃置;没答/不在手牌 ⇒ 空', () => {
    const s = scene([HWEI, inHand('h3', 'OGN-013')])
    const evs = ITEM.resolve(s, { [UNL_080_DISCARD]: 'h3' }) as unknown as readonly Ev[]
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'addEffect'])
    expect(evs[1]!.effect!.modification.delta).toBe(UNL_080_PUMP)
    const gone = scene([inHand('h3', 'OGN-013')])        
    expect(ITEM.resolve(gone, { [UNL_080_DISCARD]: 'h3' }).map((e) => (e as Ev).kind), '★我离场 ⇒ 那半落空弃牌照弃').toEqual(['zoneChange'])
    expect(ITEM.resolve(s, {})).toEqual([])
    expect(ITEM.resolve(s, { [UNL_080_DISCARD]: 'nothand' }), '★㉖ 复验:不在手牌').toEqual([])
  })
})
