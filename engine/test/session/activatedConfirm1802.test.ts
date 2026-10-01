                                                                                     
                                                                 
  
                                
                                                                                              
                                                                             
                                                            
                                                                                              
                                                          
  
      
                                                                       
                                                                   
                                                                                 
                                                                      
                                                            
                                                      
                                                   
                                                                                                     
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { applyEvents } from '../../src/loop/reduce'
import { blocksEnemyTargeting } from '../../src/keywords/untargetable'
import { GAINED_TAG_KEY } from '../../data/cardTagQuery'
import { pumpEvent } from '../../data/cards/activated-batch'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
const DEPS = makeGameDeps(0x1802d) as never
const MDEPS = makeGameDeps(0x1802d) as never
const FULL = { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } }
const TAG = 'PROBE1802D'

type Any = Record<string, any>

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const chainOf = (g: InteractiveGame): readonly Any[] => (curState(g).chain ?? []) as unknown as readonly Any[]
const objOf = (g: InteractiveGame, oid: string): Any | undefined =>
  (curState(g).objects as unknown as Record<string, Any>)[oid]
const mightOf = (g: InteractiveGame, oid: string): number => {
  const o = objOf(g, oid)
  return o === undefined ? -999 : ((o.derived as Any | undefined)?.might ?? o.baseMight ?? 0)
}
const zoneOf = (g: InteractiveGame, oid: string): string => objOf(g, oid)?.zone ?? 'gone'
const shields = (g: InteractiveGame, oid: string): boolean => {
  const o = objOf(g, oid)
  return o === undefined ? false : blocksEnemyTargeting(o as unknown as GameObject)
}

                                                      
const mko = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

                                         
const place = (oid: string, defId: string, who: PlayerId, extra: Partial<GameObject> = {}): GameObject => {
  const cat = CARD_CATEGORIES[defId]
  const zone = cat === 'legend' ? `legend:${who}` : `base:${who}`
  const baseTypes = cat === 'legend' ? ['legend'] : cat === 'equipment' ? ['equipment'] : ['unit']
  return mko(oid, defId, who, zone, { baseTypes: baseTypes as never, baseMight: cat === 'unit' ? 6 : 0, ...extra })
}

function scene(objs: readonly GameObject[], patch: Partial<GameState> = {}): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { P1: FULL, P2: FULL }, ...patch,
  } as GameState)
}

                                            
function mutateInWindow(g: InteractiveGame, fn: (s: GameState) => GameState): void {
  const snap = g.snapshot() as Any
  const after = recomputeContinuous(fn(curState(g)))
  if (snap.window) g.restore({ ...snap, window: { ...snap.window, state: after } } as never)
  else if (snap.choice) g.restore({ ...snap, choice: { ...snap.choice, state: after } } as never)
  else g.restore({ ...snap, state: after } as never)
}

const activateActs = (g: InteractiveGame, oid: string, ability: string): Any[] =>
  (g.legalActions(P1) as unknown as Any[]).filter((a) => a.kind === 'ACTIVATE' && String(a.oid) === oid && String(a.ability) === ability)

                                                      
interface Ask { step: number; key: string; itemId: string; reqStage: string | undefined; passesBefore: number; candidates: string[]; isTarget: boolean; answer: string }
interface RunOut { asks: Ask[]; error: string | null; hitCap: boolean; steps: number }

interface DriveOpts {
  readonly answer: (key: string, req: Any) => string
  readonly onWindow?: (g: InteractiveGame, player: PlayerId, n: number) => InteractiveAction | null
  readonly afterChoice?: (g: InteractiveGame, n: number) => void
}

