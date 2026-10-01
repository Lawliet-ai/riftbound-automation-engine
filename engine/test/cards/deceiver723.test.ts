import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { ChainItem } from '../../src/loop/chain'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { UNL_199, makeDeceiverTrigger, makeDeceiverCopyItem } from '../../data/cards/UNL-199'

                                                              
                                          
                                               
                                               
                   
  
           
                                                             
                                                             
                                                        
                                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const lb = (status: Record<string, boolean> = {}): GameObject =>
  ({ ...obj('lb', P1, `legend:${P1}`), defId: 'UNL-199', baseTypes: ['legend'], status } as GameObject)
const card = (oid: string): GameObject =>
  ({ ...obj(oid, P1, `hand:${P1}`), baseTypes: ['spell'] } as GameObject)

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

const trigC = makeDeceiverTrigger(asObjId('lb'), P1, 'conquer')
const trigH = makeDeceiverTrigger(asObjId('lb'), P1, 'hold')
const conquer = (player: PlayerId, battlefield = BF0): GameEvent =>
  ({ kind: 'conquer', player, battlefield } as unknown as GameEvent)
const hold = (player: PlayerId, battlefield = BF0): GameEvent =>
  ({ kind: 'hold', player, battlefield } as unknown as GameEvent)

describe('★★★★★★★ ①④触发与双费用可付性', () => {
  test('★★★★★★conquer/hold 各响;对手不响;无手牌不问;已 tapped 不问', () => {
    const s = scene([lb(), card('h1'), obj('u', P1, BF0)])
    expect(checkTrigger(trigC, conquer(P1), s, P1)).toBe(true)
    expect(checkTrigger(trigH, hold(P1), s, P1)).toBe(true)
    expect(checkTrigger(trigC, conquer(P2), s, P2), '★对手征服').toBe(false)
                                                          
                                                                        
                                                                         
                                                                         
    expect(checkTrigger(trigC, conquer(P1), scene([lb(), obj('u', P1, BF0)]), P1), '★「弃置一张手牌」没手牌=付不起,连触发都不入链').toBe(false)
    expect(checkTrigger(trigC, conquer(P1), scene([lb({ tapped: true }), card('h1')]), P1), '★已休眠=付不起,连触发都不入链').toBe(false)
  })

                                                                       
                                                           
  test('★★★★★★两问链:选弃牌 ⇒ 选该处单位(敌我全在);该处没单位 ⇒ 第二问不问(映像照打)', () => {
    const s = scene([lb(), card('h1'), card('h2'), obj('mine', P1, BF0), obj('foe', P2, BF0), obj('far', P1, 'battlefield:shared:1')])
    expect(trigC.mayChoose, '★★§383.3.a「你可以选择」在效果开头 ⇒ 确认阶段问(★1445 缺陷 194)').toBe(true)
    const q2 = trigC.nextChoice!(s, conquer(P1), {})!
    expect(q2.candidates.map((c) => c.id).sort(), '★费①:选弃哪张').toEqual(['h1', 'h2'])
    const q3 = trigC.nextChoice!(s, conquer(P1), { deceiverDiscard: 'h1' })!
    expect(q3.candidates.map((c) => c.id), '★「该处另一名单位」=同战场敌我全在、别处不在').toEqual(['foe', 'mine'])
    const empty = scene([lb(), card('h1')])
    expect(trigC.nextChoice!(empty, conquer(P1), { deceiverDiscard: 'h1' }), '★该处没单位 ⇒ 不问(映像照打)').toBeNull()
  })
})

