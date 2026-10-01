                                                                     
  
                                  
                                                       
                                                        
                         
                                                       
  
                                                                  
                                                                        
                                                                    
                                                               
                                                                                 
  
                                                                 
                                                                                     
import { describe, expect, test } from 'vitest'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { installProviders, makeGameDeps } from '../../data/gameDeps'
import { PLAY_SPECS, playBonusFor } from '../../data/registry'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { recomputeContinuous } from '../../src/effects/continuousView'

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
const mutationsDeps = makeGameDeps(0x1802c) as never

                                                      
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

                                         
function withChainItem(s: GameState, id: string, cardDefId: string, who: PlayerId): GameState {
  const chainZone = Object.values(s.zones).find((z) => z.kind === 'chain')!.id
  const cardOid = `probe:chainspell`
  const objects = { ...s.objects, [cardOid]: obj(cardOid, cardDefId, who, chainZone, { baseTypes: ['spell'] as never }) }
  const zones = { ...s.zones, [chainZone]: { ...s.zones[chainZone]!, contents: [...s.zones[chainZone]!.contents, asObjId(cardOid)] } }
  return {
    ...s, objects, zones,
    chain: [...(s.chain ?? []), { id, controller: who, kind: 'spell', status: 'pending', cardOid: asObjId(cardOid), resolve: () => [] } as never],
  } as GameState
}

const game = (s: GameState, seed = 0x1802c): InteractiveGame => new InteractiveGame(s, makeGameDeps(seed) as never)

                                                      
const playsOf = (g: InteractiveGame, player: PlayerId, cardOid: string): readonly Any[] =>
  (g.legalActions(player) as readonly Any[]).filter((a) => (a.kind === 'PLAY_CARD' || a.kind === 'PLAY_STANDBY')
    && String(a.cardOid ?? a.oid) === cardOid)
const isListed = (g: InteractiveGame, player: PlayerId, cardOid: string): boolean => playsOf(g, player, cardOid).length > 0
const zoneOf = (g: InteractiveGame, oid: string): string => {
  const o = (curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]
  return o === undefined ? 'gone' : String(o.zone)
}
const damageOf = (g: InteractiveGame, oid: string): number =>
  ((curState(g).objects as unknown as Record<string, GameObject | undefined>)[oid]?.damage) ?? 0
const unitsAt = (g: InteractiveGame, zone: string, who: PlayerId): string[] => {
  const ids = (((curState(g).zones as Any)[zone]?.contents ?? []) as string[])
  const objects = curState(g).objects as unknown as Record<string, GameObject | undefined>
  return ids
    .map((id) => objects[id])
    .filter((o): o is GameObject => o !== undefined && o.controller === who && (o.baseTypes ?? []).includes('unit'))
    .map((o) => String(o.oid))
}
const handHas = (g: InteractiveGame, defId: string, who: PlayerId): boolean =>
  ((curState(g).zones as Any)[`hand:${who}`]?.contents ?? [])
    .some((id: string) => (curState(g).objects as unknown as Record<string, GameObject | undefined>)[id]?.defId === defId)

interface AskRec { key: string; stage: 'confirm' | 'resolve'; reqStage: string | undefined; isTarget: boolean; candidates: string[] }
interface RunOut { asks: AskRec[]; error: string | null; steps: number }

                                                        
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
        asks.push({
          key: String(req.key), stage: passes === 0 ? 'confirm' : 'resolve', reqStage: req.stage,
          isTarget: req.isTarget === true, candidates: ((req.candidates ?? []) as Any[]).map((c) => String(c.id)),
        })
        g.apply({ kind: 'CHOOSE', player: req.controller, key: req.key, answer: String(req.candidates?.[0]?.id ?? '') } as never)
        continue
      }
      if (p.mode === 'window') { passes++; g.apply({ kind: 'PASS', player: p.player } as never); continue }
      break
    }
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  }
  return { asks, error, steps }
}

                                                                                 
interface Case1801 {
  defId: string
  askKey: string
  empty: () => GameObject[]
  full: () => GameObject[]
                           
  chain?: (s: GameState) => GameState
                              
