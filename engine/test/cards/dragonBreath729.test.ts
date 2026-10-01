import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { runCleanupToFixpoint } from '../../src/loop/cleanup'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardKeywords, cardKind, extraLethal } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { specLookup } from '../../data/decks'
import { UNL_118, makeDragonBreathTrigger } from '../../data/cards/UNL-118'

                                                   
                                       
                                           
                                             
                                                       
                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = asObjId('dr')

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const dragon = (): GameObject => ({ ...obj('dr', P1, BF0), defId: 'UNL-118', baseMight: 10 } as GameObject)

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

const trig = makeDragonBreathTrigger(SELF, P1)
const pu = (unit: string, player: PlayerId = P1): GameEvent =>
  ({ kind: 'playUnit', unit: asObjId(unit), player } as unknown as GameEvent)

describe('★★★★★★★ ①②③句②逐位置问链', () => {
  test('★★★★★★两位置各有敌方 ⇒ 逐位置问(候选=该处敌方+skip);基地敌方也在位置清单;我方不入候选', () => {
    const s = scene([dragon(), obj('a', P2, BF0), obj('b', P2, BF1), obj('c', P2, `base:${P2}`), obj('mine', P1, BF0)])
                                           
    const q1 = trig.nextChoice!(s, pu('dr'), {})!
    expect(q1.key, '★裁定③:基地也是位置(字典序在前)').toBe(`dragonAt:base:${P2}`)
    expect(q1.candidates.map((c) => c.id)).toEqual(['c', 'skip'])
    const q2 = trig.nextChoice!(s, pu('dr'), { [`dragonAt:base:${P2}`]: 'c' })!
    expect(q2.key).toBe(`dragonAt:${BF0}`)
    expect(q2.candidates.map((c) => c.id), '★该处敌方+skip,我方不入').toEqual(['a', 'skip'])
    const q3 = trig.nextChoice!(s, pu('dr'), { [`dragonAt:base:${P2}`]: 'c', [`dragonAt:${BF0}`]: 'a' })!
    expect(q3.key).toBe(`dragonAt:${BF1}`)
    expect(trig.nextChoice!(s, pu('dr'), { [`dragonAt:base:${P2}`]: 'c', [`dragonAt:${BF0}`]: 'a', [`dragonAt:${BF1}`]: 'skip' }), '★问完').toBeNull()
  })

  test('★★★★★★effect:选中的各 1 点带两归因;skip 不打;裁定③移走复验不打;对手打出不响', () => {
    const s = scene([dragon(), obj('a', P2, BF0), obj('b', P2, BF1)])
    const evs = trig.effect(s, pu('dr'), { [`dragonAt:${BF0}`]: 'a', [`dragonAt:${BF1}`]: 'b' }) as unknown as readonly { kind: string, target?: string, amount?: number, source?: string, sourcePlayer?: string }[]
    expect(evs).toHaveLength(2)
    expect(evs[0]).toMatchObject({ kind: 'damage', target: 'a', amount: 1, source: 'dr', sourcePlayer: P1 })
    const skipped = trig.effect(s, pu('dr'), { [`dragonAt:${BF0}`]: 'skip', [`dragonAt:${BF1}`]: 'b' })
    expect(skipped, '★skip 那格不打').toHaveLength(1)
    const moved = scene([dragon(), obj('a', P2, `base:${P2}`), obj('b', P2, BF1)])            
    const evs2 = trig.effect(moved, pu('dr'), { [`dragonAt:${BF0}`]: 'a', [`dragonAt:${BF1}`]: 'b' }) as unknown as readonly { target?: string }[]
    expect(evs2.map((e) => e.target), '★裁定③:a 不在原位置 ⇒ 只打 b').toEqual(['b'])
    expect(checkTrigger(trig, pu('dr', P2), s, P2), '★对手打出').toBe(false)
  })
})

describe('★★★★★★★ ④两句联动 E2E', () => {
  test('★★★★★★句②的 1 点 ⇒ damagedBy 喂上 ⇒ 州级 extraLethal 清理即死(5 战力 1 点伤)', () => {
    const s = scene([dragon(), obj('a', P2, BF0)])
    const evs = trig.effect(s, pu('dr'), { [`dragonAt:${BF0}`]: 'a' })
    const hit = applyEvents(s, evs as never, {}).state
    expect(hit.objects['a' as never]!.damagedBy, '★两归因 ⇒ damagedBy 喂上').toEqual([P1])
    const cleaned = runCleanupToFixpoint(hit, { extraLethal })
    expect(cleaned.objects['a' as never], '★1 点伤在巨龙州级下=致命(§124 换 oid)').toBeUndefined()
  })
})

describe('★ 前提:登记(无组双登+半步收尾)', () => {
  test('★★★★★12费 4pip 橙 10[S]、无组实证、keywords 双号空、CARDS 有肉;哨兵与名单已摘', () => {
    expect(CARD_COSTS['UNL-118']).toEqual({ mana: 12, pips: 4, colors: ['orange'] })
    expect(cardKind('UNL-118')).toBe('unit')
                                                                    
                                                  
                                                  
    expect(VARIANT_GROUPS['UNL-118'], '★833 region 退出签名后并组').toEqual(['UNL-118', 'UNL-118a'])
    for (const no of ['UNL-118', 'UNL-118a']) expect(cardKeywords(no), no).toEqual([])
    expect(specLookup('UNL-118').baseMight, '★decks CARDS 有肉').toBe(10)
    expect(UNL_118.power).toBe(10)
  })
})
