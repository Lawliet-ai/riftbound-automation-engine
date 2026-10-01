   
                                                                     
  
                                        
                                                   
                                              
                                                                
                                                                 
  
                      
                                                                                 
                                                                                 
  
        
                                                                   
                                                                    
                                    
                                                                
                                                                 
  
                                                            
                                                                            
                                         
   
import { describe, expect, test } from 'vitest'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { activeTriggers } from '../../data/registry'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import type { Trigger } from '../../src/dsl/trigger'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { TRIGGER_ORDER_KEY } from '../../src/loop/chain'
import { UNL_192_ATTACKER_KEY as AK, UNL_192_TARGETS_PREFIX as TP } from '../../data/cards/UNL-192'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
type Any = Record<string, any>

const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones,
    runePools: { P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } } },
  } as GameState
}

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}

                                                                             
interface ListenerSpec { readonly tag: string; readonly controller: PlayerId; readonly match: (target: string) => boolean }
const listenerId = (tag: string): string => `PROBE1817:${tag}`
function makeListener(spec: ListenerSpec, fire: string[]): Trigger {
  return {
    id: listenerId(spec.tag),
    sourceOid: asObjId(`lk:${spec.tag}`),
    sourceDefId: `PROBE1817-${spec.tag}`,
    controller: spec.controller,
    event: 'targeted',
    by: 'any',
    filter: (ev: Any) => spec.match(String((ev as Any).target)),
    effect: () => { fire.push(spec.tag); return [] },
  } as unknown as Trigger
}

interface Ask { key: string; isTarget: boolean; candidates: string[]; answer: string }
interface Step { key: string | null; before: string[]; after: string[] }
interface RunOut {
  asks: Ask[]
  orderQs: { key: string; candidates: string[] }[]
  fire: string[]
                                        
  listenerChainOrder: string[]
  steps: Step[]
                                                 
  ledger: Any
  error: string | null
}

const listenerIdsIn = (g: InteractiveGame): string[] =>
  (curState(g).chain as unknown as Any[]).map((i) => String(i.id)).filter((id) => id.includes('PROBE1817:'))

function run(
  state: GameState,
  initial: unknown,
  specs: readonly ListenerSpec[],
  decide: (key: string, cands: readonly string[]) => string,
): RunOut {
  const fire: string[] = []
  const listeners = specs.map((s) => makeListener(s, fire))
  const deps = {
    ...makeGameDeps(0x1817),
    getTriggers: (st: GameState) => [...activeTriggers(st), ...listeners],
  } as never
  const g = new InteractiveGame(state, deps)
  const asks: Ask[] = []
  const orderQs: RunOut['orderQs'] = []
  const steps: Step[] = []
  let listenerChainOrder: string[] = []
  let error: string | null = null
  try {
    g.apply(initial as never)
    for (let n = 0; n < 300; n++) {
      const present = listenerIdsIn(g)
      if (listenerChainOrder.length === 0 && present.length >= 2) listenerChainOrder = present
      const raw = g.pending() as Any
      if (raw.mode === 'choice') {
        const req = raw.request as Any
        const key = String(req.key)
        const cands = ((req.candidates ?? []) as readonly Any[]).map((c) => String(c.id))
        asks.push({ key, isTarget: req.isTarget === true, candidates: cands, answer: '' })
        if (key.startsWith(TRIGGER_ORDER_KEY)) orderQs.push({ key, candidates: cands })
        const before = listenerIdsIn(g)
        const answer = decide(key, cands)
        asks[asks.length - 1]!.answer = answer
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer } as never)
        steps.push({ key, before, after: listenerIdsIn(g) })
        continue
      }
      if (raw.mode === 'window') {
        const before = listenerIdsIn(g)
        g.apply({ kind: 'PASS', player: raw.player } as never)
        steps.push({ key: null, before, after: listenerIdsIn(g) })
        continue
      }
      break
    }
  } catch (e) { error = e instanceof Error ? `${e.name}: ${e.message}` : String(e) }
  const present = listenerIdsIn(g)
  if (listenerChainOrder.length === 0 && present.length >= 2) listenerChainOrder = present
  return { asks, orderQs, fire, listenerChainOrder, steps, ledger: ledger(g), error }
}

const hitIdx = (key: string): number => Number(/(\d+)$/.exec(key)?.[1] ?? '0')
const ledger = (g: InteractiveGame): Any => ((curState(g) as unknown as Any).enemyTargetedThisTurn ?? null) as Any

const voliScene = (foes: readonly string[]): GameState => scene([
  obj('voli', 'OGN-041', P1, BF0, { baseMight: 9, status: { ready: true } } as never),
  ...foes.map((f) => obj(f, 'BLK', P2, BF0, { baseMight: 9 })),
])
const foeSpecs = (foes: readonly string[]): ListenerSpec[] =>
  foes.map((f) => ({ tag: f, controller: P2, match: (t) => t === f }))