describe('★★★★★★★ ②③effect:双费先付+映像落该处+内嵌', () => {
  test('★★★★★★事件序=[弃牌, 休眠我, spawnToken 该处 ready, enqueueItem](打出信号由产地派生,★1258);落地全验', () => {
    const s = scene([lb(), card('h1'), obj('mine', P1, BF0)])
    const evs = trigC.effect(s, conquer(P1), { deceiverSwap: 'swap', deceiverDiscard: 'h1', deceiverVictim: 'mine' }) as unknown as readonly { kind: string, obj?: string, to?: string, target?: string, zone?: string, ready?: boolean, item?: ChainItem }[]
                                                                                                                                         
    expect(evs.map((e) => e.kind), '★双费用先付').toEqual(['zoneChange', 'statusChange', 'spawnToken', 'enqueueItem'])
    expect(evs[0], '★费①弃置=hand→discard(★692 账口径)').toMatchObject({ kind: 'zoneChange', obj: 'h1', to: `discard:${P1}` })
    expect(evs[1]).toMatchObject({ target: 'lb', key: 'tapped', value: true })
    expect(evs[2], '★「在**该处**打出」+「处于活跃状态的」').toMatchObject({ kind: 'spawnToken', zone: BF0, ready: true })
    expect(evs[3]!.item!.id).toBe('UNL-199-embed-copy:lb')
    const after = applyEvents(s, evs.slice(0, 3) as never, {}).state
    const mirror = Object.values(after.objects).find((o) => o.defId === 'token:映像')!
    expect(mirror, '★映像落地').toBeTruthy()
    expect(mirror.zone as string, '★落该处(镜花水月是基地——同族分辨)').toBe(BF0)
                                                  
    const discarded = (after.zones[`discard:${P1}` as never]?.contents ?? []).map((oid) => after.objects[oid as never]?.defId)
    expect(discarded, '★弃牌进废牌堆(freshOid ★713)').toContain('U-h1')
  })

  test('★★★★★★内嵌:victim 在场 ⇒ copyOf+瞬息;裁定 L219=victim 已离场 ⇒ 只瞬息(0 战力映像);victim 缺 ⇒ 只瞬息', () => {
    const s0 = scene([lb(), card('h1'), obj('mine', P1, BF0)])
    const evs = trigC.effect(s0, conquer(P1), { deceiverSwap: 'swap', deceiverDiscard: 'h1', deceiverVictim: 'mine' })
    const mid = applyEvents(s0, evs.slice(0, 4) as never, {}).state
    const item = makeDeceiverCopyItem(asObjId('lb'), P1, asObjId('mine'))
    const out = item.resolve(mid, {}, undefined as never) as unknown as readonly { kind: string, effect?: { modification: { kind: string, keyword?: string } } }[]
    expect(out.map((e) => e.effect!.modification.kind), '★victim 在场=copyOf+瞬息').toEqual(['copyOf', 'grantKeyword'])
    const gone = makeDeceiverCopyItem(asObjId('lb'), P1, asObjId('vanished'))
    const out2 = gone.resolve(mid, {}, undefined as never) as unknown as readonly { kind: string, effect?: { modification: { kind: string, keyword?: string } } }[]
    expect(out2.map((e) => e.effect!.modification.kind), '★裁定:弹回手牌 ⇒ 不变复制体、瞬息照给(0 战力映像)').toEqual(['grantKeyword'])
    expect(out2[0]!.effect!.modification.keyword).toBe('瞬息')
    const none = makeDeceiverCopyItem(asObjId('lb'), P1, undefined)
    expect((none.resolve(mid, {}, undefined as never) as readonly unknown[]).length, '★victim 没选到 ⇒ 只瞬息').toBe(1)
  })

  test('★★★★★可选与防御:skip 不发;弃牌答的不在手牌 ⇒ 整体免(§137);已 tapped 结算复验免', () => {
    const s = scene([lb(), card('h1'), obj('mine', P1, BF0)])
    expect(trigC.effect(s, conquer(P1), { deceiverSwap: 'skip' })).toEqual([])
    expect(trigC.effect(s, conquer(P1), { deceiverSwap: 'swap', deceiverDiscard: 'gone', deceiverVictim: 'mine' }), '★费①付不起=整体免').toEqual([])
    const tapped = scene([lb({ tapped: true }), card('h1'), obj('mine', P1, BF0)])
    expect(trigC.effect(tapped, conquer(P1), { deceiverSwap: 'swap', deceiverDiscard: 'h1' }), '★费②付不起=整体免').toEqual([])
  })
})

describe('★ 前提:登记(正典折叠,有组实证)', () => {
  test('★★★★★传奇 0费 蓝+黄、三号一组、keywords 三号空', () => {
    expect(CARD_COSTS['UNL-199']).toEqual({ mana: 0, pips: 0, colors: ['blue', 'yellow'] })
    expect(cardKind('UNL-199')).toBe('legend')
    expect(VARIANT_GROUPS['UNL-199'], '★有组实证(★722 教训:现场量)').toEqual(['UNL-199', 'UNL-235', 'UNL-235*'])
    for (const no of ['UNL-199', 'UNL-235', 'UNL-235*']) expect(cardKeywords(no), no).toEqual([])
    expect(UNL_199.energy).toBe(0)
  })
})
