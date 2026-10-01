                                                                    
                                                                   
                                                 
  
                                          
                                                                        
                                                      
                                                          
                                                                                
                                        
                                                                
                                                                                           
                                                           
                                                                                   
                                                                   
                                                                            
                                                            
                                                                       
                                                                         
                                                                          
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { activeTriggers } from '../../data/registry'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { Trigger } from '../../src/dsl/trigger'
import { detectTriggersForBatchAndNote } from '../../src/dsl/trigger'
import { addItems } from '../../src/loop/chain'
import { MAY_CHOOSE_DECLINE, MAY_CHOOSE_KEY, runFepr, TRIGGER_ORDER_KEY } from '../../src/loop/chainFepr'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { assertInvariants } from '../../src/test/invariants'

installProviders()

type Any = Record<string, any>
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SEED = 0x1799
const FULL_POOL = { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } }

                                                                      
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })
const legend = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `legend:${who}`, { baseMight: 0, baseTypes: ['legend'] as never })

function scene(objs: readonly GameObject[], bfCard?: { defId: string; owner: PlayerId }): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 10; k++) {
    const id = `deck${i++}`
    objects[id] = obj(id, 'BLK', p, `mainDeck:${p}`)
    const z = zones[`mainDeck:${p}`]!
    zones[`mainDeck:${p}`] = { ...z, contents: [...z.contents, asObjId(id)] }
  }
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { P1: { ...FULL_POOL }, P2: { ...FULL_POOL } },
    ...(bfCard !== undefined ? { battlefieldCards: { [BF0]: bfCard } } : {}),
  } as GameState
}

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const chainIds = (g: InteractiveGame): string[] => (curState(g).chain as unknown as Any[]).map((i) => String(i.id))
const findPlay = (g: InteractiveGame, p: PlayerId, cardOid: string): InteractiveAction | null =>
  ((g.legalActions(p) as unknown as Any[]).find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid) as InteractiveAction | undefined) ?? null

interface Ask { step: number; turn: number; itemId: string; key: string; candidates: string[]; answer: string; chain: string[] }

interface DriveOut { asks: Ask[]; error: string | null; hitCap: boolean }

   
         
                                                       
                                             
                                        
   
function drive(g: InteractiveGame, o: {
  answerMay?: string
  onWindow?: (g: InteractiveGame) => InteractiveAction | null
  onAction?: (g: InteractiveGame) => InteractiveAction | null
  maxSteps?: number
}): DriveOut {
  const asks: Ask[] = []
  const max = o.maxSteps ?? 300
  const answerMay = o.answerMay ?? MAY_CHOOSE_DECLINE
  let i = 0
  try {
    for (; i < max; i++) {
      const p = g.pending() as Any
      const st = curState(g)
      if (p.mode === 'choice') {
        const req = p.request as Any
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const key = String(req.key)
        const isMay = key.startsWith(MAY_CHOOSE_KEY)
        const ans = isMay ? (cands.includes(answerMay) ? answerMay : (cands[0] ?? '')) : (cands[0] ?? '')
        asks.push({ step: i, turn: st.turn, itemId: String(req.itemId), key, candidates: cands, answer: ans, chain: chainIds(g) })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        continue
      }
      if (p.mode === 'window') {
        const act = o.onWindow?.(g) ?? null
        if (act) { g.apply(act as never); continue }
        g.apply({ kind: 'PASS', player: p.player } as never)
        continue
      }
      if (p.mode === 'action') {
        const act = o.onAction?.(g) ?? null
        if (act) { g.apply(act as never); continue }
      }
      break
    }
  } catch (e) {
    return { asks, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e), hitCap: i >= max }
  }
  return { asks, error: null, hitCap: i >= max }
}

