                                                    
  
                                                    
                                                                  
                                                                    
  
                                              
                                                   
                                                    
                                                    
                                      
  
                                                                                       
                                                                                     
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

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
const WALL_PREFIX = 'SFD-043:back'                                               
const BELLOWS_PREFIX = 'SFD-080:burn'                                
const WALL_GROUP = subsetKeyPrefix('wall')                  
const BELLOWS_GROUP = subsetKeyPrefix('bellows')                     
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

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const mutationsDeps = makeGameDeps(0x1808) as never
const moveTo = (s: GameState, oid: string, to: string): GameState =>
  recomputeContinuous(applyEvents(s, [{ kind: 'zoneChange', obj: asObjId(oid), to: asZoneId(to) }] as never, mutationsDeps).state)

function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

                                                                  
interface AskRec { key: string; stage: 'confirm' | 'resolve'; candidates: string[] }
interface RunOut { asks: AskRec[]; error: string | null; steps: number }

function runScene(
  g: InteractiveGame,
  cardOid: string,
  findPlay: (acts: readonly Any[]) => Any | undefined,
  answer: (key: string, cands: string[]) => string,
  mutate: ((s: GameState) => GameState) | null,
): RunOut {
  const asks: AskRec[] = []
  let steps = 0
  let passes = 0
  let mutated = false
  let error: string | null = null
  const initial = findPlay(g.legalActions(P1) as readonly Any[])
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
        asks.push({ key, stage: passes === 0 ? 'confirm' : 'resolve', candidates: cands })
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

const plainPlay = (cardOid: string) => (acts: readonly Any[]): Any | undefined =>
  acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid && !(a.echoPicks?.length))
const echoPlay = (cardOid: string) => (acts: readonly Any[]): Any | undefined =>
  acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid && (a.echoPicks?.length ?? 0) > 0)

const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}
const damageOf = (g: InteractiveGame, oid: string): number =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.damage) ?? 0
const subsetAsks = (asks: readonly AskRec[]): AskRec[] => asks.filter((a) => a.key.startsWith(GROUP_SUBSET_PREFIX))
const subsetCands = (a: AskRec): string[] => a.candidates.filter((c) => c !== MULTI_SELECT_DONE)

                                                     
                                                                     
const wallScene = (): GameState => scene([
  obj('w1', 'BLK', P1, BF0), obj('w2', 'BLK', P1, BF0), obj('w3', 'BLK', P1, BF0),
  obj('foeB', 'BLK', P2, BF1),
  inHand('wall', 'SFD-043', P1),
])
const wallGame = (): InteractiveGame => new InteractiveGame(wallScene(), makeGameDeps(0x1808) as never)
                                            
const wallAnswer = (subOrder: readonly (string | undefined)[]) => (key: string, cands: string[]): string => {
  if (key.startsWith(WALL_PREFIX)) {
    const i = Number(key.slice(WALL_PREFIX.length))
    return ['w1', 'w2', 'w3'][i] ?? MULTI_SELECT_DONE
  }
  if (key.startsWith(WALL_GROUP)) {
    const i = Number(key.slice(WALL_GROUP.length))
    return subOrder[i] ?? MULTI_SELECT_DONE
  }
  return cands[0] ?? ''
}

                                                                                    
const bellScene = (): GameState => scene([
  obj('u1', 'BLK', P1, BF0), obj('e1', 'BLK', P2, BF0), obj('u2', 'BLK', P1, BF0),
  obj('u3', 'BLK', P1, BF1),
  inHand('bel', 'SFD-080', P1),
])
const bellGame = (): InteractiveGame => new InteractiveGame(bellScene(), makeGameDeps(0x1808) as never)
const bellAnswer = (subOrder: readonly (string | undefined)[]) => (key: string, cands: string[]): string => {
                                                                                  
                                                                  
                                                                           
  const isBurn = key.startsWith(BELLOWS_PREFIX)
  const isGroup = key.startsWith(BELLOWS_GROUP)
  if (isBurn || isGroup) {
    const tail = key.slice((isBurn ? BELLOWS_PREFIX : BELLOWS_GROUP).length)
    const i = Number(tail.replace(/^:echo:2/, ''))
    return (isBurn ? ['u1', 'e1', 'u2'] : subOrder)[i] ?? MULTI_SELECT_DONE
  }
  return cands[0] ?? ''
}

                                                              
describe('★1808 ① SFD-043 对照:全选、无响应 ⇒ 三名全回基地、无子集问', () => {
  test('确认期问 back0/1/2;结算期零子集问;w1/w2/w3 全到 base:P1', () => {
    const g = wallGame()
    const R = runScene(g, 'wall', plainPlay('wall'), wallAnswer([]), null)
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.asks.filter((a) => a.key.startsWith(WALL_PREFIX)).map((a) => a.key)).toEqual(
      [`${WALL_PREFIX}0`, `${WALL_PREFIX}1`, `${WALL_PREFIX}2`])
    expect(subsetAsks(R.asks), '★组没破 ⇒ 一问都不出').toEqual([])
    expect(zoneOf(g, 'w1')).toBe('base:P1')
    expect(zoneOf(g, 'w2')).toBe('base:P1')
    expect(zoneOf(g, 'w3')).toBe('base:P1')
    expect(zoneOf(g, 'foeB'), '★敌方干扰项不动').toBe(BF1)
  })
})

