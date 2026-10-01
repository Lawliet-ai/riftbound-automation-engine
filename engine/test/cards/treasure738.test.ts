import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { cardKind, cardCost, activeTriggers, replacementShieldsFor, extraPlaySourcesFor, skipDrawPhaseFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeTreasurePlayTrigger, treasureBanishShields, VEN_022_BURN } from '../../data/cards/VEN-022'

                                                          
                                             
                           
  
                                                        
                                                     
                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
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

const treasure = () => obj('tr', 'VEN-022', P1, `base:${P1}`, ['equipment'])

describe('★ 前提:登记面+触发注册', () => {
  test('★★★★★5费 1pip 红、equipment、无组、UNIT_COST 带 pips、TRIGGERS 登了', () => {
    expect(CARD_COSTS['VEN-022']).toEqual({ mana: 5, pips: 1, colors: ['red'] })
    expect(cardKind('VEN-022')).toBe('equipment')
    expect(VARIANT_GROUPS['VEN-022'], '★单印次无组实证(738 现场量)').toBeUndefined()
    expect(cardCost('VEN-022')).toEqual({ mana: 5, pips: [['red']] })
    const trigs = activeTriggers(scene([treasure()]))
    expect(trigs.some((t) => t.id.startsWith('VEN-022:play')), '★TRIGGER_FACTORIES 登了').toBe(true)
  })
})

describe('★★★★★★★ ①打出触发:放逐手+废,然后燃烧7', () => {
  test('★★★★★★手2张+废1张 ⇒ 3 条 banish + 尾发 burn 7;手废全空 ⇒ 只 burn', () => {
    const s = scene([treasure(),
      obj('h1', 'C-h1', P1, `hand:${P1}`), obj('h2', 'C-h2', P1, `hand:${P1}`),
      obj('d1', 'C-d1', P1, `discard:${P1}`),
      obj('foeH', 'C-f', P2, `hand:${P2}`)])           
    const trig = makeTreasurePlayTrigger(asObjId('tr'), P1)
    const evs = trig.effect(s, { kind: 'playUnit', unit: asObjId('tr') } as unknown as GameEvent, {}) as unknown as readonly { kind: string, target?: string, player?: string, count?: number }[]
    expect(evs.map((e) => e.kind)).toEqual(['banish', 'banish', 'banish', 'burn'])
    expect(evs.slice(0, 3).map((e) => e.target).sort(), '★只放逐**我的**手+废').toEqual(['d1', 'h1', 'h2'])
    expect(evs[3], '★「然后」燃烧7 殿后').toMatchObject({ kind: 'burn', player: P1, count: VEN_022_BURN })
    const empty = trig.effect(scene([treasure()]), { kind: 'playUnit', unit: asObjId('tr') } as unknown as GameEvent, {}) as unknown as readonly { kind: string }[]
    expect(empty.map((e) => e.kind)).toEqual(['burn'])
  })
})

describe('★★★★★★★ ②③州级:跳抽牌+废牌堆来源(只对控制者)', () => {
  test('★★★★★★在场 ⇒ P1 跳抽、P2 照抽;离场(废牌堆里的秘藏)⇒ 不跳', () => {
    const s = scene([treasure()])
    expect(skipDrawPhaseFor(s, P1), '★「跳过**你的**」= 控制者').toBe(true)
    expect(skipDrawPhaseFor(s, P2), '★对手照抽(刀:敌我丢)').toBe(false)
    expect(skipDrawPhaseFor(scene([obj('tr', 'VEN-022', P1, `discard:${P1}`, ['equipment'])]), P1), '★在废牌堆=不在场').toBe(false)
  })

  test('★★★★★③来源加宽:P1 废牌堆两张全开;P2 不开;无秘藏不开', () => {
    const s = scene([treasure(), obj('d1', 'C-d1', P1, `discard:${P1}`), obj('d2', 'C-d2', P1, `discard:${P1}`), obj('fd', 'C-fd', P2, `discard:${P2}`)])
    expect([...extraPlaySourcesFor(s, P1)].sort(), '★我的废牌堆全部').toEqual(['d1', 'd2'])
    expect(extraPlaySourcesFor(s, P2), '★对手没秘藏').toEqual([])
    expect(extraPlaySourcesFor(scene([obj('d1', 'C-d1', P1, `discard:${P1}`)]), P1)).toEqual([])
  })
})

describe('★★★★★★★ ④进废改放逐(盾第八族)', () => {
  test('★★★★★★E2E:手牌弃到我的废牌堆 ⇒ 被改为放逐(废牌堆空、牌进放逐区);主牌堆例外照常进废;对手废牌堆不管', () => {
    const s = scene([treasure(), obj('h1', 'C-h1', P1, `hand:${P1}`),
      obj('dk', 'C-dk', P1, `mainDeck:${P1}`), obj('fh', 'C-fh', P2, `hand:${P2}`)])
    const shields = treasureBanishShields(s)
    expect(shields).toHaveLength(1)
    expect(replacementShieldsFor(s).some((sh) => sh.id === shields[0]!.id), '★汇总口第八族接上了').toBe(true)
    const deps = { replacementShields: replacementShieldsFor } as never
                      
    const a = applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('h1'), to: asZoneId(`discard:${P1}`) } as unknown as GameEvent], deps).state
    expect(a.zones[`discard:${P1}` as never]?.contents ?? [], '★废牌堆没进(刀:盾没拦)').toEqual([])
                                                 
    const banished = Object.values(a.objects).find((o) => o.defId === 'C-h1')
    expect(banished, '★改为放逐(牌还在,换了 oid)').toBeDefined()
    expect(a.zones[banished!.zone as never]?.kind, '★躺在放逐区(kind=exile)').toBe('exile')
                            
    const b = applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('dk'), to: asZoneId(`discard:${P1}`) } as unknown as GameEvent], deps).state
    const inDiscard = (b.zones[`discard:${P1}` as never]?.contents ?? []).map((x) => b.objects[x as never]?.defId)
    expect(inDiscard, '★「除你的主牌堆以外」例外档(㊼ 跨界换 oid 按 defId 验)').toContain('C-dk')
                           
    const c = applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('fh'), to: asZoneId(`discard:${P2}`) } as unknown as GameEvent], deps).state
    const foeDiscard = (c.zones[`discard:${P2}` as never]?.contents ?? []).map((x) => c.objects[x as never]?.defId)
    expect(foeDiscard, '★「**你的**废牌堆」敌我判(按 defId 验)').toContain('C-fh')
  })
})
