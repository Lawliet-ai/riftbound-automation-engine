                                                                   
                                                       
                                                        
  
                                                                      
                                                    
                             
                                                    
                                                      
                                                       
  
                                                               
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'

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
const mutationsDeps = makeGameDeps(0x1801f) as never

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[], bfCards: Record<string, { defId: string; owner: PlayerId }> = {}): GameState {
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
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    ...(Object.keys(bfCards).length > 0 ? { battlefieldCards: bfCards } : {}),
    runePools: {
      P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
    },
  } as GameState)
}

                                            
function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = fn(curState(g))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null =>
  (g.legalActions(player) as readonly Any[]).find((a) => a.kind === 'PLAY_CARD'
    && String(a.cardOid) === cardOid && (target === undefined || String(a.target) === target)) as InteractiveAction | null

interface AskRec { step: number; key: string; stage: 'confirm' | 'resolve'; answer: string; candidates: string[] }
interface RunOut { asks: AskRec[]; changeStep: number | null; error: string | null; hitCap: boolean }

interface SceneSpec {
  build: () => { g: InteractiveGame; initial: InteractiveAction }
  onChoice: (key: string, cands: readonly string[]) => string
  onWindow: (g: InteractiveGame, state: { confirmDone: boolean; mutated: boolean }) => void
}

function runScene(sc: SceneSpec): RunOut {
  const asks: AskRec[] = []
  const st = { confirmDone: false, mutated: false }
  let steps = 0
  let passes = 0
  let error: string | null = null
  let changeStep: number | null = null
  const { g, initial } = sc.build()
  try {
    g.apply(initial); steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const ans = sc.onChoice(String(req.key), cands)
        asks.push({ step: steps, key: String(req.key), stage: passes === 0 ? 'confirm' : 'resolve', answer: ans, candidates: cands })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        steps++
        continue
      }
      if (raw.mode === 'window') {
        if (asks.length > 0) st.confirmDone = true
        const before = st.mutated
        sc.onWindow(g, st)
        if (st.mutated && !before) changeStep = steps
        passes++
        g.apply({ kind: 'PASS', player: raw.player } as never)
        steps++
        continue
      }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { asks, changeStep, error, hitCap: steps >= STEP_CAP }
}

