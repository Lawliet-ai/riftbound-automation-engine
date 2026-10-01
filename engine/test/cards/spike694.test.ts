import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { applyEvents } from '../../src/loop/reduce'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  UNL_139_SPEC, UNL_139_BF_KEY, UNL_139_PICK_KEY, UNL_139_SKIP, spikeTag, makeSpikeStunItem,
} from '../../data/cards/UNL-139'

                                                               
                                             
                                            
  
           
                                                   
                                                         
                                                               
                                                              
                                                      
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const handUnit = (oid: string, defId: string, who: PlayerId): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(`hand:${who}`),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(hand: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of hand) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!

                                                      
                                
                                                                                 
                                                                         
const askConfirm = (s: GameState, chosen: Record<string, string>) =>
  UNL_139_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen)
const ask = (s: GameState, chosen: Record<string, string>) =>
  UNL_139_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen)
const resolveWith = (s: GameState, chosen: Record<string, string>) =>
  UNL_139_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1 } as never)(s, chosen) as unknown as readonly { kind: string, obj?: string, player?: string, to?: string, tag?: string, ready?: boolean, item?: ChainItem }[]

describe('★ 前提:①登记与两问', () => {
  test('★★★★★法术 2费 1紫pip、[待命] 登了、PLAY_SPECS 接了、target none', () => {
    expect(CARD_COSTS['UNL-139']).toEqual({ mana: 2, pips: 1, colors: ['purple'] })
    expect(cardKind('UNL-139')).toBe('spell')
    expect(cardKeywords('UNL-139'), '★§811 待命引擎统一管,登了才真生效').toEqual(['待命'])
    expect(playSpecFor('UNL-139')).toBe(UNL_139_SPEC)
    expect(UNL_139_SPEC.cost).toEqual({ mana: 2, pips: [['purple']] })
    expect(UNL_139_SPEC.target).toBe('none')
  })

  test('★★★★★★②问1=「一处战场」零限定词:**所有**战场都在候选(不筛控制权)', () => {
    const s = scene([handUnit('u1', 'OGN-078', P2)])
                                                            
    const q = askConfirm(s, {})!
    expect(q.key).toBe(UNL_139_BF_KEY)
    expect(q.candidates.map((c) => c.id).sort(), '★两处战场全在(⚠️ 不是 tokenDropZones 的受控口径)')
      .toEqual(zonesByKind(s, 'battlefield').map((z) => z.id as string).sort())
  })

  test('★★★★★★③问2=对手手牌**单位**+停止档;法术不在;我的手牌不在;空手 ⇒ 不问', () => {
    const s = scene([handUnit('u1', 'OGN-078', P2), handUnit('sp2', 'OGN-156', P2), handUnit('mine', 'OGN-078', P1)])
    const q = ask(s, { [UNL_139_BF_KEY]: bf(s, 0) })!
    expect(q.key).toBe(UNL_139_PICK_KEY)
    expect(q.candidates.map((c) => c.id), '★只有对手手牌那名单位+skip(OGN-156 是法术被筛掉;我的不算)')
      .toEqual(['u1', UNL_139_SKIP])
    const empty = scene([handUnit('mine', 'OGN-078', P1)])
    expect(ask(empty, { [UNL_139_BF_KEY]: bf(empty, 0) }), '★对手手里没单位 ⇒ 不问').toBeNull()
  })
})

describe('★★★★★★★ ④resolve:playFree{对手,战场,tag}+内嵌眩晕', () => {
  test('★★★★★★两事件;playFree 主体=**对手**、落点=所选战场、tag 带上;内嵌项目 id 对', () => {
    const s = scene([handUnit('u1', 'OGN-078', P2)])
    const evs = resolveWith(s, { [UNL_139_BF_KEY]: bf(s, 0), [UNL_139_PICK_KEY]: 'u1' })
    expect(evs.map((e) => e.kind)).toEqual(['playFree', 'enqueueItem'])
    expect(evs[0], '★player=对手不是我;没写活跃 ⇒ 不传 ready(§359.2.c 休眠)').toMatchObject({
      kind: 'playFree', obj: 'u1', player: P2, to: bf(s, 0), tag: spikeTag('sp'),
    })
    expect(evs[0]!.ready, '★缺省休眠').toBeUndefined()
    expect(evs[1]!.item!.id).toBe('UNL-139-embed-stun:sp')
  })

  test('★★★★★skip/没选/牌已离手/战场没了 ⇒ 全落空(眩晕也不发)', () => {
    const s = scene([handUnit('u1', 'OGN-078', P2)])
    expect(resolveWith(s, { [UNL_139_BF_KEY]: bf(s, 0), [UNL_139_PICK_KEY]: UNL_139_SKIP }), '★「可以」不选').toEqual([])
    expect(resolveWith(s, { [UNL_139_BF_KEY]: bf(s, 0) }), '★没答到').toEqual([])
    const gone = scene([])
    expect(resolveWith(gone, { [UNL_139_BF_KEY]: bf(gone, 0), [UNL_139_PICK_KEY]: 'u1' }), '★§355.8 结算时牌已不在对手手牌').toEqual([])
    expect(resolveWith(s, { [UNL_139_BF_KEY]: 'base:P1', [UNL_139_PICK_KEY]: 'u1' }), '★落点必须是战场').toEqual([])
  })
})

describe('★★★★★★★ ⑤E2E:落地+内嵌眩晕跨 §124 点名', () => {
  test('★★★★★★★playFree 落地:对手控制、**休眠**进场、tag 进 counters;内嵌找到它 ⇒ stun ⇒ 真眩晕', () => {
    const s = scene([handUnit('u1', 'OGN-078', P2)])
    const evs = resolveWith(s, { [UNL_139_BF_KEY]: bf(s, 0), [UNL_139_PICK_KEY]: 'u1' })
    const after = applyEvents(s, [evs[0]] as never, {}).state
                            
    const landed = (after.zones[bf(s, 0) as never]?.contents ?? []).map((id) => after.objects[id]!).find((o) => o.defId === 'OGN-078')!
    expect(landed, '★tag 进 counters(★694 PlayFreeEvent.tag 通道)').toBeDefined()
    expect(landed.counters[spikeTag('sp')]).toBe(1)
    expect(landed.controller, '★控制者=对手').toBe(P2)
    expect(landed.status.dormant, '★没写活跃 ⇒ §359.2.c 休眠').toBe(true)
                                   
    const stunEvs = makeSpikeStunItem('sp', P1).resolve(after, {} as never, undefined as never) as unknown as readonly { kind: string, target?: string }[]
    expect(stunEvs).toEqual([{ kind: 'stun', target: landed.oid }])
    const stunned = applyEvents(after, stunEvs as never, {}).state
    expect(stunned.objects[landed.oid]!.status.stunned, '★§423 真眩晕落上').toBe(true)
  })

  test('★★★★★它在反应窗口被弄走 ⇒ 内嵌项目空(眩晕落空)', () => {
    const s = scene([])
    expect(makeSpikeStunItem('sp', P1).resolve(s, {} as never, undefined as never)).toEqual([])
  })
})
