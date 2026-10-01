                                                                     
  
                                      
                                       
                               
                                                         
                                                 
  
                            
                                           
                                                         
                                                           
                                                      
  
                                                                                     
                                                          
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { GROUP_SUBSET_PREFIX, subsetKeyPrefix } from '../../src/loop/groupTargets'
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { OGN_220_SPEC, TWO_TARGET_KEY } from '../../data/cards/two-target-spells'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
const SMASH_GROUP = subsetKeyPrefix('smash')                   
type Any = Record<string, any>

                                                                                                    
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[]): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `deck${i++}`
    const c = obj(id, 'BLK', p, `mainDeck:${p}`)
    objects[id] = c
    zones[`mainDeck:${p}`] = { ...zones[`mainDeck:${p}`]!, contents: [...zones[`mainDeck:${p}`]!.contents, c.oid] }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState
}

const aScene = (): GameState => scene([
  obj('F', 'BLK', P1, BF0, { baseMight: 3 }), // 友方第一目标
  obj('E', 'BLK', P2, BF0, { baseMight: 3 }), // 敌方第二目标
  inHand('sp', 'OGN-220', P1),
])
const aGame = (): InteractiveGame => new InteractiveGame(aScene(), makeGameDeps(0x1808) as never)

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const mutationsDeps = makeGameDeps(0x1808) as never
const moveTo = (s: GameState, oid: string, to: string): GameState =>
  recomputeContinuous(applyEvents(s, [{ kind: 'zoneChange', obj: asObjId(oid), to: asZoneId(to) }] as never, mutationsDeps).state)

                                
const shroudE = (s: GameState): GameState => {
  const eff = {
    id: 'probe1808c:untargetableE', duration: 'thisTurn' as const, fromPassive: false,
    predicate: (o: GameObject) => String(o.oid) === 'E',
    modification: { kind: 'addRestriction' as const, restriction: NO_ENEMY_TARGET },
    timestamp: 9999,
  }
  return recomputeContinuous({ ...s, continuousEffects: [...(s.continuousEffects ?? []), eff as never] } as GameState)
}

function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

                                                                  
interface AskRec { key: string; stage: 'confirm' | 'resolve'; candidates: string[]; isTarget: boolean }
interface RunOut { asks: AskRec[]; error: string | null; steps: number }

                                                                    
const aAns = (second: string, subOrder: readonly string[] = []) => (key: string, cands: string[]): string => {
  if (key === TWO_TARGET_KEY) return cands.includes(second) ? second : (cands[0] ?? '')
  if (key.startsWith(SMASH_GROUP)) {
    const i = Number(key.slice(SMASH_GROUP.length))
    if (subOrder[i] !== undefined && cands.includes(subOrder[i]!)) return subOrder[i]!
    return cands.find((c) => c !== MULTI_SELECT_DONE) ?? cands[0] ?? ''
  }
  return cands[0] ?? ''
}

function runScene(
  g: InteractiveGame,
  cardOid: string,
  answer: (key: string, cands: string[]) => string,
  mutate: ((s: GameState) => GameState) | null,
): RunOut {
  const asks: AskRec[] = []
  let steps = 0
  let passes = 0
  let mutated = false
  let error: string | null = null
  const initial = (g.legalActions(P1) as readonly Any[]).find(
    (a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid && !(a.echoPicks?.length)) as InteractiveAction | undefined
  if (initial === undefined) return { asks, error: '找不到打出动作', steps }
  try {
    g.apply(initial as never); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const key = String(req.key)
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const ans = answer(key, cands)
        asks.push({ key, stage: passes === 0 ? 'confirm' : 'resolve', candidates: cands, isTarget: req.isTarget === true })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never); steps++
        continue
      }
      if (raw.mode === 'window') {
        if (mutate !== null && !mutated) { mutateInWindow(g, mutate); mutated = true }
        passes++
        g.apply({ kind: 'PASS', player: raw.player } as never); steps++
        continue
      }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { asks, error, steps }
}

const statusOf = (g: InteractiveGame, oid: string): Any =>
  ((curState(g).objects as unknown as Record<string, Any>)[oid]?.status) ?? {}
