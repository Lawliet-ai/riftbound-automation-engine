                                                        
  
                                  
                                                                    
                                                
                            
  
                                                                              
                                                       
                                                       
                                                                             
                                           
  
      
                                                                    
                                  
                                                                     
                                          
                                                                       
                                    
                                                                             
  
                                                                                                  
import { describe, expect, test } from 'vitest'
import { advanceFepr, applyFeprDecision, submitChoice, GATING_SKIP_ITERATION_CAP, withTargetableCandidates } from '../../src/loop/chainFepr'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import { SKIPPED_BY_757 } from '../../src/loop/chain'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { SFD_107_SPEC, SFD_107_FOE_KEY, SFD_107_GEAR_KEY } from '../../data/cards/SFD-107'
import { UNL_192_SPEC, UNL_192_ATTACKER_KEY, UNL_192_TARGETS_PREFIX } from '../../data/cards/UNL-192'
import { UNL_054_SPEC, UNL_054_PREFIX, UNL_054_DEST_KEY } from '../../data/cards/UNL-054'
import { makeMountainPeakTrigger } from '../../data/cards/battlefields-extra'
import { makeDesertReaperTrigger } from '../../data/cards/VEN-145'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
type Any = Record<string, any>

                                                        
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
                                                                         
const shield = (o: GameObject): GameObject =>
  ({ ...o, derived: { ...(o.derived ?? {}), restrictions: [NO_ENEMY_TARGET] } } as unknown as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })
const geared = (host: string): GameObject =>
  obj('g1', 'SFD-009', P1, BF0, { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never, status: { attachedTo: asObjId(host) } })

function scene(objs: readonly GameObject[], chain: readonly ChainItem[] = []): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, chain: [...chain],
    runePools: { P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } } },
  } as GameState
}

                                                                                 
interface DriveOut { asks: { key: string; stage: string | undefined; candidates: string[] }[]; state: GameState; done: boolean; error: string | null }
function drive(s0: GameState, pick: (req: ChoiceRequest) => string, cap = 80): DriveOut {
  let s = s0
  const asks: DriveOut['asks'] = []
  let error: string | null = null
  let done = false
  try {
    for (let i = 0; i < cap; i++) {
      const step = advanceFepr(s)
      if (step.kind === 'done') { done = true; s = step.state; break }
      if (step.kind === 'choice') {
        asks.push({ key: String(step.request.key), stage: step.request.stage, candidates: step.request.candidates.map((c) => c.id) })
        s = submitChoice(step.state, step.request.key, pick(step.request))
        continue
      }
      s = applyFeprDecision(step.state, step.player, { kind: 'pass' })
    }
  } catch (e) { error = e instanceof Error ? e.message : String(e) }
  return { asks, state: s, done, error }
}

const attachedToOf = (s: GameState, oid: string): string | undefined =>
  (s.objects[oid as never] as unknown as { status?: { attachedTo?: string } })?.status?.attachedTo
const damageOf = (s: GameState, oid: string): number => (s.objects[oid as never] as unknown as { damage?: number })?.damage ?? 0
const zoneOf = (s: GameState, oid: string): string => String(s.objects[oid as never]?.zone)

                                                                          
                                                                                 
                                                                                     
function sfd107Item(id: string, target: string, forceFoeTarget: boolean): ChainItem {
  const next = SFD_107_SPEC.makeNextChoice!({ movedCardOid: id, controller: P1, target } as never)
  const resolve = SFD_107_SPEC.makeResolve!({ movedCardOid: id, controller: P1, target } as never)
  return {
    id: `play:${id}`, controller: P1, kind: 'spell', status: 'pending',
    confirmChoice: (st, chosen) => {
      const q = next(st, chosen)
      return q !== null && forceFoeTarget && q.key === SFD_107_FOE_KEY ? { ...q, isTarget: true } : q
    },
    resolve,
  }
}

