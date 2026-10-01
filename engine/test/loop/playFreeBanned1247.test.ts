import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { landEvent, type GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { makeGameDeps } from '../../data/gameDeps'
import { playBannedFor } from '../../data/cards/longtail-12'
import { makeBlinkPlayTrigger } from '../../data/cards/SFD-200'
import { makeRiftPlayTrigger } from '../../data/cards/VEN-066'

                                                       
                                                                                        
                                                                                         
                                                        
                                                     
                                                                
                                                                   
                                                                   
                                                                          
                                                                               
                                                                                  
                                                                            
                                                                    
                                                                    
                                                             
                                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const EXILE = (p: PlayerId) => `exile:${p}`
const DEPS = { playBanned: playBannedFor }

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const spell = (oid: string, def: string) => obj(oid, def, P1, 'chain:shared', { baseMight: 0, baseTypes: ['spell'] as unknown as GameObject['baseTypes'] })

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
const banishedEv = (card: string, def: string, from?: string) =>
  ({ kind: 'banished', card: asObjId(card), player: P1, defId: def, ...(from === undefined ? {} : { from }) } as unknown as GameEvent)

describe('★★★★★★★ ★1247 效果打出过统一闸(缺陷 152 族:§054 / §419.3 / FAQ L199+L203 同一原则)', () => {
  test('★★★★★★①SFD-200 奥术跃迁 × 禁手:接力打不出、停留放逐区;同批「放逐此牌」照发', () => {
    const trig = makeBlinkPlayTrigger(asObjId('sp'), P1)
    const s = ban(scene([spell('sp', 'SFD-200'), obj('u', 'OGN-078', P1, EXILE(P1))]), P1)
    expect(playBannedFor(s, P1, 'OGN-078', `base:${P1}`), '★前提:统一闸判打不出').toBe(true)
    const evs = trig.effect(s, banishedEv('u', 'OGN-078'), {})
    expect(evs.map((e) => e.kind), '★1251 起产地也闸(缺陷 154 共用件:一个打得出的落点都没有 ⇒ 打出跳过、「放逐此牌」照发);reducer 那道见 ④⑤').toEqual(['banish'])
    const r = applyEvents(s, evs, DEPS)
    expect(defsIn(r.state, EXILE(P1)), '★停留在放逐区').toContain('OGN-078')
    expect(defsIn(r.state, `base:${P1}`), '★修前落这里').not.toContain('OGN-078')
    expect(r.events.map((e) => e.kind), '★不进 landed、不派生 playUnit;法术自己的放逐照落').not.toContain('playFree')
    expect(r.events.map((e) => e.kind)).not.toContain('playUnit')
    expect(r.events.map((e) => e.kind)).toContain('banish')
    expect(defsIn(r.state, EXILE(P1)), '★「放逐此牌」照发:法术自己也进了放逐区').toContain('SFD-200')
  })

  test('★★★★★★②VEN-066 时空裂隙 SAME_PLACE × 典狱长@BF1:回不了 BF0、停留放逐区;典狱长不在 ⇒ 照回', () => {
    const trig = makeRiftPlayTrigger(asObjId('sp'), P1)
    const s = scene([spell('sp', 'VEN-066'), obj('u', 'OGN-078', P1, EXILE(P1)), obj('wd', 'OGN-070', P2, BF1)])
    expect(playBannedFor(s, P1, 'OGN-078', BF0), '★前提:典狱长第六档判打不出').toBe(true)
    const evs = trig.effect(s, banishedEv('u', 'OGN-078', BF0), {})
    expect((evs[0] as unknown as { to?: string }).to, '★SAME_PLACE 指回 BF0').toBe(BF0)
    const r = applyEvents(s, evs, DEPS)
    expect(defsIn(r.state, EXILE(P1)), '★停留在放逐区').toContain('OGN-078')
    expect(defsIn(r.state, BF0)).toEqual([])
               
    const s2 = scene([spell('sp', 'VEN-066'), obj('u', 'OGN-078', P1, EXILE(P1))])
    const r2 = applyEvents(s2, trig.effect(s2, banishedEv('u', 'OGN-078', BF0), {}), DEPS)
    expect(defsIn(r2.state, BF0), '★对照:照回 BF0').toContain('OGN-078')
  })

  test('★★★★★③SFD-200 × VEN-029 老老魄罗(turn 1,卡牌级「前三回合无法被打出」):停留;换张没禁令的卡 ⇒ 照打', () => {
    const trig = makeBlinkPlayTrigger(asObjId('sp'), P1)
    const s = scene([spell('sp', 'SFD-200'), obj('u', 'VEN-029', P1, EXILE(P1))])
    expect(playBannedFor(s, P1, 'VEN-029', `base:${P1}`), '★前提:卡牌级 PLAY_BANS 判打不出').toBe(true)
    const r = applyEvents(s, trig.effect(s, banishedEv('u', 'VEN-029'), {}), DEPS)
    expect(defsIn(r.state, EXILE(P1))).toContain('VEN-029')
    expect(defsIn(r.state, `base:${P1}`)).not.toContain('VEN-029')
    const s2 = scene([spell('sp', 'SFD-200'), obj('u', 'OGN-078', P1, EXILE(P1))])
    const r2 = applyEvents(s2, trig.effect(s2, banishedEv('u', 'OGN-078'), {}), DEPS)
    expect(defsIn(r2.state, `base:${P1}`), '★对照:无禁令 ⇒ 缺省落拥有者基地(playFree 缺省=基地是设计)').toContain('OGN-078')
    expect(r2.events.map((e) => e.kind), '★对照:landed 含 playFree + 派生 playUnit').toEqual(expect.arrayContaining(['playFree', 'playUnit']))
  })

  test('★★★★④【第三态】deps 不给 playBanned ⇒ 老路一字不动(纯造景测试不受影响,与 ★1112 同款约定)', () => {
                                                                                             
    const s = ban(scene([obj('u', 'OGN-078', P1, EXILE(P1))]), P1)
    const r = applyEvents(s, [{ kind: 'playFree', obj: asObjId('u'), player: P1 } as unknown as GameEvent])
    expect(defsIn(r.state, `base:${P1}`), '★没接判据 ⇒ 照旧落基地(第三态是有意识的)').toContain('OGN-078')
  })

  test('★★★★⑤landEvent 直调(纯函数点)同款闸:被禁 ⇒ 返回同一个 state 引用;不禁 ⇒ 真搬', () => {
    const s = ban(scene([obj('u', 'OGN-078', P1, EXILE(P1))]), P1)
    const ev = { kind: 'playFree', obj: asObjId('u'), player: P1 } as unknown as GameEvent
    expect(landEvent(s, ev, DEPS), '★引用相等 = 什么都没发生').toBe(s)
    const moved = landEvent(s, ev, {})
    expect(moved).not.toBe(s)
    expect(defsIn(moved, `base:${P1}`)).toContain('OGN-078')
  })

  test('★★★★⑥战报旁路 onEvent 看不到被拦下的打出(★780 纪律:拦在 landEvent 之前);对照组看得到', () => {
    const trig = makeBlinkPlayTrigger(asObjId('sp'), P1)
    const banned = ban(scene([spell('sp', 'SFD-200'), obj('u', 'OGN-078', P1, EXILE(P1))]), P1)
    const seenBanned: string[] = []
    applyEvents(banned, trig.effect(banned, banishedEv('u', 'OGN-078'), {}), { ...DEPS, onEvent: (e) => { seenBanned.push(e.kind) } })
    expect(seenBanned, '★被拦下的 playFree 不进战报').not.toContain('playFree')
    expect(seenBanned, '★同批的 banish 照记').toContain('banish')
    const free = scene([spell('sp', 'SFD-200'), obj('u', 'OGN-078', P1, EXILE(P1))])
    const seenFree: string[] = []
    applyEvents(free, trig.effect(free, banishedEv('u', 'OGN-078'), {}), { ...DEPS, onEvent: (e) => { seenFree.push(e.kind) } })
    expect(seenFree, '★对照:真打出进战报').toContain('playFree')
  })

  test('★★★⑦接线钉死【上半】:gameDeps 注进 InteractiveDeps 的 playBanned 就是 playBannedFor', () => {
                                                            
                                                                                        
    expect(makeGameDeps(1).playBanned).toBe(playBannedFor)
  })
})