describe('★1808 ② SFD-043 响应期挪 1 名去 BF1 ⇒ 出子集问;改答「另两名」⇒ 恰这两名回基地', () => {
  test('候选恰为初始三名;w1/w2 回基地;BF1 的 w3 不动', () => {
    const g = wallGame()
    const R = runScene(g, 'wall', plainPlay('wall'), wallAnswer(['w1', 'w2']), (s) => moveTo(s, 'w3', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const subs = subsetAsks(R.asks)
    expect(subs.length, '★组破 ⇒ 问子集').toBeGreaterThan(0)
    expect(subs[0]!.stage, '★子集问在结算期').toBe('resolve')
    expect(subsetCands(subs[0]!), '★候选恰为初始三名').toEqual(['w1', 'w2', 'w3'])
    expect(zoneOf(g, 'w1')).toBe('base:P1')
    expect(zoneOf(g, 'w2')).toBe('base:P1')
    expect(zoneOf(g, 'w3'), '★BF1 那名不动').toBe(BF1)
  })

  test('★memberLegal 维度:成员离开【战场】(回基地)⇒ 不在子集候选(个体门「在战场」的作用点)', () => {
    const g = wallGame()
    const R = runScene(g, 'wall', plainPlay('wall'), wallAnswer([]), (s) => moveTo(s, 'w3', 'base:P1'))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const subs = subsetAsks(R.asks)
    expect(subs.length, '★组破(基地≠战场)⇒ 问子集').toBeGreaterThan(0)
    expect(subsetCands(subs[0]!), '★回到基地的 w3 已非「战场上的友方单位」⇒ 出候选;只剩 w1/w2')
      .toEqual(['w1', 'w2'])
    expect(zoneOf(g, 'w1'), '★零子集 ⇒ 都不动').toBe(BF0)
    expect(zoneOf(g, 'w3'), '★w3 留在基地').toBe('base:P1')
  })
})

describe('★1808 ③ SFD-043 同场景答「够了」(0 名)⇒ 零移动(§355.13 含 0)', () => {
  test('子集问给出「够了」;三名都不动', () => {
    const g = wallGame()
    const R = runScene(g, 'wall', plainPlay('wall'), wallAnswer([]), (s) => moveTo(s, 'w3', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const subs = subsetAsks(R.asks)
    expect(subs.length).toBeGreaterThan(0)
    expect(subs[0]!.candidates, '★「够了」任何时候都给(含 0)').toContain(MULTI_SELECT_DONE)
    expect(zoneOf(g, 'w1'), '★零移动').toBe(BF0)
    expect(zoneOf(g, 'w2')).toBe(BF0)
    expect(zoneOf(g, 'w3')).toBe(BF1)
  })
})

describe('★1808 ④ SFD-043 三名一起挪去 BF1 ⇒ 不问、三名全回基地(§355.11.b 末句)', () => {
  test('组仍「全在同一处」⇒ 零子集问;三名全到 base:P1', () => {
    const g = wallGame()
    const R = runScene(g, 'wall', plainPlay('wall'), wallAnswer([]),
      (s) => moveTo(moveTo(moveTo(s, 'w1', BF1), 'w2', BF1), 'w3', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(subsetAsks(R.asks), '★整组一起转场 ⇒ 仍满足 ⇒ 不问').toEqual([])
    expect(zoneOf(g, 'w1')).toBe('base:P1')
    expect(zoneOf(g, 'w2')).toBe('base:P1')
    expect(zoneOf(g, 'w3')).toBe('base:P1')
  })
})

                                                              
describe('★1808 ⑤ SFD-080 对照:敌我混编三名全选、无响应 ⇒ 三名各 1 点、无子集问', () => {
  test('确认期问 burn0/1/2;结算期零子集问;u1/e1/u2 各 1 伤,u3 不中', () => {
    const g = bellGame()
    const R = runScene(g, 'bel', plainPlay('bel'), bellAnswer([]), null)
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.asks.filter((a) => a.key.startsWith(BELLOWS_PREFIX)).map((a) => a.key)).toEqual(
      [`${BELLOWS_PREFIX}0`, `${BELLOWS_PREFIX}1`, `${BELLOWS_PREFIX}2`])
    expect(subsetAsks(R.asks), '★组没破 ⇒ 一问都不出').toEqual([])
    expect(damageOf(g, 'u1')).toBe(1)
    expect(damageOf(g, 'e1')).toBe(1)
    expect(damageOf(g, 'u2')).toBe(1)
    expect(damageOf(g, 'u3'), '★BF1 干扰项不中').toBe(0)
  })
})

describe('★1808 ⑥ SFD-080 响应期挪 1 名去 BF1 ⇒ 出子集问;改答「另两名」⇒ 恰这两名各 1 点', () => {
  test('候选恰为初始三名;u1/e1 各 1 伤;u2 不中', () => {
    const g = bellGame()
    const R = runScene(g, 'bel', plainPlay('bel'), bellAnswer(['u1', 'e1']), (s) => moveTo(s, 'u2', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const subs = subsetAsks(R.asks)
    expect(subs.length, '★组破 ⇒ 问子集').toBeGreaterThan(0)
    expect(subsetCands(subs[0]!), '★候选恰为初始三名').toEqual(['u1', 'e1', 'u2'])
    expect(damageOf(g, 'u1')).toBe(1)
    expect(damageOf(g, 'e1')).toBe(1)
    expect(damageOf(g, 'u2'), '★移到 BF1 的那名不中').toBe(0)
  })

  test('★memberLegal 维度:成员离开【场上】(进手牌)⇒ 不在子集候选(个体门「onField」的作用点)', () => {
                                                                                   
                                  
    const g = bellGame()
    const R = runScene(g, 'bel', plainPlay('bel'), bellAnswer([]),
      (s) => ({ ...s, objects: { ...s.objects, u2: { ...(s.objects as Any)['u2'], zone: asZoneId('hand:P1') } } } as GameState))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const subs = subsetAsks(R.asks)
    expect(subs.length, '★组破(手牌≠BF0,且 u2 仍在 objects 里)⇒ 问子集').toBeGreaterThan(0)
    expect(subsetCands(subs[0]!), '★已非 onField 的 u2 出候选(但仍在判据集里);只剩 u1/e1')
      .toEqual(['u1', 'e1'])
    expect(damageOf(g, 'u1'), '★零子集 ⇒ 都不中').toBe(0)
  })
})

describe('★1808 ⑦ SFD-080 同场景答「够了」⇒ 零伤害', () => {
  test('子集问给出「够了」;三名都不中', () => {
    const g = bellGame()
    const R = runScene(g, 'bel', plainPlay('bel'), bellAnswer([]), (s) => moveTo(s, 'u2', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const subs = subsetAsks(R.asks)
    expect(subs.length).toBeGreaterThan(0)
    expect(subs[0]!.candidates, '★「够了」含 0').toContain(MULTI_SELECT_DONE)
    expect(damageOf(g, 'u1')).toBe(0)
    expect(damageOf(g, 'e1')).toBe(0)
    expect(damageOf(g, 'u2')).toBe(0)
  })
})

describe('★1808 ⑧ SFD-080 三名一起挪去 BF1 ⇒ 不问、三名各 1 点(§355.11.b 末句)', () => {
  test('组仍「全在同一处」⇒ 零子集问;三名各 1 伤', () => {
    const g = bellGame()
    const R = runScene(g, 'bel', plainPlay('bel'), bellAnswer([]),
      (s) => moveTo(moveTo(moveTo(s, 'u1', BF1), 'e1', BF1), 'u2', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(subsetAsks(R.asks), '★整组一起转场 ⇒ 仍满足 ⇒ 不问').toEqual([])
    expect(damageOf(g, 'u1')).toBe(1)
    expect(damageOf(g, 'e1')).toBe(1)
    expect(damageOf(g, 'u2')).toBe(1)
  })
})

                                                       
                                                             
                                                  
                                              
                                                                    
                                        
describe('★1808 ⑨ SFD-080 回响(★1812 逐份口径):确认期两份各问一轮;两份各对子集 {u1,e1} 结算;u2 零', () => {
  test('付回响 + 挪 u2 去 BF1 ⇒ 确认期 burn0/1/2 + burn:echo:20/1/2;子集两条链;u1/e1 各 2 点;u2 零', () => {
    const g = bellGame()
    const R = runScene(g, 'bel', echoPlay('bel'), bellAnswer(['u1', 'e1']), (s) => moveTo(s, 'u2', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.asks.filter((a) => a.key.startsWith(BELLOWS_PREFIX)).map((a) => a.key), '★§820.2.a 确认期逐份各问一轮')
      .toEqual([`${BELLOWS_PREFIX}0`, `${BELLOWS_PREFIX}1`, `${BELLOWS_PREFIX}2`,
        `${BELLOWS_PREFIX}:echo:20`, `${BELLOWS_PREFIX}:echo:21`, `${BELLOWS_PREFIX}:echo:22`])
                                                
    expect(subsetAsks(R.asks).map((a) => a.key), '§820.2.a 子集每份各一条链')
      .toEqual([`${BELLOWS_GROUP}0`, `${BELLOWS_GROUP}1`,
        `${BELLOWS_GROUP}:echo:20`, `${BELLOWS_GROUP}:echo:21`])
    expect(damageOf(g, 'u1'), '★两份各打一次子集 ⇒ u1 共 2 点').toBe(2)
    expect(damageOf(g, 'e1'), '★e1 共 2 点').toBe(2)
    expect(damageOf(g, 'u2'), '★u2 已不合法 ⇒ 零').toBe(0)
  })
})

                                                         
describe('★1808 ⑩ 机械断言:确认期键不含子集前缀;子集键不以父前缀开头', () => {
  test('SFD-043:确认期键 join 不含 §355.11.b:;子集键不以 SFD-043:back 开头', () => {
    const confirmKeys = [`${WALL_PREFIX}0`, `${WALL_PREFIX}1`, `${WALL_PREFIX}2`]
    expect(confirmKeys.join(''), '★确认期键不带子集前缀').not.toContain(GROUP_SUBSET_PREFIX)
    expect(WALL_GROUP.startsWith(WALL_PREFIX), '★子集键不与父前缀相交').toBe(false)
    expect(`${WALL_GROUP}0`.startsWith(WALL_PREFIX)).toBe(false)
  })

  test('SFD-080:确认期键 join 不含 §355.11.b:;子集键不以 SFD-080:burn 开头', () => {
    const confirmKeys = [`${BELLOWS_PREFIX}0`, `${BELLOWS_PREFIX}1`, `${BELLOWS_PREFIX}2`]
    expect(confirmKeys.join(''), '★确认期键不带子集前缀').not.toContain(GROUP_SUBSET_PREFIX)
    expect(BELLOWS_GROUP.startsWith(BELLOWS_PREFIX), '★子集键不与父前缀相交').toBe(false)
    expect(`${BELLOWS_GROUP}0`.startsWith(BELLOWS_PREFIX)).toBe(false)
  })

  test('两张卡都在「确认期问」:确认期键的 stage=confirm、子集键的 stage=resolve', () => {
    const R = runScene(wallGame(), 'wall', plainPlay('wall'), wallAnswer(['w1']), (s) => moveTo(s, 'w3', BF1))
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const conf = R.asks.filter((a) => a.key.startsWith(WALL_PREFIX))
    expect(conf.length).toBe(3)
    expect(conf.every((a) => a.stage === 'confirm'), '★确认期键全在 confirm 阶段').toBe(true)
    expect(subsetAsks(R.asks).every((a) => a.stage === 'resolve'), '★子集键全在 resolve 阶段').toBe(true)
  })
})