describe('★1805c ㈠ SFD-107:§757 掐掉 FOE 这一问,GEAR 照问、卸武装照做', () => {
  test('敌方全不可选 ⇒ asks 只有 knockdownGear;武装真被卸除、敌方无伤', () => {
    const s = scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      shield(obj('foe', 'OGN-012', P2, BF0, { baseMight: 9 })),
    ], [sfd107Item('kd', 'a1', true)])
    const r = drive(s, (req) => (req.key === SFD_107_GEAR_KEY ? 'g1' : req.candidates[0]!.id))
    expect(r.error, `运行异常:${r.error}`).toBeNull()
    expect(r.asks.map((a) => a.key), '★FOE 被掐不问;GEAR 照问(修前整段消失 ⇒ asks=[])').toEqual([SFD_107_GEAR_KEY])
    expect(attachedToOf(r.state, 'g1'), '★卸武装照做').toBeUndefined()
    expect(damageOf(r.state, 'foe'), '★FOE 没问 ⇒ 无伤').toBe(0)
  })

  test('对照:有可选敌方 ⇒ FOE → GEAR 两问都问,伤害照打', () => {
    const s = scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      obj('foe', 'OGN-012', P2, BF0, { baseMight: 9 }),
    ], [sfd107Item('kd', 'a1', true)])
    const r = drive(s, (req) => (req.key === SFD_107_FOE_KEY ? 'foe' : req.key === SFD_107_GEAR_KEY ? 'g1' : req.candidates[0]!.id))
    expect(r.error, `运行异常:${r.error}`).toBeNull()
    expect(r.asks.map((a) => a.key), '★两问都问,顺序照卡文').toEqual([SFD_107_FOE_KEY, SFD_107_GEAR_KEY])
    expect(damageOf(r.state, 'foe'), '★伤害 = 友方战力 4').toBe(4)
    expect(attachedToOf(r.state, 'g1'), '★卸武装照做').toBeUndefined()
  })
})

                                                                               
                                                                  
function unl054Item(id: string, forcePickTarget: boolean): ChainItem {
  const base = UNL_054_SPEC.makeConfirmChoice!({ movedCardOid: id, controller: P1 } as never)
  return {
    id: `play:${id}`, controller: P1, kind: 'spell', status: 'pending',
    confirmChoice: (st, chosen) => {
      const q = base(st, chosen)
      return q !== null && forcePickTarget && q.key.startsWith(UNL_054_PREFIX) ? { ...q, isTarget: true } : q
    },
    resolve: () => [],
  }
}

describe('★1805c ㈡ UNL-054:pick 全被 §757 掐 ⇒ 不抛错;落点按卡自己的守卫不问', () => {
  test('敌方全不可选:无 tentaclePick 问、无 tentacleDest 问、无异常', () => {
    const s = scene([shield(obj('e1', 'OGN-012', P2, BF0)), shield(obj('e2', 'OGN-013', P2, BF0))], [unl054Item('tp', true)])
    const r = drive(s, (req) => req.candidates[0]!.id)
    expect(r.error, `运行异常:${r.error}`).toBeNull()
    expect(r.asks.some((a) => a.key.startsWith(UNL_054_PREFIX)), '★pick 被掐 ⇒ 一个 pick 问都不出').toBe(false)
                                                                          
                                                                       
    expect(r.asks.some((a) => a.key === UNL_054_DEST_KEY), '★落点按卡逻辑不问(不是引擎掐的)').toBe(false)
  })

  test('对照:敌方可选 ⇒ pick 逐问、候选带「够了」退出口,答一个后落点照问', () => {
    const s = scene([obj('e1', 'OGN-012', P2, BF0), obj('e2', 'OGN-013', P2, BF0)], [unl054Item('tp', true)])
    const r = drive(s, (req) => (req.key.endsWith('0') ? 'e1' : req.key === UNL_054_DEST_KEY ? req.candidates[0]!.id : MULTI_SELECT_DONE))
    expect(r.error, `运行异常:${r.error}`).toBeNull()
    const pick0 = r.asks.find((a) => a.key === `${UNL_054_PREFIX}0`)
    expect(pick0, '对照:pick0 问得出').toBeTruthy()
    expect(pick0!.candidates, '★multiSelect 的「够了」退出口没丢').toContain(MULTI_SELECT_DONE)
    expect(r.asks.some((a) => a.key === UNL_054_DEST_KEY), '★选了一个 ⇒ 落点照问').toBe(true)
  })
})

                                                                                       
const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target) && !((a.echoPicks?.length ?? 0) > 0)) ?? null) as InteractiveAction | null
}
function runScene(g0: InteractiveGame, initial: InteractiveAction, onChoice: (key: string, req: Any) => string): { asks: string[]; error: string | null } {
  const g = g0
  const asks: string[] = []
  let error: string | null = null
  let steps = 0
  try {
    g.apply(initial); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        asks.push(String(req.key))
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: onChoice(String(req.key), req) } as never)
      } else if (raw.mode === 'window') {
        g.apply({ kind: 'PASS', player: raw.player } as never)
      } else break
      steps++
    }
  } catch (e) { error = e instanceof Error ? `${e.name}: ${e.message}` : String(e) }
  return { asks, error }
}

