                                                                     
  
                                                               
                                                                                          
                                                               
                                                                   
                                            
  
                                                                          
                                             
                                                                                     
                                                                         
                                                                    
                                                                                
                                                                
                                                                                    
                                             
  
                       
                                                        
                                                          
                                               
                                          
                                                               
                                  
  
                                                                                                
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { activatedDefIds, activatedFor, PLAY_SPECS, playBonusFor } from '../../data/registry'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId, type ZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { applyEvents } from '../../src/loop/reduce'
import { withTargetableCandidates } from '../../src/loop/chainFepr'
import { decodeTargetOids } from '../../src/loop/chainTargets'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ActivatedSpec, PlaySpec } from '../../src/loop/playSpec'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'probe:self'
const FULL = { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } }
const MDEPS = makeGameDeps(0x1805) as never
const DEPS = makeGameDeps(0x1805) as never
type Any = Record<string, any>

                                                      
const mko = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

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

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const actsOf = (g: InteractiveGame, oid: string): Any[] =>
  (g.legalActions(P1) as unknown as Any[]).filter((a) => a.kind === 'ACTIVATE' && String(a.oid) === oid)
const playsOf = (g: InteractiveGame, cardOid: string): readonly Any[] =>
  (g.legalActions(P1) as unknown as Any[]).filter((a) => (a.kind === 'PLAY_CARD' || a.kind === 'PLAY_STANDBY')
    && String(a.cardOid ?? a.oid) === cardOid)
const isListed = (g: InteractiveGame, cardOid: string): boolean => playsOf(g, cardOid).length > 0

                                                                       
function specScene(defId: string, selfOid: string, spec: ActivatedSpec): GameState {
  const cat = CARD_CATEGORIES[defId]
  const baseTypes = cat === 'legend' ? ['legend'] : cat === 'equipment' ? ['equipment'] : ['unit']
  const self = mko(selfOid, defId, P1, `base:${P1}`, {
    baseTypes: baseTypes as never, baseMight: cat === 'unit' ? 6 : 0,
    ...(spec.unempowerSelf ? { counters: { empower: 1 } } : {}),
  })
  return scene([self, mko('probe:hand1', 'BLK', P1, `hand:${P1}`)])
}

                                                                                                    
                                                             
