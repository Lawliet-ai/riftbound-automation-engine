import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import type { PlayCtx } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { applyEvents } from '../../src/loop/reduce'
import { banishInState, banishedBy } from '../../src/actions/banish'
import { playBannedFor } from '../../data/cards/longtail-12'
import { unitDestinationChoice, unitDestinationResolve } from '../../data/cards/play-from-deck'
import { makePhoenixTrigger, OGN_037_TO } from '../../data/cards/OGN-037'
import { makeAuroraPlayTrigger, AURORA_TO } from '../../data/cards/OGN-160'
import { makeHookPlayTrigger, HOOK_TO } from '../../data/cards/OGN-242'
import { makeBlinkPlayTrigger, BLINK_TO } from '../../data/cards/SFD-200'
import { makeNocturneTrigger, NOCTURNE_BANISH, NOCTURNE_PLAY, NOCTURNE_TO } from '../../data/cards/OGN-194'
import { UNL_168_SPEC, UNL_168_TO } from '../../data/cards/UNL-168'
import { makeKarloxPlunderItem, VEN_114_TO } from '../../data/cards/VEN-114'
import { UNL_142_SPEC, UNL_142_PICK, UNL_142_TO, revivalCandidates } from '../../data/cards/sacrifice-spells-500'
import { Z_DRIVE_RECALL_SPEC } from '../../data/cards/gear-triggers'
import { makeHuntPlayTrigger, UNL_184_DEST } from '../../data/cards/UNL-184'
import { unitDestinations } from '../../data/cards/play-from-deck'
import { extraPlayZonesFor } from '../../data/cards/longtail-19'
import { makeAva107Trigger, OGN_107_PICK_KEY, OGN_107_TO, STANDBY_KEYWORD, type Ava107Deps } from '../../data/cards/OGN-107'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { lastRitesChoiceOf, lastRitesChoiceEffect, UNL_179_PICK } from '../../data/cards/last-rites-choices'
import type { DeathSnapshot } from '../../src/keywords/lastRites'
import { SFD_111_SPEC, SFD_111_PICK } from '../../data/cards/SFD-111'

                                                                            
                                                                      
                                                                     
                                                       
                                                                          
                                                
                                                                                                          
                                                                
                                                                              
                                                                             
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const BASE = `base:${P1}`
const BASE2 = `base:${P2}`
const DEPS = { playBanned: playBannedFor }

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
                                       
const rune = (i: number, color: string): GameObject => ({
  oid: asObjId(`rune${i}`), defId: `rune:${color}`, owner: P1, controller: P1,
  zone: asZoneId(BASE), baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                                                 
function scene(objs: readonly GameObject[], extra: Partial<GameState> = {}, withGuard = true): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...(withGuard ? [obj('guard', 'U-guard', P1, BF0)] : []), ...objs]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, ...extra } as GameState
}
const ban = (s: GameState, p: PlayerId): GameState =>
  applyEvents(s, [{ kind: 'banPlayCards', player: p } as unknown as GameEvent]).state
const ids = (q: ChoiceRequest | null) => q!.candidates.map((c) => c.id)
const defsIn = (s: GameState, zone: string): string[] =>
  (s.zones[asZoneId(zone)]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '?')
type PF = { kind: string; obj?: string; player?: string; to?: string }
const playFreeOf = (evs: readonly GameEvent[]): PF | undefined =>
  (evs as unknown as readonly PF[]).find((e) => e.kind === 'playFree')
                                      
const inExile = (s: GameState, defId: string): string => {
  const hit = Object.values(s.objects).find((o) => o.defId === defId && String(o.zone).startsWith('exile:'))
  if (!hit) throw new Error(`★放逐区找不到 ${defId}`)
  return hit.oid as string
}
const DRAKE_EXTRA = { conqueredBattlefieldsThisTurn: { [P1]: [BF0] } } as unknown as Partial<GameState>

