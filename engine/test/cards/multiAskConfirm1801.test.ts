                                                                   
  
                                                                             
                                                                        
                                                      
  
      
                                                                          
                                                                                               
                                                                
                                                               
                                                                               
                                                                     
                                                                         
                                                                      
                                                                                      
  
                                                                                               
                           
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { attachedTo } from '../../src/state/attach'
import { UNL_101_SPEC, UNL_101_DEST_KEY, UNL_101_FOE_KEY, UNL_101_FOE_UNIT_KEY } from '../../data/cards/UNL-101'
import { UNL_139_SPEC, UNL_139_BF_KEY, UNL_139_PICK_KEY } from '../../data/cards/UNL-139'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
type Any = Record<string, any>

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const mutationsDeps = makeGameDeps(0x1801) as never

                                                                                                        
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[], patch: Any = {}): GameState {
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
    ...patch,
  } as GameState
}

                                                 
function addObj(state: GameState, oid: string, defId: string, ctrl: PlayerId, zone: string, patch: Any = {}): GameState {
  const objects = { ...(state.objects as unknown as Record<string, GameObject>) }
  const zones = { ...state.zones }
  objects[oid] = {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...patch,
  } as unknown as GameObject
  const z = zones[asZoneId(zone)]!
  zones[asZoneId(zone)] = { ...z, contents: [...z.contents, asObjId(oid)] }
  return { ...state, objects, zones } as GameState
}

                                            
function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target) && !((a.echoPicks?.length ?? 0) > 0)) ?? null) as InteractiveAction | null
}
                                                      
const findStandbyPlay = (g: InteractiveGame, player: PlayerId, cardOid: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_STANDBY' && String(a.oid) === cardOid) ?? null) as InteractiveAction | null
}
const standbyZoneId = (s: GameState): string =>
  String(Object.values(s.zones).find((z) => z.kind === 'standby' && (z as { parentBattlefield?: string }).parentBattlefield === BF0)!.id)

                                                      
function standbyCastScene(extra: readonly GameObject[], cardOid: string): GameState {
  const s0 = scene(extra)
  const sb = asZoneId(standbyZoneId(s0))
  const c = obj(cardOid, 'UNL-139', P1, sb, { baseTypes: ['spell'] as never, status: { faceDown: true } })
  const s1 = { ...s0, objects: { ...s0.objects, [cardOid]: c } } as GameState
  return { ...s1, zones: { ...s1.zones, [sb]: { ...s1.zones[sb]!, contents: [...s1.zones[sb]!.contents, c.oid] } } } as GameState
}

interface AskRec { step: number; key: string; stage: 'confirm' | 'resolve'; reqStage: string | undefined; passesBefore: number; answer: string; candidates: string[]; controller: string; itemId: string }
interface RunOut { asks: AskRec[]; changeStep: number | null; hitCap: boolean; error: string | null; steps: number }

interface SceneSpec {
  build: () => { g: InteractiveGame; initial: InteractiveAction }
  onChoice: (key: string, req: Any, g: InteractiveGame) => string
  onWindow: (g: InteractiveGame, player: PlayerId, state: { confirmDone: boolean; mutated: boolean; changeStep: number | null }) => InteractiveAction | null
}

function runScene(sc: SceneSpec): RunOut {
  const asks: AskRec[] = []
  const st = { confirmDone: false, mutated: false, changeStep: null as number | null }
  let steps = 0
  let passes = 0
  let error: string | null = null
  const { g, initial } = sc.build()
  try {
    g.apply(initial); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const key = String(req.key)
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const ans = sc.onChoice(key, req, g)
        asks.push({ step: steps, key, stage: passes === 0 ? 'confirm' : 'resolve', reqStage: req.stage, passesBefore: passes, answer: ans, candidates: cands, controller: String(req.controller), itemId: String(req.itemId ?? '') })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        steps++
        continue
      }
      if (raw.mode === 'window') {
        if (asks.length > 0) st.confirmDone = true
        const before = st.mutated
        const play = sc.onWindow(g, raw.player as PlayerId, st)
        if (st.mutated && !before) st.changeStep = steps
        if (play) g.apply(play)
        else { passes++; g.apply({ kind: 'PASS', player: raw.player } as never) }
        steps++
        continue
      }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { asks, changeStep: st.changeStep, hitCap: steps >= STEP_CAP, error, steps }
}

