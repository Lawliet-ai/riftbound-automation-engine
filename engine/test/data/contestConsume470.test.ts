import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'

                                                                    
                                                     
                                                            
                                             
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, green: 3, blue: 3, orange: 3, colorless: 3 } },
    },
  } as GameState
}
const mk = (oid: string, zone: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'] as never, damage: 0, counters: {}, status: {},
  ...extra,
}) as GameObject
const spell = (oid: string): GameObject => ({ ...mk(oid, `hand:${P1}`), defId: 'OGN-173', baseMight: 0, baseTypes: ['spell'] as never }) as GameObject
const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()

                                                      
function play(s0: GameState, target: string, pick: (key: string, cands: readonly { id: string }[]) => string): InteractiveGame {
  const g = new InteractiveGame(s0, IG_DEPS)
  const act = g.legalActions(P1).find((a) =>
    (a as { cardOid?: string }).cardOid === 'sp' && (a as { target?: string }).target === target)
  expect(act, '前提自证:打出动作列得出来').toBeDefined()
  g.apply(act!)
  for (let i = 0; i < 40; i++) {
    const p = g.pending()
    if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
    if (p.mode === 'choice') {
      g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: pick(p.request.key, p.request.candidates) })
      continue
    }
    break
  }
  return g
}

describe('🔴★★★★★端到端:效果移动落地后真开战/真对决真征服', () => {
  test('🔴★★★★①移进敌场 ⇒ 链空消费 ⇒ 战斗真打(§316.7.b 效果同样引发)', () => {
    const bf0 = 'battlefield:shared:0'
    const s0 = scene([mk('home', `base:${P1}`), mk('blocker', bf0, P2), spell('sp')])
    const g = play(s0, 'home', (k, c) => (k.includes('dest') || true) ? c.find((x) => x.id === bf0)?.id ?? c[0]!.id : c[0]!.id)
    expect(g.state.lastCombat, '战斗真的发生了(接管线前这里恒 undefined)').toBeDefined()
    expect(g.state.lastCombat?.battlefield).toBe(bf0)
    expect(g.state.pendingContests ?? [], '队列消费干净').toEqual([])
  })

  test('🔴★★★★★②移永恩进开放战场 ⇒ 对决 ⇒ 征服带 wasOpen ⇒ 永恩触发打基地敌方(债⑩同销)', () => {
    const bf1 = 'battlefield:shared:1'
    const s0 = scene([
      mk('yone', `base:${P1}`, P1, { defId: 'SFD-116', baseMight: 4 }),
      mk('foe', `base:${P2}`, P2, { baseMight: 10 }), // 战力 10:吃 4 伤不致命,damage 可断言
      spell('sp'),
    ])
    const g = play(s0, 'yone', (_k, c) => c.find((x) => x.id === bf1)?.id ?? c[0]!.id)
    expect(g.state.objects['yone' as ObjId]?.zone as string, '永恩真挪过去了').toBe(bf1)
    expect(g.state.scores[P1 as string], '空场征服得 1 分(接管线前效果移动永远不得分)').toBe(1)
    expect(g.state.objects['foe' as ObjId]?.damage, '永恩触发:对基地敌方造成我战力 4 伤害(wasOpen 通道)').toBe(4)
    expect(g.state.pendingContests ?? []).toEqual([])
  })

  test('★★③对照组:移进【己控】战场 ⇒ 不标不打不得分', () => {
    const bf0 = 'battlefield:shared:0'
    const s0 = scene([mk('home', `base:${P1}`), mk('mate', bf0, P1), spell('sp')])
    const g = play(s0, 'home', (_k, c) => c.find((x) => x.id === bf0)?.id ?? c[0]!.id)
    expect(g.state.lastCombat).toBeUndefined()
    expect(g.state.scores[P1 as string] ?? 0).toBe(0)
    expect(g.state.pendingContests ?? []).toEqual([])
  })
})

describe('🔴★★★★单元级:蒸发与守卫(consumePendingContests 直调)', () => {
  type Poke = { consumePendingContests(): void; state: GameState; window: unknown }

  test('🔴★★★蒸发:争夺方单位已不在该战场 ⇒ 出队且什么都不开(§461)', () => {
    const bf1 = 'battlefield:shared:1'
    const g = new InteractiveGame(scene([mk('u1', `base:${P1}`)]), IG_DEPS) as unknown as Poke
    g.state = { ...g.state, pendingContests: [{ battlefield: asZoneId(bf1), causedBy: P1 }] }
    g.consumePendingContests()
    expect(g.state.pendingContests, '出队').toEqual([])
    expect(g.state.spellDuelActive, '没开对决').toBe(false)
    expect((g.state as GameState).lastCombat, '没开战').toBeUndefined()
  })

  test('🔴★★★471 补档·替敌方争夺:causedBy=P2 的标记消费 ⇒ attack 以【P2】为进攻方(§450/§464.2.c.1;布里茨拉敌/娅希拉移敌共性)', () => {
    const bf0 = 'battlefield:shared:0'
    const g = new InteractiveGame(scene([mk('mine', bf0, P1), mk('enemy', bf0, P2)]), IG_DEPS) as unknown as Poke & { pendingCombat: { attacker: string } | null }
    g.state = { ...g.state, pendingContests: [{ battlefield: asZoneId(bf0), causedBy: P2 }] }
    g.consumePendingContests()
    expect(g.pendingCombat?.attacker, '进攻方 = 令战场进入争夺的玩家 = 被移动单位的控制者 P2,不是效果发起者').toBe(P2)
  })

  test('🔴★★★471 补档·娅希拉空场边界:causedBy=P2 进空场 ⇒ P2 的非战斗对决开(替敌方争夺→对手征服路)', () => {
    const bf1 = 'battlefield:shared:1'
    const g = new InteractiveGame(scene([mk('enemy', bf1, P2)]), IG_DEPS) as unknown as Poke
    g.state = { ...g.state, pendingContests: [{ battlefield: asZoneId(bf1), causedBy: P2 }] }
    g.consumePendingContests()
    expect(g.state.spellDuelActive, '对决开了').toBe(true)
    expect(g.state.focus, '争夺方(对决焦点)= P2').toBe(P2)
  })

  test('🔴★★守卫:window 开着 ⇒ 队列原样不动(幂等,下一次 done 再试)', () => {
    const bf1 = 'battlefield:shared:1'
    const g = new InteractiveGame(scene([mk('u1', bf1, P1)]), IG_DEPS) as unknown as Poke
    g.state = { ...g.state, pendingContests: [{ battlefield: asZoneId(bf1), causedBy: P2 }] }
    g.window = { kind: 'decision' }
    g.consumePendingContests()
    expect(g.state.pendingContests, '守卫挡下,一条没动').toHaveLength(1)
  })
})