const mayAsks = (asks: readonly Ask[]): Ask[] => asks.filter((a) => a.key.startsWith(MAY_CHOOSE_KEY))
const exiledOf = (g: InteractiveGame): readonly string[] => (curState(g).banishLedger?.['jh' as never] ?? []) as readonly string[]

                                                                
function run181(answerMay: string): { g: InteractiveGame; asks: Ask[]; error: string | null } {
  const g = new InteractiveGame(scene([
    legend('jh', 'UNL-181', P1),
    inHand('sp1', 'OGN-083', P1), // 借鉴历史:4 费法术,无目标 ⇒ 落在「≥4 法力」那一档
    inHand('sp2', 'OGN-083', P1),
  ]), makeGameDeps(SEED) as never)
  const a1 = findPlay(g, P1, 'sp1')
  expect(a1, '前提:sp1 打得出').not.toBeNull()
  g.apply(a1 as never)
  let playedSecond = false
  const out = drive(g, {
    answerMay,
    onWindow: (gg) => {
      if (playedSecond) return null
      const a2 = findPlay(gg, P1, 'sp2')
      if (a2 === null) return null
      playedSecond = true
      return a2
    },
  })
  expect(out.error, '真流程无异常').toBeNull()
  expect(playedSecond, '前提:第二张在反应窗口打出去了').toBe(true)
  return { g, asks: out.asks, error: out.error }
}

