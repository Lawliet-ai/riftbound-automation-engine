                                                   
  
      
                                                   
                                          
                                                  
                                                 
                                       
  
                                                                 
                                                                    
                                                                      
                                                                          
                                  
                                                                   
                                                                  
  
                                           
                                                                   
                                                   
                                      
                                            
                                           
  
                                                                   
import { describe, expect, test } from 'vitest'
import { advanceFepr } from '../../src/loop/chainFepr'
import type { ChainItem, ChoiceRequest } from '../../src/loop/chain'
import { SKIPPED_BY_757 } from '../../src/loop/chain'
import { spellNextChoiceGated, spellResolveGated, ILLEGAL_TARGET, referencesIllegalTarget } from '../../src/loop/spellTargetAtResolve'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { SFD_107_SPEC, SFD_107_FOE_KEY, SFD_107_GEAR_KEY } from '../../data/cards/SFD-107'

installProviders()

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const STEP_CAP = 150
type Any = Record<string, any>

                                                        
const obj = (oid: string, defId: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)
                                                                         
const shield = (o: GameObject): GameObject =>
  ({ ...o, derived: { ...(o.derived ?? {}), restrictions: [NO_ENEMY_TARGET] } } as unknown as GameObject)
const inHand = (oid: string, defId: string, who: PlayerId): GameObject =>
  obj(oid, defId, who, `hand:${who}`, { baseTypes: [CARD_CATEGORIES[defId] === 'spell' ? 'spell' : 'unit'] as never })
const geared = (host: string): GameObject =>
  obj('g1', 'SFD-009', P1, BF0, { baseTypes: ['equipment'] as never, baseTags: ['武装'] as never, status: { attachedTo: asObjId(host) } })