const ATTACK = { kind: 'ATTACK', player: P1, battlefield: BF0 }

                                                                       
describe('★1817 ① OGN-041 分摊 3 目标 ⇒ §383.3.d 排序问出现(同批)', () => {
  test('🔴 三个落点各触发一条 ⇒ 三条同批(batchId)⇒ 排序问 1 次、候选恰 3 个来源', () => {
                                                          
    const state = voliScene(['u1', 'u2', 'u3'])
    const R = run(state, ATTACK, foeSpecs(['u1', 'u2', 'u3']), (key, cands) => {
      if (key.startsWith(TRIGGER_ORDER_KEY)) return cands[0]!
      const i = hitIdx(key)
      return i < 3 ? 'u1' : i === 3 ? 'u2' : 'u3'
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const hits = R.asks.filter((a) => a.key.startsWith('OGN-041:hit:'))
    expect(hits.length, '★前提自证:逐点问 5 次').toBe(5)
    expect(R.orderQs.length, '★★同批 ⇒ 排序问恰 1 次').toBe(1)
    const q = R.orderQs[0]!
    expect(q.key.startsWith(`${TRIGGER_ORDER_KEY}:`), `★key 形如 ${TRIGGER_ORDER_KEY}:<batchId>`).toBe(true)
    expect(q.candidates.length, '★★候选 = 3 个触发来源').toBe(3)
    const tags = q.candidates.map((id) => /PROBE1817:([^:]+):/.exec(id)?.[1]).sort()
    expect(tags, '★★候选恰为三个监听者落点').toEqual(['u1', 'u2', 'u3'])
  })
})

describe('★1817 ② 答谁谁先结算(reorderBatchFirst)', () => {
  test('🔴 答候选第 2 个 ⇒ 它先结算(fire 首项 = 被答者)', () => {
    const state = voliScene(['u1', 'u2', 'u3'])
    const R = run(state, ATTACK, foeSpecs(['u1', 'u2', 'u3']), (key, cands) => {
      if (key.startsWith(TRIGGER_ORDER_KEY)) return cands[1]!            
      const i = hitIdx(key)
      return i < 3 ? 'u1' : i === 3 ? 'u2' : 'u3'
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const chosen = R.orderQs[0]!.candidates[1]!
    const chosenTag = /PROBE1817:([^:]+):/.exec(chosen)![1]!
    expect(R.fire.length, '★三条触发各结算一次').toBe(3)
    expect(R.fire[0], '★★被答者先结算(链 LIFO:挪到该批最后 ⇒ 最先结算)').toBe(chosenTag)
  })
})

describe('★1817 ③ UNL-192 确认期多选 ⇒ 排序问出现(确认期攒批的直接钉板)', () => {
  test('🔴 确认期冻结 e1/e2(两条 targeted)⇒ 两条同批 ⇒ 排序问出现(候选 2)', () => {
    const state = scene([
      obj('me', 'BLK', P1, BF0, { baseMight: 5, status: { ready: true } } as never),
      obj('e1', 'BLK', P2, BF0, { baseMight: 9 }),
      obj('e2', 'BLK', P2, BF0, { baseMight: 9 }),
      inHand('sp', 'UNL-192', P1),
    ])
    const g = new InteractiveGame(state, makeGameDeps(0x1817) as never)
    const play = (g.legalActions(P1) as readonly Any[]).find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === 'sp')
    expect(play, '前提:UNL-192 打得出来').toBeTruthy()
    const R = run(state, play, foeSpecs(['e1', 'e2']), (key, cands) => {
      if (key.startsWith(TRIGGER_ORDER_KEY)) return cands[0]!
      if (key === AK) return 'me'
      if (key.startsWith(TP)) { const i = Number(key.slice(TP.length)); return i === 0 ? 'e1' : i === 1 ? 'e2' : '__done__' }
      if (key.startsWith('UNL-192:hit')) return hitIdx(key) < 3 ? 'e1' : 'e2'
      return cands[0]!
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const tgtAsks = R.asks.filter((a) => a.key.startsWith(TP))
    expect(tgtAsks.length, '★前提:确认期真的多选过').toBeGreaterThanOrEqual(2)
    expect(R.orderQs.length, '★★确认期攒批 ⇒ 排序问出现').toBe(1)
    expect(R.orderQs[0]!.candidates.length, '★候选 2 个来源').toBe(2)
    expect(
      R.orderQs[0]!.candidates.map((id) => /PROBE1817:([^:]+):/.exec(id)?.[1]).sort(),
      '★候选恰为 e1/e2',
    ).toEqual(['e1', 'e2'])
  })
})

describe('★1817 ④ 跨玩家 ⇒ §383.3.d.1 APNAP(不玩家选,强制回合顺序)', () => {
  test('🔴 P1/P2 各有监听者同批触发 ⇒ 同 batchId、无排序问、链序按 APNAP(P1→P2)', () => {
                                                              
    const specs: ListenerSpec[] = [
      { tag: 'p2any', controller: P2, match: () => true },
      { tag: 'p1any', controller: P1, match: () => true },
    ]
    const state = voliScene(['u1'])
    const R = run(state, ATTACK, specs, (key, cands) => {
      if (key.startsWith('OGN-041:hit:')) return 'u1'
      return cands[0]!
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.orderQs.length, '★★跨控制者 ⇒ 不问排序(§383.3.d.1 是强制的)').toBe(0)
    expect(R.listenerChainOrder.length, '★前提:两个监听者确实同批入链').toBe(2)
    const [first, second] = R.listenerChainOrder
    expect(first, '★★APNAP:回合玩家 P1 的触发先入链').toContain(listenerId('p1any'))
    expect(second, '★P2 的触发随后').toContain(listenerId('p2any'))
  })
})

describe('★1817 ⑤ 去重保持(★1807 语义不回归)', () => {
  test('🔴 同一单位分摊 2 点 ⇒ 只算一次选取(监听者各触发一次、账本按落点数记)', () => {
    const state = voliScene(['u1', 'u2', 'u3'])
                                                      
    const R = run(state, ATTACK, foeSpecs(['u1', 'u2', 'u3']), (key, cands) => {
      if (key.startsWith(TRIGGER_ORDER_KEY)) return cands[0]!
      const i = hitIdx(key)
      return i < 2 ? 'u1' : i < 4 ? 'u2' : 'u3'
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.asks.filter((a) => a.key.startsWith('OGN-041:hit:')).length, '★前提:逐点问 5 次').toBe(5)
    expect(R.fire.filter((t) => t === 'u1').length, '★★u1 分 2 点 ⇒ 恰触发一次(去重)').toBe(1)
    expect(R.fire.filter((t) => t === 'u2').length, '★★u2 分 2 点 ⇒ 恰触发一次(去重)').toBe(1)
    expect(R.fire.filter((t) => t === 'u3').length).toBe(1)
    expect(R.ledger?.P1?.unitAbility, '★★账本:3 个不同落点 ⇒ 技能桶 3(不是 5)').toBe(3)
  })
})

describe('★1817 ⑥ §158.3 保持:结算期攒批的触发不插队(held → 离链后放出)', () => {
  test('🔴 逐点问期间链上无监听者项目;最后一问答完(项目结算离链)才出现', () => {
    const state = voliScene(['u1', 'u2', 'u3'])
    const R = run(state, ATTACK, foeSpecs(['u1', 'u2', 'u3']), (key, cands) => {
      if (key.startsWith(TRIGGER_ORDER_KEY)) return cands[0]!
      const i = hitIdx(key)
      return i < 3 ? 'u1' : i === 3 ? 'u2' : 'u3'
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const hitSteps = R.steps.filter((s) => s.key !== null && s.key.startsWith('OGN-041:hit:'))
    expect(hitSteps.length, '★前提:逐点问出现').toBe(5)
    const hasListener = (ids: readonly string[]): boolean => ids.some((id) => id.includes('PROBE1817:'))
                                                
    for (const s of hitSteps.slice(0, -1)) {
      expect(hasListener(s.before), `第 ${s.key} 问作答前链上不该有监听者`).toBe(false)
      expect(hasListener(s.after), `第 ${s.key} 问作答后链上不该有监听者`).toBe(false)
    }
    const last = hitSteps[hitSteps.length - 1]!
    expect(hasListener(last.before), '★最后一问作答前仍无').toBe(false)
    expect(hasListener(last.after), '★★最后一问作答后(项目结算离链)监听者才入链').toBe(true)
  })
})

describe('★1817 ⑦ 单目标 ⇒ 无排序问(单条不打批号,现行行为不回归)', () => {
  test('🔴 只选 1 个落点(5 点全砸同一单位)⇒ 无排序问、触发恰一次', () => {
    const state = voliScene(['u1'])
    const R = run(state, ATTACK, foeSpecs(['u1']), (key, cands) => {
      if (key.startsWith('OGN-041:hit:')) return 'u1'
      return cands[0]!
    })
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    expect(R.orderQs.length, '★单条不打批号 ⇒ 不问排序').toBe(0)
    expect(R.fire, '★恰触发一次').toEqual(['u1'])
  })
})
