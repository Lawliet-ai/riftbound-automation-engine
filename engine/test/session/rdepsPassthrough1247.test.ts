import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents, type ReduceDeps } from '../../src/loop/reduce'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'
import { playBannedFor } from '../../data/cards/longtail-12'
import { makeBlinkPlayTrigger } from '../../data/cards/SFD-200'

                                                                
                                                                                       
                                                                             
                                                                                                 
                                                        
                                                                                          
                                                                     
                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
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
const rdepsOf = (g: InteractiveGame): ReduceDeps => (g as unknown as { rdeps: ReduceDeps }).rdeps

                                                           
const FORWARDED: readonly (keyof ReduceDeps)[] = [
  'scoreBlockedAnywhere', // ★1112 缺陷 89:玩家级「无法得分」下沉到 gainPoint
  'playBanned',           // ★1247 缺陷 152 族:效果打出的「打不出」统一闸下沉到 playFree
]

describe('★★★★★★ ★1247 收尾:playBanned 从 InteractiveDeps 转发进 rdeps(接线的下半)', () => {
  test('★★★★★①rdeps.playBanned 就是 playBannedFor(不转发 ⇒ reducer 预闸在真对局 fail-open)', () => {
    const g = new InteractiveGame(scene([]), makeGameDeps(1))
    expect(rdepsOf(g).playBanned, '★★手工拼字段的 rdeps 必须显式转发这一行').toBe(playBannedFor)
  })

  test('★★★★②名单对账:凡名单里的判据,InteractiveDeps 有 ⇒ rdeps 同一引用', () => {
    const deps = makeGameDeps(1)
    const rd = rdepsOf(new InteractiveGame(scene([]), deps))
    for (const k of FORWARDED) {
      const src = (deps as unknown as Record<string, unknown>)[k]
      expect(src, `★前提:gameDeps 注入了 ${String(k)}`).toBeDefined()
      expect(rd[k], `★rdeps 没转发 ${String(k)} —— 去 InteractiveGame 构造函数补一行`).toBe(src)
    }
  })

  test('★★★★★③拿真对局那份 rdeps 直喂 applyEvents:P1 被禁手 ⇒ SFD-200 接力停留放逐区;对照无禁手照落', () => {
    const trig = makeBlinkPlayTrigger(asObjId('sp'), P1)
    const spell = obj('sp', 'SFD-200', P1, 'chain:shared', { baseMight: 0, baseTypes: ['spell'] as unknown as GameObject['baseTypes'] })
    const s0 = scene([spell, obj('u', 'OGN-078', P1, `exile:${P1}`)])
    const rd = rdepsOf(new InteractiveGame(s0, makeGameDeps(1)))
    const banned = applyEvents(s0, [{ kind: 'banPlayCards', player: P1 } as unknown as GameEvent], rd).state
    const ev = { kind: 'banished', card: asObjId('u'), player: P1, defId: 'OGN-078' } as unknown as GameEvent
    const r = applyEvents(banned, trig.effect(banned, ev, {}), rd)
    expect(defsIn(r.state, `exile:${P1}`), '★真对局 deps ⇒ 停留放逐区').toContain('OGN-078')
    expect(defsIn(r.state, `base:${P1}`)).not.toContain('OGN-078')
    const r2 = applyEvents(s0, trig.effect(s0, ev, {}), rd)
    expect(defsIn(r2.state, `base:${P1}`), '★对照:无禁手照落基地').toContain('OGN-078')
  })
})