describe('★1805c ㈢ UNL-202:敌方全不可选 ⇒ voidFoePick 不问,友方移动照做', () => {
  test('友方移到 BF1;敌方仍留在 BF0', () => {
                                                                        
                                     
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0), obj('foe', 'SFD-105', P2, BF0), inHand('vd', 'UNL-202', P1),
    ]), makeGameDeps(0x1805) as never)
    const initial = findCardPlay(g, P1, 'vd', 'a1')
    expect(initial, '找得到打出动作').toBeTruthy()
    const R = runScene(g, initial!, (key, req) => (key === 'voidFriendDest' ? BF1 : String((req.candidates as readonly Any[])[0]?.id ?? '')))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.asks, '★voidFoePick 被 §757 掐 ⇒ 不问').not.toContain('voidFoePick')
    expect(zoneOf(curState(g), 'a1'), '★友方那半照做').toBe(BF1)
    expect(zoneOf(curState(g), 'foe'), '★敌方那半落空').toBe(BF0)
  })

  test('对照:敌方可选 ⇒ voidFoePick 问得出、落点问得出,敌方照移', () => {
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0), obj('foe', 'OGN-012', P2, BF0), inHand('vd', 'UNL-202', P1),
    ]), makeGameDeps(0x1805) as never)
    const initial = findCardPlay(g, P1, 'vd', 'a1')
    expect(initial, '找得到打出动作').toBeTruthy()
    const R = runScene(g, initial!, (key, req) => (
      key === 'voidFriendDest' ? BF1
        : key === 'voidFoePick' ? 'foe'
          : key === 'voidFoeDest' ? `base:${P2}`
            : String((req.candidates as readonly Any[])[0]?.id ?? '')
    ))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.asks, '★对照:voidFoePick 问得出').toContain('voidFoePick')
    expect(zoneOf(curState(g), 'a1'), '★友方移到 BF1').toBe(BF1)
    expect(zoneOf(curState(g), 'foe'), '★敌方移到其基地').toBe(`base:${P2}`)
  })
})

                                                                     
describe('★1805c ㈣ 迭代上限:病理 spec 抛错,不死循环', () => {
  test('confirmChoice 恒返回同一问 ⇒ 抛「§757 掐链循环」而不是死循环', () => {
    const fake: ChainItem = {
      id: 'play:loop', controller: P1, kind: 'spell', status: 'pending',
      confirmChoice: (): ChoiceRequest => ({
        itemId: 'play:loop', controller: P1, key: 'sameAsk', prompt: '',
        isTarget: true, candidates: [{ id: 'foe', label: 'foe' }],
      }),
      resolve: () => [],
    }
    const s = scene([shield(obj('foe', 'OGN-012', P2, BF0))], [fake])
    const r = drive(s, (req) => req.candidates[0]!.id)
    expect(r.error, '★必须抛错,不能静默/死循环').toMatch(/§757 掐链循环/)
    expect(GATING_SKIP_ITERATION_CAP, '上限是有限正整数').toBeGreaterThan(0)
    expect(Number.isFinite(GATING_SKIP_ITERATION_CAP)).toBe(true)
  })
})

                                                                                             
                                                                           
                                                                           
const ledger = (g: InteractiveGame): { enemyTargetedThisTurn: Record<string, { unitAbility?: number; spell?: number }> | null } => ({
  enemyTargetedThisTurn: ((curState(g) as unknown as Record<string, unknown>).enemyTargetedThisTurn ?? null) as never,
})
interface SessionAsk { key: string; candidates: string[] }
function runSession(g0: InteractiveGame, initial: unknown, onChoice: (key: string, req: Any) => string): { asks: SessionAsk[]; error: string | null } {
  const g = g0
  const asks: SessionAsk[] = []
  let error: string | null = null
  let steps = 0
  try {
    g.apply(initial as never)
    for (; steps < STEP_CAP; steps++) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        asks.push({ key: String(req.key), candidates: ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id)) })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: onChoice(String(req.key), req) } as never)
      } else if (raw.mode === 'window') {
        g.apply({ kind: 'PASS', player: raw.player } as never)
      } else break
    }
  } catch (e) { error = e instanceof Error ? `${e.name}: ${e.message}` : String(e) }
  return { asks, error }
}

