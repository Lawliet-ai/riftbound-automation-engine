import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { playBannedFor } from '../../data/cards/longtail-12'
import { makeKarloxPlunderItem, karloxCandidates, VEN_114_SKIP } from '../../data/cards/VEN-114'
import { UNL_168_SPEC, loyaltyTargets } from '../../data/cards/UNL-168'
import { revivalCandidates } from '../../data/cards/sacrifice-spells-500'
import { makePhoenixTrigger } from '../../data/cards/OGN-037'
import { makeNocturneTrigger, NOCTURNE_BANISH, NOCTURNE_PLAY } from '../../data/cards/OGN-194'
import { makeAva107Trigger, STANDBY_KEYWORD, standbyInHand, type Ava107Deps } from '../../data/cards/OGN-107'

                                                                         
                                                        
                                                         
                                                 
                                                                                   
                                                                    
                                                             
                                                                                    
                                                                                 
                                                                    
                                                                     
                                                                               
                                                                                       
                                                                 
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS = { playBanned: playBannedFor }

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
                                         
const rune = (i: number, color: string): GameObject => ({
  oid: asObjId(`rune${i}`), defId: `rune:${color}`, owner: P1, controller: P1,
  zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const defsIn = (s: GameState, zone: string): string[] =>
  (s.zones[asZoneId(zone)]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '?').sort()
                        
const ban = (s: GameState, p: PlayerId): GameState =>
  applyEvents(s, [{ kind: 'banPlayCards', player: p } as unknown as GameEvent]).state
const kinds = (evs: readonly GameEvent[]) => evs.map((e) => e.kind)

describe('★★★★★★★ ★1248 候选侧过闸(§419.3.c / §054.1;缺陷 152 族的另一半)', () => {
  test('★前提:老老魄罗 VEN-029 2 费 0 pip(忠诚不渝双上限内)、第一回合就是「无法被打出」', () => {
    expect(CARD_COSTS['VEN-029']).toMatchObject({ mana: 2, pips: 0 })
    const s = scene([obj('u', 'VEN-029', P1, `discard:${P1}`)])
    expect(playBannedFor(s, P1, 'VEN-029', `base:${P1}`), '★卡牌级 PLAY_BANS 第一回合成立').toBe(true)
    expect(playBannedFor(s, P1, 'OGN-078', `base:${P1}`), '★对照:普通单位不禁').toBe(false)
  })

  test('★★★★★★①VEN-114 卡洛克斯:P1 被禁手 ⇒ 候选空、不问;resolve 硬塞也不发;对照照列 [du, skip]', () => {
    const s0 = scene([obj('du', 'OGN-078', P2, `discard:${P2}`)])
    const item = makeKarloxPlunderItem(asObjId('kx'), P1, P2)
    expect(item.nextChoice!(s0, {})!.candidates.map((c) => c.id), '★对照').toEqual(['du', VEN_114_SKIP])
    const banned = ban(s0, P1)
    expect([...karloxCandidates(banned, P2 as string)], '★原始候选函数不变(它只看类别)').toEqual(['du'])
    expect(item.nextChoice!(banned, {}), '★被禁 ⇒ 滤空 ⇒ 不问').toBeNull()
    expect(item.resolve(banned, { karloxPick: 'du' } as never, undefined as never), '★结算侧同闸').toEqual([])
                               
    const s1 = scene([obj('du', 'VEN-029', P2, `discard:${P2}`), obj('du2', 'OGN-078', P2, `discard:${P2}`)])
    expect(item.nextChoice!(s1, {})!.candidates.map((c) => c.id), '★只滤掉打不出的那张').toEqual(['du2', VEN_114_SKIP])
  })

  test('★★★★★★②UNL-168 忠诚不渝:§358.3.a —— 老老魄罗仍是【有效目标】(法术照样能打),结算时打出被跳过', () => {
                                                                  
    const cheap = Object.entries(CARD_COSTS).find(([id, c]) => id !== 'VEN-029' && cardKind(id) === 'unit' && c.mana <= 2 && c.pips <= 1)?.[0]
    expect(cheap, '★前提:卡池里有 ≤2 费 ≤1 pip 的单位').toBeDefined()
    const s = scene([obj('old', 'VEN-029', P1, `discard:${P1}`), obj('ok', cheap!, P1, `discard:${P1}`)])
    expect(loyaltyTargets(s, P1), '★§358.3.a:打出被禁不改变目标有效性 ⇒ 两张都列').toEqual(['ok', 'old'])
    expect(loyaltyTargets(ban(s, P1), P1), '★禁手下法术本身另有两道门管(interactiveGame);目标列表不动').toEqual(['ok', 'old'])
    const resolve = (t: string) => (UNL_168_SPEC as unknown as { makeResolve: (c: { movedCardOid: string; controller: PlayerId; target?: string }) => (st: GameState) => readonly GameEvent[] })
      .makeResolve({ movedCardOid: 'sp', controller: P1, target: t })(s)
    expect(resolve('old'), '★结算时打出被跳过(§358.3.a),reducer 仍兜底').toEqual([])
    expect(kinds(resolve('ok')), '★对照').toEqual(['playFree'])
                                                         
    expect(loyaltyTargets(scene([obj('old', 'VEN-029', P1, `discard:${P1}`)]), P1)).toEqual(['old'])
  })

  test('★★★★★③UNL-142 残酷复活:候选滤掉打不出的;对照照列', () => {
    const s = scene([obj('old', 'VEN-029', P1, `discard:${P1}`), obj('ok', 'OGN-012', P1, `discard:${P1}`)])
    expect([...revivalCandidates(s, P1, 'OGN-012')], '★老老魄罗不列').toEqual(['ok'])
    expect([...revivalCandidates(ban(s, P1), P1, 'OGN-012')], '★禁手 ⇒ 全滤').toEqual([])
  })

  test('★★★★★★④OGN-037 不朽凤凰:P1 被禁手 ⇒ 不扣费、不发 playFree;对照付得起 ⇒ spend + playFree', () => {
    const trig = makePhoenixTrigger(asObjId('phx'), P1)
    const ev = { kind: 'destroyed', victim: { oid: asObjId('v'), types: ['unit'] }, responsible: [P1], byCards: ['OGN-085'] } as unknown as GameEvent
    const rich = scene([obj('phx', 'OGN-037', P1, `discard:${P1}`), rune(0, 'red'), rune(1, 'red'), rune(2, 'red')])
    expect(kinds(trig.effect(rich, ev, {})), '★对照:付得起 ⇒ spend + playFree').toEqual(['spend', 'playFree'])
    const banned = ban(rich, P1)
    expect(trig.effect(banned, ev, {}), '★被禁 ⇒ 空(修前:spend 照扣、playFree 再被 reducer 拦 ⇒ 付了费没打出)').toEqual([])
  })

  test('★★★★★★⑤OGN-194 魔腾:P1 被禁手 ⇒ 不问「付 A 打出」;硬答 yes 也只放逐、不扣费;对照问得出', () => {
    const trig = makeNocturneTrigger(asObjId('nc'), P1, 'revealed')
    const seen = { kind: 'revealed', player: P1, cards: ['nc'] } as unknown as GameEvent
    const s = scene([obj('nc', 'OGN-194', P1, `mainDeck:${P1}`), rune(0, '紫色'), rune(1, '紫色'), rune(2, '紫色')])
    expect(trig.nextChoice!(s, seen, { [NOCTURNE_BANISH]: 'yes' })!.key, '★对照:问 2 付 A').toBe(NOCTURNE_PLAY)
    expect(kinds(trig.effect(s, seen, { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' })), '★对照').toEqual(['banish', 'spend', 'playFree'])
    const banned = ban(s, P1)
    expect(trig.nextChoice!(banned, seen, { [NOCTURNE_BANISH]: 'yes' }), '★被禁 ⇒ 不问付费,留在放逐区').toBeNull()
    expect(kinds(trig.effect(banned, seen, { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' })), '★硬答 yes ⇒ 只放逐,不扣费不打').toEqual(['banish'])
  })

  test('★★★★★★⑥OGN-107 艾娃:单位候选按「此处」判 —— 典狱长在别处战场 ⇒ 滤掉、不问;effect 硬塞也不发;对照照列', () => {
    const deps: Ava107Deps = { hasStandby: (d) => cardKeywords(d).includes(STANDBY_KEYWORD), isUnitCard: (d) => cardKind(d) === 'unit', specFor: (d) => playSpecFor(d) }
    expect(cardKind('VEN-135'), '★前提:VEN-135 是带待命的单位').toBe('unit')
    expect(cardKeywords('VEN-135')).toContain(STANDBY_KEYWORD)
    const hand = (oid: string, def: string) => obj(oid, def, P1, `hand:${P1}`, { baseMight: 0 })
    const trig = makeAva107Trigger(asObjId('ava'), P1, deps)
    const s0 = scene([obj('ava', 'OGN-107', P1, BF0), hand('h', 'VEN-135')])
    expect(standbyInHand(s0, P1, deps)).toEqual(['h'])
    expect(trig.nextChoice!(s0, {} as GameEvent, {})!.candidates.map((c) => c.id), '★对照').toEqual(['h'])
    const s1 = scene([obj('ava', 'OGN-107', P1, BF0), hand('h', 'VEN-135'), obj('wd', 'OGN-070', P2, BF1)])
    expect(playBannedFor(s1, P1, 'VEN-135', BF0), '★前提:典狱长在场 ⇒ 打不到此处').toBe(true)
    expect(trig.nextChoice!(s1, {} as GameEvent, {}), '★单位候选滤空 ⇒ 不问').toBeNull()
    expect(trig.effect(s1, {} as GameEvent, { avaStandbyPick: 'h' }), '★effect 结算侧同闸').toEqual([])
    expect(kinds(trig.effect(s0, {} as GameEvent, { avaStandbyPick: 'h' })), '★对照 effect 照发').toEqual(['playFree'])
  })

  test('★★★★⑦对照「reducer 那道仍在」:候选侧被绕过(直接造 playFree)时落地仍被拦', () => {
    const s = ban(scene([obj('du', 'OGN-078', P2, `discard:${P2}`)]), P1)
    const r = applyEvents(s, [{ kind: 'playFree', obj: asObjId('du'), player: P1 } as unknown as GameEvent], DEPS)
    expect(defsIn(r.state, `discard:${P2}`), '★还在对手废牌堆').toContain('OGN-078')
    expect(defsIn(r.state, `base:${P1}`)).not.toContain('OGN-078')
  })
})