function candidateResolves(state: GameState, id: string): boolean {
  if (state.objects[id as ObjId] !== undefined) return true
  if (state.zones[id as ZoneId] !== undefined) return true
  if (state.chain.some((it) => it.id === id)) return true
  if (state.players.includes(id as PlayerId)) return true
  return decodeTargetOids(id).some((oid) => state.objects[oid as ObjId] !== undefined)
}

   
                                                   
                                                                  
                                
   
function firstAskBlocksRaw(spec: ActivatedSpec, state: GameState, selfOid: string): boolean {
  if (spec.choiceTiming !== 'confirm' && spec.makeConfirmChoice === undefined) return false
  const ask = (spec.makeConfirmChoice
    ?? (spec.choiceTiming === 'confirm' ? spec.makeNextChoice : undefined)) as
    | ((ctx: Any) => (s: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null)
    | undefined
  if (ask === undefined) return false
  const raw = ask({ selfOid, controller: P1 })(state, {})
  if (raw === null) return true
  const req = withTargetableCandidates(state, raw)
  if (req === null) return true
  if (req.isTarget === true && !req.candidates.some((c) => candidateResolves(state, c.id))) return true
  return false
}

   
                                                            
                                                                                                               
                                                     
   
function applyCostSim(spec: ActivatedSpec, state: GameState, selfOid: string): GameState {
  if (spec.extraCost) {
    const opts = spec.extraCost.options?.(state, P1, selfOid)
    const paid = spec.extraCost.pay(state, P1, selfOid, opts?.[0]?.id)
    return paid ?? state
  }
  const evs: GameEvent[] = []
  if (spec.unempowerSelf) evs.push({ kind: 'disempower', target: selfOid as ObjId } as GameEvent)
  if (spec.destroySelf) evs.push({ kind: 'destroy', target: selfOid as ObjId, sourcePlayer: P1 } as GameEvent)
  if (spec.recycleSelf) evs.push({ kind: 'recycle', player: P1, objs: [selfOid as ObjId] } as GameEvent)
  const n = spec.discard ?? 0
  if (n > 0) {
    const hand = state.zones[`hand:${P1}` as ZoneId]?.contents ?? []
    for (let i = 0; i < n && i < hand.length; i++) evs.push({ kind: 'zoneChange', obj: hand[i]!, to: `discard:${P1}` as ZoneId } as GameEvent)
  }
  if (evs.length === 0) return state
  return applyEvents(state, evs, MDEPS).state
}

const isNonResourceCost = (sp: ActivatedSpec): boolean =>
  sp.destroySelf === true || sp.recycleSelf === true || sp.unempowerSelf === true
  || (sp.discard ?? 0) > 0 || sp.extraCost !== undefined
const isConfirmTiming = (sp: ActivatedSpec): boolean =>
  sp.choiceTiming === 'confirm' || sp.makeConfirmChoice !== undefined

                                      
function allActivatedSpecs(): readonly { defId: string; spec: ActivatedSpec }[] {
  const ids = new Set<string>([...activatedDefIds(), ...Object.keys(CARD_CATEGORIES), 'token:金币', 'token:映像'])
  const out: { defId: string; spec: ActivatedSpec }[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    for (const sp of activatedFor(id)) {
      if (seen.has(sp.key)) continue
      seen.add(sp.key)
      out.push({ defId: id, spec: sp })
    }
  }
  return out
}

                                      
function firstAskDependsOnCost(defId: string, spec: ActivatedSpec): boolean {
  const s = specScene(defId, SELF, spec)
  const pre = firstAskBlocksRaw(spec, s, SELF)
  const post = firstAskBlocksRaw(spec, applyCostSim(spec, s, SELF), SELF)
  return pre !== post
}

                                                                                             
                                                                       
describe('★1805b ㈠ 对照:★1803c 缺陷 271 的 PLAY 路修法没被本单动到', () => {
  test('UNL-142 残酷复活:有祭品 + 废牌堆有够低单位 ⇒ 列得出(付费后盘面模拟仍在)', () => {
    const g = new InteractiveGame(scene([
      mko('ally', 'UNL-140', P1, BF0),          // 祭品(贵;费用回指门)
      mko('rev', 'OGN-012', P1, 'discard:P1'),  // 废牌堆里够得着的便宜单位
      mko('soul', 'UNL-142', P1, `hand:${P1}`, { baseTypes: ['spell'] as never }),
    ]), DEPS)
    const acts = playsOf(g, 'soul')
    expect(acts.length, '★该列出(修前:假阻塞列不出)').toBeGreaterThan(0)
    expect(acts.some((a) => a.bonus === true && String(a.bonusChoice) === 'ally'), '★required ⇒ 带 bonusChoice 的那一支').toBe(true)
  })
})

                                                                                         
describe('★1805b ㈡ 前提闸(现算):未被豁免的主动技能,确认期第一问候选不得依赖本技能费用产物', () => {
  const inScope = allActivatedSpecs().filter(({ spec }) => isNonResourceCost(spec) && isConfirmTiming(spec))

  test('现算射程:非资源费用 × 确认期 的规格集合(棘轮:新卡进射程即红,回来重量)', () => {
                                                       
    expect(inScope.map((x) => x.spec.key).sort(), '★射程集合(★1805b 现算快照)').toEqual([
      'OGN-212:recycle', 'VEN-133:handover',
    ])
  })

  test('逐条差分:付费前盘面问不出、付费后问得出 ⇒ 属载体;未豁免的载体一律不许有', () => {
    const carriers: { defId: string; key: string; exempt: boolean }[] = []
    for (const { defId, spec } of inScope) {
      if (firstAskDependsOnCost(defId, spec)) {
        carriers.push({ defId, key: spec.key, exempt: spec.firstAskOptional === true })
      }
    }
                                                
    expect(carriers.map((c) => c.key).sort(), '★载体清单(现算;今天 = OGN-212 这一张被豁免的)').toEqual([
      'OGN-212:recycle',
    ])
                                                                   
    expect(
      carriers.filter((c) => !c.exempt).map((c) => c.key),
      '★★未豁免却依赖费用产物的载体(空 = 前提成立;非空 ⇒ 回来给 ACTIVATE 分支补付费后盘面)',
    ).toEqual([])
  })

  test('VEN-133 发光石:候选=玩家、与费用无关 ⇒ 差分判非载体(对照,证明判据不是"见非资源费用就报警")', () => {
    const sp = activatedFor('VEN-133').find((s) => s.key === 'VEN-133:handover')!
    expect(sp, '前提:规格在').toBeTruthy()
    expect(firstAskDependsOnCost('VEN-133', sp), '★候选=玩家 ⇒ 非载体').toBe(false)
  })
})

                                                                         
                                                     
describe('★1805b ㈢ 反例自证:(566) 构造假载体,证明前提闸有判别力', () => {
                                                             
  const FAKE_CARRIER: ActivatedSpec = {
    key: 'FAKE:carrier',
    label: '(测试假规格)摧毁此牌:从废牌堆回收一张',
    cost: {},
    destroySelf: true,
    target: 'none',
    choiceTiming: 'confirm',
    makeNextChoice: () => (state: GameState) => {
      const c = state.zones[`discard:${P1}` as ZoneId]?.contents ?? []
      if (c.length === 0) return null
      return {
        itemId: 'fake:carrier', controller: P1, key: 'fakeCarrierPick', isTarget: true,
        candidates: c.map((oid) => ({ id: String(oid), label: String(oid) })),
      }
    },
    makeResolve: () => () => [],
  } as unknown as ActivatedSpec

                                         
  const FAKE_SAFE: ActivatedSpec = {
    key: 'FAKE:safe',
    label: '(测试假规格)摧毁此牌:选择一名玩家',
    cost: {},
    destroySelf: true,
    target: 'none',
    choiceTiming: 'confirm',
    makeNextChoice: () => (state: GameState) => ({
      itemId: 'fake:safe', controller: P1, key: 'fakeSafePick', isTarget: true,
      candidates: state.players.map((p) => ({ id: p as string, label: p as string })),
    }),
    makeResolve: () => () => [],
  } as unknown as ActivatedSpec

  test('判据级:假载体 ⇒ 付费前问不出、付费后问得出 ⇒ firstAskDependsOnCost 返回 true(红)', () => {
    const s = specScene('BLK', SELF, FAKE_CARRIER)
    expect(firstAskBlocksRaw(FAKE_CARRIER, s, SELF), '★付费前:废牌堆空 ⇒ 问不出').toBe(true)
    expect(firstAskBlocksRaw(FAKE_CARRIER, applyCostSim(FAKE_CARRIER, s, SELF), SELF), '★付费后:自身已进废牌堆 ⇒ 问得出').toBe(false)
    expect(firstAskDependsOnCost('BLK', FAKE_CARRIER), '★判据对该假载体返回 true').toBe(true)
    expect(FAKE_CARRIER.firstAskOptional === true, '★且它未豁免 ⇒ 会被上一条闸的红断言抓住').toBe(false)
  })

  test('对照:假"安全"规格(候选=玩家)⇒ 判据返回 false(不给假阳性)', () => {
    expect(firstAskDependsOnCost('BLK', FAKE_SAFE), '★候选与费用无关 ⇒ 非载体').toBe(false)
  })

  test('端到端:把假载体接进引擎 ⇒ 空废牌堆时 ACTIVATE 列不出(假阻塞复现);有牌时列得出并问得出', () => {
    const base = makeGameDeps(0x1805) as Any
    const deps = {
      ...base,
      activatedFor: (defId: string) => (defId === 'OGN-078'
        ? [FAKE_CARRIER]
        : (base.activatedFor(defId) as readonly ActivatedSpec[])),
    } as never
                                              
    const gEmpty = new InteractiveGame(scene([mko(SELF, 'OGN-078', P1, `base:${P1}`)]), deps)
    expect(actsOf(gEmpty, SELF).length, '★假阻塞:空废牌堆 ⇒ 列不出').toBe(0)
                                                       
    const g = new InteractiveGame(scene([
      mko(SELF, 'OGN-078', P1, `base:${P1}`),
      mko('d0', 'BLK', P1, 'discard:P1'),
    ]), deps)
    const acts = actsOf(g, SELF)
    expect(acts.length, '★有牌 ⇒ 列得出').toBeGreaterThan(0)
    g.apply(acts[0] as InteractiveAction)
    let firstAsk: Any | null = null
    for (let i = 0; i < 20; i++) {
      const p = g.pending() as Any
      if (p.mode === 'choice') { firstAsk = p.request; break }
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player } as never); continue }
      break
    }
    expect(firstAsk?.key, '★真流程确认期问得出第一问(⇒ 修前把它挡掉就是假阻塞)').toBe('fakeCarrierPick')
  })
})

                                                                           
describe('★1805b ㈣ 报告:PLAY 路带额外费用的确认期规格(★1803c 已修,供对照)', () => {
  test('现算:PLAY_SPECS ∩ 确认期 ∩ 带额外费用 = UNL-142(PLAY 路已经补过付费后盘面)', () => {
    const inScope = Object.keys(PLAY_SPECS).filter((id) => {
      const sp = PLAY_SPECS[id] as PlaySpec | undefined
      return sp !== undefined && isConfirmTiming(sp as unknown as ActivatedSpec) && playBonusFor(id) !== undefined
    }).sort()
    expect(inScope).toEqual(['UNL-142'])
  })
})