describe('★1805c ㈥ ③ OGN-041 分摊:候选接 §757;同一单位分多点仍只发一条 targeted', () => {
  test('不可选取的敌方不在分摊候选里;可选取的照分', () => {
                                                          
                                                
                                                
    const g = new InteractiveGame(scene([
      obj('voli', 'OGN-041', P1, BF0, { baseMight: 9, status: { ready: true } } as never),
      obj('foe', 'SFD-105', P2, BF0, { baseMight: 9 }), // 不可被敌方法术/技能选作目标
      obj('plainFoe', 'BLK', P2, BF0, { baseMight: 9 }),
    ]), makeGameDeps(0x1805) as never)
    const R = runSession(g, { kind: 'ATTACK', player: P1, battlefield: BF0 }, (key, req) =>
      key.startsWith('OGN-041:hit:') ? 'plainFoe' : String((req.candidates as readonly Any[])[0]?.id ?? ''))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const hits = R.asks.filter((a) => a.key.startsWith('OGN-041:hit:'))
    expect(hits.length, '★分摊逐点问出现').toBeGreaterThan(0)
    expect(hits[0]!.candidates, '★★候选含 plainFoe').toContain('plainFoe')
    expect(hits[0]!.candidates, '★★候选【不】含不可选取的 foe(§757 门接上)').not.toContain('foe')
    expect(ledger(g).enemyTargetedThisTurn?.P1?.unitAbility, '★落点只有 plainFoe ⇒ 1 条 targeted').toBe(1)
  })

  test('同一单位分多点 ⇒ targeted 只发一条(证明没顺手给分摊加 isTarget)', () => {
    const g = new InteractiveGame(scene([
      obj('voli', 'OGN-041', P1, BF0, { baseMight: 9, status: { ready: true } } as never),
      obj('plainFoe', 'BLK', P2, BF0),
    ]), makeGameDeps(0x1805) as never)
    const R = runSession(g, { kind: 'ATTACK', player: P1, battlefield: BF0 }, (key, req) =>
      key.startsWith('OGN-041:hit:') ? 'plainFoe' : String((req.candidates as readonly Any[])[0]?.id ?? ''))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(ledger(g).enemyTargetedThisTurn?.P1?.unitAbility, '★5 点全砸一个 ⇒ 去重后 1 条(不是 5 条)').toBe(1)
  })
})

                                                                              
describe('★1805c ㈦ 结算期 nextChoice:同样只掐这一问', () => {
  const mkResolveItem = (): ChainItem => ({
    id: 'play:r', controller: P1, kind: 'spell', status: 'confirmed',
    nextChoice: (_st, chosen) => {
      if (chosen['q1'] === undefined) return { itemId: 'play:r', controller: P1, key: 'q1', prompt: '', isTarget: true, candidates: [{ id: 'foe', label: 'foe' }] }
      if (chosen['q2'] === undefined) return { itemId: 'play:r', controller: P1, key: 'q2', prompt: '', candidates: [{ id: 'after', label: 'after' }] }
      return null
    },
    resolve: () => [],
  })

  test('q1 被 §757 掐 ⇒ q2 照问(修前整段 nextChoice 消失)', () => {
    const s = { ...scene([shield(obj('foe', 'OGN-012', P2, BF0))], [mkResolveItem()]), feprPasses: 2 }
    const step = advanceFepr(s)
    expect(step.kind, '停在结算期问').toBe('choice')
    expect(step.kind === 'choice' ? step.request.key : '', '★q2 照问(不是整段消失)').toBe('q2')
  })

  test('对照:q1 可选取 ⇒ 先问 q1', () => {
    const s = { ...scene([obj('foe', 'OGN-012', P2, BF0)], [mkResolveItem()]), feprPasses: 2 }
    const step = advanceFepr(s)
    expect(step.kind === 'choice' ? step.request.key : '', '★对照:先问 q1').toBe('q1')
  })
})

                                                                                 
describe('★1805c ㈤ 回归', () => {
  test('SKIPPED_BY_757 与 multiSelect 的「够了」哨兵同值(否则被掐的多选会一路往下问)', () => {
    expect(SKIPPED_BY_757, '⚠️ 改一处会红 —— 见 chain.ts 该常量的头注').toBe(MULTI_SELECT_DONE)
  })

  test('VEN-145 / OGN-289 的符文多选:标 isTarget 后「够了」退出口照旧,§757 门不误伤', () => {
    const runeObj = (oid: string, who: PlayerId): GameObject =>
      obj(oid, 'rune:blue', who, `base:${who}`, { baseTypes: ['rune'] as never })
    const s = scene([runeObj('r1', P1), runeObj('r2', P1)])
    const peak = makeMountainPeakTrigger(BF0, P1)
    const qPeak = peak.nextChoice!(s, {} as never, {})
    expect(qPeak?.key.startsWith('peakRune'), 'OGN-289 首问 = 符文多选').toBe(true)
    expect(qPeak?.isTarget, '★本单补的标').toBe(true)
    expect(qPeak!.candidates.map((c) => c.id), '★「够了」退出口没丢').toContain(MULTI_SELECT_DONE)
    expect(withTargetableCandidates(s, qPeak!)?.candidates.map((c) => c.id), '★符文没有这条限制 ⇒ 候选原样保留')
      .toContain(MULTI_SELECT_DONE)

    const reaper = makeDesertReaperTrigger(asObjId('lord'), P1, 'playUnit')
    const qReap = reaper.nextChoice!(s, {} as never, {})
    expect(qReap?.key.startsWith('reaperRune'), 'VEN-145 首问 = 符文多选').toBe(true)
    expect(qReap?.isTarget, '★本单补的标').toBe(true)
    expect(qReap!.candidates.map((c) => c.id), '★「够了」退出口没丢').toContain(MULTI_SELECT_DONE)
  })
})

                                                              
                                                                                
                                                                      
                                                                  
                                                                
                                                                   
