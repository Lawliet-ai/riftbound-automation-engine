                                                            
  
                                  
                                                     
                                                        
                                                                   
                                                      
                                         
  
                                                               
  
                                                    
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { PLAY_SPECS } from '../../data/registry'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { withTargetableCandidates } from '../../src/loop/chainFepr'
import { decodeTargetOids } from '../../src/loop/chainTargets'
import { moveDestinations } from '../../data/cards/enemy-move'
import { blinkAllies, blinkFoes } from '../../data/cards/SFD-200'
import { damageVictims } from '../../data/cards/damage-spells'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const STEP_CAP = 160
type Any = Record<string, any>

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}

                                                      
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
                                          
const arm = (oid: string, who: PlayerId, host: string, zone = BF0): GameObject =>
  obj(oid, 'OGN-158', who, zone, { baseTypes: ['equipment'], baseTags: ['武装'], status: { attachedTo: asObjId(host) } } as never)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })

function scene(objs: readonly GameObject[], battlefieldCount = 2): GameState {
  const s = createInitialState([P1, P2], battlefieldCount)
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

const game = (s: GameState, seed = 0x1815): InteractiveGame => new InteractiveGame(s, makeGameDeps(seed) as never)
const playsOf = (g: InteractiveGame, player: PlayerId, cardOid: string): readonly Any[] =>
  (g.legalActions(player) as readonly Any[]).filter((a) => (a.kind === 'PLAY_CARD' || a.kind === 'PLAY_STANDBY')
    && String(a.cardOid ?? a.oid) === cardOid)
const isListed = (g: InteractiveGame, player: PlayerId, cardOid: string): boolean => playsOf(g, player, cardOid).length > 0

interface AskRec { key: string; stage: string | undefined; candidates: string[] }
interface RunOut { asks: AskRec[]; error: string | null; steps: number; stopped: string }
                                      
function drive(g: InteractiveGame): RunOut {
  const asks: AskRec[] = []
  let passes = 0
  let steps = 0
  let error: string | null = null
  try {
    for (; steps < STEP_CAP; steps++) {
      const p = g.pending() as Any
      if (p.mode === 'choice') {
        const req = p.request as Any
        asks.push({ key: String(req.key), stage: req.stage, candidates: ((req.candidates ?? []) as Any[]).map((c) => String(c.id)) })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: String(req.candidates?.[0]?.id ?? '') } as never)
        continue
      }
      if (p.mode === 'window') { passes++; g.apply({ kind: 'PASS', player: p.player } as never); continue }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  const p = g.pending() as Any
  return { asks, error, steps, stopped: String(p.mode) }
}

                                                                                           
describe('★1815 ① VEN-140 隼舞:问2「然后移动一名友方单位」是必选 ⇒ 没友方就不列出', () => {
  test('①a 空场 ⇒ 不列出(问1 无敌方直接落空,问2 空)', () => {
    const g = game(scene([inHand('card', 'VEN-140', P1)]))
    expect(isListed(g, P1, 'card'), '★一名友方都没有 ⇒ §355.8 不列').toBe(false)
  })

  test('①b 只有敌方 ⇒ 不列出(问1 非空、问2 死分支全落空)', () => {
                                                           
                                                         
    const g = game(scene([inHand('card', 'VEN-140', P1), obj('foe', 'BLK', P2, BF0)]))
    expect(isListed(g, P1, 'card'), '★有敌方可打、但没友方可移 ⇒ 不列(缺陷 286)').toBe(false)
  })

  test('①c 有友方且该友方有合法落点 ⇒ 列出', () => {
    const g = game(scene([inHand('card', 'VEN-140', P1), obj('foe', 'BLK', P2, BF0), obj('mine', 'BLK', P1, BF0)]))
    expect(isListed(g, P1, 'card'), '★两问都能走通 ⇒ 列出').toBe(true)
  })

  test('①d 友方无任何合法落点 ⇒ 不列出(问3 必选空载体)', () => {
                                                                                
    const g = game(scene([inHand('card', 'VEN-140', P1), obj('mine', 'BLK', P1, `base:${P1}`)], 0))
    const s = curState(g)
    expect(moveDestinations(s, 'mine'), '★前提自证:这名友方确实没有落点').toEqual([])
    expect(isListed(g, P1, 'card'), '★问3 必选空 ⇒ 不列').toBe(false)
  })
})

                                                                                        
describe('★1815 ② UNL-202 虚空来袭:敌方那半必选 ⇒ 没敌方 / 敌方无落点都不列出', () => {
  const s202 = (extra: GameObject[]) => scene([inHand('card', 'UNL-202', P1), obj('mine', 'BLK', P1, BF0), ...extra])

  test('②a 无敌方 ⇒ 不列出(问2 必选空)', () => {
    const g = game(s202([]))
    expect(isListed(g, P1, 'card'), '★没敌方 ⇒ 缺陷 286:不列').toBe(false)
  })

  test('②b 敌方全部无落点 ⇒ 不列出(问3 必选空)', () => {
                                                                   
    const g = game(scene([
      inHand('card', 'UNL-202', P1),
      obj('mine', 'BLK', P1, `base:${P2}`),   // 友方:落点 = base:P1(异于当前位置)⇒ 非空
      obj('foe', 'BLK', P2, `base:${P2}`),    // 敌方:落点 = base:P2 − base:P2 = [] ⇒ 空
    ], 0))
    const s = curState(g)
    expect(moveDestinations(s, 'mine'), '★前提自证:友方有落点').toEqual([`base:${P1}`])
    expect(moveDestinations(s, 'foe'), '★前提自证:敌方无落点').toEqual([])
    expect(isListed(g, P1, 'card'), '★敌方那半死分支 ⇒ 不列').toBe(false)
  })

  test('②c 至少一名敌方有落点 ⇒ 列出(§355.16 ∃ 语义:死分支可绕开)', () => {
    const g = game(s202([obj('foe', 'BLK', P2, BF0)]))
    expect(isListed(g, P1, 'card'), '★敌方有落点 ⇒ 列出').toBe(true)
  })
})

                                                                         
describe('★1815 ③ SFD-107 击倒:「对一名敌方单位造成…伤害」必选 ⇒ 没敌方不列出', () => {
  const geared = (extra: GameObject[]) => scene([
    inHand('card', 'SFD-107', P1), obj('me', 'BLK', P1, BF0), arm('g1', P1, 'me'), ...extra,
  ])

  test('③a 无敌方 ⇒ 不列出(反转:旧设计「跳过问1继续问武装」)', () => {
    const g = game(geared([]))
    expect(isListed(g, P1, 'card'), '★问1 必选空 ⇒ 不列(缺陷 286)').toBe(false)
  })

  test('③b 有敌方 ⇒ 列出', () => {
    const g = game(geared([obj('foe', 'BLK', P2, BF0)]))
    expect(isListed(g, P1, 'card'), '★问1 有候选 ⇒ 列出').toBe(true)
  })
})

                                                                                
describe('★1815 ④ UNL-107 对峙:无友方 ⇒ 不列出(现状不变)', () => {
  test('④a 无友方 ⇒ 不列出', () => {
    const g = game(scene([inHand('card', 'UNL-107', P1)]))
    expect(isListed(g, P1, 'card'), '★问1 无友方 ⇒ 首问 null ⇒ 不列').toBe(false)
  })

  test('④b 有友方 ⇒ 列出', () => {
    const g = game(scene([inHand('card', 'UNL-107', P1), obj('mine', 'BLK', P1, BF0)]))
    expect(isListed(g, P1, 'card'), '★有友方 + 有战场 ⇒ 列出').toBe(true)
  })
})

                                                                                      
describe('★1815 ⑤ firstAskOptional 保留:UNL-054 顽皮触手空场仍可打出(flag 没被动)', () => {
  test('空场 ⇒ 列出(§355.13「任意数量」含 0)', () => {
    const g = game(scene([inHand('card', 'UNL-054', P1)]))
    expect((PLAY_SPECS['UNL-054'] as Any).firstAskOptional, '★前提:flag 还在').toBe(true)
    expect(isListed(g, P1, 'card'), '★firstAskOptional ⇒ 空场仍列出').toBe(true)
  })
})

                                                                                       
describe('★1815 ⑦ 直发容忍:绕过枚举直发 VEN-140 动作(无友方)⇒ 空候选确认问当 null 收尾', () => {
  test('问链正常收尾、不死循环、结算照跑(移动半句落空)', () => {
                                                                         
    const full = game(scene([inHand('card', 'VEN-140', P1), obj('foe', 'BLK', P2, BF0), obj('mine', 'BLK', P1, BF0)]))
    const acts = playsOf(full, P1, 'card')
    expect(acts.length, '★前提:全场景下列得出').toBeGreaterThan(0)
    const act = acts[0] as Any
                                    
    const g = game(scene([inHand('card', 'VEN-140', P1), obj('foe', 'BLK', P2, BF0)]))
    g.apply({ ...act, player: P1, cardOid: 'card' } as InteractiveAction)
    const R = drive(g)
    expect(R.error, `直发运行异常:${R.error}`).toBeNull()
    expect(R.stopped, '★问链收尾(不停在一个没有选项的问题上)').not.toBe('choice')
                                              
    expect(R.asks.filter((a) => a.candidates.length === 0), '★空候选确认问不外泄').toEqual([])
                                        
    const st = curState(g)
    expect(Object.values(st.objects).some((o) => String(o.zone) === String(BF1)), '★移动半句落空:没人在 BF1').toBe(false)
  })
})

                                                                               
describe('★1815 ⑨ SFD-200 奥术跃迁:「放逐一名友方」与「对战场上的一名敌方」两问皆必选 ⇒ 缺哪半都不列出', () => {
  test('⑨a 无友方 ⇒ 不列出(问1 必选空;旧设计「跳过问1」)', () => {
    const g = game(scene([inHand('card', 'SFD-200', P1), obj('foe', 'BLK', P2, BF0)]))
    expect(blinkAllies(curState(g), P1), '★前提自证:确实没有友方').toEqual([])
    expect(isListed(g, P1, 'card'), '★问1 必选空 ⇒ §355.8 不列(缺陷 287)').toBe(false)
  })

  test('⑨b 有友方无敌方 ⇒ 不列出(判别力核心格:首问非空、第二问死)', () => {
                                                  
                                                          
    const g = game(scene([inHand('card', 'SFD-200', P1), obj('mine', 'BLK', P1, BF0)]))
    expect(blinkAllies(curState(g), P1), '★前提自证:友方非空').not.toEqual([])
    expect(blinkFoes(curState(g), P1), '★前提自证:敌方空').toEqual([])
    expect(isListed(g, P1, 'card'), '★有友方可放逐、但没敌方 ⇒ 不列(缺陷 287)').toBe(false)
  })

  test('⑨c 有友方有敌方 ⇒ 列出', () => {
    const g = game(scene([inHand('card', 'SFD-200', P1), obj('mine', 'BLK', P1, BF0), obj('foe', 'BLK', P2, BF0)]))
    expect(isListed(g, P1, 'card'), '★两问都能走通 ⇒ 列出').toBe(true)
  })
})

                                                                                   
describe('★1815 ⑩ UNL-192 阿尔法突袭:确认期目标问必选 ⇒ 没敌方不列出', () => {
  test('⑩a 有友方(战力≥1)无敌方 ⇒ 不列出(反转:旧行为仍列出)', () => {
    const g = game(scene([inHand('card', 'UNL-192', P1), obj('mine', 'BLK', P1, BF0)]))
    expect(damageVictims('oneEnemyOnBattlefield', curState(g), P1), '★前提自证:战场上确实没有敌方').toEqual([])
    expect(isListed(g, P1, 'card'), '★确认期目标问必选空 ⇒ §355.8 不列(缺陷 287)').toBe(false)
  })

  test('⑩b 有友方有敌方 ⇒ 列出', () => {
    const g = game(scene([inHand('card', 'UNL-192', P1), obj('mine', 'BLK', P1, BF0), obj('foe', 'BLK', P2, BF0)]))
    expect(isListed(g, P1, 'card'), '★有合法敌方目标 ⇒ 列出').toBe(true)
  })
})

                                                                                       
                                                                   
                                                                                                
                                      
describe('★1815 ⑧ 全 confirm 规格在标准盘面下 DFS 节点数普查(< 500)', () => {
  const asAny = (x: unknown): Any => x as Any
  const resolves = (state: GameState, id: string): boolean => {
    if (state.objects[id as never] !== undefined) return true
    if (state.zones[id as never] !== undefined) return true
    if (state.chain.some((it) => it.id === id)) return true
    if (state.players.includes(id as never)) return true
    return decodeTargetOids(id).some((oid) => state.objects[oid as never] !== undefined)
  }
                                                                  
  type AskFn = (state: GameState, chosen: Readonly<Record<string, string>>) => Any | null
  const dfsNodes = (state: GameState, ask: AskFn, firstAskOptional: boolean): number => {
    let nodes = 0
    let overflow = false
    const node = (chosen: Record<string, string>, depth: number): boolean => {
      if (depth === 0 && firstAskOptional === true) return true
      nodes++
      if (nodes > 2000) { overflow = true; return false }
      if (depth > 16) return false
      const raw = ask(state, chosen)
      if (raw === null) return depth > 0
      if (chosen[raw.key] !== undefined) return true                        
      if (raw.maskedOut === true) return false
      const req = withTargetableCandidates(state, raw as never)
      if (req === null) return false
      if (req.candidates.length === 0) return false
      if (req.isTarget === true && !req.candidates.some((c: Any) => resolves(state, c.id))) return false
      for (const c of req.candidates) if (node({ ...chosen, [req.key]: c.id }, depth + 1)) return true
      return false
    }
    node({}, 0)
    return overflow ? -1 : nodes
  }

  test('最大节点数 < 500(现算)', () => {
    const confirmSpecs = Object.keys(PLAY_SPECS).filter((id) => {
      const sp = asAny(PLAY_SPECS[id])
      return sp !== undefined && (sp.choiceTiming === 'confirm' || sp.makeConfirmChoice !== undefined)
    })
    expect(confirmSpecs.length, '★confirm 规格数与 enumerateAsk1802 同源').toBe(62)
    let maxNodes = -1
    let maxId = ''
    for (const defId of confirmSpecs) {
      const sp = asAny(PLAY_SPECS[defId])
      const s = scene([
        inHand('probe:card', defId, P1),
        obj('me', 'OGN-012', P1, BF0), arm('g1', P1, 'me'),
        obj('mineBase', 'OGN-012', P1, `base:${P1}`),
        obj('foe', 'OGN-012', P2, BF0), obj('foeBase', 'OGN-012', P2, `base:${P2}`),
      ])
      let target: string | undefined
      if (sp.target !== 'none' && sp.targetlessChoice !== true) {
        try { target = (sp.legalTargets(s, P1) as string[])[0] } catch { target = undefined }
      }
      const ctx: Any = { movedCardOid: 'play:probe:card', controller: P1, ...(target !== undefined ? { target } : {}) }
      const mk: ((c: Any) => AskFn | undefined) | undefined = sp.makeConfirmChoice ?? sp.makeNextChoice
      const ask = mk?.(ctx)
      if (ask === undefined) continue
      const n = dfsNodes(s, ask, sp.firstAskOptional === true)
      expect(n, `★${defId} DFS 节点数不该触上界`).toBeGreaterThanOrEqual(0)
      if (n > maxNodes) { maxNodes = n; maxId = defId }
    }
                                                    
    expect(maxNodes, `★最大 DFS 节点数(${maxId})=${maxNodes},须 < 500`).toBeLessThan(500)
  })
})
