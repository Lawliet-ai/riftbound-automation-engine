import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { playBannedFor } from '../../data/cards/longtail-12'
import { SFD_111_SPEC, SFD_111_PICK, SFD_111_DEST } from '../../data/cards/SFD-111'
import { makeRellAttackTrigger, SFD_024_ASK } from '../../data/cards/SFD-024'

                                                                          
                                                                                                   
                                                                                  
                                                              
                                                            
                                                         
                                                                                        
                                                                         
                                                                               
                                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const DEPS = { playBanned: playBannedFor }

const obj = (oid: string, defId: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: types as unknown as GameObject['baseTypes'], damage: 0, counters: {}, status: {},
} as GameObject)
                                   
const rune = (oid: string, color: string): GameObject =>
  ({ ...obj(oid, `rune:${color}`, P1, `base:${P1}`, ['rune']), baseMight: 0 } as GameObject)
                                                                  
function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, obj('guard', 'U-guard', P1, BF0)]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const defsIn = (s: GameState, zone: string): string[] =>
  (s.zones[asZoneId(zone)]?.contents ?? []).map((o) => s.objects[o]?.defId ?? '?').sort()
const runesInBase = (s: GameState) => defsIn(s, `base:${P1}`).filter((d) => d.startsWith('rune:')).length
const playEv = (cost: { mana: number; pips: readonly (readonly string[])[] }) => ({
  kind: 'playUnit', unit: asObjId('u'), player: P1,
  play: { card: asObjId('u'), to: asZoneId(BF0), cost, by: asObjId('sp') },
} as unknown as GameEvent)
const hand = () => obj('u', 'OGN-078', P1, `hand:${P1}`)
                                                                                                   
const handCheap = () => obj('u', 'OGN-013', P1, `hand:${P1}`)
const warden = () => obj('wd', 'OGN-070', P2, BF1)
const COST = { mana: 0, pips: [['orange']] } as const

describe('★★★★★★★ ★1249 playUnit{play} 那条效果打出路过统一闸(缺陷 153,§358.3.a 原例)', () => {
  test('★★★★★★①典狱长@BF1 ⇒ 打不到我控的 BF0:留手牌、不进 landed、费不付、战报不记', () => {
    const s = scene([hand(), warden(), rune('r1', 'orange')])
    expect(playBannedFor(s, P1, 'OGN-078', BF0), '★前提:典狱长第六档判打不出').toBe(true)
    const seen: string[] = []
    const r = applyEvents(s, [playEv(COST)], { ...DEPS, onEvent: (e) => { seen.push(e.kind) } })
    expect(defsIn(r.state, `hand:${P1}`), '★留在手牌').toContain('OGN-078')
    expect(defsIn(r.state, BF0), '★没落到被禁战场(修前:真落地)').not.toContain('OGN-078')
    expect(r.events, '★不进 landed').toEqual([])
    expect(runesInBase(r.state), '★跳在付费之前:符文一枚不少').toBe(1)
    expect(seen, '★战报不记').not.toContain('playUnit')
  })

  test('★★★★★★②对照:无典狱长 ⇒ 落到 BF0、进 landed、pip 照付(符文被回收)', () => {
    const s = scene([hand(), rune('r1', 'orange')])
    const r = applyEvents(s, [playEv(COST)], DEPS)
    expect(defsIn(r.state, BF0)).toContain('OGN-078')
    expect(r.events.map((e) => e.kind)).toContain('playUnit')
    expect(runesInBase(r.state), '★对照:付了一枚橙 pip').toBe(0)
  })

  test('★★★★③【第三态】deps 不给 playBanned ⇒ 老路一字不动(典狱长在也照落)', () => {
    const s = scene([hand(), warden(), rune('r1', 'orange')])
    const r = applyEvents(s, [playEv(COST)])
    expect(defsIn(r.state, BF0), '★没接判据 ⇒ 照旧落地(第三态是有意识的)').toContain('OGN-078')
  })

  test('★★★★★④SFD-111 候选侧:典狱长在 ⇒ 落点全禁 ⇒ 第二问不问;对照问得出 [BF0]', () => {
    const ask = (s: GameState) => SFD_111_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, { [SFD_111_PICK]: 'u' })
    expect(ask(scene([handCheap(), warden()])), '★全禁 ⇒ 不问').toBeNull()
    const q = ask(scene([handCheap()]))!
    expect(q.key).toBe(SFD_111_DEST)
    expect(q.candidates.map((c) => c.id), '★对照').toEqual([BF0])
  })

  test('★★★★★⑤SFD-111 makeResolve 硬塞落点:典狱长在 ⇒ 不发;对照发 playUnit{play}', () => {
    const resolve = (s: GameState) => SFD_111_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, { [SFD_111_PICK]: 'u', [SFD_111_DEST]: BF0 })
    expect(resolve(scene([handCheap(), warden()])), '★结算侧同闸').toEqual([])
    const evs = resolve(scene([handCheap()]))
    expect(evs.map((e) => e.kind), '★对照').toEqual(['playUnit'])
  })

  test('★★★★⑥拿真对局那份 rdeps 直喂:典狱长在 ⇒ 仍被拦(接线那半,与 rdepsPassthrough1247 同一口径)', () => {
    const s = scene([hand(), warden(), rune('r1', 'orange')])
    const rd = (new InteractiveGame(s, makeGameDeps(1)) as unknown as { rdeps: ReduceDeps }).rdeps
    const r = applyEvents(s, [playEv(COST)], rd)
    expect(defsIn(r.state, `hand:${P1}`)).toContain('OGN-078')
    expect(defsIn(r.state, BF0)).not.toContain('OGN-078')
  })
  test('★★★★★⑦SFD-024 芮尔(Workflow 收尾抓出):被禁手 ⇒ 候选滤空不问、硬塞 pick ⇒ playUnit 与 enqueueItem 两条都不发;对照两条都发', () => {
                                                                                          
    const rell = obj('rell', 'SFD-024', P1, BF0)
    const gear = { ...obj('g', 'SFD-022', P1, `hand:${P1}`, ['equipment']), baseMight: 0, baseTags: ['武装'] } as unknown as GameObject
    const trig = makeRellAttackTrigger(asObjId('rell'), P1)
    const attack = { kind: 'attack', unit: asObjId('rell'), player: P1, battlefield: BF0, responsible: [P1] } as unknown as GameEvent
    const s0 = scene([rell, gear])
    expect(trig.nextChoice!(s0, attack, {})!.candidates.map((c) => c.id), '★对照:候选照列').toEqual(['g'])
    expect(trig.effect(s0, attack, { [SFD_024_ASK]: 'g' }).map((e) => e.kind), '★对照:两条都发').toEqual(['playUnit', 'enqueueItem'])
    const banned = applyEvents(s0, [{ kind: 'banPlayCards', player: P1 } as unknown as GameEvent]).state
    expect(playBannedFor(banned, P1, 'SFD-022', `base:${P1}`), '★前提:禁手连装备一起禁(§052 主牌堆卡牌)').toBe(true)
    expect(trig.nextChoice!(banned, attack, {}), '★候选滤空 ⇒ 不问').toBeNull()
    expect(trig.effect(banned, attack, { [SFD_024_ASK]: 'g' }), '★硬塞 ⇒ 两条都不发(不留幽灵 enqueueItem)').toEqual([])
  })

})
