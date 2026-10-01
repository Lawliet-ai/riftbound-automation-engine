                                   
                                                                
                                                                         
  
                                    
                                         
                                                      
                                            
                                           
                                                       
  
      
                                                       
                                                         
                                                              
                         
                                 
                                                                     
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { GAINED_TAG_KEY } from '../../data/cardTagQuery'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 150
const DEPS = makeGameDeps(0x1802f) as never
const FULL = { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } }
const TAG = 'PROBE1802F'

type Any = Record<string, any>

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const chainOf = (g: InteractiveGame): readonly Any[] => (curState(g).chain ?? []) as unknown as readonly Any[]
const objOf = (g: InteractiveGame, oid: string): Any | undefined =>
  (curState(g).objects as unknown as Record<string, Any>)[oid]
const zoneOf = (g: InteractiveGame, oid: string): string => objOf(g, oid)?.zone ?? 'gone'

                                                      
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

                                              
const moveObjInState = (s: GameState, oid: string, to: string): GameState => {
  const o = (s.objects as unknown as Record<string, GameObject>)[oid]!
  const old = o.zone as string
  const zones = { ...s.zones }
  zones[old as never] = { ...zones[old as never]!, contents: zones[old as never]!.contents.filter((x) => x !== oid) }
  zones[to as never] = { ...zones[to as never]!, contents: [...zones[to as never]!.contents, asObjId(oid)] }
  const objects = { ...s.objects, [oid]: { ...o, zone: asZoneId(to) } }
  return { ...s, objects, zones } as GameState
}

const activateActs = (g: InteractiveGame, oid: string, ability: string): Any[] =>
  (g.legalActions(P1) as unknown as Any[]).filter((a) => a.kind === 'ACTIVATE' && String(a.oid) === oid && String(a.ability) === ability)

                                                      
interface Ask { step: number; key: string; itemId: string; reqStage: string | undefined; passesBefore: number; candidates: string[]; isTarget: boolean; answer: string }
interface RunOut { asks: Ask[]; error: string | null; hitCap: boolean; steps: number }
interface DriveOpts {
  readonly answer: (key: string, req: Any) => string
  readonly onWindow?: (g: InteractiveGame) => void
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
        const ans = opts.answer(String(req.key), req)
        asks.push({ step: steps, key: String(req.key), itemId: String(req.itemId), reqStage: req.stage, passesBefore: passes, candidates: ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id)), isTarget: req.isTarget === true, answer: ans })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: ans } as never)
        steps++
        opts.afterChoice?.(g, asks.length)
        continue
      }
      if (raw.mode === 'window') {
        opts.onWindow?.(g)
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
  return { asks, error, hitCap: steps >= STEP_CAP, steps }
}
const firstCand = (req: Any): string => String(((req.candidates ?? []) as readonly Any[])[0]?.id ?? '')

                                                           
const YASUO = (): GameObject[] => [place('yasuo', 'OGN-259', P1, { baseMight: 0 }), mko('yb', 'BLK', P1, 'base:P1'), mko('yb2', 'BLK', P1, BF0)]
const yasuoAct = (g: InteractiveGame, target: string): Any =>
  activateActs(g, 'yasuo', 'OGN-259:shuttle').find((a) => String(a.target) === target)!