describe('★1799 ㈠ UNL-181:答不放逐后,同链第二张同 id 触发必须【再问】', () => {
  test('答 no ⇒ 第二张触发再问一次(修前是 1 问,答案被静默沿用);放逐账本 0', () => {
    const { g, asks } = run181(MAY_CHOOSE_DECLINE)
    const may = mayAsks(asks)
    expect(may.length, '★修前:只问 1 次(第二张被旧答案静默顶掉)').toBe(2)
    expect(may[0]!.answer).toBe(MAY_CHOOSE_DECLINE)
    expect(may[1]!.answer, '★第二问确实被问了,并同样答不执行').toBe(MAY_CHOOSE_DECLINE)
    expect(exiledOf(g).length, '答不放逐 ⇒ 一张都没放逐').toBe(0)
  })

  test('正对照:答 yes ⇒ 两张都放逐(账本 2);且第二张确实被问', () => {
    const { g, asks } = run181('yes')
    expect(mayAsks(asks).length, '答 yes 时两次触发本来就都会被问(本对照确认探测口有效)').toBe(2)
    expect(exiledOf(g).length, '★两张法术都经此放逐').toBe(2)
  })
})

                                                                
describe('★1799 ㈡ VEN-067 瓶中星海:主阶段答 no 后,下一次主阶段同 id 必须【再问】', () => {
  test('第 3 回合答 no ⇒ 第 5 回合再问(修前静默不问、不执行)', () => {
    const g = new InteractiveGame(scene([
      obj('me', 'VEN-067', P1, `base:${P1}`, { baseMight: 0, baseTypes: ['equipment'] as never }),
      obj('ally1', 'BLK', P1, `base:${P1}`),
      obj('ally2', 'BLK', P1, `base:${P1}`),
      obj('ally3', 'BLK', P1, `base:${P1}`),
    ]), makeGameDeps(SEED) as never)
    const out = drive(g, {
      answerMay: MAY_CHOOSE_DECLINE,
      onAction: (gg) => ({ kind: 'END_TURN', player: (gg.pending() as Any).player } as InteractiveAction),
      maxSteps: 200,
    })
    expect(out.error, '真流程无异常').toBeNull()
    const may = mayAsks(out.asks)
    const t3 = may.filter((a) => a.turn === 3)
    const t5 = may.filter((a) => a.turn === 5)
    expect(t3.length, '第 3 回合问过一次、答 no').toBe(1)
    expect(t3[0]!.answer).toBe(MAY_CHOOSE_DECLINE)
    expect(t5.length, '★修前:第 5 回合 0 问(被旧答案静默顶掉)').toBe(1)
    expect(t5[0]!.key, '★同一 id(键跨时间复用)').toBe(t3[0]!.key)
    expect(t5[0]!.answer).toBe(MAY_CHOOSE_DECLINE)
  })
})

                                                                   
describe('★1799 ㈢ OGN-288 星尖峰:据守答 no 后,下一次据守同 id 必须【再问】', () => {
  test('P2 连续两次据守 BF0:每次都被问(修前第二次静默不问)', () => {
    const g = new InteractiveGame(scene([
      obj('u', 'BLK', P2, BF0), // P2 的单位占住 BF0
    ], { defId: 'OGN-288', owner: P1 }), makeGameDeps(SEED) as never)
    const out = drive(g, {
      answerMay: MAY_CHOOSE_DECLINE,
      onAction: (gg) => ({ kind: 'END_TURN', player: (gg.pending() as Any).player } as InteractiveAction),
      maxSteps: 200,
    })
    expect(out.error, '真流程无异常').toBeNull()
    const may = mayAsks(out.asks)
    expect(may.length, '★修前只问 1 次;修后每次据守都问').toBeGreaterThanOrEqual(2)
    expect(may[0]!.answer).toBe(MAY_CHOOSE_DECLINE)
    expect(may[1]!.key, '★同一 id(据守判别式回落 player:battlefield:nth)').toBe(may[0]!.key)
    expect(may[1]!.answer).toBe(MAY_CHOOSE_DECLINE)
  })
})

                                                                        
describe('★1799 ㈣ 反方向:答 yes 后被无效化 ⇒ 下一次同 id 触发必须【再问】,不许直接执行', () => {
  test('放逐触发答 yes → 被 negate 移出链 → 再打一张 ≥4 费法术 ⇒ 再问一次', () => {
    const g = new InteractiveGame(scene([
      legend('jh', 'UNL-181', P1),
      inHand('sp1', 'OGN-083', P1),
      inHand('sp2', 'OGN-083', P1),
    ]), makeGameDeps(SEED) as never)
                                                                     
    g.apply(findPlay(g, P1, 'sp1')! as never)
    const first = g.pending() as Any
    expect(first.mode, '打出 sp1 后停在确认期那一问').toBe('choice')
    const mayKey = String(first.request.key)
    expect(mayKey.startsWith(MAY_CHOOSE_KEY), '是 mayChoose 那一问').toBe(true)
    const itemId = String(first.request.itemId)                                  
    g.apply({ kind: 'CHOOSE', player: first.request.controller, key: first.request.key, answer: 'yes' } as never)
    const st = curState(g)
    const triggerItem = (st.chain as unknown as Any[]).find(
      (it) => String(it.id) === itemId || String(it.id).startsWith(`${itemId}:`))
    expect(triggerItem, '触发项目已在链上').toBeDefined()
                                                                     
                                                                  
                                                         
    expect(Object.prototype.hasOwnProperty.call(st.resolveChoices, mayKey), '★1800d:答 yes 后该键已不在表里(键随确认清出表)').toBe(false)
    expect(String(triggerItem!.status), '★1800d:该项目此刻已 confirmed').toBe('confirmed')

                                                                             
                                                                
    const chainItemId = String(triggerItem!.id)
    const negated = applyEvents(st, [{ kind: 'negate', target: chainItemId } as never], {}).state
    expect((negated.chain as unknown as Any[]).some((it) => String(it.id) === chainItemId),
      '★项目被移出链').toBe(false)
    expect(Object.prototype.hasOwnProperty.call(negated.resolveChoices, mayKey),
      '★被无效化后该项目自己的 mayChoose 键已清(修前仍在 ⇒ 下一次同 id 静默沿用)').toBe(false)

                                                                         
    const g2 = new InteractiveGame(negated, makeGameDeps(SEED) as never)
    g2.apply(findPlay(g2, P1, 'sp2')! as never)
    const out = drive(g2, { answerMay: 'yes', maxSteps: 80 })
    expect(out.error, '真流程无异常').toBeNull()
    const may = mayAsks(out.asks)
    expect(may.length, '★第二张 ≥4 费法术的同 id 触发必须重新问').toBeGreaterThanOrEqual(1)
    expect(may[0]!.key, '★同一 id').toBe(mayKey)
  })

  test('正对照:不去无效化 ⇒ 第二次同 id 触发也照常问(证明探测口有效)', () => {
    const g = new InteractiveGame(scene([
      legend('jh', 'UNL-181', P1),
      inHand('sp1', 'OGN-083', P1),
      inHand('sp2', 'OGN-083', P1),
    ]), makeGameDeps(SEED) as never)
    const out = run181SameGameUnnegated(g)
                                                             
    expect(mayAsks(out.asks).length, '未被无效化时第二次触发照常问(本对照确认探测口有效)').toBe(1)
  })
})

