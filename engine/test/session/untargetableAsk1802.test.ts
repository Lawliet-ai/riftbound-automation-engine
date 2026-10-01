                                                                
  
                                  
                                                                        
                         
                                                             
                                   
                                                   
                                                           
  
        
                                                                                     
                                             
                                                                                    
                                                              
  
      
                                                                       
                                                                       
                                                                         
                                               
                                                                  
  
                                                                                                    
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { blocksEnemyTargeting } from '../../src/keywords/untargetable'
import { shroudEvent } from '../../data/cards/untargetable-cards'

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
const mutationsDeps = makeGameDeps(0x1802) as never

                                                        
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
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
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

const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target)
    && !(a.echoPicks?.length)) ?? null) as InteractiveAction | null
}

interface AskRec { step: number; key: string; stage: 'confirm' | 'resolve'; reqStage: string | undefined; passesBefore: number; answer: string; candidates: string[]; isTarget: boolean }
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
        asks.push({ step: steps, key, stage: passes === 0 ? 'confirm' : 'resolve', reqStage: req.stage, passesBefore: passes, answer: ans, candidates: cands, isTarget: req.isTarget === true })
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

const firstCand = (req: Any): string => String(((req.candidates ?? []) as readonly Any[])[0]?.id ?? '')
const damageOf = (g: InteractiveGame, oid: string): number =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.damage) ?? 0
const statusOf = (g: InteractiveGame, oid: string): Any =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.status) ?? {}
const shields = (g: InteractiveGame, oid: string): boolean => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? false : blocksEnemyTargeting(o)
}

                                                          
describe('★1802 ㈠ 确认期目标问:候选不含「敌方不可选我」的沙墟啸匪 SFD-105', () => {
  interface Case { defId: string; oid: string; key: string; target?: string; objs: () => GameObject[] }
  const CASES: readonly Case[] = [
    {
      defId: 'OGN-260', oid: 'gust', key: 'gustFoe', target: 'ally1',
      objs: () => [
        obj('ally1', 'BLK', P1, 'base:P1', { baseMight: 3 }),
        obj('foe', 'SFD-105', P2, BF0, { baseMight: 3 }),
        obj('plainFoe', 'BLK', P2, BF0, { baseMight: 3 }),
        inHand('gust', 'OGN-260', P1),
      ],
    },
    {
      defId: 'UNL-186', oid: 'well', key: 'wellspringVictim',
      objs: () => [
        obj('foe', 'SFD-105', P2, BF0, { baseMight: 3 }),
        obj('plainFoe', 'BLK', P2, BF0, { baseMight: 3 }),
        inHand('well', 'UNL-186', P1),
      ],
    },
    {
      defId: 'UNL-198', oid: 'mf', key: 'moonfallMove', target: BF1,
      objs: () => [
        obj('ally1', 'BLK', P1, BF1, { baseMight: 3 }), // 使 BF1 = 「我有单位的战场」
        obj('foe', 'SFD-105', P2, BF0, { baseMight: 3 }),
        obj('plainFoe', 'BLK', P2, BF0, { baseMight: 3 }),
        inHand('mf', 'UNL-198', P1),
      ],
    },
  ]

  test('三张真卡:确认期候选有 plainFoe、没有带限制的 foe;且 foe 真带着那条限制', () => {
    for (const c of CASES) {
      const g = new InteractiveGame(scene(c.objs()), makeGameDeps(0x1802) as never)
      const initial = findCardPlay(g, P1, c.oid, c.target)
      expect(initial, `${c.defId}:找得到打出动作`).toBeTruthy()
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => (key === c.key ? 'plainFoe' : firstCand(req)),
        onWindow: () => null,
      })
      expect(R.error, `${c.defId} 运行异常:${R.error}`).toBeNull()
      expect(R.hitCap, `${c.defId} 打满步数`).toBe(false)
      const asks = R.asks.filter((a) => a.key === c.key)
      expect(asks.length, `${c.defId}:${c.key} 恰问一次`).toBe(1)
      expect(asks[0]!.isTarget, `${c.defId}:${c.key} 带 isTarget`).toBe(true)
      expect(asks[0]!.candidates, `${c.defId}:★候选含 plainFoe`).toContain('plainFoe')
      expect(asks[0]!.candidates, `${c.defId}:★★候选不含带限制的 foe`).not.toContain('foe')
                                                      
      expect(shields(g, 'foe'), `${c.defId}:前提 foe 真带着这条限制`).toBe(true)
    }
  })

  test('对照:「自己人」带限制 ⇒ 友方目标问(OGN-206 second)候选【含】它(§355.9.b 只挡敌方)', () => {
    const g = new InteractiveGame(scene([
      obj('a1', 'BLK', P1, BF0, { baseMight: 3 }),
      obj('mine', 'SFD-105', P1, BF0, { baseMight: 3 }), // 沙墟啸匪,**P1 自己的**
      obj('foe', 'BLK', P2, BF1, { baseMight: 3 }),
      inHand('btb', 'OGN-206', P1),
    ]), makeGameDeps(0x1802) as never)
    const initial = findCardPlay(g, P1, 'btb', 'a1')
    expect(initial, '找得到打出动作').toBeTruthy()
    const R = runScene({
      build: () => ({ g, initial: initial! }),
      onChoice: (key, req) => (key === 'second' ? 'mine' : firstCand(req)),
      onWindow: () => null,
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const second = R.asks.filter((a) => a.key === 'second')
    expect(second.length, 'second 恰问一次').toBe(1)
    expect(second[0]!.isTarget, 'second 带 isTarget').toBe(true)
    expect(second[0]!.candidates, '★自己人带限制 ⇒ 候选含它(只挡敌方)').toContain('mine')
    expect(shields(g, 'mine'), '前提:自己那个真带着限制').toBe(true)
  })
})

                                                         
describe('★1802 ㈡ 结算期目标问:OGN-258 内嵌 dragonTailFoe2 候选不含啸匪', () => {
  test('猛龙摆尾:移 mv 到 BF1 后,终点处另一名敌方候选有 plainFoe、没有 SFD-105', () => {
    const g = new InteractiveGame(scene([
      obj('mv', 'BLK', P2, BF0, { baseMight: 3 }),      // 被移动的敌方
      obj('foe', 'SFD-105', P2, BF1, { baseMight: 3 }), // 终点处的敌方(带限制)
      obj('plainFoe', 'BLK', P2, BF1, { baseMight: 3 }), // 终点处的敌方(对照)
      inHand('dt', 'OGN-258', P1),
    ]), makeGameDeps(0x1802) as never)
    const initial = findCardPlay(g, P1, 'dt', 'mv')
    expect(initial, '找得到打出动作').toBeTruthy()
    const R = runScene({
      build: () => ({ g, initial: initial! }),
      onChoice: (key, req) => (key === 'dragonTailDest' ? BF1 : key === 'dragonTailFoe2' ? 'plainFoe' : firstCand(req)),
      onWindow: () => null,
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.hitCap, '打满步数').toBe(false)
    const foe2 = R.asks.filter((a) => a.key === 'dragonTailFoe2')
    expect(foe2.length, 'dragonTailFoe2 恰问一次').toBe(1)
    expect(foe2[0]!.stage, '★这一问确实发生在结算期(PASS 之后)').toBe('resolve')
    expect(foe2[0]!.passesBefore).toBeGreaterThan(0)
    expect(foe2[0]!.isTarget, '带 isTarget').toBe(true)
    expect(foe2[0]!.candidates, '★候选含 plainFoe').toContain('plainFoe')
    expect(foe2[0]!.candidates, '★★候选不含带限制的 foe').not.toContain('foe')
    expect(shields(g, 'foe'), '前提:foe 真带着限制').toBe(true)
  })
})

                                                                             
describe('★1802 ㈢ 候选过滤后为空 ⇒ 这张牌不可打出;候选非空时列得出', () => {
  test('OGN-260 只剩啸匪一个敌方 ⇒ 不可打出(第二问无候选);补一名可选取敌方 ⇒ 列得出、候选不含啸匪', () => {
                                                          
                                                                    
                          
    {
      const g = new InteractiveGame(scene([
        obj('ally1', 'BLK', P1, 'base:P1', { baseMight: 3, status: { dormant: true } }),
        obj('foe', 'SFD-105', P2, BF0, { baseMight: 9 }),
        inHand('gust', 'OGN-260', P1),
      ]), makeGameDeps(0x1802) as never)
      expect(shields(g, 'foe'), '前提:foe 真带着「敌方不可选我」').toBe(true)
      expect(findCardPlay(g, P1, 'gust', 'ally1'), '★第二问候选被过滤空 ⇒ 不可打出(§355.8)').toBeNull()
    }
                                                              
    {
      const g = new InteractiveGame(scene([
        obj('ally1', 'BLK', P1, 'base:P1', { baseMight: 3, status: { dormant: true } }),
        obj('foe', 'SFD-105', P2, BF0, { baseMight: 9 }),
        obj('plainFoe', 'BLK', P2, BF0, { baseMight: 9 }),
        inHand('gust', 'OGN-260', P1),
      ]), makeGameDeps(0x1802) as never)
      const initial = findCardPlay(g, P1, 'gust', 'ally1')
      expect(initial, '★对照:候选非空 ⇒ 列得出').toBeTruthy()
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => (key === 'gustFoe' ? 'plainFoe' : firstCand(req)),
        onWindow: () => null,
      })
      expect(R.error, `★不抛错:${R.error}`).toBeNull()
      expect(R.hitCap, '不打满步数').toBe(false)
      const asks = R.asks.filter((a) => a.key === 'gustFoe')
      expect(asks.length, '★列得出 ⇒ gustFoe 问出现').toBe(1)
      expect(asks[0]!.candidates, '★候选含 plainFoe').toContain('plainFoe')
      expect(asks[0]!.candidates, '★★候选不含啸匪').not.toContain('foe')
      expect(damageOf(g, 'foe'), '★啸匪无伤').toBe(0)
      expect(damageOf(g, 'plainFoe'), '★plainFoe 受伤').toBeGreaterThan(0)
      expect(statusOf(g, 'ally1').dormant, '★前半句「变为活跃」照发').not.toBe(true)
    }
  })
})

                                                                      
describe('★1802 ㈣ §758.1:确认期选中的目标在响应窗口变为不可被选取 ⇒ 结算失去目标', () => {
  test('OGN-260:确认期选 plainFoe;P2 窗口给它注入这条限制 ⇒ 结算无伤、前半句照旧;对照有伤', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene([
      obj('ally1', 'BLK', P1, 'base:P1', { baseMight: 3 }),
      obj('plainFoe', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('gust', 'OGN-260', P1),
    ]), makeGameDeps(0x1802) as never)
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'gust', 'ally1')
      expect(initial, '找得到打出动作').toBeTruthy()
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => (key === 'gustFoe' ? 'plainFoe' : firstCand(req)),
        onWindow: (_gg, _p, st) => {
          if (st.confirmDone && !st.mutated) {
            mutateInWindow(g, (s) => applyEvents(s, [shroudEvent('probe1802:shroud', 'plainFoe')], mutationsDeps).state)
            st.mutated = true
          }
          return null
        },
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(R.changeStep, '★扰动真的发生了(窗口注入限制)').not.toBeNull()
      expect(shields(g, 'plainFoe'), '前提:注入后真带着限制').toBe(true)
      expect(damageOf(g, 'plainFoe'), '★★§758.1:结算前不可被选取 ⇒ 无伤').toBe(0)
      expect(statusOf(g, 'ally1').dormant, '★前半句「变为活跃」照发').not.toBe(true)
    }
                     
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'gust', 'ally1')
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key, req) => (key === 'gustFoe' ? 'plainFoe' : firstCand(req)),
        onWindow: () => null,
      })
      expect(R.error, `对照运行异常:${R.error}`).toBeNull()
      expect(damageOf(g, 'plainFoe'), '★对照:plainFoe 受伤 3(ally1 战力)').toBe(3)
    }
  })

  test('OGN-105(multiSelect):确认期选 u1;窗口注入限制 ⇒ 结算 u1 无伤;对照有伤', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene([
      obj('u1', 'BLK', P2, BF0, { baseMight: 9 }),
      obj('u2', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('sf', 'OGN-105', P1),
    ]), makeGameDeps(0x1802) as never)
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'sf')
      expect(initial, '找得到打出动作').toBeTruthy()
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key) => (key === 'starfall0' ? 'u1' : key === 'starfall1' ? '__done__' : ''),
        onWindow: (_gg, _p, st) => {
          if (st.confirmDone && !st.mutated) {
            mutateInWindow(g, (s) => applyEvents(s, [shroudEvent('probe1802:shroud2', 'u1')], mutationsDeps).state)
            st.mutated = true
          }
          return null
        },
      })
      expect(R.error, `运行异常:${R.error}`).toBeNull()
      expect(R.changeStep, '★扰动真的发生了(窗口注入限制)').not.toBeNull()
      expect(shields(g, 'u1'), '前提:注入后真带着限制').toBe(true)
      expect(damageOf(g, 'u1'), '★★§758.1:结算前不可被选取 ⇒ 无伤(6 点被吞)').toBe(0)
    }
                          
    {
      const g = build()
      const initial = findCardPlay(g, P1, 'sf')
      const R = runScene({
        build: () => ({ g, initial: initial! }),
        onChoice: (key) => (key === 'starfall0' ? 'u1' : key === 'starfall1' ? '__done__' : ''),
        onWindow: () => null,
      })
      expect(R.error, `对照运行异常:${R.error}`).toBeNull()
      expect(damageOf(g, 'u1'), '★对照:u1 受伤 6').toBe(6)
    }
  })
})