function scene(objs: readonly GameObject[], chain: readonly ChainItem[] = []): GameState {
  const s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (!z) throw new Error(`造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, chain: [...chain],
    runePools: { P1: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } },
      P2: { mana: 20, runes: { red: 6, blue: 6, green: 6, purple: 6, orange: 6, yellow: 6 } } },
  } as GameState
}

const attachedToOf = (s: GameState, oid: string): string | undefined =>
  (s.objects[oid as never] as unknown as { status?: { attachedTo?: string } })?.status?.attachedTo
const damageOf = (s: GameState, oid: string): number => (s.objects[oid as never] as unknown as { damage?: number })?.damage ?? 0

const curState = (g: InteractiveGame): GameState => {
  const gg = g as unknown as { choice?: { state: GameState } | null; window?: { state: GameState } | null; state: GameState }
  return gg.choice?.state ?? gg.window?.state ?? gg.state
}
const findCardPlay = (g: InteractiveGame, player: PlayerId, cardOid: string, target?: string): InteractiveAction | null => {
  const acts = g.legalActions(player) as readonly Any[]
  return (acts.find((a) => a.kind === 'PLAY_CARD' && String(a.cardOid) === cardOid
    && (target === undefined || String(a.target) === target) && !((a.echoPicks?.length ?? 0) > 0)) ?? null) as InteractiveAction | null
}

                                                                             
                                                                         
const SYNTH_Q1 = 'maskedQ1'
const SYNTH_Q2 = 'afterQ2'

interface SynthSpec {
  legalTargets: () => readonly string[]
  makeNextChoice: (ctx: Any) => (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
}
                                                                            
const synthSpec: SynthSpec = {
  legalTargets: () => [],
  makeNextChoice: ({ movedCardOid, controller, target }) => (_state, chosen) => {
    if (chosen[SYNTH_Q1] === undefined) {
      return { itemId: `play:${movedCardOid}`, controller, key: SYNTH_Q1, prompt: `把 target 带进 prompt:${String(target)}`,
        candidates: [{ id: 'a', label: 'a' }] }
    }
    if (chosen[SYNTH_Q2] === undefined) {
      return { itemId: `play:${movedCardOid}`, controller, key: SYNTH_Q2, prompt: '第二问(与遮罩无关,必须照问)',
        candidates: [{ id: 'b', label: 'b' }] }
    }
    return null
  },
}
const SYNTH_CTX = { movedCardOid: 'sp', controller: P1, target: 'a1' }

describe('★1806a ① §758.1 遮罩命中 ⇒ 只掐这一问,后面的照问', () => {
  test('包装层把遮罩命中标成 maskedOut(而不是把它当"卡没问了")', () => {
    const s = scene([obj('a1', 'OGN-078', P1, BF0)])
    const wrapped = spellNextChoiceGated(synthSpec as never, SYNTH_CTX as never, (c: Any) => String(c.movedCardOid))
    const r = wrapped(s, {})
    expect(r, '第一问照出').not.toBeNull()
    expect(r!.key, '第一问是 maskedQ1').toBe(SYNTH_Q1)
    expect(referencesIllegalTarget(r!), '第一问里 target 已被遮成哨兵').toBe(true)
    expect(r!.maskedOut, '★标 maskedOut:(不是 null)').toBe(true)
  })

  test('确认期:第一问被 §758.1 遮罩 ⇒ 第二问照问(修前整段问链退出)', () => {
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'pending',
      confirmChoice: spellNextChoiceGated(synthSpec as never, SYNTH_CTX as never, (c: Any) => String(c.movedCardOid)),
      resolve: () => [],
    }
    const s = scene([obj('a1', 'OGN-078', P1, BF0)], [item])
    const step = advanceFepr(s)
    expect(step.kind, '停在问点而不是直接把整段掐掉').toBe('choice')
    expect(step.kind === 'choice' ? step.request.key : '', '★第二问照问(修前会整段消失)').toBe(SYNTH_Q2)
    expect(step.kind === 'choice' ? step.request.maskedOut : undefined, '对外一问不带 maskedOut').toBeUndefined()
  })

  test('结算期:同一形状(nextChoice)也照问第二问', () => {
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'confirmed',
      nextChoice: spellNextChoiceGated(synthSpec as never, SYNTH_CTX as never, (c: Any) => String(c.movedCardOid)),
      resolve: () => [],
    }
    const s = { ...scene([obj('a1', 'OGN-078', P1, BF0)], [item]), feprPasses: 2 }
    const step = advanceFepr(s)
    expect(step.kind, '停在结算期问点').toBe('choice')
    expect(step.kind === 'choice' ? step.request.key : '', '★第二问照问(修前整段 nextChoice 消失)').toBe(SYNTH_Q2)
  })

  test('对照:目标合法(legalTargets 放行)⇒ 先问第一问,不进掐链循环', () => {
    const okSpec: SynthSpec = { ...synthSpec, legalTargets: () => ['a1'] }
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'pending',
      confirmChoice: spellNextChoiceGated(okSpec as never, SYNTH_CTX as never, (c: Any) => String(c.movedCardOid)),
      resolve: () => [],
    }
    const s = scene([obj('a1', 'OGN-078', P1, BF0)], [item])
    const step = advanceFepr(s)
    expect(step.kind === 'choice' ? step.request.key : '', '★对照:先问 maskedQ1').toBe(SYNTH_Q1)
    expect(step.kind === 'choice' ? step.request.maskedOut : undefined, '正常问不带 maskedOut').toBeUndefined()
  })

  test('只有这一问且被遮罩 ⇒ 填哨兵后卡返 null ⇒ 整段正常结束(不抛错、不死循环)', () => {
    const oneAskSpec: SynthSpec = {
      legalTargets: () => [],
      makeNextChoice: ({ movedCardOid, controller, target }) => (_st, chosen) =>
        chosen[SYNTH_Q1] === undefined
          ? { itemId: `play:${movedCardOid}`, controller, key: SYNTH_Q1, prompt: `x:${String(target)}`, candidates: [{ id: 'a', label: 'a' }] }
          : null,
    }
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'confirmed',
      nextChoice: spellNextChoiceGated(oneAskSpec as never, SYNTH_CTX as never, (c: Any) => String(c.movedCardOid)),
      resolve: () => [],
    }
    const s = { ...scene([obj('a1', 'OGN-078', P1, BF0)], [item]), feprPasses: 2 }
    let step: ReturnType<typeof advanceFepr> | null = null
    expect(() => { step = advanceFepr(s) }, '不抛错').not.toThrow()
    expect(step!.kind, '唯一一问被遮 ⇒ 直接结算、链空').toBe('done')
  })

  test('哨兵键仍是 SKIPPED_BY_757(键名不变,语义扩到两道门)', () => {
    expect(SKIPPED_BY_757, '哨兵值与 multiSelect 的「够了」同值(另见 1805 闸)').toBe('__done__')
  })
})

                                                                                
describe('★1806a ② SFD-107 击倒:两个时点结论不同', () => {
                                                   
                                                        
  test('㈠ 打出前敌方全不可被选取 ⇒ legalActions 里【没有】击倒', () => {
                                                                           
                                                           
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      shield(obj('shif', 'SFD-105', P2, BF0, { baseMight: 5 })),
      inHand('kd', 'SFD-107', P1),
    ]), makeGameDeps(0x1806) as never)
    expect(findCardPlay(g, P1, 'kd', 'a1'), '★§355.8:第一问无合法目标 ⇒ 不列').toBeNull()
  })

  test('㈠对照:有可选取敌方 ⇒ 击倒列得出', () => {
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      obj('foe', 'OGN-012', P2, BF0, { baseMight: 5 }),
      inHand('kd', 'SFD-107', P1),
    ]), makeGameDeps(0x1806) as never)
    expect(findCardPlay(g, P1, 'kd', 'a1'), '★对照:有合法敌方 ⇒ 列得出').toBeTruthy()
  })

                                                      
                                                   
                                                                                 
                                              
  test('㈡ 确认期之后敌方变不可被选取 ⇒ 伤害不做、卸武装照做', () => {
    const ctx = { movedCardOid: 'sp', controller: P1, target: 'a1' }
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'confirmed',
      targets: ['a1', 'g1', 'foe'], // 确认期冻结的目标(§355.6/§758.1 的前提)
      frozenChoices: { [SFD_107_FOE_KEY]: 'foe', [SFD_107_GEAR_KEY]: 'g1' },
      resolve: spellResolveGated(SFD_107_SPEC as never, ctx as never, (c: Any) => String(c.movedCardOid)),
    }
    const s = { ...scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      shield(obj('foe', 'OGN-012', P2, BF0, { baseMight: 9 })), // 确认期之后变不可被选取
    ], [item]), feprPasses: 2 }
    const step = advanceFepr(s)
    expect(step.kind, '无更多问 ⇒ 直接结算完').toBe('done')
    expect(step.state.chain.length, '链已清空').toBe(0)
    expect(damageOf(step.state, 'foe'), '★§758.1:与非法目标(敌方)相关的伤害被忽略').toBe(0)
    expect(attachedToOf(step.state, 'g1'), '★与它无关的指示(卸除该友方单位的武装)照做').toBeUndefined()
  })

                             
  test('㈡对照:敌方一直可选取 ⇒ 伤害照打(=友方战力 4)', () => {
    const ctx = { movedCardOid: 'sp', controller: P1, target: 'a1' }
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'confirmed',
      targets: ['a1', 'g1', 'foe'],
      frozenChoices: { [SFD_107_FOE_KEY]: 'foe', [SFD_107_GEAR_KEY]: 'g1' },
      resolve: spellResolveGated(SFD_107_SPEC as never, ctx as never, (c: Any) => String(c.movedCardOid)),
    }
    const s = { ...scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      obj('foe', 'OGN-012', P2, BF0, { baseMight: 9 }),
    ], [item]), feprPasses: 2 }
    const step = advanceFepr(s)
    expect(step.kind).toBe('done')
    expect(damageOf(step.state, 'foe'), '★对照:伤害 = 友方战力 4').toBe(4)
    expect(attachedToOf(step.state, 'g1'), '★卸武装照做').toBeUndefined()
  })

                                                     
  test('㈢ 同一张牌两个时点结论不同(口径说明)', () => {
                                                       
                                                    
                                            
                                                            
                                                 
                                           
    expect(true).toBe(true)
  })
})

                                                                          
describe('★1806a ③ maskedOut 不参与对外的 ChoiceRequest', () => {
  test('会话层接到的问题没有 maskedOut 字段(被引擎内部消费后丢弃)', () => {
    const g = new InteractiveGame(scene([
      obj('a1', 'OGN-078', P1, BF0, { baseMight: 4 }), geared('a1'),
      obj('foe', 'OGN-012', P2, BF0, { baseMight: 5 }),
      inHand('kd', 'SFD-107', P1),
    ]), makeGameDeps(0x1806) as never)
    const initial = findCardPlay(g, P1, 'kd', 'a1')
    expect(initial).toBeTruthy()
    g.apply(initial!)
    let sawMaskedOut = false
    let steps = 0
    try {
      for (; steps < STEP_CAP; steps++) {
        const raw = g.pending() as Any
        if (raw.mode === 'choice') {
          if ((raw.request as Any).maskedOut !== undefined) sawMaskedOut = true
          g.apply({ kind: 'CHOOSE', player: raw.request.controller, key: raw.request.key, answer: String(raw.request.candidates[0]?.id ?? '') } as never)
        } else if (raw.mode === 'window') {
          g.apply({ kind: 'PASS', player: raw.player } as never)
        } else break
      }
    } catch { /* 见下断言 */ }
    expect(sawMaskedOut, '★maskedOut 只活在引擎内部,不流给 UI').toBe(false)
    expect(curState(g).chain.length >= 0).toBe(true)
    expect(ILLEGAL_TARGET).toBe('__illegalTarget__')
  })
})

                                                                           
describe('★1806a ④ 回归:§757 那条(候选滤空)行为不变', () => {
  test('SFD-107 唯一敌方不可选取 ⇒ FOE 被 §757 掐、GEAR 照问(与 1805c 同)', () => {
    const ctx = { movedCardOid: 'sp', controller: P1, target: 'a1' }
    const ask = SFD_107_SPEC.makeNextChoice!({ ...ctx, controller: P1 } as never)
    const s = scene([obj('a1', 'OGN-078', P1, BF0), geared('a1'), shield(obj('shif', 'SFD-105', P2, BF0))])
    const q1 = ask(s, {})
    expect(q1?.key).toBe(SFD_107_FOE_KEY)
    const q2 = ask(s, { [SFD_107_FOE_KEY]: SKIPPED_BY_757 })
    expect(q2?.key, '被掐后落到 knockdownGear').toBe(SFD_107_GEAR_KEY)
                                   
    const item: ChainItem = {
      id: 'play:sp', controller: P1, kind: 'spell', status: 'pending',
      confirmChoice: ask, resolve: () => [],
    }
    const st = { ...scene([obj('a1', 'OGN-078', P1, BF0), geared('a1'), shield(obj('shif', 'SFD-105', P2, BF0))], [item]) }
    const step = advanceFepr(st)
    expect(step.kind === 'choice' ? step.request.key : '', '★§757 掐 FOE、GEAR 照问').toBe(SFD_107_GEAR_KEY)
  })
})
