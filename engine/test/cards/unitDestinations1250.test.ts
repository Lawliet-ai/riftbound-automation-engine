import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { playBannedFor } from '../../data/cards/longtail-12'
import { CARD_COSTS } from '../../data/cardCosts'
import { unitDestinations, makeSoulEaterTrigger } from '../../data/cards/play-from-deck'

                                                                                  
                                                                                                
                                                                           
                                                                 
                                                                                 
                                                                                           
                                                                         
                                                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const BASE = `base:${P1}`

const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)
                                                  
function scene(objs: readonly GameObject[], extra: Partial<GameState> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [obj('guard', 'U-guard', P1, BF0), ...objs]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, ...extra } as GameState
}
const ban = (s: GameState, p: PlayerId): GameState =>
  applyEvents(s, [{ kind: 'banPlayCards', player: p } as unknown as GameEvent]).state
const dests = (s: GameState, defId?: string, grant?: string) => [...unitDestinations(s, P1, grant, defId)]

describe('★★★★★★ ★1250 unitDestinations 过「打不出」统一闸(缺陷 153 候选侧)', () => {
  test('★★★★★⑤对照:无禁令 ⇒ [基地, 我控 BF0](带不带 defId 一样)', () => {
    const s = scene([])
    expect(dests(s)).toEqual([BASE, BF0])
    expect(dests(s, 'OGN-078')).toEqual([BASE, BF0])
  })

  test('★★★★★★①典狱长@BF1 ⇒ 只剩基地(修前照列 BF0 ⇒ 选了就悄悄不发生)', () => {
    const s = scene([obj('wd', 'OGN-070', P2, BF1)])
    expect(playBannedFor(s, P1, 'OGN-078', BF0), '★前提').toBe(true)
    expect(dests(s, 'OGN-078'), '★只剩基地').toEqual([BASE])
    expect(dests(s), '★④第三态:不给 defId ⇒ 老形状').toEqual([BASE, BF0])
  })

  test('★★★★★②落岩之径 SFD-216 在 BF0 ⇒ 去掉 BF0、基地照留', () => {
    const s = scene([], { battlefieldCards: { [BF0]: { defId: 'SFD-216', owner: P2 } } } as unknown as Partial<GameState>)
    expect(playBannedFor(s, P1, 'OGN-078', BF0), '★前提:DEST_BANS').toBe(true)
    expect(dests(s, 'OGN-078')).toEqual([BASE])
  })

  test('★★★★★③禁手 / 老老魄罗前三回合 ⇒ 全空(调用处据此不问、不发)', () => {
    expect(dests(ban(scene([]), P1), 'OGN-078'), '★禁手连基地一起禁').toEqual([])
    expect(dests(scene([]), 'VEN-029'), '★第一回合的老老魄罗哪儿都打不出').toEqual([])
    expect(dests(ban(scene([]), P2), 'OGN-078'), '★对照:只禁对手 ⇒ 不影响我').toEqual([BASE, BF0])
  })

  test('★★★★⑥grantBattlefield(雷克塞「此处」)那一处也过闸:典狱长在 ⇒ 授权的战场也被去掉', () => {
    const s = scene([obj('wd', 'OGN-070', P2, BF0)])                
    expect(dests(s, 'OGN-078', BF1), '★授权 BF1 但典狱长在场 ⇒ 只剩基地').toEqual([BASE])
    expect(dests(scene([]), 'OGN-078', BF1), '★对照:无典狱长 ⇒ 基地 + 我控 BF0 + 授权 BF1').toEqual([BASE, BF0, BF1])
  })
  test('★★★★★⑦真产地:咂魂者 OGN-196 —— 典狱长在 ⇒ 落点只问基地、硬塞 BF0 回落基地并真落地;禁手 ⇒ 不问、不发;对照两处都列', () => {
    const FREE_UNIT = 'OGN-044'                                               
    const trig = makeSoulEaterTrigger(asObjId('e'), P1)
    const ev = { kind: 'playUnit', unit: asObjId('e'), player: P1 } as unknown as GameEvent
    const mk = (extra: readonly GameObject[]) => {
      const s = scene([obj('e', 'OGN-196', P1, BASE), obj('a', FREE_UNIT, P1, `discard:${P1}`), ...extra])
      return { ...s, runePools: { ...s.runePools, [P1]: { mana: 0, runes: {} } } } as GameState
    }
    const ask = (s: GameState) => trig.nextChoice!(s, ev, { pick: 'a' })
    expect(dests(mk([]), FREE_UNIT), '★前提:共用件给出 [基地, BF0]').toEqual([BASE, BF0])
    expect(ask(mk([]))!.candidates.map((c) => c.id), '★对照:基地 + 我控 BF0').toEqual([BASE, BF0])
    const warden = mk([obj('wd', 'OGN-070', P2, BF1)])
    expect(dests(warden, FREE_UNIT), '★典狱长 ⇒ 共用件只剩基地').toEqual([BASE])
    expect(ask(warden), '★只剩基地 ⇒ 产地那句「只有基地可去,没什么可问的」⇒ 不问(自动落基地)').toBeNull()
    const evs = trig.effect(warden, ev, { pick: 'a', to: BF0 })
    expect((evs[0] as unknown as { play?: { to?: string } }).play?.to, '★硬塞被禁的 BF0 ⇒ 回落基地(§359.2.c 缺省)').toBe(BASE)
    const r = applyEvents(warden, evs, { playBanned: playBannedFor })
    expect((r.state.zones[asZoneId(BASE)]?.contents ?? []).map((o) => r.state.objects[o]?.defId), '★真落到基地').toContain(FREE_UNIT)
    const banned = ban(mk([]), P1)
    expect(ask(banned), '★禁手 ⇒ 全空 ⇒ 不问').toBeNull()
    expect(trig.effect(banned, ev, { pick: 'a', to: BF0 }), '★禁手 ⇒ 不发').toEqual([])
  })

  test('★★★★★⑧回落取【第一个打得出的】落点(★1250 收尾,Workflow 实锤):栖息的冥龙 SFD-015 只能打到本回合征服的战场 ⇒ 基地被禁、BF0 合法 ⇒ 没答落点也落 BF0', () => {
    expect(CARD_COSTS['SFD-015'], '★前提:4 费 0 pip(咂魂者免法力 ⇒ 不用符文)').toMatchObject({ mana: 4, pips: 0 })
    const trig = makeSoulEaterTrigger(asObjId('e'), P1)
    const ev = { kind: 'playUnit', unit: asObjId('e'), player: P1 } as unknown as GameEvent
    const s0 = scene([obj('e', 'OGN-196', P1, BASE), obj('a', 'SFD-015', P1, `discard:${P1}`)],
      { conqueredBattlefieldsThisTurn: { [P1]: [BF0] } } as unknown as Partial<GameState>)
    const s = { ...s0, runePools: { ...s0.runePools, [P1]: { mana: 0, runes: {} } } } as GameState
    expect(playBannedFor(s, P1, 'SFD-015', BASE), '★前提:PLAY_BANS_AT 把基地禁了').toBe(true)
    expect(dests(s, 'SFD-015'), '★只剩本回合征服的 BF0').toEqual([BF0])
    const evs = trig.effect(s, ev, { pick: 'a' })                         
    expect((evs[0] as unknown as { play?: { to?: string } }).play?.to, '★修前硬回基地(被禁 ⇒ reducer 拦 ⇒ 什么都没发生);现在回落 dests[0]').toBe(BF0)
    const r = applyEvents(s, evs, { playBanned: playBannedFor })
    expect((r.state.zones[asZoneId(BF0)]?.contents ?? []).map((o) => r.state.objects[o]?.defId), '★真落到 BF0').toContain('SFD-015')
  })

                                                            
                                                               
  test('★★★★⑨pick 那一问也按「有打得出的落点」滤:禁手 ⇒ 第一问就不问;对照 [a]', () => {
    const trig = makeSoulEaterTrigger(asObjId('e'), P1)
    const ev = { kind: 'playUnit', unit: asObjId('e'), player: P1 } as unknown as GameEvent
    const s0 = scene([obj('e', 'OGN-196', P1, BASE), obj('a', 'OGN-044', P1, `discard:${P1}`)])
    const s = { ...s0, runePools: { ...s0.runePools, [P1]: { mana: 0, runes: {} } } } as GameState
    expect(trig.nextChoice!(s, ev, {})!.candidates.map((c) => c.id), '★对照').toEqual(['a'])
    expect(trig.nextChoice!(ban(s, P1), ev, {}), '★禁手 ⇒ 哪儿都打不出 ⇒ 第一问就不问(§355.17 惯例)').toBeNull()
  })

})