  effect: (g: InteractiveGame) => void
}
const CASES: readonly Case1801[] = [
  {
    defId: 'OGN-102', askKey: 'portalTarget',
    empty: () => [], full: () => [obj('a1', 'BLK', P1, 'base:P1')],
    effect: (g) => expect(zoneOf(g, 'a1'), '★放逐→接力回基地(oid 已换)').toBe('gone'),
  },
  {
    defId: 'VEN-066', askKey: 'riftTarget',
    empty: () => [], full: () => [obj('f1', 'BLK', P2, BF0)],
    effect: (g) => expect(zoneOf(g, 'f1'), '★放逐→接力回原位(oid 已换)').toBe('gone'),
  },
  {
    defId: 'UNL-186', askKey: 'wellspringVictim',
    empty: () => [], full: () => [obj('f1', 'BLK', P2, BF0)],
    effect: (g) => expect(unitsAt(g, BF0, P2), '★战场上的那名单位被摧毁').toEqual([]),
  },
  {
    defId: 'UNL-184', askKey: 'huntAlly',
    empty: () => [], full: () => [obj('a1', 'BLK', P1, BF0)],
    effect: (g) => {
      expect(zoneOf(g, 'a1'), '★放逐→接力打进一处战场(oid 已换)').toBe('gone')
      const onBf = [BF0, BF1].some((z) => unitsAt(g, z, P1).length > 0)
      expect(onBf, '★某处战场上有那名被打出的单位').toBe(true)
    },
  },
  {
    defId: 'OGN-260', askKey: 'gustFoe',
    empty: () => [obj('a1', 'BLK', P1, BF0)], // target 通道有人,但无敌方
    full: () => [obj('a1', 'BLK', P1, BF1), obj('foe', 'BLK', P2, BF0, { baseMight: 9 })],
    effect: (g) => expect(damageOf(g, 'foe'), '★按友方战力造成伤害').toBe(3),
  },
  {
    defId: 'SFD-206', askKey: 'mindblade',
    empty: () => [obj('a1', 'BLK', P1, BF0)], // target 通道有人,但链上没法术
    full: () => [obj('a1', 'BLK', P1, BF0)],
    chain: (s) => withChainItem(s, 'probe:foeSpell', 'OGN-064', P2),
    effect: (g) => expect((curState(g).chain ?? []).length, '★被指的法术已离链(negate)').toBe(0),
  },
  {
    defId: 'VEN-034', askKey: 'echoUnit',
    empty: () => [obj('a1', 'BLK', P1, BF0)], // 我控战场,但无「其他位置」的我控单位
    full: () => [obj('a1', 'BLK', P1, BF0), obj('a2', 'BLK', P1, 'base:P1')],
    effect: (g) => expect(zoneOf(g, 'a2'), '★被移到所选战场').toBe(BF0),
  },
  {
    defId: 'VEN-148', askKey: 'shadowBindDest',
    empty: () => [obj('f1', 'BLK', P2, BF0)], // 有敌方目标,但「我有单位的战场」一个都没有
    full: () => [obj('f1', 'BLK', P2, BF0, { baseMight: 9 }), obj('a1', 'BLK', P1, BF1, { baseMight: 1 })],
    effect: (g) => expect(zoneOf(g, 'f1'), '★敌方被移到我有单位的战场').toBe(BF1),
  },
  {
    defId: 'SFD-129', askKey: 'baitDest',
    empty: () => [obj('f1', 'BLK', P2, BF0)], // 敌方控制者没有别的单位 ⇒ 无落点
    full: () => [obj('f1', 'BLK', P2, BF0), obj('f2', 'BLK', P2, BF1)],
    effect: (g) => expect(zoneOf(g, 'f1'), '★敌方被移到其同伴所在位置').toBe(BF1),
  },
]