const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}
const statusOf = (g: InteractiveGame, oid: string): Any =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.status) ?? {}
const damageOf = (g: InteractiveGame, oid: string): number =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.damage) ?? 0
const attachedToOf = (g: InteractiveGame, oid: string): string | undefined =>
  attachedTo((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]) as string | undefined
const defsIn = (g: InteractiveGame, zone: string): string[] =>
  (((curState(g).zones as Any)[zone]?.contents ?? []) as readonly string[])
    .map((id) => (curState(g).objects as Any)[id]?.defId ?? '?').sort()

                                                             
interface Setup {
  readonly defId: string
  readonly confirmKeys: readonly string[]
  readonly resolveKeys: readonly { readonly key: string; readonly answerer: PlayerId }[]
  readonly build: () => { g: InteractiveGame; initial: InteractiveAction }
}
interface StageRun extends RunOut { staged: boolean; note: string | null }

                                        
const gearFor = (oid: string, host: string): GameObject =>
  obj(oid, 'SFD-009', P1, BF0, { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never, status: { attachedTo: asObjId(host) } })

const SETUPS: readonly Setup[] = [
  {
    defId: 'SFD-107',
    confirmKeys: ['knockdownFoe', 'knockdownGear'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('a1', 'OGN-078', P1, BF0), gearFor('g1', 'a1'), obj('f1', 'OGN-012', P2, BF0), inHand('kd', 'SFD-107', P1),
      ]), makeGameDeps(0x107) as never)
      return { g, initial: findCardPlay(g, P1, 'kd', 'a1')! }
    },
  },
  {
    defId: 'SFD-200',
    confirmKeys: ['blinkAlly', 'blinkFoe'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('a1', 'OGN-078', P1, BF0), obj('f1', 'OGN-012', P2, BF0), inHand('bl', 'SFD-200', P1),
      ]), makeGameDeps(0x200) as never)
      return { g, initial: findCardPlay(g, P1, 'bl')! }
    },
  },
  {
    defId: 'UNL-101',
    confirmKeys: [UNL_101_DEST_KEY, UNL_101_FOE_KEY],
    resolveKeys: [{ key: UNL_101_FOE_UNIT_KEY, answerer: P2 }],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('a1', 'OGN-078', P1, BF0), obj('fu', 'OGN-012', P2, BF0), inHand('rl', 'UNL-101', P1),
      ], { battlefieldControl: { [BF1]: P1 } }), makeGameDeps(0x101) as never)
      return { g, initial: findCardPlay(g, P1, 'rl', 'a1')! }
    },
  },
  {
    defId: 'UNL-107',
    confirmKeys: ['standoffUnit', 'standoffZone'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('a1', 'OGN-078', P1, BF0), obj('f1', 'OGN-012', P2, BF0), inHand('sd', 'UNL-107', P1),
      ]), makeGameDeps(0x1071) as never)
      return { g, initial: findCardPlay(g, P1, 'sd')! }
    },
  },
  {
    defId: 'UNL-139',
    confirmKeys: [UNL_139_BF_KEY],
    resolveKeys: [{ key: UNL_139_PICK_KEY, answerer: P1 }],
    build: () => {
      const g = new InteractiveGame(standbyCastScene([inHand('u2', 'OGN-078', P2)], 'sp'), makeGameDeps(0x139) as never)
      return { g, initial: findStandbyPlay(g, P1, 'sp')! }
    },
  },
  {
    defId: 'UNL-202',
    confirmKeys: ['voidFriendDest', 'voidFoePick', 'voidFoeDest'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('a1', 'OGN-078', P1, BF0), obj('f1', 'OGN-012', P2, BF0), inHand('vd', 'UNL-202', P1),
      ]), makeGameDeps(0x202) as never)
      return { g, initial: findCardPlay(g, P1, 'vd', 'a1')! }
    },
  },
  {
    defId: 'VEN-140',
    confirmKeys: ['falconHit', 'falconMove', 'falconDest'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('f1', 'OGN-012', P2, BF0), obj('a1', 'OGN-078', P1, BF0), inHand('fd', 'VEN-140', P1),
      ]), makeGameDeps(0x140) as never)
      return { g, initial: findCardPlay(g, P1, 'fd')! }
    },
  },
  {
    defId: 'UNL-038',
    confirmKeys: ['dragonDest', 'dragonStun'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('f1', 'OGN-012', P2, BF0), obj('f2', 'OGN-013', P2, BF0), inHand('dk', 'UNL-038', P1),
      ], { experience: { [P1]: 6 } }), makeGameDeps(0x38) as never)
      return { g, initial: findCardPlay(g, P1, 'dk', 'f1')! }
    },
  },
  {
    defId: 'SFD-184',
    confirmKeys: ['pursuitDest', 'pursuitGear'],
    resolveKeys: [],
    build: () => {
      const g = new InteractiveGame(scene([
        obj('a1', 'OGN-078', P1, BF0), obj('a2', 'OGN-013', P1, `base:${P1}`),
        gearFor('g1', 'a2'), inHand('ps', 'SFD-184', P1),
      ]), makeGameDeps(0x184) as never)
      return { g, initial: findCardPlay(g, P1, 'ps', 'a1')! }
    },
  },
]

