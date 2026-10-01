import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'                  
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { activeTriggers, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { SPRITE_TOKEN } from '../../data/cards/batch-play-triggers'
import { makeLilliaMoveTrigger } from '../../data/cards/UNL-082'

                                                                 
               
                                                        
  
           
                                                                  
                                                   
                                         
                                                                     
                                                             
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'UNL-082', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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
const trig = makeLilliaMoveTrigger(asObjId('li'), P1)
const moved = (unit: string, from: string, by: PlayerId = P1): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player: by, from: asZoneId(from), to: asZoneId(BF1) } as unknown as GameEvent)

describe('★ 前提:①登记', () => {
  test('★★★★★3费 0pip 蓝 3[S]、[急速] 两号都登、UNIT_COST、TRIGGERS 接线、variant 两号一组', () => {
    expect(CARD_COSTS['UNL-082']).toEqual({ mana: 3, pips: 0, colors: ['blue'] })
    expect(cardKind('UNL-082')).toBe('unit')
    expect(VARIANT_GROUPS['UNL-082']).toEqual(['UNL-082', 'UNL-082a'])
    expect(cardKeywords('UNL-082'), '★§805 登了才真生效').toEqual(['急速'])
    expect(cardKeywords('UNL-082a'), '★异画号同登(㊼ VEN-019)').toEqual(['急速'])
    expect(cardCost('UNL-082')).toEqual({ mana: 3 })
    const ids = activeTriggers(scene([obj('li', P1, BF0)])).map((t) => t.id)
    expect(ids.some((i) => i.startsWith('UNL-082:moved')), '★TRIGGERS 表接线').toBe(true)
  })

  test('★★★★★②共用件 SPRITE_TOKEN:3[S] 自带[瞬息](「它拥有瞬息」在共用件里)', () => {
    expect(SPRITE_TOKEN.baseMight).toBe(3)
    expect(SPRITE_TOKEN.baseKeywords).toContain('瞬息')
  })
})

describe('★★★★★★★ ②触发+③效果', () => {
  test('★★★★★★②我移动响(对手把我移走 by P2 也响);别的单位移动不响', () => {
    const s = scene([obj('li', P1, BF1), obj('ally', P1, BF1)])
    expect(checkTrigger(trig, moved('li', BF0), s, P1)).toBe(true)
    expect(checkTrigger(trig, moved('li', BF0, P2), s, P2), '★卡文没写「你」⇒ 谁移的都算').toBe(true)
    expect(checkTrigger(trig, moved('ally', BF0), s, P1), '★队友移动 ⇒ 不响').toBe(false)
  })

  test('★★★★★★③spawnToken 落 **ev.from(起点)** 非终点;缺省休眠(打出信号由产地派生,★1258)', () => {
    const s = scene([obj('li', P1, BF1)])                                
    const evs = trig.effect(s, moved('li', BF0), {}) as unknown as readonly Ev[]
                                                                                                                                         
    expect(evs.map((e) => e.kind)).toEqual(['spawnToken'])
    expect(evs[0]).toMatchObject({ kind: 'spawnToken', zone: BF0, owner: P1 })
    expect(evs[0]!.zone, '★★643 起点=ev.from(BF0),不是我现在的 BF1').toBe(BF0)
    expect(evs[0]!.spec!.defId).toBe(SPRITE_TOKEN.defId)
    expect(evs[0]!.spec!.baseKeywords, '★共用件自带瞬息(★661 内联冒充教训)').toContain('瞬息')
    expect(evs[0]!.ready, '★§359.2.c 缺省休眠').toBeUndefined()
                                                                    
    const r = applyEvents(s, evs as never, { getTriggers: () => [] } as never)
    const derived = (((r as unknown as { events?: readonly { kind: string; at?: string }[] }).events) ?? []).filter((e) => e.kind === 'playUnit')
    expect(derived, '★产地派生恰一条(★1258 缺陷 160 前是两条)').toHaveLength(1)
    expect(derived[0]!.at, '★★★派生那条的落点 = 起点 BF0(不是我现在站的 BF1)').toBe(BF0)
  })

  test('★★★★★③基地起点也照打;from 缺失 ⇒ 空(防御)', () => {
    const s = scene([obj('li', P1, BF0)])
    const evs = trig.effect(s, moved('li', `base:${P1}`), {}) as unknown as readonly Ev[]
    expect(evs[0]!.zone, '★从基地出发 ⇒ 精灵落基地').toBe(`base:${P1}`)
    const noFrom = { kind: 'unitMoved', unit: asObjId('li'), player: P1, to: asZoneId(BF1) } as unknown as GameEvent
    expect(trig.effect(s, noFrom, {})).toEqual([])
  })
})