describe('★1802c ㈠ 9 张:确认期第一问候选空 ⇒ 不列;非空 ⇒ 打出/问出/生效', () => {
  for (const c of CASES) {
    test(`${c.defId}`, () => {
                                                                     
      {
        const s = scene([inHand('probe:card', c.defId, P1), ...c.empty()])
        const g = game(s)
        expect(isListed(g, P1, 'probe:card'), `★${c.defId} 候选空 ⇒ 不该列出`).toBe(false)
      }
                              
      {
        let s = scene([inHand('probe:card', c.defId, P1), ...c.full()])
        if (c.chain) s = c.chain(s)
        const g = game(s)
        const acts = playsOf(g, P1, 'probe:card')
        expect(acts.length, `★${c.defId} 候选非空 ⇒ 该列出`).toBeGreaterThan(0)
        g.apply(acts[0] as InteractiveAction)
        expect(handHas(g, c.defId, P1), `★${c.defId} 打出被接受`).toBe(false)
        const R = drive(g)
        expect(R.error, `${c.defId} 运行异常:${R.error}`).toBeNull()
        const asked = R.asks.filter((a) => a.key === c.askKey)
        expect(asked.length, `★${c.defId}:${c.askKey} 问出`).toBeGreaterThan(0)
        c.effect(g)
      }
    })
  }
})

                                                                  
describe('★1802c ㈡ two-target:第一目标按「第二问候选非空」过滤', () => {
  test('强手裂颅 OGN-220:所在处无敌方的友方单位不是合法第一目标', () => {
    const g = game(scene([
      obj('a1', 'BLK', P1, BF0),                 // BF0 只有自己人 ⇒ 不能当第一目标
      obj('a2', 'BLK', P1, BF1, { baseMight: 3 }),
      obj('foe', 'BLK', P2, BF1),                // BF1 有敌方 ⇒ a2 合法
      inHand('card', 'OGN-220', P1),
    ]))
    const acts = playsOf(g, P1, 'card')
    const targets = acts.map((a) => String(a.target ?? '')).sort()
    expect(targets, '★只有 a2 这条(没有 a1)').toEqual(['a2'])
  })

  test('背靠背 OGN-206:只有一名友方 ⇒ 不可打出', () => {
    const g = game(scene([
      obj('a1', 'BLK', P1, BF0),
      obj('foe', 'BLK', P2, BF1),
      inHand('card', 'OGN-206', P1),
    ]))
    expect(isListed(g, P1, 'card'), '★第二问候选空 ⇒ 不列').toBe(false)
  })
})

                                                              
describe('★1802c ㈢ 第一问可 0 的卡:候选空仍可打出(§355.13)', () => {
  test('OGN-105 星芒凝汇:零单位 ⇒ 可打出', () => {
    const g = game(scene([inHand('card', 'OGN-105', P1)]))
    expect(isListed(g, P1, 'card'), '★「最多两名」含 0').toBe(true)
  })

  test('OGN-262 天顶之刃:目标在场但无可移动友方 ⇒ 可打出(skip 档)', () => {
    const g = game(scene([
      obj('e', 'BLK', P2, BF0), // 目标通道有敌方
      obj('a1', 'BLK', P1, BF0), // 唯一的友方就在同一战场 ⇒ 没得移
      inHand('card', 'OGN-262', P1),
    ]))
    const acts = playsOf(g, P1, 'card')
    expect(acts.length, '★「你可以选择」含 0').toBeGreaterThan(0)
  })

  test('对照:必选 multiSelect OGN-029 星落:零单位 ⇒ 不可打出(required)', () => {
    const g = game(scene([inHand('card', 'OGN-029', P1)]))
    expect(isListed(g, P1, 'card'), '★「进行两次」必选 ⇒ 零单位不可打').toBe(false)
  })
})

                                                            
describe('★1802c ㈣ §757:第一问候选过「敌方不可选我」', () => {
  test('OGN-260:唯一敌方是啸匪 SFD-105 ⇒ 不可打出', () => {
    const g = game(scene([
      obj('a1', 'BLK', P1, BF0),
      obj('foe', 'SFD-105', P2, BF0),
      inHand('card', 'OGN-260', P1),
    ]))
    expect(isListed(g, P1, 'card'), '★§757 把唯一候选滤掉 ⇒ 问不出 ⇒ 不列').toBe(false)
  })

  test('OGN-260:啸匪 + plainFoe ⇒ 可打出,且候选不含啸匪', () => {
    const g = game(scene([
      obj('a1', 'BLK', P1, BF0),
      obj('foe', 'SFD-105', P2, BF0),
      obj('plainFoe', 'BLK', P2, BF0),
      inHand('card', 'OGN-260', P1),
    ]))
    const acts = playsOf(g, P1, 'card')
    expect(acts.length, '★还有一个 plainFoe ⇒ 可打').toBeGreaterThan(0)
    g.apply(acts[0] as InteractiveAction)
    const R = drive(g)
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const asked = R.asks.find((a) => a.key === 'gustFoe')
    expect(asked, 'gustFoe 问出').toBeTruthy()
    expect(asked!.candidates, '★候选含 plainFoe').toContain('plainFoe')
    expect(asked!.candidates, '★★候选不含带限制的啸匪').not.toContain('foe')
  })
})

                                                        
describe('★1802c ㈤ 待命路同口径', () => {
  const build = (withUnit: boolean): InteractiveGame => {
    const z = Object.values(createInitialState([P1, P2], 2).zones).find((zz) => zz.kind === 'standby')!.id
    const objs = [
      obj('probe:card', 'VEN-066', P1, z, { baseTypes: ['spell'] as never, status: { faceDown: true } }),
      ...(withUnit ? [obj('a1', 'BLK', P1, 'base:P1')] : []),
    ]
    return game(scene(objs))
  }
  test('VEN-066 从待命区打出:场上无单位 ⇒ 不列待命打出动作;有人 ⇒ 列出', () => {
    expect(isListed(build(false), P1, 'probe:card'), '★无单位 ⇒ 待命打出动作不列').toBe(false)
    expect(isListed(build(true), P1, 'probe:card'), '★有单位 ⇒ 列出').toBe(true)
  })
})

                                                               
describe('★1802c ㈥ 全 62 张:bare 场景下的可打出性(★1803b +4:OGN-198/UNL-142/OGN-268/UNL-054;★1804 +OGN-256)', () => {
  const confirmSpecs = (): readonly string[] => Object.keys(PLAY_SPECS).filter((id) => {
    const sp = PLAY_SPECS[id] as Any
    return sp !== undefined && (sp.choiceTiming === 'confirm' || sp.makeConfirmChoice !== undefined)
  })

  test('firstAskOptional 的(无 target 通道者)可打出;其余不可打出,例外逐张列明', () => {
    const optionalTargetless: string[] = []
    const optionalNeedsTarget: string[] = []
    const nonOptionalListed: string[] = []
    let totalListed = 0
    for (const defId of confirmSpecs()) {
      const sp = PLAY_SPECS[defId] as Any
      const g = game(scene([inHand('probe:card', defId, P1)]))
      const listed = isListed(g, P1, 'probe:card')
      const needsTarget = sp.target !== 'none' && sp.targetlessChoice !== true
      if (listed) totalListed++
      if (sp.firstAskOptional === true) {
        if (needsTarget) optionalNeedsTarget.push(defId)
        else optionalTargetless.push(defId)
      } else if (listed) {
        nonOptionalListed.push(defId)
      }
    }
                                                                                      
                                                                        
                                                       
    expect(optionalTargetless.sort(), '★firstAskOptional 且无 target 通道者:全部可打出').toEqual([
      'OGN-105', 'OGN-153', 'OGN-224', 'OGN-264', 'OGS-011', 'SFD-043', 'SFD-080',
      'UNL-054', 'VEN-103', 'VEN-107', 'VEN-150',
    ])
    expect(optionalNeedsTarget.sort(), '★firstAskOptional 但 target 通道空(分开记)').toEqual(['OGN-262', 'UNL-198'])
                                                                 
                                                                          
                                                       
    expect(nonOptionalListed.sort(), '★非 optional 却可打出的:恒有候选(战场/模式)').toEqual([
      'OGN-256', 'OGN-268', 'OGS-002', 'UNL-044', 'UNL-103', 'UNL-139',
    ])
    expect(confirmSpecs().length, '★62 张现算(★1803b +4 · ★1804 +OGN-256)').toBe(62)
    expect(totalListed, '★(报告用)bare 场景累计可打出张数;★1807d +1(UNL-054 含 0 可打);★1815 VEN-140 移出(18→17,缺陷 286)').toBe(17)
  })
})

                                                                             
                                                             
                                                          
                                                                 
                                                           
describe('★1803c ㈠㈡㈢ 缺陷 271:枚举闸按【付费后的盘面】模拟第一问', () => {
  const UNL_142_PICK_KEY = 'revivalPick'

  test('㈠ UNL-142:有祭品 + 废牌堆有够低单位 ⇒ 列得出;打出后确认期问 revivalPick', () => {
    const g = game(scene([
      obj('ally', 'UNL-140', P1, BF0),          // 祭品(贵,费用回指门)
      obj('rev', 'OGN-012', P1, 'discard:P1'),  // 废牌堆里够得着的便宜单位
      inHand('soul', 'UNL-142', P1),
    ]))
    const acts = playsOf(g, P1, 'soul') as readonly Any[]
    expect(acts.length, '★该列出(修前:假阻塞列不出)').toBeGreaterThan(0)
    const bonusAct = acts.find((a) => a.bonus === true && String(a.bonusChoice) === 'ally')
    expect(bonusAct, '★required ⇒ 只有带 bonusChoice 的那一支').toBeTruthy()
    g.apply(bonusAct as InteractiveAction)
    const R = drive(g)
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const pick = R.asks.find((a) => a.key === UNL_142_PICK_KEY)
    expect(pick, '★确认期问 revivalPick').toBeTruthy()
    expect(pick!.stage, '★确认期(passesBefore=0)').toBe('confirm')
    expect(pick!.candidates.length, '★候选 = 废牌堆够低者(含刚被摧毁的祭品)').toBeGreaterThan(0)
  })

  test('㈡ 废牌堆里没有费用够低的单位 ⇒ 列不出(§355.8 真阻塞,不能因为修了假阻塞就全放行)', () => {
                                                           
                                                       
    const g = game(scene([obj('ally', 'BLK', P1, BF0), inHand('soul', 'UNL-142', P1)]))
    expect(isListed(g, P1, 'soul'), '★真阻塞:够低的单位一个都没有').toBe(false)
  })

  test('㈢ 性质:带额外费用且在闸射程内的规格逐张 —— 模拟第一问候选数 == 真打出确认期候选数', () => {
                                                                  
                                                                      
                                                              
    const inScope = Object.keys(PLAY_SPECS).filter((id) => {
      const sp = PLAY_SPECS[id] as Any
      return (sp.choiceTiming === 'confirm' || sp.makeConfirmChoice !== undefined) && playBonusFor(id) !== undefined
    }).sort()
    expect(inScope, '★现算交集(未来有新卡进交集时此断言会红 —— 提醒把新卡纳入对比)').toEqual(['UNL-142'])

                                                                            
                      
    let phase: 'sim' | 'real' = 'sim'
    const seen: { phase: string; cands: number }[] = []
    const base = makeGameDeps(0x1803c) as Any
    const wrapFor = (defId: string): Any => {
      const spec = base.playSpecFor?.(defId) as Any
      if (spec === undefined || spec.makeConfirmChoice === undefined) return spec
      return { ...spec, makeConfirmChoice: (ctx: Any) => (s: GameState, chosen: Any) => {
        const r = spec.makeConfirmChoice(ctx)(s, chosen)
        seen.push({ phase, cands: r === null ? 0 : ((r.candidates ?? []) as Any[]).length })
        return r
      } }
    }
    const deps = { ...base, playSpecFor: (defId: string) => wrapFor(defId) }
    const g = new InteractiveGame(scene([
      obj('ally', 'UNL-140', P1, BF0), obj('rev', 'OGN-012', P1, 'discard:P1'), inHand('soul', 'UNL-142', P1),
    ]), deps as never)

    phase = 'sim'
    const acts = playsOf(g, P1, 'soul') as readonly Any[]
    const simCount = seen.filter((x) => x.phase === 'sim').reduce((m, x) => Math.max(m, x.cands), 0)
    expect(acts.length, '★造景:列得出').toBeGreaterThan(0)
    seen.length = 0
    phase = 'real'
    g.apply(acts[0] as InteractiveAction)
    const R = drive(g)
    expect(R.error, `运行异常:${R.error}`).toBeNull()
    const realCount = seen.find((x) => x.phase === 'real')?.cands ?? -1
    expect(simCount, '★模拟第一问候选数(不是 0)').toBeGreaterThan(0)
    expect([simCount, realCount], '★模拟 == 真打出(缺陷 271 的通用判别力)').toEqual([realCount, realCount])
  })
})