const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}
const subsetAsks = (asks: readonly AskRec[]): AskRec[] => asks.filter((a) => a.key.startsWith(GROUP_SUBSET_PREFIX))
const subsetCands = (a: AskRec): string[] => a.candidates.filter((c) => c !== MULTI_SELECT_DONE)
const runOk = (R: RunOut): void => { if (R.error !== null) throw new Error(`运行异常:${R.error}`) }

                                                           
describe('★1808c ① OGN-220 无响应:确认期恰问 second;结算期零子集问;F、E 都晕', () => {
  test('确认期 key=second、stage=confirm;无 §355.11.b 问;F/E 都 stunned', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E'), null)
    runOk(R)
    expect(R.asks.map((a) => `${a.key}@${a.stage}`)).toEqual([`${TWO_TARGET_KEY}@confirm`])
    expect(subsetAsks(R.asks), '★组没破 ⇒ 一问都不出').toEqual([])
    expect(statusOf(g, 'F').stunned, '★友方晕').toBe(true)
    expect(statusOf(g, 'E'), '★敌方也晕').toMatchObject({ stunned: true })
  })
})

                                                               
describe('★1808c ② 敌目标→基地:不问;友方晕、敌方不晕(裁定 Q1)', () => {
  test('零子集问;F stunned、E 不 stunned;E 在 base:P2', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E'), (s) => moveTo(s, 'E', 'base:P2'))
    runOk(R)
    expect(zoneOf(g, 'E')).toBe('base:P2')
    expect(subsetAsks(R.asks), '★裁定 Q1:不问').toEqual([])
    expect(statusOf(g, 'F').stunned, '★友方晕(Q1)').toBe(true)
    expect(statusOf(g, 'E').stunned, '★敌方不晕(Q1)').not.toBe(true)
  })
})

                                                                  
describe('★1808c ③④ 敌目标→另一处战场:问;候选恰 {F,E};答谁晕谁(裁定 Q2)', () => {
  const mut = (s: GameState): GameState => moveTo(s, 'E', BF1)

  test('③ 答友方 F ⇒ 只 F 晕(子集问候选恰 {F,E}、结算期、至少一个)', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E', ['F']), mut)
    runOk(R)
    const subs = subsetAsks(R.asks)
    expect(subs.length, '★裁定 Q2:组破 ⇒ 问').toBeGreaterThan(0)
    expect(subs[0]!.stage, '★子集问在结算期').toBe('resolve')
    expect(subsetCands(subs[0]!).slice().sort(), '★候选恰为初始两名').toEqual(['E', 'F'])
    expect(subs[0]!.candidates, '★minPicks:1 ⇒ 首问不给「够了」(裁定 Q2「必选一」)').not.toContain(MULTI_SELECT_DONE)
    expect(statusOf(g, 'F').stunned, '★答友 ⇒ 只友晕').toBe(true)
    expect(statusOf(g, 'E').stunned, '★敌方不晕').not.toBe(true)
  })

  test('④ 另一局答敌方 E ⇒ 只 E 晕(证明是玩家选的,不是引擎代选)', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E', ['E']), mut)
    runOk(R)
    expect(subsetAsks(R.asks).length, '★同一盘面仍问').toBeGreaterThan(0)
    expect(statusOf(g, 'E').stunned, '★答敌 ⇒ 只敌晕').toBe(true)
    expect(statusOf(g, 'F').stunned, '★友方不晕').not.toBe(true)
  })
})

                                                          
describe('★1808c ⑤ 友目标→另一处战场:问;答谁晕谁', () => {
  test('E 留 BF0、F 到 BF1 ⇒ 问;答 F ⇒ 只 F 晕;答 E ⇒ 只 E 晕', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E', ['F']), (s) => moveTo(s, 'F', BF1))
    runOk(R)
    expect(subsetAsks(R.asks).length, '★组破 ⇒ 问').toBeGreaterThan(0)
    expect(subsetCands(subsetAsks(R.asks)[0]!).slice().sort()).toEqual(['E', 'F'])
    expect(statusOf(g, 'F').stunned, '★答 F ⇒ F 晕').toBe(true)
    expect(statusOf(g, 'E').stunned, '★E 不晕').not.toBe(true)

    const g2 = aGame()
    const R2 = runScene(g2, 'sp', aAns('E', ['E']), (s) => moveTo(s, 'F', BF1))
    runOk(R2)
    expect(statusOf(g2, 'E').stunned, '★答 E ⇒ E 晕').toBe(true)
    expect(statusOf(g2, 'F').stunned, '★F 不晕').not.toBe(true)
  })
})

                                                                          
describe('★1808c ⑥ 两名一起挪到 BF1:不问、都晕(§355.11.b 末句)', () => {
  test('仍「同处某一处战场」⇒ 零子集问;F、E 都晕', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E'), (s) => moveTo(moveTo(s, 'F', BF1), 'E', BF1))
    runOk(R)
    expect(zoneOf(g, 'F')).toBe(BF1)
    expect(zoneOf(g, 'E')).toBe(BF1)
    expect(subsetAsks(R.asks), '★整组一起转场 ⇒ 仍满足 ⇒ 不问').toEqual([])
    expect(statusOf(g, 'F').stunned).toBe(true)
    expect(statusOf(g, 'E').stunned).toBe(true)
  })
})

                                                                 
describe('★1808c ⑦ 敌目标变为不可被选取(§758.1):不问、只友晕', () => {
  test('给 E 挂 NO_ENEMY_TARGET ⇒ 零子集问;F 晕、E 不晕', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E'), shroudE)
    runOk(R)
    expect(subsetAsks(R.asks), '★个体静默跳过,不算组破(PM 签字 #2)').toEqual([])
    expect(statusOf(g, 'F').stunned, '★只友晕').toBe(true)
    expect(statusOf(g, 'E').stunned, '★E 不晕').not.toBe(true)
  })
})

                                                          
describe('★1808c ⑧ 两名都离场:不问、零事件', () => {
  test('F、E 一起离开场上 ⇒ 零子集问;零 stun', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E'), (s) => {
      const objects = { ...(s.objects as unknown as Record<string, GameObject>) }
      objects.F = { ...objects.F!, zone: asZoneId('hand:P1') }
      objects.E = { ...objects.E!, zone: asZoneId('hand:P2') }
      return { ...s, objects } as GameState
    })
    runOk(R)
    expect(subsetAsks(R.asks), '★判据集空 / 都不在战场 ⇒ 不问').toEqual([])
    expect(statusOf(g, 'F').stunned, '★零事件').not.toBe(true)
    expect(statusOf(g, 'E').stunned, '★零事件').not.toBe(true)
  })
})

                                                                        
describe('★1808c ⑨ 第二名确认期问不出(防御性分支):退化为一目标组 ⇒ 不问、只晕第一目标', () => {
  test('makeConfirmChoice 返 null;makeResolve 只发一条 stun(第一目标)', () => {
                                          
    const s = scene([obj('F', 'BLK', P1, BF0), obj('far', 'BLK', P2, BF1), inHand('sp', 'OGN-220', P1)])
    const q = OGN_220_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', target: 'F', controller: P1 } as never)(s, {})
    expect(q, '★第二问候选空 ⇒ 不问').toBeNull()
    const evs = OGN_220_SPEC.makeResolve!({ movedCardOid: 'sp', target: 'F', controller: P1 } as never)(s, {})
    expect(evs.filter((e) => e.kind === 'stun').map((e) => (e as { target: string }).target), '★只晕第一目标')
      .toEqual(['F'])
  })
})

                                                           
describe('★1808c ⑩ 机械断言:确认期键不含子集前缀;子集键与父键不相交;子集问不标 isTarget', () => {
  test('确认期键 second 不含 §355.11.b:;子集键不以 second 开头', () => {
    expect(TWO_TARGET_KEY.includes(GROUP_SUBSET_PREFIX), '★确认期键不带子集前缀').toBe(false)
    expect(SMASH_GROUP, '★子集键前缀').toBe('§355.11.b:smash')
    expect(SMASH_GROUP.startsWith(TWO_TARGET_KEY), '★子集键不与父键相交').toBe(false)
    expect(`${SMASH_GROUP}0`.startsWith(TWO_TARGET_KEY)).toBe(false)
  })

  test('真流程:子集问 isTarget 未标(裁剪不是新选);确认期 second 标 isTarget(§355.6)', () => {
    const g = aGame()
    const R = runScene(g, 'sp', aAns('E', ['F']), (s) => moveTo(s, 'E', BF1))
    runOk(R)
    const conf = R.asks.find((a) => a.key === TWO_TARGET_KEY)!
    expect(conf.isTarget, '★确认期第二目标标 isTarget(一个目标一条)').toBe(true)
    expect(subsetAsks(R.asks)[0]!.isTarget, '★子集问刻意不标 isTarget(裁剪不是选新目标)').toBe(false)
  })
})
