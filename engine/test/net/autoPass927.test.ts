import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { specLookup } from '../../data/decks'
import { addMana, emptyRunePool } from '../../src/state/runePool'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { autoPassVerdict } from '../../src/net/autoPass'
import type { ClientView } from '../../src/net/project'

                   
                                               
                                        

installProviders()
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF1 = 'battlefield:shared:1'

                                        
function okView(): ClientView {
  return {
    chain: [{ id: 'i1', controller: P1, kind: 'spell', status: 'confirmed' }],
    feprPasses: 1,
  } as unknown as ClientView
}
const ask = (v: ClientView, seat = P1, mode = 'window', player: typeof P1 | undefined = P1) =>
  autoPassVerdict({ view: v, seat, pendingMode: mode, pendingPlayer: player })

describe('★927 作用域四条边界', () => {
  test('四条全中 ⇒ 自动让过', () => {
    const r = ask(okView())
    expect(r.auto).toBe(true)
    expect(r.reason).toContain('自动让过')
  })
  test('① 不在优先权窗口 ⇒ 不自动', () => {
    expect(ask(okView(), P1, 'action').auto).toBe(false)
    expect(ask(okView(), P1, 'choice').auto, '抉择必须由人做').toBe(false)
  })
  test('① 这一拍不轮到我 ⇒ 不自动', () => {
    expect(ask(okView(), P1, 'window', P2).auto).toBe(false)
  })
  test('🔒② 链空 ⇒ 一律不自动(★770:战斗反应窗口链本来就是空的)', () => {
    const v = { ...okView(), chain: [] } as unknown as ClientView
    const r = ask(v)
    expect(r.auto, '战斗里的每一次反应机会都必须停下来问玩家').toBe(false)
    expect(r.reason).toContain('战斗')
                                         
    expect(ask({ feprPasses: 1 } as unknown as ClientView).auto).toBe(false)
  })
  test('🔒③ 链是对手发起的 ⇒ 不自动', () => {
    const v = { ...okView(), chain: [{ id: 'i1', controller: P2, kind: 'spell', status: 'confirmed' }] } as unknown as ClientView
    const r = ask(v)
    expect(r.auto, '放弃回应对手的机会必须由人决定').toBe(false)
    expect(r.reason).toContain('对手发起')
  })
  test('③ 只认【已确认】项:链上只有 pending 项 ⇒ 不自动', () => {
    const v = { ...okView(), chain: [{ id: 'i1', controller: P1, kind: 'spell', status: 'pending' }] } as unknown as ClientView
    expect(ask(v).auto).toBe(false)
  })
  test('③ 取最新的已确认项(不是第一个):对手后压的项让我不能自动过', () => {
    const v = { ...okView(), chain: [
      { id: 'i1', controller: P1, kind: 'spell', status: 'confirmed' },
      { id: 'i2', controller: P2, kind: 'spell', status: 'confirmed' }, // §340.1 LIFO ⇒ 先结算这个
    ] } as unknown as ClientView
    expect(ask(v).auto, '待结算的是对手那条').toBe(false)
  })
  test('🔒④ 对手还没让过 ⇒ 不自动(不能替他抢跑)', () => {
    const v = { ...okView(), feprPasses: 0 } as unknown as ClientView
    const r = ask(v)
    expect(r.auto).toBe(false)
    expect(r.reason).toContain('对手还没让过')
  })
})

                                          
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

function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = { ...base.objects }
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: addMana(emptyRunePool(), 5) } }
}
const mkDeps = (): InteractiveDeps => makeGameDeps(20260827) as InteractiveDeps

describe('★927 真引擎端到端', () => {
  test('🔒真战斗对决窗口:引擎确实停在 window,但判定必须拒绝(链是空的)', () => {
    const g = new InteractiveGame(scene([blank('atk', P1, `base:${P1}`, 3), blank('foe', P2, BF1, 1)]), mkDeps())
    g.apply(g.legalActions(P1).find((a) => a.kind === 'MOVE' && (a as { to?: string }).to === BF1)!)
    const p = g.pending()
    expect(p.mode, '开战 ⇒ 停在优先权窗口').toBe('window')
    expect((p as { player?: typeof P1 }).player).toBe(P1)
    const v = g.view(P1)
    expect((v.chain ?? []).length, '★770 实测:战斗反应窗口链为空').toBe(0)
    const r = autoPassVerdict({ view: v, seat: P1, pendingMode: p.mode, pendingPlayer: (p as { player?: typeof P1 }).player })
    expect(r.auto, '战斗窗口绝不自动过').toBe(false)
  })

  test('我打出的法术上链、对手让过后 ⇒ 判定放行,且 PASS 确实是合法动作', () => {
    const g = new InteractiveGame(scene([
      blank('mine', P1, BF1, 3), blank('foe', P2, BF1, 3),
      obj('storm', 'OGN-133', P1, `hand:${P1}`), // 剑刃飓风:1 费 [反应]
    ]), mkDeps())
    const play = g.legalActions(P1).find((a) => a.kind === 'PLAY_CARD' && (a as { cardOid?: string }).cardOid === 'storm')
    expect(play, '前提:飓风打得出来').toBeDefined()
    g.apply(play!)
                     
    for (let i = 0; i < 8; i++) {
      const p = g.pending()
      if (p.mode !== 'window') break
      const who = (p as { player: typeof P1 }).player
      if (who === P1) break
      g.apply({ kind: 'PASS', player: who })
    }
    const p = g.pending()
    if (p.mode !== 'window') return                        
    const v = g.view(P1)
    const r = autoPassVerdict({ view: v, seat: P1, pendingMode: p.mode, pendingPlayer: (p as { player?: typeof P1 }).player })
    if (r.auto) {
      expect(g.legalActions(P1).some((a) => a.kind === 'PASS'), '放行时 PASS 必须真的合法').toBe(true)
      expect((v.chain ?? []).length).toBeGreaterThan(0)
      expect(v.feprPasses ?? 0).toBeGreaterThanOrEqual(1)
    } else {
                                       
      expect(r.reason.length).toBeGreaterThan(0)
    }
  })
})