describe('★★★★★★★ ★1251 缺陷 154:效果打出的单位也走 §355.2 选落点(9 张无位置词卡)', () => {
  test('★★★★★★①共用件:有我控战场 ⇒ 问 [基地, BF0];只剩基地 ⇒ 不问;非法答案/没问 ⇒ dests[0];禁手 ⇒ 不问且结算 undefined;SFD-015 ⇒ 只剩 BF0 不问、结算落 BF0', () => {
    const base = { itemId: 'x', controller: P1, key: 'to', prompt: '?' }
    const s = scene([])
    expect(ids(unitDestinationChoice(s, P1, 'OGN-078', base)), '★§355.2.a 基地 / 我控战场').toEqual([BASE, BF0])
    expect(unitDestinationChoice(scene([], {}, false), P1, 'OGN-078', base), '★只剩基地 ⇒ 不问').toBeNull()
    expect(unitDestinationResolve(s, P1, 'OGN-078', BF0)).toBe(BF0)
    expect(unitDestinationResolve(s, P1, 'OGN-078', 'battlefield:shared:9'), '★非法答案 ⇒ dests[0]').toBe(BASE)
    expect(unitDestinationResolve(s, P1, 'OGN-078'), '★没问 ⇒ dests[0]').toBe(BASE)
    const b = ban(s, P1)
    expect(unitDestinationChoice(b, P1, 'OGN-078', base), '★禁手 ⇒ 全空 ⇒ 不问').toBeNull()
    expect(unitDestinationResolve(b, P1, 'OGN-078', BF0), '★禁手 ⇒ undefined(产地不发)').toBeUndefined()
    const drake = scene([], DRAKE_EXTRA)
    expect(playBannedFor(drake, P1, 'SFD-015', BASE), '★前提:栖息的冥龙 PLAY_BANS_AT 把基地禁了').toBe(true)
    expect(unitDestinationChoice(drake, P1, 'SFD-015', base), '★只剩 BF0 ⇒ 不问').toBeNull()
    expect(unitDestinationResolve(drake, P1, 'SFD-015'), '★结算落 BF0(修前各产地硬按基地判 ⇒ 什么都不发生)').toBe(BF0)
  })

  test('★★★★★★②不朽凤凰 OGN-037:有我控战场 ⇒ 问落点;答 BF0 ⇒ spend + playFree{to: BF0} 并真落 BF0;没有 ⇒ 不问、显式落基地;禁手 ⇒ 空', () => {
    const trig = makePhoenixTrigger(asObjId('phx'), P1)
    const ev = { kind: 'destroyed', victim: { oid: asObjId('v'), types: ['unit'] }, responsible: [P1], byCards: ['OGN-085'] } as unknown as GameEvent
    const mk = (guard: boolean) => scene([obj('phx', 'OGN-037', P1, `discard:${P1}`), rune(0, 'red'), rune(1, 'red'), rune(2, 'red')], {}, guard)
    const s = mk(true)
    const q = trig.nextChoice!(s, ev, {})
    expect(q?.key).toBe(OGN_037_TO)
    expect(ids(q), '★§355.2.a 基地 / 我控战场').toEqual([BASE, BF0])
    expect(trig.nextChoice!(s, ev, { [OGN_037_TO]: BF0 }), '★答完 ⇒ 结算').toBeNull()
    const evs = trig.effect(s, ev, { [OGN_037_TO]: BF0 })
    expect(evs.map((e) => e.kind)).toEqual(['spend', 'playFree'])
    expect(playFreeOf(evs)?.to).toBe(BF0)
    const r = applyEvents(s, evs, DEPS)
    expect(defsIn(r.state, BF0), '★真落到我控战场(修前只能落基地)').toContain('OGN-037')
    expect(defsIn(r.state, BASE)).not.toContain('OGN-037')
    expect(trig.nextChoice!(mk(false), ev, {}), '★没有我控战场 ⇒ 不问').toBeNull()
    expect(playFreeOf(trig.effect(mk(false), ev, {}))?.to, '★显式落基地(老行为一字不变)').toBe(BASE)
    expect(trig.effect(ban(s, P1), ev, { [OGN_037_TO]: BF0 }), '★禁手 ⇒ 空(★1248 口径不变:不扣费不发)').toEqual([])
  })

  const relayCase = (label: string, trig: ReturnType<typeof makeAuroraPlayTrigger>, KEY: string) => {
    const mk = (guard: boolean) => {
      const s = banishInState(scene([obj('src', label, P1, BASE), obj('x', 'OGN-078', P1, `mainDeck:${P1}`)], {}, guard), asObjId('x'), asObjId('src'))
      const card = inExile(s, 'OGN-078')
      expect(banishedBy(s, asObjId('src')), '★前提:§427.3 账本认得出').toContain(card)
      return { s, ev: { kind: 'banished', card, player: P1, defId: 'OGN-078' } as unknown as GameEvent }
    }
    const { s, ev } = mk(true)
    const q = trig.nextChoice!(s, ev, {})
    expect(q?.key, label).toBe(KEY)
    expect(ids(q), `${label} ★§355.2.a 基地 / 我控战场`).toEqual([BASE, BF0])
    expect(playFreeOf(trig.effect(s, ev, { [KEY]: BF0 })), label).toMatchObject({ player: P1, to: BF0 })
    const r = applyEvents(s, trig.effect(s, ev, { [KEY]: BF0 }), DEPS)
    expect(defsIn(r.state, BF0), `${label} ★真落到 BF0`).toContain('OGN-078')
    const n = mk(false)
    expect(trig.nextChoice!(n.s, n.ev, {}), `${label} ★没有我控战场 ⇒ 不问`).toBeNull()
    expect(playFreeOf(trig.effect(n.s, n.ev, {}))?.to, `${label} ★显式落基地`).toBe(BASE)
    expect(trig.effect(ban(s, P1), ev, { [KEY]: BF0 }), `${label} ★禁手 ⇒ 不发`).toEqual([])
  }
  test('★★★★★★③闪耀极光 OGN-160 接力:问落点 [基地, BF0];答 BF0 ⇒ playFree{to: BF0} 真落;没有 ⇒ 不问、落基地;禁手 ⇒ 不发', () => {
    relayCase('OGN-160', makeAuroraPlayTrigger(asObjId('src'), P1), AURORA_TO)
  })
  test('★★★★★★④海兽钓钩 OGN-242 接力:同③', () => {
    relayCase('OGN-242', makeHookPlayTrigger(asObjId('src'), P1), HOOK_TO)
  })

  test('★★★★★★⑤奥术跃迁 SFD-200:由单位【拥有者】选落点 —— P2 的单位 ⇒ 问 P2、候选 = P2 基地 + P2 控的 BF1;答 BF1 ⇒ playFree{player: P2, to: BF1} + 放逐此牌;P2 被禁手 ⇒ 只剩「放逐此牌」', () => {
    const trig = makeBlinkPlayTrigger(asObjId('sp'), P1)
    const s = banishInState(scene([obj('sp', 'SFD-200', P1, `discard:${P1}`), obj('u', 'OGN-078', P2, BASE2), obj('g2', 'U-guard', P2, BF1)]), asObjId('u'), asObjId('sp'))
    const card = inExile(s, 'OGN-078')
    const ev = { kind: 'banished', card, player: P2, defId: 'OGN-078' } as unknown as GameEvent
    const q = trig.nextChoice!(s, ev, {})
    expect(q?.key).toBe(BLINK_TO)
    expect(q?.controller, '★问的是拥有者 P2,不是打法术的 P1').toBe(P2)
    expect(ids(q), '★P2 的基地 + P2 控的 BF1(P1 控的 BF0 不在)').toEqual([BASE2, BF1])
    const evs = trig.effect(s, ev, { [BLINK_TO]: BF1 })
    expect(evs.map((e) => e.kind)).toEqual(['playFree', 'banish'])
    expect(playFreeOf(evs)).toMatchObject({ player: P2, to: BF1 })
    expect(defsIn(applyEvents(s, evs, DEPS).state, BF1), '★真落到 P2 控的 BF1').toContain('OGN-078')
    expect(trig.effect(ban(s, P2), ev, { [BLINK_TO]: BF1 }).map((e) => e.kind), '★拥有者被禁手 ⇒ 打出跳过(§358.3.a)、「放逐此牌」照发').toEqual(['banish'])
    expect(trig.effect(ban(s, P1), ev, { [BLINK_TO]: BF1 }).map((e) => e.kind), '★对照:只禁施法者 P1 不影响拥有者 P2 打出').toEqual(['playFree', 'banish'])
  })

  test('★★★★★★⑥魔腾 OGN-194:答「付」之后第三问落点 [基地, BF0];答 BF0 ⇒ banish + spend + playFree{to: BF0};不付 ⇒ 不问落点', () => {
    const trig = makeNocturneTrigger(asObjId('nc'), P1, 'revealed')
    const seen = { kind: 'revealed', player: P1, cards: ['nc'] } as unknown as GameEvent
    const s = scene([obj('nc', 'OGN-194', P1, `mainDeck:${P1}`), rune(0, '紫色'), rune(1, '紫色'), rune(2, '紫色')])
    expect(trig.nextChoice!(s, seen, { [NOCTURNE_BANISH]: 'yes' })?.key, '★对照:第二问仍是付费').toBe(NOCTURNE_PLAY)
    const q = trig.nextChoice!(s, seen, { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' })
    expect(q?.key, '★第三问落点').toBe(NOCTURNE_TO)
    expect(ids(q)).toEqual([BASE, BF0])
    const all = { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes', [NOCTURNE_TO]: BF0 }
    expect(trig.nextChoice!(s, seen, all), '★答完 ⇒ 结算').toBeNull()
    const evs = trig.effect(s, seen, all)
    expect(evs.map((e) => e.kind)).toEqual(['banish', 'spend', 'playFree'])
    expect(playFreeOf(evs)?.to).toBe(BF0)
    expect(trig.nextChoice!(s, seen, { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'no' }), '★不付 ⇒ 不问落点').toBeNull()
    expect(trig.effect(s, seen, { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'no' }).map((e) => e.kind), '★不付 ⇒ 只放逐').toEqual(['banish'])
    expect(trig.nextChoice!(scene([obj('nc', 'OGN-194', P1, `mainDeck:${P1}`)], {}, false), seen, { [NOCTURNE_BANISH]: 'yes', [NOCTURNE_PLAY]: 'yes' }), '★没有我控战场 ⇒ 不问').toBeNull()
  })

  test('★★★★★★⑦忠诚不渝 UNL-168:makeNextChoice 问落点 [基地, BF0];答 BF0 ⇒ to: BF0;SFD-015 在废牌堆 + 本回合征服 BF0 ⇒ 不问、落 BF0(修前 return [])', () => {
    const ctx: PlayCtx = { movedCardOid: 'm', controller: P1, target: 'u1' }
    const s = scene([obj('u1', 'OGN-046', P1, `discard:${P1}`)])
    const q = UNL_168_SPEC.makeNextChoice!(ctx)(s, {})
    expect(q?.key).toBe(UNL_168_TO)
    expect(ids(q)).toEqual([BASE, BF0])
    expect(playFreeOf(UNL_168_SPEC.makeResolve(ctx)(s, { [UNL_168_TO]: BF0 }))?.to).toBe(BF0)
    expect(playFreeOf(UNL_168_SPEC.makeResolve(ctx)(s, {}))?.to, '★没答 ⇒ dests[0] = 基地').toBe(BASE)
    expect(UNL_168_SPEC.makeNextChoice!(ctx)(scene([obj('u1', 'OGN-046', P1, `discard:${P1}`)], {}, false), {}), '★没有我控战场 ⇒ 不问').toBeNull()
    const drake = scene([obj('d', 'SFD-015', P1, `discard:${P1}`)], DRAKE_EXTRA)
    const ctx2: PlayCtx = { movedCardOid: 'm', controller: P1, target: 'd' }
                                                                                   
                                                                                     
    expect(UNL_168_SPEC.makeNextChoice!(ctx2)(drake, {}), '★只剩 BF0 ⇒ 不问落点;龙栖峰不在场 ⇒ 也不问额外费用(★1364)').toBeNull()
    const evs = UNL_168_SPEC.makeResolve(ctx2)(drake, {})
    expect(playFreeOf(evs)?.to, '★修前:基地被禁 ⇒ return [](明明 BF0 合法)').toBe(BF0)
    expect(defsIn(applyEvents(drake, evs, DEPS).state, BF0), '★真落到 BF0').toContain('SFD-015')
    expect(UNL_168_SPEC.makeResolve(ctx)(ban(s, P1), { [UNL_168_TO]: BF0 }), '★禁手 ⇒ 结算跳过(§358.3.a)').toEqual([])
  })

  test('★★★★★★⑧卡洛克斯 VEN-114:选了牌 ⇒ 第二问落点 [基地, BF0];不选 ⇒ 不问;答 BF0 ⇒ playFree{player: 我, to: BF0}', () => {
    const item = makeKarloxPlunderItem(asObjId('kx'), P1, P2)
    const s = scene([obj('du', 'OGN-078', P2, `discard:${P2}`)])
    expect(item.nextChoice!(s, {})?.candidates.map((c) => c.id), '★对照:第一问选牌').toEqual(['du', 'skip'])
    const q = item.nextChoice!(s, { karloxPick: 'du' })
    expect(q?.key).toBe(VEN_114_TO)
    expect(ids(q)).toEqual([BASE, BF0])
    expect(item.nextChoice!(s, { karloxPick: 'skip' }), '★不选 ⇒ 不问落点').toBeNull()
    expect(item.nextChoice!(s, { karloxPick: 'du', [VEN_114_TO]: BF0 }), '★答完 ⇒ 结算').toBeNull()
    const evs = item.resolve(s, { karloxPick: 'du', [VEN_114_TO]: BF0 } as never, undefined as never)
    expect(playFreeOf(evs)).toMatchObject({ obj: 'du', player: P1, to: BF0 })
    expect(defsIn(applyEvents(s, evs, DEPS).state, BF0), '★对手的牌当作我的打到我控 BF0').toContain('OGN-078')
  })

  test('★★★★★★⑨残酷复活 UNL-142:选了牌 ⇒ 第二问落点;答 BF0 ⇒ to: BF0;候选按「有打得出的落点」滤 —— SFD-015 + 本回合征服 BF0 ⇒ 仍列、落 BF0(修前按基地判被滤掉)', () => {
    const ctx = { movedCardOid: 'm', controller: P1, bonusChoiceDefId: 'OGN-012' } as unknown as PlayCtx
    const s = scene([obj('ok', 'OGN-012', P1, `discard:${P1}`)])
    expect([...revivalCandidates(s, P1, 'OGN-012')]).toEqual(['ok'])
                                                                                                
                                                                        
    expect(UNL_142_SPEC.makeConfirmChoice!(ctx)(s, {})?.key, '★对照:第一问选牌(确认期)').toBe(UNL_142_PICK)
    const q = UNL_142_SPEC.makeNextChoice!(ctx)(s, { [UNL_142_PICK]: 'ok' })
    expect(q?.key).toBe(UNL_142_TO)
    expect(ids(q)).toEqual([BASE, BF0])
    expect(UNL_142_SPEC.makeNextChoice!(ctx)(s, { [UNL_142_PICK]: 'ok', [UNL_142_TO]: BF0 }), '★答完 ⇒ 结算').toBeNull()
    expect(playFreeOf(UNL_142_SPEC.makeResolve(ctx)(s, { [UNL_142_PICK]: 'ok', [UNL_142_TO]: BF0 }))?.to).toBe(BF0)
    const drake = scene([obj('d', 'SFD-015', P1, `discard:${P1}`)], DRAKE_EXTRA)
    const ctx2 = { movedCardOid: 'm', controller: P1, bonusChoiceDefId: 'OGN-078' } as unknown as PlayCtx                               
    expect([...revivalCandidates(drake, P1, 'OGN-078')], '★修前按「基地打不打得出」滤 ⇒ 空;现在按「有落点」⇒ 列').toEqual(['d'])
                                                   
    expect(UNL_142_SPEC.makeNextChoice!(ctx2)(drake, { [UNL_142_PICK]: 'd' }), '★只剩 BF0 ⇒ 不问落点;龙栖峰不在场 ⇒ 也不问额外费用(★1364)').toBeNull()
    expect(playFreeOf(UNL_142_SPEC.makeResolve(ctx2)(drake, { [UNL_142_PICK]: 'd' }))?.to, '★落 BF0').toBe(BF0)
    expect([...revivalCandidates(ban(s, P1), P1, 'OGN-012')], '★禁手 ⇒ 仍全滤(★1248 ③ 口径不变)').toEqual([])
  })

  test('★★★★★★⑩Z型驱动 SFD-090:被它放逐的两张各问一次落点(键 to:<oid>);答完 ⇒ 各落各的;没有我控战场 ⇒ 一问都不问、都落基地', () => {
    const zd = obj('zd', 'SFD-090', P1, BASE, { baseTypes: ['equipment'], baseTags: ['武装'] } as unknown as Partial<GameObject>)
    let s = scene([zd, obj('a', 'OGN-078', P1, BF0), obj('b', 'OGN-078', P1, BF0)])
    s = banishInState(s, asObjId('a'), asObjId('zd'))
    s = banishInState(s, asObjId('b'), asObjId('zd'))
    const [oa, ob] = banishedBy(s, asObjId('zd')) as readonly string[]
    expect(oa !== undefined && ob !== undefined, '★前提:账本两张').toBe(true)
    const ask = Z_DRIVE_RECALL_SPEC.makeNextChoice({ selfOid: 'zd', controller: P1 })
    const q1 = ask(s, {})
    expect(q1?.key).toBe(`to:${oa}`)
    expect(ids(q1)).toEqual([BASE, BF0])
    expect(ask(s, { [`to:${oa}`]: BF0 })?.key, '★第一张答完问第二张').toBe(`to:${ob}`)
    const all = { [`to:${oa}`]: BF0, [`to:${ob}`]: BASE }
    expect(ask(s, all), '★都答完 ⇒ 结算').toBeNull()
    const evs = Z_DRIVE_RECALL_SPEC.makeResolve({ selfOid: 'zd', controller: P1 })(s, all)
    expect((evs as unknown as readonly PF[]).map((e) => [e.obj, e.to])).toEqual([[oa, BF0], [ob, BASE]])
    const r = applyEvents(s, evs, DEPS)
    expect(defsIn(r.state, BF0).filter((d) => d === 'OGN-078'), '★一张真落 BF0').toHaveLength(1)
    expect(defsIn(r.state, BASE).filter((d) => d === 'OGN-078'), '★一张真落基地').toHaveLength(1)
    let n = scene([zd, obj('a', 'OGN-078', P1, BASE)], {}, false)
    n = banishInState(n, asObjId('a'), asObjId('zd'))
    expect(ask(n, {}), '★没有我控战场 ⇒ 不问').toBeNull()
    expect((Z_DRIVE_RECALL_SPEC.makeResolve({ selfOid: 'zd', controller: P1 })(n) as unknown as readonly PF[]).map((e) => e.to), '★显式落基地').toEqual([BASE])
  })
  test('★★★★★⑪收尾:不朽凤凰凑不出费 ⇒ 不问落点(§444.2.c 口径同 OGN-194);对照有符文 ⇒ 问', () => {
    const trig = makePhoenixTrigger(asObjId('phx'), P1)
    const ev = { kind: 'destroyed', victim: { oid: asObjId('v'), types: ['unit'] }, responsible: [P1], byCards: ['OGN-085'] } as unknown as GameEvent
    expect(trig.nextChoice!(scene([obj('phx', 'OGN-037', P1, `discard:${P1}`)]), ev, {}), '★没符文 ⇒ 不问').toBeNull()
    expect(trig.nextChoice!(scene([obj('phx', 'OGN-037', P1, `discard:${P1}`), rune(0, 'red'), rune(1, 'red'), rune(2, 'red')]), ev, {})?.key, '★对照').toBe(OGN_037_TO)
  })

  test('★★★★★⑫收尾:接力(极光)结算期复验 §427.3 账本 —— 那张不是我放逐的 ⇒ 不问;对照是我放逐的 ⇒ 问', () => {
    const trig = makeAuroraPlayTrigger(asObjId('src'), P1)
    const mk = (by: string) => {
      const s = banishInState(scene([obj('src', 'OGN-160', P1, BASE), obj('other', 'OGN-160', P1, BASE), obj('x', 'OGN-078', P1, `mainDeck:${P1}`)]), asObjId('x'), asObjId(by))
      return { s, ev: { kind: 'banished', card: inExile(s, 'OGN-078'), player: P1, defId: 'OGN-078' } as unknown as GameEvent }
    }
    const a = mk('other')
    expect(trig.nextChoice!(a.s, a.ev, {}), '★别人放逐的 ⇒ 不问').toBeNull()
    const b = mk('src')
    expect(trig.nextChoice!(b.s, b.ev, {})?.key, '★对照').toBe(AURORA_TO)
  })

  test('★★★★★⑬收尾:忠诚不渝目标已不在我废牌堆 ⇒ 不问落点(镜像 makeResolve 守卫);对照在废牌堆 ⇒ 问', () => {
    const ctx: PlayCtx = { movedCardOid: 'm', controller: P1, target: 'u1' }
    expect(UNL_168_SPEC.makeNextChoice!(ctx)(scene([obj('u1', 'OGN-046', P1, BASE)]), {}), '★已在基地 ⇒ 不问').toBeNull()
    expect(UNL_168_SPEC.makeNextChoice!(ctx)(scene([obj('u1', 'OGN-046', P1, `discard:${P1}`)]), {})?.key, '★对照').toBe(UNL_168_TO)
  })

  test('★★★★★★⑭收尾:狩猎律动 UNL-184「让其拥有者将其打出到任意一处战场」—— 落点问发给【拥有者】(§191.3.c):P2 的单位 ⇒ 问 P2;对照我的单位 ⇒ 问 P1', () => {
    const trig = makeHuntPlayTrigger(asObjId('sp'), P1)
    const mk = (owner: PlayerId) => {
      const s = banishInState(scene([obj('sp', 'UNL-184', P1, `discard:${P1}`), obj('u', 'OGN-078', owner, owner === P1 ? BASE : BASE2)]), asObjId('u'), asObjId('sp'))
      return { s, ev: { kind: 'banished', card: inExile(s, 'OGN-078'), player: owner, defId: 'OGN-078' } as unknown as GameEvent }
    }
    const a = mk(P2)
    const q = trig.nextChoice!(a.s, a.ev, {})
    expect(q?.key).toBe(UNL_184_DEST)
    expect(q?.controller, '★修前问施法者 P1;§191.1/191.3.c 打出者=拥有者 P2 才是答题人').toBe(P2)
    expect(ids(q).length, '★候选非空(任意一处战场)').toBeGreaterThan(0)
    expect(trig.nextChoice!(mk(P1).s, mk(P1).ev, {})?.controller, '★对照:我的单位 ⇒ 问我').toBe(P1)
  })

  test('★★★★★★⑮收尾【缺陷 155】§355.2.b 权限加宽也进效果打出候选:厄运小姐 OGN-193 在场 ⇒ 开放战场 BF1 入列、凤凰真落 BF1;落岩之径仍滤;第三态不加宽;对照无她 ⇒ 不列', () => {
    const mf = obj('mf', 'OGN-193', P1, BASE)
    const s = scene([mf, obj('phx', 'OGN-037', P1, `discard:${P1}`), rune(0, 'red'), rune(1, 'red'), rune(2, 'red')])
    expect([...extraPlayZonesFor(s, P1, 'OGN-078')], '★前提:板面级加宽给出开放的 BF1').toEqual([BF1])
    expect([...unitDestinations(s, P1, undefined, 'OGN-078')], '★共用件并入加宽').toEqual([BASE, BF0, BF1])
    expect([...unitDestinations(s, P1)], '★第三态:不给 defId ⇒ 老形状、不加宽').toEqual([BASE, BF0])
    expect([...unitDestinations(scene([]), P1, undefined, 'OGN-078')], '★对照:没有厄运小姐 ⇒ 开放战场不是有效位置').toEqual([BASE, BF0])
    const rock = scene([mf], { battlefieldCards: { [BF1]: { defId: 'SFD-216', owner: P2 } } } as unknown as Partial<GameState>)
    expect([...unitDestinations(rock, P1, undefined, 'OGN-078')], '★落岩之径在 BF1 ⇒「无法」高于「可以」,加宽后仍被滤').toEqual([BASE, BF0])
    const trig = makePhoenixTrigger(asObjId('phx'), P1)
    const ev = { kind: 'destroyed', victim: { oid: asObjId('v'), types: ['unit'] }, responsible: [P1], byCards: ['OGN-085'] } as unknown as GameEvent
    expect(ids(trig.nextChoice!(s, ev, {})), '★真产地:凤凰问出三处').toEqual([BASE, BF0, BF1])
    const evs = trig.effect(s, ev, { [OGN_037_TO]: BF1 })
    expect(playFreeOf(evs)?.to).toBe(BF1)
    expect(defsIn(applyEvents(s, evs, DEPS).state, BF1), '★真落到开放战场 BF1(修前不在候选)').toContain('OGN-037')
  })

  test('★★★★★★⑯★1252 艾娃 OGN-107「此处」=【位置】(§198.1 含基地):我在基地 ⇒ 钉死基地不问(即使我控 BF0);我已离场 ⇒「此处」为无 ⇒ 第一句照 §355.2 问 [基地, BF0]、答 BF0 真落;在 BF1 ⇒ 钉死;离场且不控战场 ⇒ 不问显式基地;禁手 ⇒ 不列不发;非单位一字不动', () => {
    const deps: Ava107Deps = { hasStandby: (d) => cardKeywords(d).includes(STANDBY_KEYWORD), isUnitCard: (d) => cardKind(d) === 'unit', specFor: (d) => playSpecFor(d) }
    expect(cardKind('VEN-135') === 'unit' && cardKeywords('VEN-135').includes(STANDBY_KEYWORD), '★前提:VEN-135 是带待命的单位').toBe(true)
    const trig = makeAva107Trigger(asObjId('ava'), P1, deps)
    const hand = (oid: string, def: string) => obj(oid, def, P1, `hand:${P1}`, { baseMight: 0 } as unknown as Partial<GameObject>)
    const ev = {} as GameEvent
    const atBase = scene([obj('ava', 'OGN-107', P1, BASE), hand('h', 'VEN-135')])                             
    expect(ids(trig.nextChoice!(atBase, ev, {})), '★对照:第一问照列').toEqual(['h'])
    expect(trig.nextChoice!(atBase, ev, { [OGN_107_PICK_KEY]: 'h' }), '★我在基地 ⇒「此处」= 我的基地 ⇒ 钉死、不问(★1252 主提交一度错问)').toBeNull()
    expect(playFreeOf(trig.effect(atBase, ev, { [OGN_107_PICK_KEY]: 'h', [OGN_107_TO]: BF0 }))?.to, '★硬塞 BF0 也钉死基地(显式 to)').toBe(BASE)
    const gone = scene([obj('ava', 'OGN-107', P1, `discard:${P1}`), hand('h', 'VEN-135')])                        
    const q = trig.nextChoice!(gone, ev, { [OGN_107_PICK_KEY]: 'h' })
    expect(q?.key, '★离场 ⇒「此处」为无 ⇒ 第二问落点').toBe(OGN_107_TO)
    expect(ids(q)).toEqual([BASE, BF0])
    expect(trig.nextChoice!(gone, ev, { [OGN_107_PICK_KEY]: 'h', [OGN_107_TO]: BF0 }), '★答完 ⇒ 结算').toBeNull()
    const evs = trig.effect(gone, ev, { [OGN_107_PICK_KEY]: 'h', [OGN_107_TO]: BF0 })
    expect(playFreeOf(evs)).toMatchObject({ obj: 'h', player: P1, to: BF0 })
    expect(defsIn(applyEvents(gone, evs, DEPS).state, BF0), '★真落到我控 BF0(修前硬落基地)').toContain('VEN-135')
    expect(playFreeOf(trig.effect(gone, ev, { [OGN_107_PICK_KEY]: 'h' }))?.to, '★没答 ⇒ dests[0] = 基地').toBe(BASE)
    const here = scene([obj('ava', 'OGN-107', P1, BF1), hand('h', 'VEN-135')])                  
    expect(trig.nextChoice!(here, ev, { [OGN_107_PICK_KEY]: 'h' }), '★「此处」在 BF1 ⇒ 钉死、不问').toBeNull()
    expect(playFreeOf(trig.effect(here, ev, { [OGN_107_PICK_KEY]: 'h', [OGN_107_TO]: BF0 }))?.to, '★硬塞答案也钉死此处').toBe(BF1)
    const goneNoBf = scene([obj('ava', 'OGN-107', P1, `discard:${P1}`), hand('h', 'VEN-135')], {}, false)
    expect(trig.nextChoice!(goneNoBf, ev, { [OGN_107_PICK_KEY]: 'h' }), '★离场且不控任何战场 ⇒ 不问').toBeNull()
    expect(playFreeOf(trig.effect(goneNoBf, ev, { [OGN_107_PICK_KEY]: 'h' }))?.to, '★显式落基地').toBe(BASE)
    const b = ban(gone, P1)
    expect(trig.nextChoice!(b, ev, {}), '★禁手 ⇒ 第一问就不列').toBeNull()
    expect(trig.effect(b, ev, { [OGN_107_PICK_KEY]: 'h', [OGN_107_TO]: BF0 }), '★禁手 ⇒ 不发').toEqual([])
    expect(cardKind('OGN-083') !== 'unit' && cardKeywords('OGN-083').includes(STANDBY_KEYWORD), '★前提:OGN-083 是带待命的非单位').toBe(true)
    const spell = scene([obj('ava', 'OGN-107', P1, `discard:${P1}`), hand('s', 'OGN-083')])
    expect(trig.nextChoice!(spell, ev, { [OGN_107_PICK_KEY]: 's' }), '★非单位 ⇒ 不问落点').toBeNull()
    expect(trig.effect(spell, ev, { [OGN_107_PICK_KEY]: 's' }).map((e) => e.kind), '★1254:法术走 playSpellFromZone 入链(缺陷 157),不发 playFree').toEqual(['playSpellFromZone'])
  })

  test('★★★★★⑰★1252 收尾【缺陷 153 边角】峡谷先锋 UNL-179 绝念「打出一名单位到你的基地」候选侧过「打不出」闸:老老魄罗第一回合不列、硬塞不发;禁手 ⇒ 不问;对照照列照发', () => {
    const snap = { oid: asObjId('dead'), defId: 'UNL-179', controller: P1, owner: P1, zone: asZoneId(BF0), might: 1, damage: 0, keywords: [], counters: {}, status: {},
      types: ['unit'], attachedDefIds: [], attached: [], hereOtherAllies: [], hereOtherUnits: [], phaseAtDeath: 'main', activePlayerAtDeath: P1 } as unknown as DeathSnapshot
    const s0 = scene([obj('poro', 'VEN-029', P1, `hand:${P1}`), obj('u', 'OGN-096', P1, `hand:${P1}`)])
    const s = { ...s0, runePools: { ...s0.runePools, [P1]: { mana: 0, runes: {} } } } as GameState
    expect(playBannedFor(s, P1, 'VEN-029', BASE), '★前提:第一回合的老老魄罗打不出').toBe(true)
    expect(ids(lastRitesChoiceOf(snap, 'x', s, {})), '★老老魄罗不列(修前 [poro, u])').toEqual(['u'])
    expect(lastRitesChoiceEffect(snap, { [UNL_179_PICK]: 'poro' }, s), '★硬塞老老魄罗 ⇒ 不发(修前发一条、靠 reducer 拦)').toEqual([])
    expect((lastRitesChoiceEffect(snap, { [UNL_179_PICK]: 'u' }, s)[0] as unknown as { play?: { to?: string } }).play?.to, '★对照:发到基地').toBe(BASE)
    expect(lastRitesChoiceOf(snap, 'x', ban(s, P1), {}), '★禁手 ⇒ 不问(修前照问一个空问)').toBeNull()
  })

  test('★★★★⑱★1252 收尾 前来相助 SFD-111 第一问按「有打得出的我控战场」滤:典狱长在别处 ⇒ 第一问就不问(修前问了 pick、第二问才空);对照照问', () => {
    const ask = SFD_111_SPEC.makeNextChoice!({ movedCardOid: 'm', controller: P1 } as PlayCtx)
    const s0 = scene([obj('h', 'OGN-078', P1, `hand:${P1}`)])
    expect(ask(s0, {})?.key, '★对照').toBe(SFD_111_PICK)
    const s1 = scene([obj('h', 'OGN-078', P1, `hand:${P1}`), obj('wd', 'OGN-070', P2, BF1)])
    expect(playBannedFor(s1, P1, 'OGN-078', BF0), '★前提:典狱长 ⇒ BF0 打不到').toBe(true)
    expect(ask(s1, {}), '★全禁 ⇒ 第一问就不问').toBeNull()
  })

})