const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}
const damageOf = (g: InteractiveGame, oid: string): number | undefined =>
  (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.damage

const DEST = 'dragonTailDest'
const FOE2 = 'dragonTailFoe2'

                                             
const baseUnits = (): GameObject[] => [
  obj('foe', 'BLK', P2, BF0, { baseMight: 5 }),
  obj('other', 'BLK', P2, BF1, { baseMight: 2 }),
  inHand('tail', 'OGN-258', P1),
]

describe('★1801f 缺陷 263 · 猛龙摆尾入链判据 = 目标合法(不看移动有没有发生)', () => {
  test('㈠ 落点在响应期变成当前位置 ⇒ 移动不发生,但内嵌项目【入链】、问 dragonTailFoe2、互殴照发', () => {
    const g = new InteractiveGame(scene(baseUnits()), makeGameDeps(0x1801f) as never)
    const initial = findCardPlay(g, P1, 'tail', 'foe')!
    expect(initial, '前提:OGN-258 打得出来').toBeTruthy()
    const R = runScene({
      build: () => ({ g, initial }),
      onChoice: (key) => (key === DEST ? BF1 : key === FOE2 ? 'other' : ''),
      onWindow: (gg, st) => {
        if (st.confirmDone && !st.mutated) {
                                                        
          mutateInWindow(gg, (s) => applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('foe'), to: asZoneId(BF1) }] as never, mutationsDeps).state)
          st.mutated = true
        }
      },
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.changeStep, '★扰动真的发生了(foe 被先移到 BF1)').not.toBeNull()
    const destAsk = R.asks.find((a) => a.key === DEST)
    expect(destAsk?.stage, '落点在确认期问').toBe('confirm')
    expect(destAsk?.answer, '确认期选 BF1').toBe(BF1)
    expect(R.asks.some((a) => a.key === FOE2), '★★★移动被撤销但目标合法 ⇒ 内嵌项目仍入链 ⇒ 问了 dragonTailFoe2').toBe(true)
    expect(zoneOf(g, 'foe'), '★移动没发生(它本来就被扰动挪到了 BF1)').toBe(BF1)
    expect(damageOf(g, 'foe'), '★★互殴照发:foe 吃了 other 的 2').toBe(2)
    expect(zoneOf(g, 'other'), '★★other 吃 5 点、战力 2 ⇒ 被摧毁(§124 换 oid)').toBe('gone')
  })

  test('㈡ 落点受限(巢穴 OGN-295 锁基地,确认期选基地)⇒ 移动被撤销,但内嵌项目照样入链', () => {
                                                         
    const s = scene([
      obj('foe', 'BLK', P2, BF0, { baseMight: 5 }),
      obj('other', 'BLK', P2, BF0, { baseMight: 2 }),
      inHand('tail', 'OGN-258', P1),
    ], { [BF0]: { defId: 'OGN-295', owner: P1 } })
    expect(s.objects[asObjId('foe')]!.derived?.restrictions, '前提:巢穴真的锁了 foe 的基地').toContain('moveToBase')
    const g = new InteractiveGame(s, makeGameDeps(0x1801f) as never)
    const initial = findCardPlay(g, P1, 'tail', 'foe')!
    expect(initial, '前提:OGN-258 打得出来').toBeTruthy()
    const R = runScene({
      build: () => ({ g, initial }),
      onChoice: (key) => (key === DEST ? `base:${P2}` : key === FOE2 ? 'other' : ''),
      onWindow: () => undefined,
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const destAsk = R.asks.find((a) => a.key === DEST)
    expect(destAsk?.candidates, '★★候选含被锁的基地(缺陷 264 修复)').toContain(`base:${P2}`)
    expect(destAsk?.answer, '确认期选基地').toBe(`base:${P2}`)
    expect(R.asks.some((a) => a.key === FOE2), '★★★移动被限制撤销 ⇒ 目标仍合法 ⇒ 内嵌项目入链').toBe(true)
    expect(zoneOf(g, 'foe'), '★移动被撤销,留在原地').toBe(BF0)
    expect(damageOf(g, 'foe'), '★★互殴照发(终点 = 原地 BF0,other 在那儿)').toBe(2)
    expect(zoneOf(g, 'other'), '★★other 被 5 点打死').toBe('gone')
  })

  test('㈢ 目标在响应期离场 ⇒ 前置指示被无视 ⇒ 【不入链】(§359.3.e.14.a)', () => {
    const g = new InteractiveGame(scene(baseUnits()), makeGameDeps(0x1801f) as never)
    const initial = findCardPlay(g, P1, 'tail', 'foe')!
    const R = runScene({
      build: () => ({ g, initial }),
      onChoice: (key) => (key === DEST ? BF1 : key === FOE2 ? 'other' : ''),
      onWindow: (gg, st) => {
        if (st.confirmDone && !st.mutated) {
                                      
          mutateInWindow(gg, (s) => applyEvents(s, [{ kind: 'zoneChange', obj: asObjId('foe'), to: asZoneId(`hand:${P2}`) }] as never, mutationsDeps).state)
          st.mutated = true
        }
      },
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.changeStep, '★扰动真的发生了(foe 离场)').not.toBeNull()
    expect(R.asks.some((a) => a.key === FOE2), '★★★目标失法 ⇒ 前置指示被无视 ⇒ 内嵌项目不入链、不问 dragonTailFoe2').toBe(false)
    expect(damageOf(g, 'other'), '★★没互殴:other 没受伤').toBe(0)
  })

  test('㈣ 对照(不扰动)⇒ 移动发生、内嵌项目入链、互殴照发', () => {
    const g = new InteractiveGame(scene(baseUnits()), makeGameDeps(0x1801f) as never)
    const initial = findCardPlay(g, P1, 'tail', 'foe')!
    const R = runScene({
      build: () => ({ g, initial }),
      onChoice: (key) => (key === DEST ? BF1 : key === FOE2 ? 'other' : ''),
      onWindow: () => undefined,
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(zoneOf(g, 'foe'), '★对照:foe 真被移到 BF1').toBe(BF1)
    expect(R.asks.some((a) => a.key === FOE2), '★对照:内嵌项目入链并问出 dragonTailFoe2').toBe(true)
    expect(damageOf(g, 'foe'), '★对照:互殴照发').toBe(2)
    expect(zoneOf(g, 'other'), '★对照:other 被打死').toBe('gone')
  })
})