function runActivate(g: InteractiveGame, act: Any, opts: DriveOpts): RunOut {
  const asks: Ask[] = []
  let steps = 0
  let passes = 0
  let error: string | null = null
  try {
    g.apply(act as InteractiveAction)
    steps++
    for (; steps < STEP_CAP;) {
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const key = String(req.key)
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        const ans = opts.answer(key, req)
        asks.push({ step: steps, key, itemId: String(req.itemId), reqStage: req.stage, passesBefore: passes, candidates: cands, isTarget: req.isTarget === true, answer: ans })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        steps++
        opts.afterChoice?.(g, asks.length)
        continue
      }
      if (raw.mode === 'window') {
        const play = opts.onWindow?.(g, raw.player as PlayerId, passes) ?? null
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
  return { asks, error, hitCap: steps >= STEP_CAP, steps }
}

const firstCand = (req: Any): string => String(((req.candidates ?? []) as readonly Any[])[0]?.id ?? '')

                                                                    
interface ActCase {
  readonly label: string
  readonly defId: string
  readonly ability: string
  readonly build: () => { g: InteractiveGame; act: Any }
  readonly answer: (key: string, req: Any) => string
                                
  readonly confirmKeys: readonly string[]
                                 
  readonly resolvePrefixes?: readonly string[]
}

const FORGE: GameObject[] = [place('forge', 'OGN-212', P1), mko('d1', 'BLK', P1, 'discard:P1'), mko('d2', 'BLK', P2, 'discard:P2')]
const YASUO: GameObject[] = [place('yasuo', 'OGN-259', P1, { baseMight: 0 }), mko('yb', 'BLK', P1, 'base:P1'), mko('yb2', 'BLK', P1, BF0)]
const WM: GameObject[] = [
  place('wm', 'SFD-193', P1),
  mko('arm1', 'SFD-150', P1, 'base:P1', { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never }),
  mko('arm2', 'SFD-030', P1, 'base:P1', { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never, status: { attachedTo: 'wmU' } as never }),
  mko('wmU', 'BLK', P1, 'base:P1'),
]
const HIT: GameObject[] = [place('hl', 'UNL-138', P1, { declared: { hitListTag: TAG } }), mko('tagged', 'BLK', P1, BF0, { declared: { [GAINED_TAG_KEY]: TAG } })]
const MADURI: GameObject[] = [place('maduri', 'UNL-144', P1, { baseMight: 6 }), mko('me0', 'BLK', P2, BF0, { baseMight: 1 }), mko('me1', 'BLK', P2, BF1, { baseMight: 1 })]
const MADURI_PATCH = { battlefieldControl: { [BF0]: P2, [BF1]: P2 } }
const GHOST: GameObject[] = [place('ghost', 'UNL-228', P1), mko('gu1', 'BLK', P1, BF0)]
const GLOW: GameObject[] = [place('glow', 'VEN-133', P1, { counters: { empower: 1 } })]
const JAYCE: GameObject[] = [
  place('jayce', 'VEN-194', P1, { counters: { empower: 1 } }),
  mko('g1', 'SFD-150', P1, 'base:P1', { baseTypes: ['equipment'] as never, status: { tapped: true } }),
  mko('g2', 'SFD-150', P2, 'base:P2', { baseTypes: ['equipment'] as never, status: { tapped: true } }),
  mko('g3', 'SFD-150', P1, 'base:P1', { baseTypes: ['equipment'] as never, status: { tapped: true } }),
]
                                                                                         
const SARC: GameObject[] = [place('sarc', 'UNL-148', P1), mko('ba', 'UNL-150', P1, 'exile:P1'), mko('sarcAlly', 'BLK', P1, BF0)]
const SARC_PATCH = { banishLedger: { sarc: ['ba'] as never } }

const multiFirst = (req: Any): string => {
  const c = ((req.candidates ?? []) as readonly Any[]).map((x) => String(x.id)).filter((id) => id !== '__done__')
  return c[0] ?? '__done__'
}

const CASES: readonly ActCase[] = [
  {
    label: 'OGN-212 未来熔炉(多选回收)', defId: 'OGN-212', ability: 'OGN-212:recycle',
    build: () => { const g = new InteractiveGame(scene(FORGE), DEPS); return { g, act: activateActs(g, 'forge', 'OGN-212:recycle')[0]! } },
    answer: (key, req) => (key.startsWith('OGN212rec') ? multiFirst(req) : firstCand(req)), confirmKeys: ['OGN212rec0'],
  },
  {
    label: 'OGN-259 疾风剑豪(基地→战场落点)', defId: 'OGN-259', ability: 'OGN-259:shuttle',
    build: () => {
      const g = new InteractiveGame(scene(YASUO), DEPS)
      const act = activateActs(g, 'yasuo', 'OGN-259:shuttle').find((a) => String(a.target) === 'yb')!
      return { g, act }
    },
    answer: (key, req) => (key === 'yasuoDest' ? BF1 : firstCand(req)), confirmKeys: ['yasuoDest'],
  },
  {
    label: 'SFD-193 武器大师(未贴附档)', defId: 'SFD-193', ability: 'SFD-193:equip',
    build: () => {
      const g = new InteractiveGame(scene(WM), DEPS)
      const act = activateActs(g, 'wm', 'SFD-193:equip').find((a) => String(a.target) === 'arm1')!
      return { g, act }
    },
    answer: (_key, req) => (String(_key).includes('Attach') ? 'wmU' : firstCand(req)), confirmKeys: ['wmAttachTo'],
  },
  {
    label: 'SFD-193 武器大师(已贴附档)', defId: 'SFD-193', ability: 'SFD-193:reattach',
    build: () => {
      const g = new InteractiveGame(scene(WM), DEPS)
      const act = activateActs(g, 'wm', 'SFD-193:reattach').find((a) => String(a.target) === 'arm2')!
      return { g, act }
    },
    answer: (_key, req) => (String(_key).includes('Attach') ? 'wmU' : firstCand(req)), confirmKeys: ['wmAttachTo'],
  },
  {
    label: 'UNL-138 夺命名单(句②)', defId: 'UNL-138', ability: 'UNL-138:hitList',
    build: () => { const g = new InteractiveGame(scene(HIT), DEPS); return { g, act: activateActs(g, 'hl', 'UNL-138:hitList')[0]! } },
    answer: (key, req) => (key === 'hitListVictim' ? 'tagged' : firstCand(req)), confirmKeys: ['hitListVictim'],
  },
  {
    label: 'UNL-144 守门者马杜里', defId: 'UNL-144', ability: 'UNL-144:move',
    build: () => { const g = new InteractiveGame(scene(MADURI, MADURI_PATCH), DEPS); return { g, act: activateActs(g, 'maduri', 'UNL-144:move')[0]! } },
    answer: (key, req) => (key === 'maduriZone' ? BF1 : firstCand(req)), confirmKeys: ['maduriZone'],
  },
  {
    label: 'UNL-228 血港鬼影', defId: 'UNL-228', ability: 'UNL-228:bounce',
    build: () => { const g = new InteractiveGame(scene(GHOST), DEPS); return { g, act: activateActs(g, 'ghost', 'UNL-228:bounce')[0]! } },
    answer: (key, req) => (key === 'ghostBounce' ? 'gu1' : firstCand(req)), confirmKeys: ['ghostBounce'],
  },
  {
    label: 'VEN-133 发光石(选玩家)', defId: 'VEN-133', ability: 'VEN-133:handover',
    build: () => { const g = new InteractiveGame(scene(GLOW), DEPS); return { g, act: activateActs(g, 'glow', 'VEN-133:handover')[0]! } },
    answer: (key, req) => (key === 'glowStonePlayer' ? 'P1' : firstCand(req)), confirmKeys: ['glowStonePlayer'],
  },
  {
    label: 'VEN-194 未来守护者(两件档)', defId: 'VEN-194', ability: 'VEN-194:ready2',
    build: () => {
      const g = new InteractiveGame(scene(JAYCE), DEPS)
      const act = activateActs(g, 'jayce', 'VEN-194:ready2').find((a) => String(a.target) === 'g1')!
      return { g, act }
    },
    answer: (key, req) => (key === 'jayceSecondGear' ? 'g3' : firstCand(req)), confirmKeys: ['jayceSecondGear'],
  },
  {
    label: 'UNL-148 受诅咒的石棺(显式两口:pick 确认 / to 结算)', defId: 'UNL-148', ability: 'UNL-148:sarcophagus',
    build: () => { const g = new InteractiveGame(scene(SARC, SARC_PATCH), DEPS); return { g, act: activateActs(g, 'sarc', 'UNL-148:sarcophagus')[0]! } },
    answer: (key, req) => (key === 'sarcophagusPick' ? 'ba' : firstCand(req)),
    confirmKeys: ['sarcophagusPick'], resolvePrefixes: ['sarcophagusTo'],
  },
]

describe('★1802d ㈠ 9 张 / 11 条技能:确认期键全 confirm、PASS 前;UNL-148 的 to 在结算期', () => {
  test('逐条:造得出动作 · 确认期键 reqStage===\'confirm\' 且 PASS 前 · resolvePrefixes 在 PASS 后', () => {
    for (const c of CASES) {
      const { g, act } = c.build()
      expect(act, `${c.label}:造得出 ACTIVATE 动作`).toBeTruthy()
      const R = runActivate(g, act, { answer: c.answer })
      expect(R.error, `${c.label}:运行异常 ${R.error}`).toBeNull()
      expect(R.hitCap, `${c.label}:不打满步数`).toBe(false)
      const confirmAsks = R.asks.filter((a) => a.passesBefore === 0)
                                                             
      for (const a of confirmAsks) expect(a.reqStage, `${c.label}:${a.key} 在确认期 ⇒ reqStage=confirm`).toBe('confirm')
      for (const k of c.confirmKeys) {
        const hit = R.asks.find((a) => a.key === k)
        expect(hit, `${c.label}:确认期键 ${k} 出现了`).toBeTruthy()
        expect(hit!.reqStage, `${c.label}:${k} 必须 reqStage==='confirm'`).toBe('confirm')
        expect(hit!.passesBefore, `${c.label}:${k} 必须在 PASS 前`).toBe(0)
      }
      for (const pre of c.resolvePrefixes ?? []) {
        const hits = R.asks.filter((a) => a.key.startsWith(pre))
        expect(hits.length, `${c.label}:${pre}* 出现了(结算期)${JSON.stringify(R.asks.map((a) => `${a.key}@${a.reqStage}`))}`).toBeGreaterThan(0)
        for (const a of hits) {
          expect(a.reqStage, `${c.label}:${a.key} 必须 reqStage==='resolve'`).toBe('resolve')
          expect(a.passesBefore, `${c.label}:${a.key} 必须在 PASS 后`).toBeGreaterThan(0)
        }
      }
    }
  })
})

                                                                      
describe('★1802d ㈡ 通路(UNL-228):frozenChoices/targets 冻结 · 结算生效 · 结算期无重问', () => {
  test('确认期答 u1 ⇒ act: 项目 frozenChoices.ghostBounce=u1、targets 含 u1;u1 回手、金币照打;只有一问', () => {
    const g = new InteractiveGame(scene(GHOST), DEPS)
    const act = activateActs(g, 'ghost', 'UNL-228:bounce')[0]!
    const handBefore = curState(g).zones[`hand:${P1}` as never]?.contents.length ?? 0
    let frozenAt: Any | null = null
    let targetsAt: Any | null = null
    let itemId: string | null = null
    const R = runActivate(g, act, {
      answer: (key) => (key === 'ghostBounce' ? 'gu1' : firstCand({})),
      afterChoice: (gg, n) => {
        if (n !== 1) return
        const it = chainOf(gg).find((i) => String(i.id).startsWith('act:'))
        if (it) { frozenAt = it.frozenChoices ?? null; targetsAt = it.targets ?? null; itemId = String(it.id) }
      },
    })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(itemId, '定位到 act: 项目').toContain('act:ghost')
    expect(frozenAt, '★答案冻进 frozenChoices').toMatchObject({ ghostBounce: 'gu1' })
    expect(targetsAt, '★isTarget 问 ⇒ 选中的目标进 targets').toContain('gu1')
                       
    expect(R.asks.map((a) => `${a.key}@${a.reqStage}`), '★只问一次、且在确认期').toEqual(['ghostBounce@confirm'])
                                                  
    expect(zoneOf(g, 'gu1'), '★u1 已离开战场').not.toBe(BF0)
    const handAfter = curState(g).zones[`hand:${P1}` as never]?.contents.length ?? 0
    expect(handAfter, '★u1 回到 P1 手牌(手牌 +1)').toBe(handBefore + 1)
                 
    const gold = Object.values(curState(g).objects as unknown as Any[]).some((o) => String(o.defId).includes('token:金币'))
    expect(gold, '★金币指示物照打(与第一句并列)').toBe(true)
  })
})

describe('★1802d ㈡ §757:ACTIVATE 确认期目标问同样过「敌方不可选我」这道门', () => {
  test('UNL-138 句②:敌方啸匪 SFD-105 带宣告标签也不在候选;plainFoe 在;且有对照证明那条限制真挂上', () => {
    const g = new InteractiveGame(scene([
      place('hl', 'UNL-138', P1, { declared: { hitListTag: TAG } }),
      mko('foe', 'SFD-105', P2, BF0, { baseMight: 3, declared: { [GAINED_TAG_KEY]: TAG } }),
      mko('plainFoe', 'BLK', P2, BF0, { baseMight: 3, declared: { [GAINED_TAG_KEY]: TAG } }),
    ]), DEPS)
    const act = activateActs(g, 'hl', 'UNL-138:hitList')[0]!
    expect(act, '造得出 ACTIVATE 动作').toBeTruthy()
    const R = runActivate(g, act, { answer: (key) => (key === 'hitListVictim' ? 'plainFoe' : firstCand({})) })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    const ask = R.asks.find((a) => a.key === 'hitListVictim')!
    expect(ask.reqStage, '确认期').toBe('confirm')
    expect(ask.candidates, '★候选含 plainFoe').toContain('plainFoe')
    expect(ask.candidates, '★★候选不含敌方啸匪(§757)').not.toContain('foe')
                                        
    expect(shields(g, 'foe'), '前提:foe 真带着限制').toBe(true)
                                             
    const g2 = new InteractiveGame(scene([
      place('hl', 'UNL-138', P1, { declared: { hitListTag: TAG } }),
      mko('mine', 'SFD-105', P1, BF0, { baseMight: 3, declared: { [GAINED_TAG_KEY]: TAG } }),
    ]), DEPS)
    const R2 = runActivate(g2, activateActs(g2, 'hl', 'UNL-138:hitList')[0]!, { answer: (key) => (key === 'hitListVictim' ? 'mine' : firstCand({})) })
    expect(R2.error, `对照运行异常 ${R2.error}`).toBeNull()
    expect(R2.asks.find((a) => a.key === 'hitListVictim')!.candidates, '★自己人带限制 ⇒ 候选含它').toContain('mine')
  })
})

                                                               
describe('★1802d ㈢ 扰动·失法 ⇒ 跳过(确认期选中后、结算前条件/目标不成立)', () => {
  test('UNL-144:确认期选 BF1;窗口给 BF1 敌方加战力使条件不再成立 ⇒ 不移动', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene(MADURI, MADURI_PATCH), DEPS)
    {
      const g = build()
      const act = activateActs(g, 'maduri', 'UNL-144:move')[0]!
      let mutated = false
      const R = runActivate(g, act, {
        answer: (key) => (key === 'maduriZone' ? BF1 : firstCand({})),
        onWindow: (gg) => {
          if (!mutated) { mutateInWindow(gg, (s) => applyEvents(s, [pumpEvent('p1802d:mad', 'me1', 10)], MDEPS).state); mutated = true }
          return null
        },
      })
      expect(R.error, `运行异常 ${R.error}`).toBeNull()
      expect(mutated, '★扰动真发生了').toBe(true)
      expect(mightOf(g, 'me1'), '前提:BF1 敌方总战力已被抬高(6 > 11 不成立)').toBeGreaterThanOrEqual(11)
      expect(zoneOf(g, 'maduri'), '★★条件被破坏 ⇒ 马杜里不移动').toBe(`base:${P1}`)
    }
                    
    {
      const g = build()
      const R = runActivate(g, activateActs(g, 'maduri', 'UNL-144:move')[0]!, { answer: (key) => (key === 'maduriZone' ? BF1 : firstCand({})) })
      expect(R.error, `对照运行异常 ${R.error}`).toBeNull()
      expect(zoneOf(g, 'maduri'), '★对照:马杜里移到 BF1').toBe(BF1)
    }
  })

  test('VEN-194:确认期选第二件 g3;窗口 g3 离场 ⇒ 第二件跳过(只解 g1)', () => {
    const build = (): InteractiveGame => new InteractiveGame(scene(JAYCE), DEPS)
    {
      const g = build()
      const act = activateActs(g, 'jayce', 'VEN-194:ready2').find((a) => String(a.target) === 'g1')!
      let mutated = false
      const R = runActivate(g, act, {
        answer: (key) => (key === 'jayceSecondGear' ? 'g3' : firstCand({})),
        onWindow: (gg) => {
          if (!mutated) { mutateInWindow(gg, (s) => applyEvents(s, [{ kind: 'destroy', target: 'g3' } as never], MDEPS).state); mutated = true }
          return null
        },
      })
      expect(R.error, `运行异常 ${R.error}`).toBeNull()
      expect(mutated, '★扰动真发生了').toBe(true)
      expect(zoneOf(g, 'g3'), '前提:g3 已离场').not.toBe('base:P1')
      expect(objOf(g, 'g1')!.status?.tapped, '★g1(第一件)照常变为活跃').not.toBe(true)
                      
      expect(objOf(g, 'g2')!.status?.tapped, '★g2 从未被选 ⇒ 保持横置').toBe(true)
    }
                    
    {
      const g = build()
      const R = runActivate(g, activateActs(g, 'jayce', 'VEN-194:ready2').find((a) => String(a.target) === 'g1')!, { answer: (key) => (key === 'jayceSecondGear' ? 'g3' : firstCand({})) })
      expect(R.error, `对照运行异常 ${R.error}`).toBeNull()
      expect(objOf(g, 'g1')!.status?.tapped, '★对照:g1 解横置').not.toBe(true)
      expect(objOf(g, 'g3')!.status?.tapped, '★对照:g3 解横置').not.toBe(true)
    }
  })
})

                                                              
describe('★1802d ㈣ 扰动·新候选选不到(UNL-138):确认期只 v1,窗口加 v2 ⇒ 不重问、v2 不受影响', () => {
  test('确认期候选只 v1 ⇒ 答 v1;P2 窗口加 v2(同标签)⇒ 不再问、v2 战力不动,只 v1 -2', () => {
    const g = new InteractiveGame(scene([
      place('hl', 'UNL-138', P1, { declared: { hitListTag: TAG } }),
      mko('v1', 'BLK', P1, BF0, { baseMight: 3, declared: { [GAINED_TAG_KEY]: TAG } }),
    ]), DEPS)
    const act = activateActs(g, 'hl', 'UNL-138:hitList')[0]!
    let mutated = false
    const R = runActivate(g, act, {
      answer: (key) => (key === 'hitListVictim' ? 'v1' : firstCand({})),
      onWindow: (gg) => {
        if (!mutated) {
          mutateInWindow(gg, (s) => {
            const objects = { ...(s.objects as unknown as Record<string, GameObject>) }
            const zones = { ...s.zones }
            const v2 = mko('v2', 'BLK', P1, BF0, { baseMight: 3, declared: { [GAINED_TAG_KEY]: TAG } })
            objects['v2'] = v2
            zones[BF0 as never] = { ...zones[BF0 as never]!, contents: [...zones[BF0 as never]!.contents, asObjId('v2')] }
            return { ...s, objects, zones } as GameState
          })
          mutated = true
        }
        return null
      },
    })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(mutated, '★扰动真发生了(v2 在响应窗口进场)').toBe(true)
    const picks = R.asks.filter((a) => a.key === 'hitListVictim')
    expect(picks.length, '★hitListVictim 恰问一次(不重问)').toBe(1)
    expect(picks[0]!.reqStage, '★那一问在确认期(即 v2 进场之前)').toBe('confirm')
    expect(picks[0]!.candidates, '★确认期候选只有 v1、没有 v2').not.toContain('v2')
    expect(mightOf(g, 'v1'), '★v1 照常 -2').toBe(1)
    expect(mightOf(g, 'v2'), '★v2 不受影响(新候选选不到)').toBe(3)
  })
})

                                                                    
describe('★1802d ㈤ 两口拆分(UNL-148):pick 在确认期、to 在结算期', () => {
  test('sarcophagusPick 在 PASS 前、reqStage=confirm;至少一发 sarcophagusTo* 在 PASS 后、reqStage=resolve', () => {
    const g = new InteractiveGame(scene(SARC, SARC_PATCH), DEPS)
    const act = activateActs(g, 'sarc', 'UNL-148:sarcophagus')[0]!
    expect(act, '造得出 ACTIVATE 动作').toBeTruthy()
    const R = runActivate(g, act, {
      answer: (key) => (key === 'sarcophagusPick' ? 'ba' : firstCand({})),
    })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    const pick = R.asks.find((a) => a.key === 'sarcophagusPick')!
    expect(pick, 'pick 问出现').toBeTruthy()
    expect(pick.reqStage, '★pick 在确认期').toBe('confirm')
    expect(pick.passesBefore, '★pick 在 PASS 前').toBe(0)
    const to = R.asks.find((a) => a.key.startsWith('sarcophagusTo'))!
    expect(to, '★to 问出现').toBeTruthy()
    expect(to.reqStage, '★to 在结算期').toBe('resolve')
    expect(to.passesBefore, '★to 在 PASS 后').toBeGreaterThan(0)
  })
})