describe('★1802f ㈠ 缺陷 268:OGN-259 方向按打出时定,结算只复验,不重推未选过的终点', () => {
  test('打出时在基地、确认期答 BF1;窗口把 yb 挪到 BF0 ⇒ 结算不再移动(yb 留 BF0,不出现 base:P1)', () => {
    const g = new InteractiveGame(scene(YASUO()), DEPS)
    const act = yasuoAct(g, 'yb')
    let frozenAt: Any | null = null
    let moved = false
    const R = runActivate(g, act, {
      answer: (k) => (k === 'yasuoDest' ? BF1 : firstCand({})),
      afterChoice: (gg, n) => { if (n === 1) frozenAt = chainOf(gg).find((i) => String(i.id).startsWith('act:'))?.frozenChoices ?? null },
      onWindow: (gg) => { if (!moved) { mutateInWindow(gg, (s) => moveObjInState(s, 'yb', BF0)); moved = true } },
    })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(frozenAt, '前提:确认期答案冻进 frozenChoices').toMatchObject({ yasuoDest: BF1 })
    expect(moved, '前提:响应窗口真把 yb 挪到了 BF0').toBe(true)
                                                           
    expect(zoneOf(g, 'yb'), '★★落空:yb 停在窗口挪入的 BF0,没有被移去任何地方').toBe(BF0)
    expect(zoneOf(g, 'yb'), '★★不出现从未被选过的 base:P1').not.toBe(`base:${P1}`)
    expect(curState(g).zones[`base:${P1}` as never]?.contents ?? [], '★★base:P1 里没有 yb').not.toContain('yb')
  })

  test('打出时在基地、确认期答 BF1;窗口把 yb 挪到 BF1 本身 ⇒ 终点=当前位置 ⇒ 落空(留 BF1)', () => {
    const g = new InteractiveGame(scene(YASUO()), DEPS)
    const act = yasuoAct(g, 'yb')
    let moved = false
    const R = runActivate(g, act, {
      answer: (k) => (k === 'yasuoDest' ? BF1 : firstCand({})),
      onWindow: (gg) => { if (!moved) { mutateInWindow(gg, (s) => moveObjInState(s, 'yb', BF1)); moved = true } },
    })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(moved, '前提:响应窗口真把 yb 挪到了 BF1').toBe(true)
    expect(zoneOf(g, 'yb'), '★§355.4.a 终点=当前位置 ⇒ 落空,停在 BF1(而不是被重推到 base:P1)').toBe(BF1)
  })

  test('对照:不扰动 ⇒ yb 照常落到冻结答案 BF1', () => {
    const g = new InteractiveGame(scene(YASUO()), DEPS)
    const R = runActivate(g, yasuoAct(g, 'yb'), { answer: (k) => (k === 'yasuoDest' ? BF1 : firstCand({})) })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(zoneOf(g, 'yb'), '★对照:y→BF1').toBe(BF1)
  })

  test('★1802e 那半回归:打出时在战场、窗口被挪进基地 ⇒ 落空(且全程没有落点问)', () => {
    const g = new InteractiveGame(scene(YASUO()), DEPS)
    let moved = false
    const R = runActivate(g, yasuoAct(g, 'yb2'), {
      answer: () => firstCand({}),
      onWindow: (gg) => { if (!moved) { mutateInWindow(gg, (s) => moveObjInState(s, 'yb2', `base:${P1}`)); moved = true } },
    })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(moved, '前提:响应窗口真把 yb2 挪进了基地').toBe(true)
    expect(R.asks, '★打出时在战场 ⇒ 落点唯一、确认期无问;结算期也不补问').toEqual([])
    expect(zoneOf(g, 'yb2'), '★★落空:yb2 停在窗口挪入的基地,resolve 没有再动它').toBe(`base:${P1}`)
  })
})

                                                           
describe('★1802f ㈡ 缺陷 269:§402.3 确认期第一问问不出 ⇒ 不列 ACTIVATE', () => {
  test('UNL-228 血港鬼影:战场无友方单位 ⇒ 没有 ACTIVATE;有 ⇒ 有、且问 ghostBounce、金币照打', () => {
                                            
    {
      const g = new InteractiveGame(scene([place('ghost', 'UNL-228', P1)]), DEPS)
      expect(activateActs(g, 'ghost', 'UNL-228:bounce').length, '★无友方单位 ⇒ 列不出').toBe(0)
    }
                               
    {
      const g = new InteractiveGame(scene([place('ghost', 'UNL-228', P1), mko('gu1', 'BLK', P1, BF0)]), DEPS)
      const acts = activateActs(g, 'ghost', 'UNL-228:bounce')
      expect(acts.length, '★有友方单位 ⇒ 列得出').toBeGreaterThan(0)
      const R = runActivate(g, acts[0]!, { answer: (k) => (k === 'ghostBounce' ? 'gu1' : firstCand({})) })
      expect(R.error, `运行异常 ${R.error}`).toBeNull()
      const ask = R.asks.find((a) => a.key === 'ghostBounce')
      expect(ask, '★确认期问 ghostBounce').toBeTruthy()
      expect(ask!.reqStage, '★在确认期').toBe('confirm')
      expect(zoneOf(g, 'gu1'), '★结算生效:gu1 离开战场').not.toBe(BF0)
      const gold = Object.values(curState(g).objects as unknown as Any[]).some((o) => String(o.defId).includes('token:金币'))
      expect(gold, '★第二句并列:金币照打').toBe(true)
    }
  })

  test('UNL-144 守门者马杜里:无满足条件的敌方战场 ⇒ 没有 ACTIVATE;有 ⇒ 有', () => {
    {
      const g = new InteractiveGame(scene([place('maduri', 'UNL-144', P1, { baseMight: 6 })]), DEPS)
      expect(activateActs(g, 'maduri', 'UNL-144:move').length, '★一处都压不住 ⇒ 列不出').toBe(0)
    }
    {
      const g = new InteractiveGame(scene([
        place('maduri', 'UNL-144', P1, { baseMight: 6 }),
        mko('me0', 'BLK', P2, BF0, { baseMight: 1 }), mko('me1', 'BLK', P2, BF1, { baseMight: 1 }),
      ], { battlefieldControl: { [BF0]: P2, [BF1]: P2 } }), DEPS)
      const acts = activateActs(g, 'maduri', 'UNL-144:move')
      expect(acts.length, '★有满足条件的战场 ⇒ 列得出').toBeGreaterThan(0)
      const R = runActivate(g, acts[0]!, { answer: (k) => (k === 'maduriZone' ? BF1 : firstCand({})) })
      expect(R.error, `运行异常 ${R.error}`).toBeNull()
      expect(R.asks.find((a) => a.key === 'maduriZone')!.reqStage, '★确认期问落点').toBe('confirm')
      expect(zoneOf(g, 'maduri'), '★结算生效:移到 BF1').toBe(BF1)
    }
  })
})

                                                         
describe('★1802f ㈢ 豁免正确:§355.13「最多」/「第一问不出现」两种情形仍可激活', () => {
  test('OGN-212 未来熔炉:废牌堆空 ⇒ 仍可激活(§355.13「最多四张」含 0)', () => {
    const g = new InteractiveGame(scene([place('forge', 'OGN-212', P1)]), DEPS)
    const acts = activateActs(g, 'forge', 'OGN-212:recycle')
    expect(acts.length, '★废牌堆空、第一问候选空 ⇒ 仍列得出').toBeGreaterThan(0)
    const R = runActivate(g, acts[0]!, { answer: () => firstCand({}) })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
  })

  test('OGN-259 疾风剑豪:目标在战场(落点问不出现)⇒ 仍可激活,且结算把它移回基地', () => {
    const g = new InteractiveGame(scene([place('yasuo', 'OGN-259', P1, { baseMight: 0 }), mko('yb', 'BLK', P1, BF0)]), DEPS)
    const acts = activateActs(g, 'yasuo', 'OGN-259:shuttle')
    expect(acts.length, '★第一问不出现 ≠ 没有合法选项 ⇒ 仍列得出').toBeGreaterThan(0)
    const act = acts.find((a) => String(a.target) === 'yb')!
    const R = runActivate(g, act, { answer: () => firstCand({}) })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
    expect(R.asks, '★打出时在战场 ⇒ 无落点问').toEqual([])
    expect(zoneOf(g, 'yb'), '★结算:移回其所属基地').toBe(`base:${P1}`)
  })
})

                                                                
interface NineCase { readonly name: string; readonly oid: string; readonly ability: string; readonly mk: () => GameObject[]; readonly patch?: Partial<GameState> }
const NINE: readonly NineCase[] = [
  { name: 'OGN-212 未来熔炉', oid: 'forge', ability: 'OGN-212:recycle', mk: () => [place('forge', 'OGN-212', P1), mko('d1', 'BLK', P1, 'discard:P1'), mko('d2', 'BLK', P2, 'discard:P2')] },
  { name: 'OGN-259 疾风剑豪', oid: 'yasuo', ability: 'OGN-259:shuttle', mk: YASUO },
  { name: 'SFD-193 武器大师', oid: 'wm', ability: 'SFD-193:equip', mk: () => [place('wm', 'SFD-193', P1), mko('arm1', 'SFD-150', P1, 'base:P1', { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never }), mko('wmU', 'BLK', P1, 'base:P1')] },
  { name: 'SFD-193 武器大师', oid: 'wm', ability: 'SFD-193:reattach', mk: () => [place('wm', 'SFD-193', P1), mko('arm2', 'SFD-030', P1, 'base:P1', { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never, status: { attachedTo: 'wmU' } as never }), mko('wmU', 'BLK', P1, 'base:P1')] },
  { name: 'UNL-138 夺命名单', oid: 'hl', ability: 'UNL-138:hitList', mk: () => [place('hl', 'UNL-138', P1, { declared: { hitListTag: TAG } }), mko('tagged', 'BLK', P1, BF0, { declared: { [GAINED_TAG_KEY]: TAG } })] },
  { name: 'UNL-144 守门者马杜里', oid: 'maduri', ability: 'UNL-144:move', mk: () => [place('maduri', 'UNL-144', P1, { baseMight: 6 }), mko('me0', 'BLK', P2, BF0, { baseMight: 1 }), mko('me1', 'BLK', P2, BF1, { baseMight: 1 })], patch: { battlefieldControl: { [BF0]: P2, [BF1]: P2 } } },
  { name: 'UNL-228 血港鬼影', oid: 'ghost', ability: 'UNL-228:bounce', mk: () => [place('ghost', 'UNL-228', P1), mko('gu1', 'BLK', P1, BF0)] },
  { name: 'VEN-133 发光石', oid: 'glow', ability: 'VEN-133:handover', mk: () => [place('glow', 'VEN-133', P1, { counters: { empower: 1 } })] },
  { name: 'VEN-194 未来守护者', oid: 'jayce', ability: 'VEN-194:ready2', mk: () => [place('jayce', 'VEN-194', P1, { counters: { empower: 1 } }), mko('g1', 'SFD-150', P1, 'base:P1', { baseTypes: ['equipment'] as never, status: { tapped: true } }), mko('g3', 'SFD-150', P1, 'base:P1', { baseTypes: ['equipment'] as never, status: { tapped: true } })] },
  { name: 'UNL-148 受诅咒的石棺', oid: 'sarc', ability: 'UNL-148:sarcophagus', mk: () => [place('sarc', 'UNL-148', P1), mko('ba', 'UNL-150', P1, 'exile:P1'), mko('sarcAlly', 'BLK', P1, BF0)], patch: { banishLedger: { sarc: ['ba'] as never } } },
]