function run181SameGameUnnegated(g: InteractiveGame): DriveOut {
  g.apply(findPlay(g, P1, 'sp1')! as never)
  const a = g.pending() as Any
  g.apply({ kind: 'CHOOSE', player: a.request.controller, key: a.request.key, answer: 'yes' } as never)
  let playedSecond = false
  return drive(g, {
    answerMay: 'yes',
    onWindow: (gg) => { if (playedSecond) return null; const x = findPlay(gg, P1, 'sp2'); if (x) { playedSecond = true; return x } return null },
    maxSteps: 80,
  })
}

                                                                    
describe('★1799 ㈤ ★1789 O3 回归:同批三条触发排序后拒绝第一条 ⇒ 剩下两条不再问排序', () => {
  test('排序问恰好 1 次;拒绝第一条后,另两条各问一次、排序键未被误清', () => {
    const resolveOrder: string[] = []
    const mk = (id: string): Trigger => ({
      id, controller: P1, sourceOid: asObjId(`src-${id}`), event: 'damage', by: 'any',
      mayChoose: true, // ★三条都是 mayChoose ⇒ 拒绝第一条走 §383.3.a.2 离链,会触发 dropItemChoices
      effect: (): readonly never[] => { resolveOrder.push(id); return [] },
    } as unknown as Trigger)
    const s0 = createInitialState([P1, P2], 2)
    const { items, state } = detectTriggersForBatchAndNote(
      s0 as GameState, [{ kind: 'damage', target: asObjId('dummy'), amount: 1 } as never], [mk('t1'), mk('t2'), mk('t3')], P1,
    )
    expect(items.length, '造景:同批 3 条待处理触发').toBe(3)
    const start = { ...state, chain: addItems(state.chain, items) } as GameState
    const sortAsks: string[][] = []
    const mayOrder: string[] = []
    let firstMay = true
    runFepr(start, () => ({ kind: 'pass' }) as never, {} as never, (req) => {
      if (req.key.startsWith(TRIGGER_ORDER_KEY)) { sortAsks.push(req.candidates.map((c) => c.id)); return req.candidates[0]!.id }
      if (req.key.startsWith(MAY_CHOOSE_KEY)) {
        mayOrder.push(req.key)
        const ans = firstMay ? MAY_CHOOSE_DECLINE : 'yes'                      
        firstMay = false
        return ans
      }
      return req.candidates[0]?.id ?? ''
    })
    expect(sortAsks.length, '★修前(排序键被误清时会重问):恰好 1 次').toBe(1)
    expect(sortAsks[0]).toHaveLength(3)
    expect(mayOrder.length, '三条各问一次 mayChoose(第一条被拒、另两条执行)').toBe(3)
    expect(resolveOrder.length, '被拒的那条不结算;另两条各结算一次').toBe(2)
  })
})

                                                                 
describe('★1799 ㈥ 不变量判别力自证:链空但 resolveChoices 非空 ⇒ 抛', () => {
  test('手写违规 state 喂 assertInvariants 必须抛', () => {
    const base = createInitialState([P1, P2], 2)
    const bad = { ...base, chain: [], resolveChoices: { [`${MAY_CHOOSE_KEY}:x`]: 'no' } } as GameState
    expect(() => assertInvariants(bad), '★判别力:链空+表非空当场红').toThrow(/链空但 resolveChoices 非空/)
                                        
    expect(() => assertInvariants({ ...base, chain: [], resolveChoices: {} } as GameState)).not.toThrow()
  })
})
