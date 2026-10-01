import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { boardValue, greedyAction, DEFAULT_WEIGHTS } from '../../src/bot/greedyBot'

                                          
                                         
                                                                  
                                                                    

installProviders()
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF1 = 'battlefield:shared:1'

function obj(oid: string, defId: string, ctrl: typeof P1, zone: string, extra: Partial<GameObject> = {}): GameObject {
  const spec = (specLookup(defId) ?? {}) as Partial<GameObject>
  return {
    ...spec, oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: spec.baseMight ?? 3, baseKeywords: spec.baseKeywords ?? [], baseTypes: spec.baseTypes ?? ['unit'],
    damage: 0, counters: {}, status: {}, ...extra,
  } as GameObject
}
const blank = (o: string, c: typeof P1, z: string, m: number): GameObject =>
  obj(o, 'OGN-175', c, z, { baseMight: m })

function scene(objs: GameObject[], patch: Partial<GameState> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, ...patch }
}
const mkDeps = (): InteractiveDeps => makeGameDeps(20260827) as InteractiveDeps

describe('★926 boardValue 打分口径', () => {
  test('得分差压倒性主导:少一点分,再多战力也补不回来', () => {
    const behind = scene([blank('a', P1, BF1, 9)], { scores: { P1: 0, P2: 1 } })
    const ahead = scene([blank('a', P1, BF1, 1)], { scores: { P1: 1, P2: 0 } })
    expect(boardValue(ahead, P1)).toBeGreaterThan(boardValue(behind, P1))
                                      
    expect(DEFAULT_WEIGHTS.score).toBeGreaterThan(DEFAULT_WEIGHTS.might * 8)
  })
  test('战力走 effectiveMight 而不是 baseMight:增益必须算进去', () => {
                                                    
    const host = blank('host', P1, BF1, 3)
    const bare = scene([host, blank('foe', P2, BF1, 3)])
    const gear = obj('g', 'SFD-033', P1, BF1, { status: { attachedTo: asObjId('host') } })
    const buffed = scene([host, gear, blank('foe', P2, BF1, 3)])
    expect(boardValue(buffed, P1), '装备加成必须体现在分数里').toBeGreaterThan(boardValue(bare, P1))
  })
  test('对称局面得分为 0(没有偏向任何一方的常数项)', () => {
    const sym = scene([blank('m', P1, BF1, 3), blank('t', P2, 'battlefield:shared:0', 3)])
    expect(boardValue(sym, P1)).toBeCloseTo(-boardValue(sym, P2), 6)
  })
})

describe('★926 greedyAction 的搜索边界', () => {
  test('action 模式:真的搜索,且返回的动作在 legalActions 里', () => {
    const g = new InteractiveGame(scene([blank('u', P1, `base:${P1}`, 3), blank('foe', P2, BF1, 1)]), mkDeps())
    expect(g.pending().mode).toBe('action')
    const r = greedyAction(g, P1, mkDeps)
    expect(r.action, '应当挑出一个动作').not.toBeNull()
    expect(r.scored.length, '每个候选都被打过分').toBeGreaterThan(0)
    const legal = g.legalActions(P1)
    expect(legal.some((a) => a.kind === r.action!.kind), '挑出来的动作必须来自合法白名单').toBe(true)
  })
  test('🔒 window 模式一律不搜索(重建会丢待决状态,搜出来是错的)', () => {
    const g = new InteractiveGame(scene([blank('u', P1, `base:${P1}`, 3), blank('foe', P2, BF1, 1)]), mkDeps())
    const mv = g.legalActions(P1).find((a) => a.kind === 'MOVE' && (a as { to?: string }).to === BF1)
    g.apply(mv!)
    expect(g.pending().mode, '走进敌方战场 ⇒ 开战 ⇒ 进优先权窗口').toBe('window')
    const r = greedyAction(g, P1, mkDeps)
    expect(r.action, 'window 下必须交还给调用方走默认策略').toBeNull()
    expect(r.scored).toHaveLength(0)
  })
  test('dry-run 不污染原局面(探针跑完,真局面一个字节没动)', () => {
    const g = new InteractiveGame(scene([blank('u', P1, `base:${P1}`, 3), blank('foe', P2, BF1, 1)]), mkDeps())
    const before = JSON.stringify(g.state)
    greedyAction(g, P1, mkDeps)
    expect(JSON.stringify(g.state), 'dry-run 只能在副本上跑').toBe(before)
  })
  test('㉖ 两道门同口径:legalActions 列出来的动作没有一条 apply 不动', () => {
    const g = new InteractiveGame(scene([
      blank('u', P1, `base:${P1}`, 3), blank('v', P1, `base:${P1}`, 2), blank('foe', P2, BF1, 1),
    ]), mkDeps())
    const r = greedyAction(g, P1, mkDeps)
    expect(r.faults, 'faults 非空 = 引擎缺陷,不是 bot 的问题').toEqual([])
  })
})