describe('★1805d ① UNL-192 分摊:`mustFeed` 用过滤后的池(§758.1 滤掉的不算「还没喂到」)', () => {
  const splitFrozen2 = {
    [UNL_192_ATTACKER_KEY]: 'mine',
    [`${UNL_192_TARGETS_PREFIX}0`]: 'e1',
    [`${UNL_192_TARGETS_PREFIX}1`]: 'e2',
  }
  const mine = (): GameObject => obj('mine', 'OGN-078', P1, BF0, { baseMight: 3 })

                                               
  const runSplit192 = (s: GameState, greedy: string): { asks: string[]; dmg: Record<string, number> } => {
    let ch: Record<string, string> = { ...splitFrozen2 }
    const asks: string[] = []
    for (let i = 0; i < 12; i++) {
      const q = UNL_192_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 } as never)(s, ch as never)
      if (q === null) break
      const ids = q.candidates.map((c) => c.id)
      asks.push(`${q.key}[${ids.join(',')}]`)
      ch = { ...ch, [q.key]: ids.includes(greedy) ? greedy : ids[0]! }
    }
    const dmg: Record<string, number> = {}
    const evs = UNL_192_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1 } as never)(s, ch as never)
    for (const e of evs as readonly { kind: string; target?: string; amount?: number }[]) {
      if (e.kind === 'damage') dmg[String(e.target)] = e.amount!
    }
    return { asks, dmg }
  }

  test('㈠ e1 结算前变为不可选取 ⇒ 3 点**全部**落地 e2(e1 damage=0);命中问恰 3 次', () => {
    const s = scene([mine(), shield(obj('e1', 'OGN-012', P2, BF0, { baseMight: 9 })), obj('e2', 'OGN-013', P2, BF0, { baseMight: 9 })])
    const r = runSplit192(s, 'e2')
    expect(r.asks.length, '★修前:第 3 点凭空消失 ⇒ 只有 2 问(ds1805c ③ 引入的回归)').toBe(3)
    expect(r.dmg, '★★3 点全在 e2;e1 已是「不再成为目标」(§758.1)⇒ 0').toEqual({ e2: 3 })
    expect(r.asks[2], '★最后一点时池里只剩 e2').toBe('UNL-192:hit2[e2]')
  })

  test('㈡ 对照:e1 仍可选取 ⇒ 2+1 或 1+2,两者都 ≥1(§355.14.f)', () => {
    const s = scene([mine(), obj('e1', 'OGN-012', P2, BF0, { baseMight: 9 }), obj('e2', 'OGN-013', P2, BF0, { baseMight: 9 })])
    const r = runSplit192(s, 'e1')
    expect(r.dmg.e1! > 0 && r.dmg.e2! > 0, '★每个留存目标都必须吃到有效伤害').toBe(true)
    expect((r.dmg.e1 ?? 0) + (r.dmg.e2 ?? 0), '★合计仍 3 点').toBe(3)
    expect(r.dmg, '★贪心 e1 ⇒ 2+1').toEqual({ e1: 2, e2: 1 })
  })

  test('㈢ 全部目标都变不可选取 ⇒ 一点都不发、不抛错、不死循环', () => {
    const s = scene([mine(), shield(obj('e1', 'OGN-012', P2, BF0, { baseMight: 9 })), shield(obj('e2', 'OGN-013', P2, BF0, { baseMight: 9 }))])
    let r: { asks: string[]; dmg: Record<string, number> } | null = null
    expect(() => { r = runSplit192(s, 'e1') }, '★不抛错').not.toThrow()
    expect(r!.asks, '★候选空 ⇒ 直接收尾,无死循环').toEqual([])
    expect(r!.dmg, '★无合法落点 ⇒ 无伤').toEqual({})
  })
})

                                                                       
                                                                              
                                                                           
describe('★1805d ② SFD-107 `knockdownFoe` 补标 isTarget', () => {
  const a1 = (): GameObject => obj('a1', 'OGN-078', P1, BF0, { baseMight: 3 })
  const foeAsk = (s: GameState, chosen: Record<string, string> = {}) =>
    SFD_107_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target: 'a1' } as never)(s, chosen as never)

  test('㈠ 啸匪在场 ⇒ FOE 候选**不含**它、它不挨伤害;对照(有别的敌方)⇒ 正常打', () => {
    const s = scene([
      a1(), geared('a1'),
      shield(obj('shif', 'SFD-105', P2, BF0, { baseMight: 5 })),
      obj('plainFoe', 'BLK', P2, BF0, { baseMight: 5 }),
    ])
    const q = foeAsk(s)
    expect(q?.key).toBe(SFD_107_FOE_KEY)
    expect(q?.isTarget, '★补标生效').toBe(true)
    const gated = withTargetableCandidates(s, q!)
    expect(gated, '★有可选取敌方 ⇒ 这一问照出').not.toBeNull()
    expect(gated!.candidates.map((c) => c.id), '★候选含 plainFoe').toContain('plainFoe')
    expect(gated!.candidates.map((c) => c.id), '★★候选不含带限制的啸匪(§757)').not.toContain('shif')
                            
    const evs = SFD_107_SPEC.makeResolve!({ movedCardOid: 'sp', controller: P1, target: 'a1' } as never)(s,
      { [SFD_107_FOE_KEY]: 'plainFoe', [SFD_107_GEAR_KEY]: 'g1' } as never) as readonly { kind: string; target?: string }[]
    const dmg = evs.filter((e) => e.kind === 'damage').map((e) => String(e.target))
    expect(dmg).toEqual(['plainFoe'])
  })

  test('㈡ 标上后:答案进 `targets`、`enemyTargetedThisTurn` 有记账(§355.6)', () => {
    const g = new InteractiveGame(scene([
      a1(), geared('a1'),
      shield(obj('shif', 'SFD-105', P2, BF0, { baseMight: 5 })),
      obj('plainFoe', 'BLK', P2, BF0, { baseMight: 5 }),
      inHand('kd', 'SFD-107', P1),
    ]), makeGameDeps(0x1805) as never)
    const initial = findCardPlay(g, P1, 'kd', 'a1')
    expect(initial, '找得到击倒的打出动作').toBeTruthy()
    g.apply(initial!)
    let targets: readonly string[] = []
    const asked: string[] = []
    let error: string | null = null
    try {
      for (let steps = 0; steps < STEP_CAP; steps++) {
        const raw = g.pending() as Any
        if (raw.mode === 'choice') {
          const req = raw.request as Any
          asked.push(String(req.key))
          const answer = String(req.key) === SFD_107_FOE_KEY ? 'plainFoe'
            : String(req.key) === SFD_107_GEAR_KEY ? 'g1'
              : String((req.candidates as readonly Any[])[0]?.id ?? '')
          g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer } as never)
        } else if (raw.mode === 'window') {
          if (targets.length === 0) {
            const it = (curState(g).chain as readonly Any[]).find((c) => (c.targets?.length ?? 0) > 0)
            if (it) targets = it.targets as readonly string[]
          }
          g.apply({ kind: 'PASS', player: raw.player } as never)
        } else break
      }
    } catch (e) { error = e instanceof Error ? e.message : String(e) }
    expect(error, `运行异常:${error}`).toBeNull()
    expect(asked, 'FOE 照问').toContain(SFD_107_FOE_KEY)
    expect([...targets], '★★答案进链项目 targets').toContain('plainFoe')
    expect([...targets], '★啸匪不在候选 ⇒ 也没进 targets').not.toContain('shif')
    const ledger = (curState(g) as unknown as Record<string, unknown>).enemyTargetedThisTurn as
      Record<string, { spell?: number }> | null | undefined
    expect(ledger?.P1?.spell ?? 0, '★★§355.6 targeted 有记账').toBeGreaterThanOrEqual(1)
  })

  test('㈢ 啸匪是**唯一**敌方 ⇒ FOE 被掐,但 knockdownGear 照问(① 的回归)', () => {
    const s = scene([a1(), geared('a1'), shield(obj('shif', 'SFD-105', P2, BF0, { baseMight: 5 }))])
    const q = foeAsk(s)
    expect(q?.key, '首问仍是 FOE').toBe(SFD_107_FOE_KEY)
    expect(q?.isTarget, '★补标生效').toBe(true)
    expect(withTargetableCandidates(s, q!), '★唯一敌方不可选取 ⇒ 这一问被掐').toBeNull()
    const q2 = foeAsk(s, { [SFD_107_FOE_KEY]: SKIPPED_BY_757 })
    expect(q2?.key, '★被掐后落到 knockdownGear,照问').toBe(SFD_107_GEAR_KEY)
  })
})
