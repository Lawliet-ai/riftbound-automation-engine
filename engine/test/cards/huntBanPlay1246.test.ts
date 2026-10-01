import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { makeHuntPlayTrigger } from '../../data/cards/UNL-184'
import { makeThunderCallerTrigger } from '../../data/cards/ban-play'
import { playBannedFor } from '../../data/cards/longtail-12'

                                                             
                                                    
                                          
                                                         
                                                                        
                                                              
                                                                 
                                                                
                                                             
                                                              
                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const EXILE = (p: PlayerId) => `exile:${p}`

const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

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

                                                 
const trig = makeHuntPlayTrigger(asObjId('spell'), P1)
const ev = { kind: 'banished', card: asObjId('u') } as unknown as GameEvent
const banished = (who: PlayerId = P1) => obj('u', 'OGN-078', who, EXILE(who))

describe('★★★★★★★ ★1246 §054 禁手 × 狩猎律动(裁判 FAQ L203,缺陷 151)', () => {
  test('★①禁手由真事件写进 state;playBannedFor 第七档只认被点名的那个人', () => {
    const s = ban(scene([banished()]), P1)
    expect(s.cannotPlayCardsThisTurn).toEqual([P1])
    expect(playBannedFor(s, P1, 'OGN-078', BF0), '★第七档:P1 被禁手').toBe(true)
    expect(playBannedFor(s, P2, 'OGN-078', BF0), '★对照:没被点名的 P2 不禁').toBe(false)
    expect(playBannedFor(scene([banished()]), P1, 'OGN-078', BF0), '★对照:没有禁手时不禁').toBe(false)
  })

  test('★★★★★★②P1 被禁手 ⇒ 落点问不出、effect 不发事件、真 reduce 后单位停留放逐区', () => {
    const s = ban(scene([banished()]), P1)
    expect(trig.nextChoice!(s, ev, {}), '★禁手 ⇒ 战场全被禁 ⇒ 问不出').toBeNull()
    const evs = trig.effect(s, ev, {})
    expect(evs, '★不发事件(修前:带 to 的 playFree,单位落战场)').toEqual([])
    expect(trig.effect(s, ev, { ['huntDest']: BF0 }), '★硬塞答案也过不了').toEqual([])
    const s1 = applyEvents(s, evs).state
    expect(defsIn(s1, EXILE(P1)), '★FAQ L203:停留在放逐区').toContain('OGN-078')
    expect(defsIn(s1, BF0)).toEqual([])
    expect(defsIn(s1, `base:${P1}`)).not.toContain('OGN-078')
  })

  test('★★★★★③对照组:无禁手 / 只禁对手 P2 ⇒ 旧行为一字不变(问得出、带 to、真落战场)', () => {
    for (const bannedOne of [undefined, P2]) {
      const s0 = scene([banished()])
      const s = bannedOne === undefined ? s0 : ban(s0, bannedOne)
      const q = trig.nextChoice!(s, ev, {})!
      expect(q, '★问得出').not.toBeNull()
      const dest = q.candidates[0]!.id
      const evs = trig.effect(s, ev, { [q.key]: dest }) as unknown as readonly { kind: string, to?: string }[]
      expect(evs).toHaveLength(1)
      expect(evs[0]!.to).toBe(dest)
      const s1 = applyEvents(s, evs as unknown as readonly GameEvent[]).state
      expect(defsIn(s1, dest), '★真落到答的那处战场').toContain('OGN-078')
      expect(defsIn(s1, EXILE(P1))).not.toContain('OGN-078')
    }
  })

  test('★★★★④禁手认的是【打出者=拥有者】,不是打狩猎律动的人(FAQ L203「对方的布林希尔」由对方打出)', () => {
                                                            
    const banP2 = ban(scene([banished(P2)]), P2)
    expect(trig.nextChoice!(banP2, ev, {}), '★拥有者 P2 被禁 ⇒ 打不出').toBeNull()
    expect(trig.effect(banP2, ev, { ['huntDest']: BF0 })).toEqual([])
    const banP1 = ban(scene([banished(P2)]), P1)
    const q = trig.nextChoice!(banP1, ev, {})!
    expect(q, '★只禁了打法术的 P1,打出者 P2 没被禁 ⇒ 照打').not.toBeNull()
    const evs = trig.effect(banP1, ev, { [q.key]: BF0 }) as unknown as readonly { player?: string, to?: string }[]
    expect(evs[0]!.player).toBe(P2)
    expect(defsIn(applyEvents(banP1, evs as unknown as readonly GameEvent[]).state, BF0)).toContain('OGN-078')
  })

  test('★★★★★⑤颂雷者 OGN-026 的触发 ⇒ 对手禁手 ⇒ 对手那张狩猎律动的接力打不出(FAQ L203 的链条)', () => {
                                                                       
    const thunder = makeThunderCallerTrigger(asObjId('bryn'), P1)
    const s0 = scene([obj('bryn', 'OGN-026', P1, BF0), banished(P2)])
    const banEvs = thunder.effect(s0, { kind: 'playUnit', unit: asObjId('bryn'), player: P1 } as unknown as GameEvent, {})
    expect(banEvs.map((e) => (e as { kind: string }).kind), '★颂雷者发的就是 banPlayCards').toEqual(['banPlayCards'])
    expect((banEvs[0] as unknown as { player: string }).player, '★「对手」= P2').toBe(P2)
    const s = applyEvents(s0, banEvs).state
    expect(s.cannotPlayCardsThisTurn).toEqual([P2])
    const huntP2 = makeHuntPlayTrigger(asObjId('spell2'), P2)
    expect(huntP2.nextChoice!(s, ev, {}), '★对方的布林希尔无法打出').toBeNull()
    expect(huntP2.effect(s, ev, {})).toEqual([])
    const s1 = applyEvents(s, huntP2.effect(s, ev, {})).state
    expect(defsIn(s1, EXILE(P2)), '★停留在放逐区').toContain('OGN-078')
                             
    expect(trig.nextChoice!({ ...s, objects: { ...s.objects, u: { ...s.objects['u' as never], owner: P1, controller: P1 } } } as GameState, ev, {}), '★对照:未被禁的一方照打').not.toBeNull()
  })
})