describe('★1802f ㈣ 不误杀:9 张主动技能在正常盘面下 ACTIVATE 全部列得出', () => {
  test('逐张:正常盘面下都有对应 ability 的 ACTIVATE 动作(名单与 activatedConfirm1802 对齐)', () => {
    const listed: string[] = []
    for (const c of NINE) {
      const g = new InteractiveGame(scene(c.mk(), c.patch ?? {}), DEPS)
      const acts = activateActs(g, c.oid, c.ability)
      expect(acts.length, `★${c.name} [${c.ability}] 正常盘面必须列得出(zero 误杀)`).toBeGreaterThan(0)
      listed.push(c.name)
    }
    expect(listed.length, '★本闸覆盖 10 条技能(SFD-193 两条)').toBe(10)
    expect(new Set(listed), '★去重后恰 9 张卡,与 activatedConfirm1802 名单对齐').toEqual(new Set([
      'OGN-212 未来熔炉', 'OGN-259 疾风剑豪', 'SFD-193 武器大师', 'UNL-138 夺命名单',
      'UNL-144 守门者马杜里', 'UNL-148 受诅咒的石棺', 'UNL-228 血港鬼影',
      'VEN-133 发光石', 'VEN-194 未来守护者',
    ]))
  })
})

                                                                  
describe('★1802f ㈤ 未迁主动技能(问在 makeNextChoice 且无 choiceTiming):候选空仍可激活(§355.17)', () => {
  test('SFD-019 装配架:有回收料、但无落点问的候选 ⇒ 仍列得出、可激活', () => {
    const g = new InteractiveGame(scene([place('rig', 'SFD-019', P1), mko('du', 'BLK', P1, 'discard:P1')]), DEPS)
    const acts = activateActs(g, 'rig', 'SFD-019:robot')
    expect(acts.length, '★§355.17 结算期问不在 §402.3 管辖 ⇒ 列得出').toBeGreaterThan(0)
    const R = runActivate(g, acts[0]!, { answer: () => firstCand({}) })
    expect(R.error, `运行异常 ${R.error}`).toBeNull()
  })
})
