import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { WAR_HAWK_TOKEN } from '../../data/cards/reprint-batch'
import { UNL_160_SPEC } from '../../data/cards/UNL-160'

                                                              
                                                   
  
           
                                              
                                                           
                                                                     
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'UNL-160', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

type Ev = { kind: string, spec?: { defId: string, baseMight?: number, baseKeywords?: readonly string[] }, zone?: string, owner?: string, ready?: boolean, unit?: string, player?: string }

describe('★ 前提:①登记/②战鹰共用件', () => {
  test('★★★★★5费 0pip 黄 5[S]、无关键词、ACTIVATED 一条(tapSelf+cost 空+available 在)', () => {
    expect(CARD_COSTS['UNL-160']).toEqual({ mana: 5, pips: 0, colors: ['yellow'] })
    expect(cardKind('UNL-160')).toBe('unit')
    expect(cardKeywords('UNL-160')).toEqual([])
    expect(cardCost('UNL-160')).toEqual({ mana: 5 })
    const specs = activatedFor('UNL-160')
    expect(specs).toHaveLength(1)
    expect(specs[0]!.key).toBe('UNL-160:hawks')
    expect(specs[0]!.tapSelf, '★{横置}').toBe(true)
    expect(specs[0]!.cost, '★冒号前只有横置').toEqual({})
    expect(specs[0]!.available, '★「必须位于战场」闸在').toBeDefined()
  })

  test('★★★★★②WAR_HAWK_TOKEN = 1[S] 自带[法盾](「它们拥有法盾」在共用件里)', () => {
    expect(WAR_HAWK_TOKEN.baseMight).toBe(1)
    expect(WAR_HAWK_TOKEN.baseKeywords).toContain('法盾')
  })
})

describe('★★★★★★★ ③效果 + ④available', () => {
  test('★★★★★★③两条 spawnToken(owner=我/我的基地/缺省休眠);卡自己不发打出信号 (集中闸 test/loop/tokenPlayOnce1258.test.ts)', () => {
    const s = scene([obj('pr', P1, BF0)])
    const evs = UNL_160_SPEC.makeResolve({ selfOid: asObjId('pr'), controller: P1 } as never)(s, {} as never, undefined as never) as unknown as readonly Ev[]
                                                                                                                                         
    expect(evs.map((e) => e.kind)).toEqual(['spawnToken', 'spawnToken'])
    for (const e of evs.slice(0, 2)) {
      expect(e).toMatchObject({ kind: 'spawnToken', zone: `base:${P1}`, owner: P1 })
      expect(e.spec!.defId).toBe(WAR_HAWK_TOKEN.defId)
      expect(e.spec!.baseKeywords, '★「它们拥有法盾」— 发出的 spec 就带').toContain('法盾')
      expect(e.ready, '★卡文没写活跃 ⇒ §359.2.c 缺省休眠').toBeUndefined()
    }
  })

  test('★★★★★★④战场 ⇒ 可用;基地 ⇒ 不可用;离场 ⇒ 不可用(㊼ SFD-088 同款)', () => {
    expect(UNL_160_SPEC.available!(scene([obj('pr', P1, BF0)]), P1, 'pr')).toBe(true)
    expect(UNL_160_SPEC.available!(scene([obj('pr', P1, `base:${P1}`)]), P1, 'pr'), '★「必须位于战场上」').toBe(false)
    expect(UNL_160_SPEC.available!(scene([]), P1, 'pr')).toBe(false)
  })
})