function driveStagePilot(setup: Setup): StageRun {
  let built: { g: InteractiveGame; initial: InteractiveAction }
  try {
    built = setup.build()
  } catch (e) {
    return { staged: false, note: `build:${(e as Error).message}`, asks: [], changeStep: null, hitCap: false, error: null, steps: 0 }
  }
  if (!built.initial) return { staged: false, note: '找不到打出动作', asks: [], changeStep: null, hitCap: false, error: null, steps: 0 }
  const d = runScene({ build: () => built, onChoice: (_k, req) => String((req.candidates as readonly Any[])[0]?.id ?? ''), onWindow: () => null })
  return { staged: true, note: null, ...d }
}

const RUNS = new Map<string, StageRun>(SETUPS.map((s) => [s.defId, driveStagePilot(s)]))

describe('★1801d ㈠ 9 张:打出时问在确认期(§355 打出时选定),结算期那问按 §355.10 留结算期', () => {
  test('9 张全部造景成功、不打满步数上限', () => {
    const failed = SETUPS.filter((s) => !RUNS.get(s.defId)!.staged)
    expect(failed, `造景失败的卡:${failed.map((s) => `${s.defId}:${RUNS.get(s.defId)!.note}`).join(', ')}`).toEqual([])
    const capped = SETUPS.filter((s) => RUNS.get(s.defId)!.hitCap)
    expect(capped, `打满步数上限:${capped.map((s) => s.defId).join(', ')}`).toEqual([])
  })

  test('每张:确认期键恰一次、reqStage==="confirm"、passesBefore===0;结算期键 reqStage==="resolve"、答者正确', () => {
    for (const s of SETUPS) {
      const r = RUNS.get(s.defId)!
      for (const key of s.confirmKeys) {
        const asks = r.asks.filter((a) => a.key === key)
        expect(asks.length, `${s.defId} 的 ${key} 问次数`).toBe(1)
        expect(asks[0]!.stage, `${s.defId} ${key} 派生 stage`).toBe('confirm')
        expect(asks[0]!.reqStage, `${s.defId} ${key} reqStage`).toBe('confirm')
        expect(asks[0]!.passesBefore, `${s.defId} ${key} 在 PASS 之前`).toBe(0)
        expect(r.asks.filter((a) => a.key === key && a.reqStage !== 'confirm').length, `${s.defId} ${key} 不该在结算期出现`).toBe(0)
      }
      for (const rk of s.resolveKeys) {
        const asks = r.asks.filter((a) => a.key === rk.key)
        expect(asks.length, `${s.defId} 的 ${rk.key} 问次数`).toBe(1)
        expect(asks[0]!.stage, `${s.defId} ${rk.key} 派生 stage`).toBe('resolve')
        expect(asks[0]!.reqStage, `${s.defId} ${rk.key} reqStage`).toBe('resolve')
        expect(asks[0]!.passesBefore, `${s.defId} ${rk.key} 在 PASS 之后`).toBeGreaterThan(0)
        expect(asks[0]!.controller, `${s.defId} ${rk.key} 答者`).toBe(String(rk.answerer))
        expect(r.asks.filter((a) => a.key === rk.key && a.reqStage === 'confirm').length, `${s.defId} ${rk.key} 不该在确认期出现`).toBe(0)
      }
    }
  })

  test('UNL-101 的 rallyFoeUnit 由【对手】答(§355.10.e 由该玩家选),UNL-139 的 spikePick 由【我】答', () => {
    const u101 = RUNS.get('UNL-101')!.asks.find((a) => a.key === UNL_101_FOE_UNIT_KEY)
    expect(u101?.controller, '①③ 作答者是那名对手').toBe(String(P2))
    const u139 = RUNS.get('UNL-139')!.asks.find((a) => a.key === UNL_139_PICK_KEY)
    expect(u139?.controller, '从对手手牌挑牌的人仍是我(候选才是对手手牌)').toBe(String(P1))
  })
})

                                                                 
describe('★1801d ㈡ 链式追问在确认期一口气问完:UNL-202 三问 / VEN-140 三问,顺序与修前相同', () => {
  test('UNL-202:voidFriendDest → voidFoePick → voidFoeDest 全在 PASS 之前', () => {
    const r = RUNS.get('UNL-202')!
    const seq = r.asks.map((a) => a.key)
    expect(seq, '★三问按卡文次序').toEqual(['voidFriendDest', 'voidFoePick', 'voidFoeDest'])
    expect(r.asks.every((a) => a.passesBefore === 0), '★三问全在 PASS 之前').toBe(true)
    expect(r.asks.every((a) => a.reqStage === 'confirm'), '★三问 reqStage=confirm').toBe(true)
  })

  test('VEN-140:falconHit → falconMove → falconDest 全在 PASS 之前', () => {
    const r = RUNS.get('VEN-140')!
    const seq = r.asks.map((a) => a.key)
    expect(seq, '★三问按卡文次序').toEqual(['falconHit', 'falconMove', 'falconDest'])
    expect(r.asks.every((a) => a.passesBefore === 0), '★三问全在 PASS 之前').toBe(true)
    expect(r.asks.every((a) => a.reqStage === 'confirm'), '★三问 reqStage=confirm').toBe(true)
  })
})

                                                               
describe('★1801d ㈢ 已选对象失法 ⇒ 跳过', () => {
  test('SFD-200:blinkFoe 目标撤回基地 ⇒ 不伤害它;blinkAlly 那半照做', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0), obj('f1', 'OGN-012', P2, BF0, { baseMight: 9 }), inHand('bl', 'SFD-200', P1),
    ]), makeGameDeps(0x200) as never)
                                                             
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'bl')!
      const R = runScene({
        build: () => ({ g, initial }),
        onChoice: (key, req) => (key === 'blinkAlly' ? 'a1' : key === 'blinkFoe' ? 'f1' : String((req.candidates as readonly Any[])[0]?.id ?? '')),
        onWindow: (_gg, _p, st) => {
          if (st.confirmDone && !st.mutated) {
            mutateInWindow(g, (s) => applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('f1'), to: asZoneId('base:P2') }] as never, mutationsDeps).state)
            st.mutated = true
          }
          return null
        },
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(R.changeStep, '★扰动真的发生了(f1 被撤回基地)').not.toBeNull()
      expect(R.asks.filter((a) => a.key === 'blinkFoe').length, 'blinkFoe 确认期问一次、结算不重问').toBe(1)
      expect(damageOf(g, 'f1'), '★已不是「战场上敌方」⇒ 不伤害它').toBe(0)
      expect(defsIn(g, `exile:${P1}`), '★blinkAlly 那半照做(放逐友方 ⇒ 接力把法术自己送进放逐区)').toContain('SFD-200')
    }
                         
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'bl')!
      const R = runScene({
        build: () => ({ g, initial }),
        onChoice: (key, req) => (key === 'blinkAlly' ? 'a1' : key === 'blinkFoe' ? 'f1' : String((req.candidates as readonly Any[])[0]?.id ?? '')),
        onWindow: () => null,
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(damageOf(g, 'f1'), '★对照:f1 吃 3 点').toBe(3)
    }
  })

  test('UNL-038:dragonStun 对象撤回基地(候选谓词无位置门 ⇒ 仍合法,如实按谓词判)', () => {
    const g = new InteractiveGame(scene([
      obj('f1', 'OGN-012', P2, BF0), obj('f2', 'OGN-013', P2, BF0), inHand('dk', 'UNL-038', P1),
    ], { experience: { [P1]: 6 } }), makeGameDeps(0x38) as never)
    const initial = findCardPlay(g, P1, 'dk', 'f1')!
    const R = runScene({
      build: () => ({ g, initial }),
      onChoice: (key, req) => (key === 'dragonDest' ? `base:${P2}` : key === 'dragonStun' ? 'f2' : String((req.candidates as readonly Any[])[0]?.id ?? '')),
      onWindow: (_gg, _p, st) => {
        if (st.confirmDone && !st.mutated) {
          mutateInWindow(g, (s) => applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('f2'), to: asZoneId('base:P2') }] as never, mutationsDeps).state)
          st.mutated = true
        }
        return null
      },
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.changeStep, '★扰动真的发生了(f2 被撤回基地)').not.toBeNull()
    expect(zoneOf(g, 'f2'), 'f2 已在基地').toBe(`base:${P2}`)
                                                                        
    expect(statusOf(g, 'f2').stunned, '★仍在谓词内 ⇒ 眩晕照发').toBe(true)
    expect(zoneOf(g, 'f1'), '★落点那半:目标被移到其基地').toBe(`base:${P2}`)
  })

  test('VEN-140:falconHit 对象离场(回基地)⇒ 无伤;falconMove 那半照做', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene([
      obj('f1', 'OGN-012', P2, BF0), obj('a1', 'OGN-078', P1, BF0), inHand('fd', 'VEN-140', P1),
    ]), makeGameDeps(0x140) as never)
    let dest = ''
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'fd')!
      const R = runScene({
        build: () => ({ g, initial }),
        onChoice: (key, req) => {
          const c = String((req.candidates as readonly Any[])[0]?.id ?? '')
          if (key === 'falconHit') return 'f1'
          if (key === 'falconMove') return 'a1'
          if (key === 'falconDest') { dest = c; return c }
          return c
        },
        onWindow: (_gg, _p, st) => {
          if (st.confirmDone && !st.mutated) {
            mutateInWindow(g, (s) => applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('f1'), to: asZoneId('base:P2') }] as never, mutationsDeps).state)
            st.mutated = true
          }
          return null
        },
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(R.changeStep, '★扰动真的发生了(f1 离开战场)').not.toBeNull()
      expect(R.asks.filter((a) => a.key === 'falconHit').length, 'falconHit 确认期问一次、结算不重问').toBe(1)
      expect(damageOf(g, 'f1'), '★已不是战场上敌方 ⇒ 无伤').toBe(0)
      expect(zoneOf(g, 'a1'), '★falconMove 那半照做(友方被移到确认期选的落点)').toBe(dest)
    }
                         
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'fd')!
      const R = runScene({
        build: () => ({ g, initial }),
        onChoice: (key, req) => (key === 'falconHit' ? 'f1' : key === 'falconMove' ? 'a1' : String((req.candidates as readonly Any[])[0]?.id ?? '')),
        onWindow: () => null,
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(damageOf(g, 'f1'), '★对照:f1 吃 2 点').toBe(2)
    }
  })
})

                                                                      
describe('★1801d ㈣ 新候选选不到:SFD-107 确认期 knockdownGear 候选只 g1,窗口再贴 g2 ⇒ 不重问、g2 不被卸', () => {
  test('窗口给 a1 再贴一件 g2 ⇒ 结算仍只卸 g1,g2 原样', () => {
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0), gearFor('g1', 'a1'), obj('f1', 'OGN-012', P2, BF0), inHand('kd', 'SFD-107', P1),
    ]), makeGameDeps(0x107) as never)
    const initial = findCardPlay(g, P1, 'kd', 'a1')!
    const R = runScene({
      build: () => ({ g, initial }),
      onChoice: (key, req) => (key === 'knockdownFoe' ? 'f1' : key === 'knockdownGear' ? 'g1' : String((req.candidates as readonly Any[])[0]?.id ?? '')),
      onWindow: (_gg, _p, st) => {
        if (st.confirmDone && !st.mutated) {
          mutateInWindow(g, (s) => {
            const s1 = addObj(s, 'g2', 'SFD-009', P1, BF0, { baseTypes: ['equipment'], baseTags: ['武装'], status: { attachedTo: asObjId('a1') } })
            return s1
          })
          st.mutated = true
        }
        return null
      },
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.changeStep, '★扰动真的发生了(g2 响应期贴上)').not.toBeNull()
    const asks = R.asks.filter((a) => a.key === 'knockdownGear')
    expect(asks.length, 'knockdownGear 只在确认期问一次').toBe(1)
    expect(asks[0]!.stage, '★在确认期').toBe('confirm')
    expect(asks[0]!.reqStage, '★reqStage=confirm').toBe('confirm')
    expect(asks[0]!.candidates, '★确认期候选只含 g1(答案冻结)').toEqual(['g1'])
    expect(R.asks.some((a) => a.key === 'knockdownGear' && R.changeStep !== null && a.step > R.changeStep), '★扰动后不重问').toBe(false)
    expect(attachedToOf(g, 'g1'), '★确认期选的 g1 被卸除').toBeUndefined()
    expect(attachedToOf(g, 'g2'), '★新贴的 g2 不受影响(仍贴在 a1 上)').toBe('a1')
  })
})

                                                              
describe('★1801d ㈤ 显式两口:确认期那口不吐结算期那问(反例:搬进去 ⇒ ㈠ 红)', () => {
  test('UNL-101:makeConfirmChoice 只问 dest/foe;makeNextChoice 才问 rallyFoeUnit(答者=对手)', () => {
    const s = scene([obj('a1', 'OGN-078', P1, BF0), obj('fu', 'OGN-012', P2, BF0)], { battlefieldControl: { [BF1]: P1 } })
    const confirm = UNL_101_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1, target: 'a1' })
    expect(confirm(s, {})?.key, '① 确认期先问落点').toBe(UNL_101_DEST_KEY)
    expect(confirm(s, { [UNL_101_DEST_KEY]: BF1 })?.key, '② 再问选哪名对手').toBe(UNL_101_FOE_KEY)
                                                           
    expect(confirm(s, { [UNL_101_DEST_KEY]: BF1, [UNL_101_FOE_KEY]: P2 as string }), '★确认期到此收口').toBeNull()
    const next = UNL_101_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1, target: 'a1' })
    const q = next(s, { [UNL_101_DEST_KEY]: BF1, [UNL_101_FOE_KEY]: P2 as string })
    expect(q?.key, '③ 结算期才问该对手送谁').toBe(UNL_101_FOE_UNIT_KEY)
    expect(q?.controller, '★答者是对手').toBe(P2)
  })

  test('UNL-139:makeConfirmChoice 只问战场;makeNextChoice 才问从对手手牌挑牌(答者=我)', () => {
    const s = scene([inHand('u2', 'OGN-078', P2)])
    const confirm = UNL_139_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1 })
    expect(confirm(s, {})?.key, '确认期问战场').toBe(UNL_139_BF_KEY)
    expect(confirm(s, { [UNL_139_BF_KEY]: BF0 }), '★确认期到此收口(不把从手牌挑牌拖进来)').toBeNull()
    const next = UNL_139_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 })
    const q = next(s, { [UNL_139_BF_KEY]: BF0 })
    expect(q?.key, '结算期才问从对手手牌挑牌').toBe(UNL_139_PICK_KEY)
    expect(q?.controller, '★答者是我').toBe(P1)
  })
})
