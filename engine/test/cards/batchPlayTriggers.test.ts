import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind, cardCost } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { advanceFepr } from '../../src/loop/chainFepr'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import type { GameEvent } from '../../src/loop/events'
import { CARD_TAGS } from '../../data/cardTags'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { EMPOWER_COUNTER } from '../../src/keywords/empower'
import { CARD_COSTS as CARD_COSTS_FOR_TEST } from '../../data/cardCosts'

                                        
                                      
  
                                      
                                              
                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function card(oid: string, defId: string, controller = P1, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: controller, controller, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function plain(oid: string, controller = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: controller, controller, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function deckCards(): GameObject[] {
  return ['d1', 'd2'].map((id) => ({
    oid: asObjId(id), defId: 'DECK', owner: P1, controller: P1, zone: asZoneId(`mainDeck:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'] as const, damage: 0, counters: {}, status: {},
  }))
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, ...deckCards()]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                                                
function playAndResolve(st: GameState, self: string, pick?: string): GameState {
  let s = landAndEnqueueTriggers(
    st, [{ kind: 'playUnit', unit: asObjId(self), player: P1 }], activeTriggers, P1, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
                                                                                                            
        const req = it.nextChoice?.(s, chosen)
        if (!req) break
        const hit = pick === undefined ? undefined : req.candidates.find((c) => c.id === pick)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
                                  
function candidatesFor(st: GameState, self: string): readonly string[] {
  const ev = { kind: 'playUnit' as const, unit: asObjId(self), player: P1 }
  const t = activeTriggers(st).find((x) => x.sourceOid === asObjId(self))
  return (t?.nextChoice?.(st, ev, {})?.candidates ?? []).map((c) => c.id)
}
const handSize = (s: GameState): number => s.zones[`hand:${P1}`]?.contents.length ?? 0

describe('前提:四张卡都真进了 registry', () => {
  test('类别与费用都对得上卡面', () => {
    for (const id of ['VEN-048', 'OGN-051', 'OGN-132', 'OGN-234']) expect(cardKind(id)).toBe('unit')
    expect(cardCost('OGN-234').pips?.length).toBe(2)                             
    expect(cardCost('VEN-048').pips ?? []).toHaveLength(0)
  })

  test('真 registry 收得到四条触发', () => {
    for (const id of ['VEN-048', 'OGN-051', 'OGN-132', 'OGN-234']) {
      const st = scene([card('x', id), plain('foe', P2)])
      expect(activeTriggers(st).some((t) => t.sourceOid === asObjId('x'))).toBe(true)
    }
  })
})

describe('★云端亚龙 VEN-048:打出时抽一张', () => {
  test('★抽到了', () => {
    const st = scene([card('x', 'VEN-048')])
    expect(handSize(playAndResolve(st, 'x'))).toBe(handSize(st) + 1)
  })

  test('★打出的是【别人】→ 不触发', () => {
    const st = scene([card('x', 'VEN-048'), plain('mate')])
    expect(handSize(playAndResolve(st, 'mate'))).toBe(handSize(st))
  })
})

describe('★烈阳盾卫 OGN-051:眩晕一名单位(卡文没写敌我)', () => {
  test('★敌方单位可选', () => {
    const st = scene([card('x', 'OGN-051'), plain('foe', P2)])
    expect(candidatesFor(st, 'x')).toContain('foe')
    expect(playAndResolve(st, 'x', 'foe').objects['foe']!.status.stunned).toBe(true)
  })

  test('★【友方】单位也可选——卡文没写敌我就是双方都算(㊵)', () => {
    const st = scene([card('x', 'OGN-051'), plain('mate', P1)])
    expect(candidatesFor(st, 'x')).toContain('mate')
    expect(playAndResolve(st, 'x', 'mate').objects['mate']!.status.stunned).toBe(true)
  })
})

describe('★大副 OGN-132:让【另一】名单位变为活跃', () => {
  test('★选中的那名从休眠变活跃', () => {
    const st = scene([card('x', 'OGN-132'), plain('mate', P1, { status: { dormant: true } })])
    expect(playAndResolve(st, 'x', 'mate').objects['mate']!.status.dormant).toBe(false)
  })

  test('★「另一名」⇒ 自己不在候选里', () => {
    const st = scene([card('x', 'OGN-132', P1, { status: { dormant: true } }), plain('mate')])
    expect(candidatesFor(st, 'x')).not.toContain('x')
  })
})

describe('★龙骑兵 OGN-234:摧毁一名【敌方】单位', () => {
  test('★敌方单位进了废牌堆', () => {
    const st = scene([card('x', 'OGN-234'), plain('foe', P2)])
    const s = playAndResolve(st, 'x', 'foe')
    expect(s.objects['foe']).toBeUndefined()
    expect(s.zones[`discard:${P2}`]!.contents).toHaveLength(1)                
  })

  test('★这张写了「敌方」⇒ 友方单位【不】在候选里(与烈阳盾卫正好相反)', () => {
    const st = scene([card('x', 'OGN-234'), plain('mate', P1), plain('foe', P2)])
    const cands = candidatesFor(st, 'x')
    expect(cands).toContain('foe')
    expect(cands).not.toContain('mate')
  })

  test('场上没有敌方单位 → 不弹问、什么都不做(不是报错)', () => {
    const st = scene([card('x', 'OGN-234'), plain('mate', P1)])
    expect(candidatesFor(st, 'x')).toHaveLength(0)
    expect(playAndResolve(st, 'x').objects['mate']).toBeDefined()
  })
})

                                                                 
                           
function fireAndResolve(
  st: GameState, ev: { kind: 'playUnit' | 'attack' | 'conquer'; self: string }, pick?: string,
): GameState {
  const event = ev.kind === 'playUnit'
    ? { kind: 'playUnit' as const, unit: asObjId(ev.self), player: P1 }
    : ev.kind === 'attack'
      ? { kind: 'attack' as const, unit: asObjId(ev.self), player: P1, battlefield: BF0 }
      : { kind: 'conquer' as const, player: P1, battlefield: BF0 }
  let s = landAndEnqueueTriggers(st, [event], activeTriggers, P1, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      const chosen: Record<string, string> = {}
      for (let q = 0; q < 3; q++) {
        const req = it.nextChoice?.(s, chosen)                    
        if (!req) break
        const hit = pick === undefined ? undefined : req.candidates.find((c) => c.id === pick)
        chosen[req.key] = (hit ?? req.candidates[0]!).id
      }
      s = applyEvents(s, it.resolve(s, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
                   
function candsOf(st: GameState, self: string, ev: GameEvent): readonly string[] {
  const t = activeTriggers(st).find((x) => x.sourceOid === asObjId(self))
  return (t?.nextChoice?.(st, ev, {})?.candidates ?? []).map((c) => c.id)
}
const playEv = (self: string) => ({ kind: 'playUnit' as const, unit: asObjId(self), player: P1 })
                                                                  
function reqOf(st: GameState, self: string, ev: GameEvent) {
  const t = activeTriggers(st).find((x) => x.sourceOid === asObjId(self))
  return t?.nextChoice?.(st, ev, {}) ?? null
}

                                              
  
                                                                      
                                              
                                                     
                                                           
                                         
describe('🔴🔴🔴★★★★★★557【C3】触发式技能的追问要带 §355.6 目标标记', () => {
  test('🔴🔴🔴★★★★★★选择器标了 isTarget ⇒ 追问也要标(SFD-007 让一名单位获得[游走])', () => {
    const st = scene([card('x', 'SFD-007'), plain('mate')])
    const req = reqOf(st, 'x', playEv('x'))
    expect(req, '★前提:这一问真的问得出来').not.toBeNull()
    expect(req!.isTarget, '★★★没有它,阿狸 OGN-119 那类选了目标也没人记').toBe(true)
  })

  test('🔴🔴★★★★★★选择器【没标】isTarget ⇒ 追问也不许标(别把普通选择当成选目标)', () => {
                                                         
                                                    
                                                       
                                               
                                               
                                                        
    const mk = (isTarget?: boolean) => compileTrigger({
      id: 'probe-1768', rawId: true, event: 'playUnit', by: 'you',
      choose: { key: 'u', prompt: 'probe', selector: { type: 'unit', fielded: true, ...(isTarget ? { isTarget: true } : {}) } },
      then: [],
    } as never, asObjId('x') as never, P1)
    const st = scene([card('x', 'OGN-082'), plain('mate')])
    const ask = (t: { nextChoice?: (s: GameState, e: GameEvent, c: Record<string, string>) => unknown }) =>
      (t.nextChoice?.(st, playEv('x'), {}) ?? null) as { isTarget?: boolean } | null
    expect(ask(mk(true))?.isTarget, '★标了就要带出来').toBe(true)
    expect(ask(mk(undefined))?.isTarget, '★★★没标就必须是 undefined —— 证明那行是【照抄】不是恒为 true').toBeUndefined()
  })
})

describe('★战力加成族(苍炎守护者/战地乐团/天声玄龙)', () => {
  test('★苍炎守护者:本回合[S]+8 落在选中的那名身上', () => {
    const st = scene([card('x', 'OGN-082'), plain('mate')])
    const s = fireAndResolve(st, { kind: 'playUnit', self: 'x' }, 'mate')
    expect(effectiveMight(recomputeContinuous(s).objects['mate']!).actual).toBe(2 + 8)
  })

  test('★苍炎守护者没写敌我 ⇒ 敌方单位也在候选里(㊵)', () => {
    const st = scene([card('x', 'OGN-082'), plain('foe', P2)])
    expect(candsOf(st, 'x', playEv('x'))).toContain('foe')
  })

  test('★天声玄龙写了「友方」⇒ 敌方【不】在候选里', () => {
    const st = scene([card('x', 'UNL-027'), plain('mate'), plain('foe', P2)])
    const ev = { kind: 'conquer' as const, player: P1, battlefield: BF0 }
    const cands = candsOf(st, 'x', ev)
    expect(cands).toContain('mate')
    expect(cands).not.toContain('foe')
  })

  test('★天声玄龙用的是「我在不在那处」而非「主角是我」——征服事件不带主角', () => {
                            
    const st = scene([card('x', 'UNL-027'), plain('mate')])
    const s = fireAndResolve(st, { kind: 'conquer', self: 'x' }, 'mate')
    expect(effectiveMight(recomputeContinuous(s).objects['mate']!).actual).toBe(2 + 8)
  })
})

describe('★伤害族(怒海大鲨炮/神射海盗)', () => {
  test('★怒海大鲨炮:6点伤害打在敌方单位上', () => {
    const st = scene([card('x', 'OGN-092'), plain('foe', P2)])
    const s = fireAndResolve(st, { kind: 'playUnit', self: 'x' }, 'foe')
    expect(s.objects['foe']).toBeUndefined()                        
  })

  test('★神射海盗「此处」⇒ 别处战场的敌人不在候选里', () => {
    const far: GameObject = { ...plain('far', P2), zone: asZoneId('battlefield:shared:1') }
    const st = scene([card('x', 'OGN-130'), plain('near', P2), far])
    const ev = { kind: 'attack' as const, unit: asObjId('x'), player: P1, battlefield: BF0 }
    const cands = candsOf(st, 'x', ev)
    expect(cands).toContain('near')
    expect(cands).not.toContain('far')
  })

                                                                 
                                           
                                                                       
  test('🔴🔴🔴★★★★★★【B1 核心分辨】神射海盗:事件说 BF1、我人在 BF0 ⇒ 按 BF0 算', () => {
    const far: GameObject = { ...plain('far', P2), zone: asZoneId('battlefield:shared:1') }
    const st = scene([card('x', 'OGN-130'), plain('near', P2), far])
    const ev = { kind: 'attack' as const, unit: asObjId('x'), player: P1, battlefield: 'battlefield:shared:1' }
    expect(candsOf(st, 'x', ev), '★★★旧写法会给 far').toEqual(['near'])
  })

  test('🔴🔴★★★★★★神射海盗:我【回了基地】⇒ 一个候选都没有', () => {
    const me: GameObject = { ...card('x', 'OGN-130'), zone: asZoneId(`base:${P1}`) }
    const st = scene([me, plain('near', P2)])
    const ev = { kind: 'attack' as const, unit: asObjId('x'), player: P1, battlefield: BF0 }
    expect(candsOf(st, 'x', ev), '★不在战场上 ⇒ 忽略与战场相关的指示').toEqual([])
  })

  test('🔴🔴★★★★★★悚悚魄罗 UNL-137 同一口径:事件说 BF1、我人在 BF0 ⇒ 按 BF0 算', () => {
    const far: GameObject = { ...plain('far', P2), zone: asZoneId('battlefield:shared:1') }
    const st = scene([card('x', 'UNL-137'), plain('near', P2), far])
    const ev = { kind: 'attack' as const, unit: asObjId('x'), player: P1, battlefield: 'battlefield:shared:1' }
    expect(candsOf(st, 'x', ev)).toEqual(['near'])
  })
})

describe('★流沙术士 SFD-158:摧毁一名【不高于3[S]】的敌方单位', () => {
  test('★战力上限按【当前】战力算,不是印刷战力', () => {
                                     
    const st0 = scene([card('x', 'SFD-158'), plain('foe', P2)])
    expect(candsOf(st0, 'x', playEv('x'))).toContain('foe')
    const boosted = recomputeContinuous({
      ...st0,
      continuousEffects: [{
        id: 'test-boost', duration: 'permanent', fromPassive: false, timestamp: 1,
        predicate: (o: GameObject) => o.oid === asObjId('foe'),
        modification: { kind: 'addMight', delta: 2 },
      }] as never,
    })
    expect(effectiveMight(boosted.objects['foe']!).reference).toBe(4)
    expect(candsOf(boosted, 'x', playEv('x'))).not.toContain('foe')
  })
})

describe('★增益/活跃族(竞技场新人/暮光狂舞者)', () => {
  test('★竞技场新人:「另一名友方」——自己和敌方都不在候选里', () => {
    const st = scene([card('x', 'OGN-136'), plain('mate'), plain('foe', P2)])
    const cands = candsOf(st, 'x', playEv('x'))
    expect(cands).toEqual(['mate'])
  })

  test('★暮光狂舞者:进攻时让另一名友方单位变活跃', () => {
    const st = scene([card('x', 'VEN-020'), plain('mate', P1, { status: { dormant: true } })])
    const s = fireAndResolve(st, { kind: 'attack', self: 'x' }, 'mate')
    expect(s.objects['mate']!.status.dormant).toBe(false)
  })
})

                                                             
describe('★移回基地族(悚悚魄罗/狂热粉丝)', () => {
  test('★§446.1 移回基地是【真移动】——必须补发 unitMoved 信号', () => {
                                              
    const st = { ...scene([card('x', 'UNL-137'), plain('foe', P2)]),
      runePools: { P1: { mana: 1, runes: {} }, P2: { mana: 0, runes: {} } } } as GameState
    const ev = { kind: 'attack' as const, unit: asObjId('x'), player: P1, battlefield: BF0 }
    let s2 = landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {})
    const it = s2.chain[0]!
    const chosen: Record<string, string> = {}
    const req = it.nextChoice?.(s2, chosen)
    chosen[req!.key] = 'foe'
    const out = applyEvents(s2, it.resolve(s2, chosen, it), {})
    expect(out.events.some((e) => e.kind === 'unitMoved')).toBe(true)        
    expect(out.state.objects['foe']!.zone).toBe(`base:${P2}`)               
  })

  test('★狂热粉丝按【进攻方身份】选目标,不是按阵营', () => {
                                             
    const st = scene([
      card('x', 'SFD-128'),
      plain('atk', P2, { status: { attacking: true } }),
      plain('idle', P2),
    ])
    const ev = { kind: 'defend' as const, unit: asObjId('x'), player: P1, battlefield: BF0 }
    const cands = candsOf(st, 'x', ev)
    expect(cands).toContain('atk')
    expect(cands).not.toContain('idle')
  })

                                                           
                                   
  test('★狂热粉丝的「摧毁我」是费用,在确认阶段付,先于收益发生', () => {
    const st = scene([card('x', 'SFD-128'), plain('atk', P2, { status: { attacking: true } })])
    const ev = { kind: 'defend' as const, unit: asObjId('x'), player: P1, battlefield: BF0 }
    let s2 = landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {})
    const it = s2.chain[0]!
                
    s2 = it.basePerform!(s2, {})!
    expect(s2.objects['x'], '我在确认阶段就死了').toBeUndefined()
                
    const chosen: Record<string, string> = {}
    const req = it.nextChoice?.(s2, chosen)
    chosen[req!.key] = 'atk'
    const out = applyEvents(s2, it.resolve(s2, chosen, it), {}).state
    expect(out.objects['atk']!.zone).toBe(`base:${P2}`)           
  })
})

describe('★永黯潜伏者 UNL-123:弃一张抽一张', () => {
  test('★弃牌是强制的(卡文没有"你可以选择")——手牌少一张、牌堆少一张', () => {
    const inHand: GameObject = {
      oid: asObjId('h1'), defId: 'HAND', owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
      baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
    }
    const st = scene([card('x', 'UNL-123'), inHand])
    const s2 = playAndResolve(st, 'x', 'h1')
    expect(s2.zones[`discard:${P1}`]!.contents).toHaveLength(1)       
    expect(handSize(s2)).toBe(1)                
  })

  test('手牌为空 → 没得弃,但【抽牌照抽】(两句是并列效果)', () => {
    const st = scene([card('x', 'UNL-123')])
    expect(handSize(playAndResolve(st, 'x'))).toBe(1)
  })
})

                                                       
describe('★命运编织者 UNL-064:查顶4张,取一张法力费≥4的法术,其余回收', () => {
                                                        
  function deckOf(specs: readonly { oid: string; defId: string }[]): GameObject[] {
    return [...specs].reverse().map((c) => ({
      oid: asObjId(c.oid), defId: c.defId, owner: P1, controller: P1,
      zone: asZoneId(`mainDeck:${P1}`), baseMight: 0, baseKeywords: [],
      baseTypes: ['spell'] as const, damage: 0, counters: {}, status: {},
    }))
  }
                                               
  function board(): GameState {
    const base = createInitialState([P1, P2], 2)
                                            
                                              
                                         
    const objs = [card('x', 'UNL-064'), ...deckOf([
      { oid: 'top1', defId: 'OGN-169' }, // 罡风:真法术,印刷费查 CARD_COSTS
      { oid: 'top2', defId: 'UNL-186' }, // 涌泉之恨 4费专属法术
                                                                      
                                                                  
                                                       
      { oid: 'top3', defId: 'OGN-047' }, // 3 费 0pip 法术 = 门槛−1
      { oid: 'top4', defId: 'OGN-169' },
      { oid: 'deep1', defId: 'OGN-169' }, // 查看范围之外
      { oid: 'deep2', defId: 'OGN-169' },
    ])]
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of objs) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return { ...base, activePlayer: P1, phase: 'main', objects, zones }
  }

  test('前提:牌堆顶四张确实是我摆的那四张(尾=顶的约定别搞反)', () => {
    const st = board()
    const deck = st.zones[`mainDeck:${P1}`]!.contents
    expect(deck).toHaveLength(6)
    expect(deck[deck.length - 1]).toBe('top1')       
  })

  test('★候选只含【法力费≥4】的法术,费用不够的不在里面', () => {
    const st = board()
    const cands = candsOf(st, 'x', playEv('x'))
                                               
    expect(cands).toContain('top2')
    expect(cands).not.toContain('top1')
                                                       
                                                                
    expect(CARD_COSTS_FOR_TEST['OGN-047']!.mana, '★前提自证:它正好 3 费 = 门槛−1').toBe(3)
    expect(cands, '🔴门槛−1 必须出局').not.toContain('top3')
  })

  test('★拿走一张 → 它进手牌,其余三张回收(牌堆总数不变、顶已换人)', () => {
    const st = board()
    const s2 = playAndResolve(st, 'x', 'top2')
    expect(s2.zones[`hand:${P1}`]!.contents).toHaveLength(1)
    expect(s2.zones[`mainDeck:${P1}`]!.contents).toHaveLength(5)            
  })

  test('★放弃选择 → 四张【全部】回收到底(要看顺序,不能只看张数)', () => {
                                                             
                                                 
                                       
    const st = board()
    const s2 = playAndResolve(st, 'x', 'skip')
    const deck = s2.zones[`mainDeck:${P1}`]!.contents
    expect(s2.zones[`hand:${P1}`]!.contents ?? []).toHaveLength(0)
    expect(deck).toHaveLength(6)
                                  
                                     
    expect(['deep1', 'deep2']).toContain(deck[deck.length - 1])
  })
})

                                                                          
                                 
  
                       
                                                                 
                                                          
                                         
                                                  
                                                                          
describe('★一卡两时机族(奥恩 SFD-058 / 艾翁 UNL-051)', () => {
  const BF1 = 'battlefield:shared:1'

                                                    
  function deck(specs: readonly { oid: string; defId: string; types: readonly ('unit' | 'spell' | 'equipment')[] }[]): GameObject[] {
    return [...specs].reverse().map((c) => ({
      oid: asObjId(c.oid), defId: c.defId, owner: P1, controller: P1,
      zone: asZoneId(`mainDeck:${P1}`), baseMight: 0, baseKeywords: [],
      baseTypes: c.types, damage: 0, counters: {}, status: {},
    }))
  }
  function board(self: string, defId: string, deckSpecs: Parameters<typeof deck>[0], extras: GameObject[] = []): GameState {
    const base = createInitialState([P1, P2], 2)
    const objs = [card(self, defId), ...extras, ...deck(deckSpecs)]
    const objects: Record<string, GameObject> = {}
    const zones = { ...base.zones }
    for (const o of objs) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    return { ...base, activePlayer: P1, phase: 'main', objects, zones }
  }
                                                  
  const evPlay = (self: string): GameEvent => ({ kind: 'playUnit', unit: asObjId(self), player: P1 })
  const evHold = (bf = BF0): GameEvent => ({ kind: 'hold', player: P1, battlefield: bf })

                                                   
  function firing(st: GameState, self: string, ev: GameEvent) {
    return activeTriggers(st).filter(
      (t) => t.sourceOid === asObjId(self) && t.event === ev.kind && (t.filter?.(ev, st) ?? true))
  }
                                              
  function run(st: GameState, ev: GameEvent, picks: Record<string, string> = {}): GameState {
    let s = landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {})
    for (let i = 0; i < 8 && s.chain.length > 0; i++) {
      const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
      if (items.length === 0) break
      for (const it of items) {
        const chosen: Record<string, string> = {}
        for (let q = 0; q < 4; q++) {
          const req = it.nextChoice?.(s, chosen)                   
          if (!req) break
          const want = picks[req.key]
          const hit = want === undefined ? undefined : req.candidates.find((c) => c.id === want)
          chosen[req.key] = (hit ?? req.candidates[0]!).id
        }
        s = applyEvents(s, it.resolve(s, chosen, it), {}).state
      }
      s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
    }
    return s
  }
  const deckTop = (s: GameState): string => {
    const c = s.zones[`mainDeck:${P1}`]!.contents
    return c[c.length - 1] as string
  }
     
                          
                                                                
                                               
                                         
                                                 
     
  const handDefIds = (s: GameState): string[] =>
    (s.zones[`hand:${P1}`]?.contents ?? []).map((oid) => s.objects[oid]?.defId ?? '?')

                                                                    
  describe('奥恩 SFD-058(查顶4张取一件装备)', () => {
                                          
                                           
    const specs = [
      { oid: 'top1', defId: 'OGN-169', types: ['spell'] as const }, // 法术:不是装备
      { oid: 'top2', defId: 'OGN-017', types: ['equipment'] as const }, // ★唯一合格的装备
      { oid: 'top3', defId: 'OGN-013', types: ['unit'] as const }, // 单位:不是装备
      { oid: 'top4', defId: 'OGN-169', types: ['spell'] as const },
      { oid: 'deep1', defId: 'OGN-021', types: ['equipment'] as const }, // ★查看范围【之外】的装备,不该进候选
      { oid: 'deep2', defId: 'OGN-169', types: ['spell'] as const },
    ]
    const st = () => board('x', 'SFD-058', specs)

    test('前提:三处登记齐、费用 5+1绿pip、牌堆尾=顶', () => {
      expect(cardKind('SFD-058')).toBe('unit')
      expect(cardCost('SFD-058').mana).toBe(5)
      expect(cardCost('SFD-058').pips).toEqual([['green']])                  
      expect(specLookup('SFD-058').baseMight).toBe(5)                     
      expect(deckTop(st())).toBe('top1')
    })

    test('★两个时机都真的会响,且共用同一个 abilityKey(得分互映靠它去重)', () => {
      const s = st()
      const p = firing(s, 'x', evPlay('x'))
      const h = firing(s, 'x', evHold())
      expect(p).toHaveLength(1)
      expect(h).toHaveLength(1)                        
      expect(p[0]!.id).not.toBe(h[0]!.id)
      expect(p[0]!.abilityKey).toBe(h[0]!.abilityKey)
    })

    test('★据守的是【别处】战场 ⇒ 不响(我不在那儿)', () => {
      expect(firing(st(), 'x', evHold(BF1))).toHaveLength(0)
    })

    test('★候选只含顶4张里的装备:范围内的法术/单位不在,范围外的装备也不在', () => {
      const cands = (firing(st(), 'x', evPlay('x'))[0]!.nextChoice?.(st(), evPlay('x'), {})?.candidates ?? [])
        .map((c) => c.id)
      expect(cands).toContain('top2')
      expect(cands).not.toContain('top1')      
      expect(cands).not.toContain('top3')      
      expect(cands).not.toContain('deep1')                                 
      expect(cands).toContain('skip')                 
    })

    test('★取走装备:它进手牌,其余三张回收到底 ⇒ 顶换成 deep1', () => {
      const s = run(st(), evPlay('x'), { card: 'top2' })
      expect(handDefIds(s)).toEqual(['OGN-017'])             
      expect(s.zones[`mainDeck:${P1}`]!.contents).toHaveLength(5)
      expect(deckTop(s)).toBe('deep1')                  
    })

    test('★不拿(skip):四张【全部】回收 ⇒ 顶换成 deep1,手牌不变', () => {
                                               
      const s = run(st(), evPlay('x'), { card: 'skip' })
      expect(s.zones[`hand:${P1}`]!.contents).toHaveLength(0)
      expect(s.zones[`mainDeck:${P1}`]!.contents).toHaveLength(6)
      expect(deckTop(s)).toBe('deep1')
    })

    test('★据守时机走同一条效果(不是只挂了个空壳触发)', () => {
      const s = run(st(), evHold(), { card: 'top2' })
      expect(handDefIds(s)).toEqual(['OGN-017'])
      expect(deckTop(s)).toBe('deep1')
    })
  })

                                                                    
  describe('艾翁 UNL-051(查顶3张取一名单位;展示到指定属性再给一次增益)', () => {
                                               
    const specs = [
      { oid: 'poro', defId: 'OGN-013', types: ['unit'] as const }, // 魄罗 ⇒ 命中标签
      { oid: 'plainUnit', defId: 'OGN-097', types: ['unit'] as const }, // 单位但无这四种标签
      { oid: 'sp', defId: 'OGN-169', types: ['spell'] as const },
      { oid: 'deep1', defId: 'OGN-169', types: ['spell'] as const },
      { oid: 'deep2', defId: 'OGN-169', types: ['spell'] as const },
    ]
    const st = () => board('x', 'UNL-051', specs, [plain('mate')])
    const buffOf = (s: GameState, oid: string) => s.objects[oid]?.counters['buff'] ?? 0

    test('前提:三处登记齐、费用 5+1绿pip、"无标签单位"这个道具确实无那四种标签', () => {
      expect(cardKind('UNL-051')).toBe('unit')
      expect(cardCost('UNL-051').mana).toBe(5)
      expect(cardCost('UNL-051').pips).toEqual([['green']])
      expect(specLookup('UNL-051').baseMight).toBe(4)
      expect(CARD_TAGS['OGN-013']).toBe('魄罗')           
      expect(['鸟类', '猫科', '犬形', '魄罗']).not.toContain(CARD_TAGS['OGN-097'] ?? '')       
    })

    test('★两个时机都会响、共用 abilityKey;据守别处不响', () => {
      const s = st()
      expect(firing(s, 'x', evPlay('x'))).toHaveLength(1)
      expect(firing(s, 'x', evHold())).toHaveLength(1)
      expect(firing(s, 'x', evPlay('x'))[0]!.abilityKey).toBe(firing(s, 'x', evHold())[0]!.abilityKey)
      expect(firing(s, 'x', evHold(BF1))).toHaveLength(0)
    })

    test('★第一问的候选只含顶3张里的单位', () => {
      const cands = (firing(st(), 'x', evPlay('x'))[0]!.nextChoice?.(st(), evPlay('x'), {})?.candidates ?? [])
        .map((c) => c.id)
      expect(cands).toEqual(expect.arrayContaining(['poro', 'plainUnit', 'skip']))
      expect(cands).not.toContain('sp')
      expect(cands).not.toContain('deep1')
    })

    test('★★★★★第【三】张也在范围内(第362轮补:老用例的前两张都是单位,把 topOfDeck 改小也照样绿)', () => {
                                                               
                                             
      const deep = [
        { oid: 'sp1', defId: 'OGN-169', types: ['spell'] as const },
        { oid: 'sp2', defId: 'OGN-169', types: ['spell'] as const },
        { oid: 'third', defId: 'OGN-097', types: ['unit'] as const }, // 第3张才是那名单位
        { oid: 'deep9', defId: 'OGN-013', types: ['unit'] as const }, // 第4张:范围外
      ]
      const s2 = board('x', 'UNL-051', deep, [plain('mate')])
      const cands2 = (firing(s2, 'x', evPlay('x'))[0]!.nextChoice?.(s2, evPlay('x'), {})?.candidates ?? [])
        .map((c) => c.id)
      expect(cands2, '★顶3张的第三张').toContain('third')
      expect(cands2, '★第4张在范围外').not.toContain('deep9')
    })

    test('★展示了【魄罗】⇒ 牌进手牌 + 追问增益目标 + 友方单位真拿到增益', () => {
      const s = run(st(), evPlay('x'), { card: 'poro', buff: 'mate' })
      expect(handDefIds(s)).toEqual(['OGN-013'])        
      expect(buffOf(s, 'mate')).toBe(1)
      expect(deckTop(s)).toBe('deep1')           
    })

    test('★展示了【无标签】单位 ⇒ 只抽牌,不追问、不给增益', () => {
                                            
      const s = run(st(), evPlay('x'), { card: 'plainUnit', buff: 'mate' })
      expect(handDefIds(s)).toEqual(['OGN-097'])         
      expect(buffOf(s, 'mate')).toBe(0)
    })

    test('★一张都不拿(skip)⇒ 没展示,不给增益,三张全回收', () => {
                                              
      const s = run(st(), evPlay('x'), { card: 'skip', buff: 'mate' })
      expect(s.zones[`hand:${P1}`]!.contents).toHaveLength(0)
      expect(buffOf(s, 'mate')).toBe(0)
      expect(deckTop(s)).toBe('deep1')
    })

    test('★据守时机走同一条效果(含标签那半)', () => {
      const s = run(st(), evHold(), { card: 'poro', buff: 'mate' })
      expect(handDefIds(s)).toEqual(['OGN-013'])
      expect(buffOf(s, 'mate')).toBe(1)
    })
  })
})

                                                                          
                                              
  
                      
                                                      
                                          
                                       
                                                                          
describe('★第二批「当你打出我时」(经验/动态抽牌/条件激活/授予关键词/眩晕或摧毁)', () => {
  const BASE = `base:${P1}`
  const exp = (s: GameState) => s.experience[P1] ?? 0

  test('前提:八张全部进了三处登记(规格不是回落的空壳、费用对得上卡面)', () => {
    for (const id of ['UNL-092', 'UNL-157', 'OGN-038', 'UNL-097', 'SFD-062', 'SFD-072', 'SFD-007', 'OGN-225']) {
      expect(cardKind(id)).toBe('unit')
      expect(specLookup(id).baseMight).toBeGreaterThan(0)                     
    }
    expect(cardCost('OGN-038').pips).toEqual([['red'], ['red']])                  
    expect(cardCost('OGN-225').pips).toEqual([['yellow']])
    expect(cardCost('UNL-092').pips ?? []).toHaveLength(0)
  })

  test('★UNL-092 德玛西亚使节:打出即获得1经验', () => {
    const st = scene([card('x', 'UNL-092')])
    expect(exp(st)).toBe(0)
    expect(exp(playAndResolve(st, 'x'))).toBe(1)
  })

  test('★UNL-157 严厉军士:按【场上】友方单位数给经验 —— 基地上的也要数进去', () => {
                                                
                                                       
    const st = scene([card('x', 'UNL-157'), plain('a'), plain('b'), plain('c', P1, { zone: asZoneId(BASE) })])
    expect(exp(playAndResolve(st, 'x'))).toBe(4)
  })

  test('★UNL-157:敌方单位不算(卡文写了「友方」)', () => {
    const st = scene([card('x', 'UNL-157'), plain('mine'), plain('foe', P2)])
    expect(exp(playAndResolve(st, 'x'))).toBe(2)              
  })

  test('★OGN-038 邪焰巨龙:按【强力】(§708 战力≥5)友方单位数抽牌,4[M]的不算', () => {
                                                
    const st = scene([card('x', 'OGN-038'),
      plain('big', P1, { baseMight: 5 }), plain('small', P1, { baseMight: 4 })])
    const before = handSize(st)
    expect(handSize(playAndResolve(st, 'x'))).toBe(before + 2)                    
  })

  test('★UNL-097 均衡门徒:「其他」单位总战力≥5 才抽 —— 自己的战力不算进去', () => {
                                                    
                                               
    const notEnough = scene([card('x', 'UNL-097'), plain('mate', P1, { baseMight: 4 })])
    expect(handSize(playAndResolve(notEnough, 'x'))).toBe(handSize(notEnough))
                               
    const enough = scene([card('x', 'UNL-097'), plain('mate', P1, { baseMight: 5 })])
    expect(handSize(playAndResolve(enough, 'x'))).toBe(handSize(enough) + 1)
  })

  test('★SFD-062 泡泡机:只让【另一名】【友方】【机械】变活跃', () => {
    const st = scene([
      card('x', 'SFD-062'),
      plain('mech', P1, { defId: 'OGN-016', status: { dormant: true } }), // OGN-016 是"机械"
      plain('foeMech', P2, { defId: 'OGN-016', status: { dormant: true } }),
      plain('plainMate', P1, { status: { dormant: true } }),
    ])
    expect(CARD_TAGS['OGN-016']).toBe('机械')                
    const cands = candidatesFor(st, 'x')
    expect(cands).toEqual(['mech'])                        
    const s2 = playAndResolve(st, 'x', 'mech')
    expect(s2.objects['mech']!.status.dormant).toBeFalsy()
  })

  test('★SFD-072 滑板高手:装备满两件才自己变活跃(一件不算)', () => {
    const gear = (id: string) => plain(id, P1, { defId: 'UNL-088', baseTypes: ['equipment'], zone: asZoneId(BASE) })
    const one = scene([card('x', 'SFD-072', P1, { status: { dormant: true } }), gear('g1')])
    expect(playAndResolve(one, 'x').objects['x']!.status.dormant).toBe(true)              
    const two = scene([card('x', 'SFD-072', P1, { status: { dormant: true } }), gear('g1'), gear('g2')])
    expect(playAndResolve(two, 'x').objects['x']!.status.dormant).toBeFalsy()
  })

  test('★SFD-007 晶能阻断器:授予[游走],且卡文没写敌我 ⇒ 敌方单位也在候选里(㊵)', () => {
    const st = scene([card('x', 'SFD-007'), plain('mate'), plain('foe', P2)])
    const cands = candidatesFor(st, 'x')
    expect(cands).toEqual(expect.arrayContaining(['mate', 'foe', 'x']))
    const s2 = recomputeContinuous(playAndResolve(st, 'x', 'foe'))
    const foe = s2.objects['foe']!
    expect(foe.derived ? foe.derived.keywords : (foe.baseKeywords ?? [])).toContain('游走')
  })

  test('★OGN-225 烈阳首领:没晕的 → 眩晕;【已晕的 → 只摧毁,不是又晕又摧】', () => {
    const fresh = scene([card('x', 'OGN-225'), plain('foe', P2)])
    const s1 = playAndResolve(fresh, 'x', 'foe')
    expect(s1.objects['foe']!.status.stunned).toBe(true)
    expect(s1.objects['foe']).toBeDefined()        

    const stunned = scene([card('x', 'OGN-225'), plain('foe', P2, { status: { stunned: true } })])
    const s2 = playAndResolve(stunned, 'x', 'foe')
    expect(s2.objects['foe']).toBeUndefined()            
    expect(s2.zones[`discard:${P2}`]!.contents.length).toBe(1)               
  })

  test('★OGN-225「改为」是二选一,不是二者都做 —— 断言必须落在【事件流】上', () => {
                                          
                                                    
                                               
    const st = scene([card('x', 'OGN-225'), plain('foe', P2, { status: { stunned: true } })])
    const t = activeTriggers(st).find((x) => x.sourceOid === asObjId('x'))!
    const evs = t.effect(st, playEv('x'), { unit: 'foe' })
    expect(evs.map((e) => e.kind)).toEqual(['destroy'])                
  })

  test('★OGN-225:候选只含敌方单位(卡文写了「敌方」)', () => {
    const st = scene([card('x', 'OGN-225'), plain('mate'), plain('foe', P2)])
    expect(candidatesFor(st, 'x')).toEqual(['foe'])
  })
})

                                                                          
                                       
  
                 
                                                    
                                                         
                                                  
                                                                          
describe('★第三批「当你打出我时」(此处打指示物 / 全体 / 废牌堆返回手牌)', () => {
  const BASE = `base:${P1}`
  const tokensIn = (s: GameState, zone: string): string[] =>
    (s.zones[zone]?.contents ?? []).map((oid) => s.objects[oid]?.defId ?? '?').filter((d) => d.startsWith('token:'))

  test('前提:七张全部进了三处登记,费用对得上卡面', () => {
    for (const id of ['OGN-211', 'SFD-157', 'UNL-033', 'UNL-132', 'OGS-018', 'OGS-010', 'UNL-167']) {
      expect(cardKind(id)).toBe('unit')
      expect(specLookup(id).baseMight).toBeGreaterThan(0)
    }
    expect(cardCost('OGS-018').pips).toEqual([['red', 'purple'], ['red', 'purple']])                         
    expect(cardCost('UNL-132').pips).toEqual([['purple']])
    expect(cardCost('OGN-211').pips ?? []).toHaveLength(0)
  })

  test('★OGN-211 忠实的工坊主:指示物打在【此处】(我在战场就进战场,不是一律进基地)', () => {
                                                       
    const st = scene([card('x', 'OGN-211')])                  
    const s2 = playAndResolve(st, 'x')
    expect(tokensIn(s2, BF0)).toEqual(['token:随从'])
    expect(tokensIn(s2, BASE)).toEqual([])
  })

  test('★OGN-211:我在基地被打出时,指示物就进基地(同一条"此处"两边都对)', () => {
    const st = scene([card('x', 'OGN-211', P1, { zone: asZoneId(BASE) })])
    const s2 = playAndResolve(st, 'x')
    expect(tokensIn(s2, BASE)).toEqual(['token:随从'])
    expect(tokensIn(s2, BF0)).toEqual([])
  })

  test('★指示物默认【休眠】进场(§359.2.c;卡文没写"活跃的"就不豁免)', () => {
    const s2 = playAndResolve(scene([card('x', 'SFD-157')]), 'x')
    const tok = Object.values(s2.objects).find((o) => o.defId === 'token:黄沙士兵')!
    expect(tok.baseMight).toBe(2)
    expect(tok.status.dormant).toBe(true)
  })

  test('★UNL-033 调皮猎手:战鹰要真的带着[法盾](漏登记关键词=少半张脸,盘面看不出来)', () => {
    const s2 = playAndResolve(scene([card('x', 'UNL-033')]), 'x')
    const hawk = Object.values(s2.objects).find((o) => o.defId === 'token:战鹰')!
    expect(hawk.baseMight).toBe(1)
    expect(hawk.baseKeywords).toContain('法盾')
  })

  test('★UNL-132 提灯海煞:所有≤2[M]的单位【不分敌我】一起弹回其【所属】手牌', () => {
    const st = scene([
      card('x', 'UNL-132'),                                  // 我 5[M],不满足
      plain('mine', P1, { baseMight: 2 }),                   // 友方 2[M] ⇒ 弹
      plain('foe', P2, { baseMight: 1 }),                    // 敌方 1[M] ⇒ 弹
      plain('big', P1, { baseMight: 3 }),                    // 3[M] ⇒ 不弹
      plain('atBase', P1, { baseMight: 1, zone: asZoneId(BASE) }), // 基地上的也算(卡文没限定位置)
    ])
    const s2 = playAndResolve(st, 'x')
                                               
    expect(s2.zones[`hand:${P1}`]!.contents).toHaveLength(2)                      
    expect(s2.zones[`hand:${P2}`]!.contents).toHaveLength(1)                      
    expect(s2.objects['big']).toBeDefined()
    expect(s2.objects['x']).toBeDefined()
    expect(s2.objects['mine']).toBeUndefined()
  })

  test('★UNL-132:一次选完再逐个弹 —— 三名都符合就三名全弹,不能弹掉一个就重算', () => {
                                          
                                                      
    const st = scene([card('x', 'UNL-132'),
      plain('a', P1, { baseMight: 1 }), plain('b', P1, { baseMight: 2 }), plain('c', P2, { baseMight: 1 })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    const evs = t.effect(st, playEv('x'), {})
    expect(evs).toHaveLength(3)
    expect(new Set(evs.map((e) => (e as { obj: string }).obj))).toEqual(new Set(['a', 'b', 'c']))
  })

  test('★OGS-018 提伯斯:只打【战场上】的,基地上的一点伤害都不吃', () => {
                                                      
                                          
    const st = scene([card('x', 'OGS-018'),
      plain('onBf', P2, { baseMight: 9 }), plain('inBase', P2, { baseMight: 9, zone: asZoneId(BASE) })])
    const s2 = playAndResolve(st, 'x')
    expect(s2.objects['onBf']!.damage).toBe(3)
    expect(s2.objects['inBase']!.damage).toBe(0)
  })

  test('★OGS-018:不限敌我 —— 我自己在战场上也照吃3点', () => {
    const s2 = playAndResolve(scene([card('x', 'OGS-018'), plain('mate', P1, { baseMight: 9 })]), 'x')
    expect(s2.objects['x']!.damage).toBe(3)
    expect(s2.objects['mate']!.damage).toBe(3)
  })

  test('★OGS-010 安妮:候选只含【我废牌堆里的法术】(单位、对手的都不在)', () => {
    const inDiscard = (id: string, defId: string, owner: typeof P1) =>
      plain(id, owner, { defId, zone: asZoneId(`discard:${owner}`), baseTypes: defId === 'OGN-169' ? ['spell'] : ['unit'] })
    const st = scene([card('x', 'OGS-010'),
      inDiscard('sp', 'OGN-169', P1),      // 我的法术 ⇒ 合格
      inDiscard('unit', 'BLK', P1),        // 我的单位 ⇒ 不合格
      inDiscard('foeSp', 'OGN-169', P2)])                
    expect(candidatesFor(st, 'x')).toEqual(['sp'])
    const s2 = playAndResolve(st, 'x', 'sp')
    expect(s2.zones[`hand:${P1}`]!.contents.map((o) => s2.objects[o]!.defId)).toEqual(['OGN-169'])
  })

  test('★UNL-167 星獒:候选只含废牌堆里【带那四种标签】的单位', () => {
    const inDiscard = (id: string, defId: string) =>
      plain(id, P1, { defId, zone: asZoneId(`discard:${P1}`) })
    const st = scene([card('x', 'UNL-167'),
      inDiscard('poro', 'OGN-013'),   // 魄罗 ⇒ 合格
      inDiscard('nope', 'OGN-097')])                 
    expect(candidatesFor(st, 'x')).toEqual(['poro'])
    const s2 = playAndResolve(st, 'x', 'poro')
    expect(s2.zones[`hand:${P1}`]!.contents.map((o) => s2.objects[o]!.defId)).toEqual(['OGN-013'])
  })
})

                                                                          
                                        
            
                                         
                                
                                            
                                          
                                                                          
describe('★第四批「当你打出我时」(条件 / 互伤 / 金币 / 费用式)', () => {
  const BASE = `base:${P1}`
  const rune = (id: string, owner: typeof P1, extra: Partial<GameObject> = {}) =>
    plain(id, owner, { defId: 'rune:green', baseTypes: ['rune'], baseMight: 0, zone: asZoneId(`base:${owner}`), ...extra })
  const goldsIn = (s: GameState, zone: string) =>
    (s.zones[zone]?.contents ?? []).map((o) => s.objects[o]!).filter((o) => o.defId === 'token:金币')

  test('前提:六张全部进了三处登记,费用照 cardCosts 对得上', () => {
    for (const id of ['OGN-061', 'VEN-037', 'OGN-149', 'SFD-039', 'SFD-174', 'SFD-074']) {
      expect(cardKind(id)).toBe('unit')
      expect(specLookup(id).baseMight).toBeGreaterThan(0)
    }
    expect(cardCost('OGN-149').pips).toEqual([['orange'], ['orange']])
    expect(cardCost('SFD-174').pips).toEqual([['yellow'], ['yellow']])
    expect(cardCost('VEN-037').pips ?? []).toHaveLength(0)
  })

  test('★OGN-061 魄罗牧者:场上没有魄罗 ⇒ 什么都不做;有了 ⇒ 给我增益并抽1', () => {
    const none = scene([card('x', 'OGN-061'), plain('mate')])
    const s1 = playAndResolve(none, 'x')
    expect(s1.objects['x']!.counters['buff'] ?? 0).toBe(0)
    expect(handSize(s1)).toBe(handSize(none))

    const withPoro = scene([card('x', 'OGN-061'), plain('poro', P1, { defId: 'OGN-013' })])
    expect(CARD_TAGS['OGN-013']).toBe('魄罗')                
    const s2 = playAndResolve(withPoro, 'x')
    expect(s2.objects['x']!.counters['buff']).toBe(1)
    expect(handSize(s2)).toBe(handSize(withPoro) + 1)
  })

  test('★OGN-061:自己【不带】魄罗标签 ⇒ 这个条件不是恒真', () => {
    expect(CARD_TAGS['OGN-061']).toBeUndefined()
  })

  test('★VEN-037 芭芭拉:符文按【控制的全部】数 —— 横置的也算(只数活跃的话第7枚会漏)', () => {
    const gear = (id: string, extra: Partial<GameObject> = {}) =>
      plain(id, P2, { defId: 'UNL-088', baseTypes: ['equipment'], zone: asZoneId(`base:${P2}`), ...extra })
                                  
    const runes = [0, 1, 2, 3, 4, 5].map((i) => rune(`r${i}`, P1))
    runes.push(rune('rTapped', P1, { status: { tapped: true } }))
    const st = scene([card('x', 'VEN-037'), gear('g'), ...runes])
    const s2 = playAndResolve(st, 'x', 'g')
    expect(s2.objects['g']).toBeUndefined()            
  })

  test('★VEN-037:符文只有 6 枚 ⇒ 整条不执行(装备安然无恙)', () => {
    const st = scene([
      card('x', 'VEN-037'),
      plain('g', P2, { defId: 'UNL-088', baseTypes: ['equipment'], zone: asZoneId(`base:${P2}`) }),
      ...[0, 1, 2, 3, 4, 5].map((i) => rune(`r${i}`, P1)),
    ])
    expect(playAndResolve(st, 'x', 'g').objects['g']).toBeDefined()
  })

  test('★VEN-037:【已强化】的改为解除强化,不是摧毁(二选一,不是都做)', () => {
    const st = scene([
      card('x', 'VEN-037'),
      plain('g', P2, { defId: 'UNL-088', baseTypes: ['equipment'], zone: asZoneId(`base:${P2}`), counters: { [EMPOWER_COUNTER]: 1 } }),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => rune(`r${i}`, P1)),
    ])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    expect(t.effect(st, playEv('x'), { gear: 'g' }).map((e) => e.kind)).toEqual(['disempower'])
  })

  test('★OGN-149 食肉蛇藤:互相以战力造成伤害,两边都按【同一个快照】算', () => {
                                   
                                                           
                                             
    const st = scene([card('x', 'OGN-149'), plain('foe', P2, { baseMight: 4 })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    const evs = t.effect(st, playEv('x'), { foe: 'foe' }) as readonly { kind: string; target: string; amount: number }[]
    expect(evs.map((e) => [e.target, e.amount])).toEqual([['foe', 6], ['x', 4]])
                                                       
                                          
                                                               
    const s2 = playAndResolve(st, 'x', 'foe')
    expect(s2.objects['foe']).toBeUndefined()
    expect(s2.objects['x']!.damage).toBe(4)                  
  })

  test('★OGN-149:候选只含【战场上】的敌方单位(基地上的不能选)', () => {
    const st = scene([card('x', 'OGN-149'),
      plain('onBf', P2), plain('inBase', P2, { zone: asZoneId(`base:${P2}`) }), plain('mate')])
    expect(candidatesFor(st, 'x')).toEqual(['onBf'])
  })

  test('★SFD-039 皇家随从:一个问题里连着问"哪个传奇"和"变哪种状态"', () => {
    const legend = plain('lg', P2, { defId: 'LEG', baseTypes: ['legend'], zone: asZoneId('legend:P2') })
    const st = scene([card('x', 'SFD-039'), legend])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    const req = t.nextChoice?.(st, playEv('x'), {})
    expect(req!.candidates.map((c) => c.id)).toEqual(['lg:::ready', 'lg:::dormant'])
                 
    const s2 = applyEvents(st, t.effect(st, playEv('x'), { legend: 'lg:::dormant' }), {}).state
    expect(s2.objects['lg']!.status.tapped).toBe(true)                                      
                                          
    const dormant = { ...st, objects: { ...st.objects, lg: { ...st.objects['lg']!, status: { tapped: true } } } }
    const s3 = applyEvents(dormant, t.effect(dormant, playEv('x'), { legend: 'lg:::ready' }), {}).state
    expect(s3.objects['lg']!.status.tapped).toBe(false)
  })

  test('★SFD-174 宝藏魔像:四个金币,而且都是【横置的】(装备指示物默认活跃,写了"休眠的"才横置)', () => {
    const s2 = playAndResolve(scene([card('x', 'SFD-174')]), 'x')
    const golds = goldsIn(s2, BASE)
    expect(golds).toHaveLength(4)
    expect(golds.every((g) => g.status.tapped === true)).toBe(true)                    
  })

  test('★SFD-074 暗巷神偷:候选按【卡面印刷】费用≤1 筛,贵的不在里面', () => {
    const gear = (id: string, defId: string, owner: typeof P1) =>
      plain(id, owner, { defId, baseTypes: ['equipment'], zone: asZoneId(`base:${owner}`) })
                                                                     
                                                                 
                                                  
    const st = scene([card('x', 'SFD-074'), gear('cheap', 'SFD-063', P1),
      gear('mid', 'OGN-023', P1), gear('pricey', 'UNL-088', P2)])
    expect(CARD_COSTS_FOR_TEST['SFD-063']!.mana, '★恰好等于门槛').toBe(1)
    expect(CARD_COSTS_FOR_TEST['OGN-023']!.mana, '★前提自证:门槛+1').toBe(2)
    expect(CARD_COSTS_FOR_TEST['UNL-088']!.mana).toBeGreaterThan(1)
                                                         
    expect(candidatesFor(st, 'x')).toEqual(['cheap'])                     
  })

  test('★SFD-074:㊹ 摧毁是【费用】—— 费用在前收益在后,且拆不掉就拿不到金币', () => {
    const st = scene([card('x', 'SFD-074'),
      plain('cheap', P1, { defId: 'SFD-063', baseTypes: ['equipment'], zone: asZoneId(BASE) })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    expect(t.effect(st, playEv('x'), { gear: 'cheap' }).map((e) => e.kind)).toEqual(['destroy', 'spawnToken'])
                                     
    const bare = scene([card('x', 'SFD-074')])
    expect(goldsIn(playAndResolve(bare, 'x'), BASE)).toHaveLength(0)
  })
})

                                                                          
                                              
            
                                               
                                    
                                              
                                            
                                                                          
describe('★第五批「当你打出我时」(二选一 / 活跃瞬息指示物 / 消耗增益)', () => {
  const BASE = `base:${P1}`
  const spriteIn = (s: GameState, zone: string) =>
    (s.zones[zone]?.contents ?? []).map((o) => s.objects[o]!).filter((o) => o.defId === 'token:精灵')

  test('前提:四张全部进了三处登记,费用照 cardCosts 对得上', () => {
    for (const id of ['SFD-091', 'OGN-106', 'UNL-084', 'OGN-147']) {
      expect(cardKind(id)).toBe('unit')
      expect(specLookup(id).baseMight).toBeGreaterThan(0)
    }
    expect(cardCost('UNL-084').pips).toEqual([['blue']])
    expect(cardCost('OGN-147').pips ?? []).toHaveLength(0)
  })

  test('★SFD-091 芭茹队长:两个模式各走各的路(只压一边的话写死某一支照样绿)', () => {
    const st = scene([card('x', 'SFD-091')])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    expect(t.nextChoice?.(st, playEv('x'), {})!.candidates.map((c) => c.id)).toEqual(['draw', 'buff'])
    expect(t.effect(st, playEv('x'), { mode: 'draw' }).map((e) => e.kind)).toEqual(['draw'])
    expect(t.effect(st, playEv('x'), { mode: 'buff' }).map((e) => e.kind)).toEqual(['grantBuff'])
  })

                                                         
                                                              
                                                       
                                                              
                                                                           
                                                                        
  test('★★★★★★★1451:那一问真的在确认阶段(advanceFepr 停下来问,项目还是 pending)', () => {
    const st = scene([card('x', 'SFD-091')])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    expect(t.mayChoose, '★★§383.3.a 挂上了').toBe(true)
    const fired = landAndEnqueueTriggers(st, [playEv('x')], activeTriggers, P1, {})
    const step = advanceFepr(fired, {})
    expect(step.kind, '★★★确认阶段就停下来问了').toBe('choice')
    expect(step.state.chain.some((i) => i.status === 'pending'), '★★★问的时候项目还没确认').toBe(true)
    const req = (step as Extract<typeof step, { kind: 'choice' }>).request
    expect(req.candidates.map((c) => c.id).sort(), '★★★而且这一问是【要不要执行】,不是【选哪个模式】').toEqual(['no', 'yes'])
  })

  test('★OGN-106 精灵之母:精灵在【此处】、【活跃】、且带【瞬息】', () => {
    const s2 = playAndResolve(scene([card('x', 'OGN-106')]), 'x')                  
    const sprites = spriteIn(s2, BF0)
    expect(sprites).toHaveLength(1)
    expect(sprites[0]!.baseMight).toBe(3)
    expect(sprites[0]!.status.dormant).toBeFalsy()                       
    expect(sprites[0]!.baseKeywords).toContain('瞬息')                   
    expect(spriteIn(s2, BASE)).toHaveLength(0)
  })

  test('★UNL-084 精灵女王:精灵进【基地】,不跟着我跑到战场上', () => {
                                         
                                        
    const s2 = playAndResolve(scene([card('x', 'UNL-084')]), 'x')
    expect(spriteIn(s2, BASE)).toHaveLength(1)
    expect(spriteIn(s2, BF0)).toHaveLength(0)
  })

  test('★UNL-084:两个时机都真的会响、共用 abilityKey,且开始阶段那半判的是【我的】回合', () => {
    const st = scene([card('x', 'UNL-084')])
    const mine = { kind: 'startPhase' as const, player: P1 }
    const theirs = { kind: 'startPhase' as const, player: P2 }
    const firing = (ev: GameEvent) => activeTriggers(st).filter(
      (t) => t.sourceOid === asObjId('x') && t.event === ev.kind && (t.filter?.(ev, st) ?? true))
    const p = firing(playEv('x'))
    const s = firing(mine)
    expect(p).toHaveLength(1)
    expect(s).toHaveLength(1)                                          
    expect(p[0]!.abilityKey).toBe(s[0]!.abilityKey)
    expect(firing(theirs)).toHaveLength(0)              
  })

  test('★OGN-147 野爪萨满:候选只含【我控制的、身上真有增益的】单位', () => {
    const st = scene([
      card('x', 'OGN-147'),
      plain('buffed', P1, { counters: { buff: 1 } }),
      plain('bare', P1),                            // 没增益 ⇒ 不合格
      plain('foeBuffed', P2, { counters: { buff: 1 } }), // §702.2.b.2 别人的不能消耗
    ])
    expect(candidatesFor(st, 'x')).toEqual(['buffed'])
  })

  test('★OGN-147:付了费用才拿收益 —— 消耗在前、增益+活跃在后', () => {
    const st = scene([card('x', 'OGN-147', P1, { status: { dormant: true } }),
      plain('buffed', P1, { counters: { buff: 1 } })])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x'))!
    expect(t.effect(st, playEv('x'), { buffSrc: 'buffed' }).map((e) => e.kind))
      .toEqual(['consumeBuff', 'grantBuff', 'statusChange'])
    const s2 = playAndResolve(st, 'x', 'buffed')
    expect(s2.objects['buffed']!.counters['buff'] ?? 0).toBe(0)         
    expect(s2.objects['x']!.counters['buff']).toBe(1)
    expect(s2.objects['x']!.status.dormant).toBeFalsy()
  })

  test('★OGN-147:铁律70 —— 场上没有带增益的单位 ⇒ 一分收益都不给', () => {
                                                         
                                                  
    const st = scene([card('x', 'OGN-147', P1, { status: { dormant: true } })])
    const s2 = playAndResolve(st, 'x')
    expect(s2.objects['x']!.counters['buff'] ?? 0).toBe(0)
    expect(s2.objects['x']!.status.dormant).toBe(true)
  })
})

                                                                          
                                             
                                               
                                                   
                                                   
                                                                          
describe('★仙灵龙 SFD-101:最多四名增益 + 消耗增益换金币', () => {
  const BASE_P1 = `base:${P1}`
  const goldCount = (s: GameState) =>
    (s.zones[BASE_P1]?.contents ?? []).filter((o) => s.objects[o]?.defId === 'token:金币').length

  test('前提:两条触发都登记了,而且共用同一个来源', () => {
    const st = scene([card('x', 'SFD-101')])
    const mine = activeTriggers(st).filter((t) => t.sourceOid === asObjId('x'))
    expect(mine.map((t) => t.event).sort()).toEqual(['consumeBuff', 'playUnit'])
  })

  test('★「最多四名」:五名候选里只能给到四名(上限硬生效)', () => {
    const st = scene([card('x', 'SFD-101'), plain('a'), plain('b'), plain('c'), plain('d')])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x') && y.event === 'playUnit')!
                          
    const chosen: Record<string, string> = {}
    let asked = 0
    for (let i = 0; i < 8; i++) {
      const req = t.nextChoice?.(st, playEv('x'), chosen)
      if (!req) break
      asked++
      chosen[req.key] = req.candidates[0]!.id               
    }
    expect(asked).toBe(4)                           
  })

  test('★「最多四名」含【零名】:直接说"够了"就一个增益都不给', () => {
                                                           
    const st = scene([card('x', 'SFD-101'), plain('a')])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x') && y.event === 'playUnit')!
    expect(t.effect(st, playEv('x'), {})).toEqual([])
  })

  test('★选中几名就给几个增益(逐个落到选中的身上)', () => {
    const st = scene([card('x', 'SFD-101'), plain('a'), plain('b')])
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId('x') && y.event === 'playUnit')!
    const evs = t.effect(st, playEv('x'), { buffT0: 'a', buffT1: 'b' })
    expect(evs.map((e) => [e.kind, (e as { target: string }).target]))
      .toEqual([['grantBuff', 'a'], ['grantBuff', 'b']])
  })

  test('★第二句:消耗一个增益 → 基地多一个【横置的】金币', () => {
    const st = scene([card('x', 'SFD-101'), plain('a', P1, { counters: { buff: 1 } })])
    const s2 = applyEvents(st, [{ kind: 'consumeBuff', target: asObjId('a'), by: P1 }], {}).state
    const landed = landAndEnqueueTriggers(st, [{ kind: 'consumeBuff', target: asObjId('a'), by: P1 }],
      activeTriggers, P1, {})
    const items = landed.chain.filter((it: { status: string }) => it.status === 'pending')
    expect(items).toHaveLength(1)                    
    const s3 = applyEvents(landed, items[0]!.resolve(landed, {}, items[0]!), {}).state
    expect(goldCount(s3)).toBe(1)
    expect(s2.objects['a']!.counters['buff'] ?? 0).toBe(0)               
  })
})

                                                                          
                                
            
                                                
                                   
                                           
                                                                   
                                                                          
const OTHER_FRIENDLY_FOR_TEST = { type: 'unit', fielded: true, controller: 'you', excludeSelf: true } as const

describe('★多问积木 chooses(第136轮)', () => {
                                   
  function askAll(st: GameState, self: string, answers: Record<string, string> = {}) {
    const t = activeTriggers(st).find((y) => y.sourceOid === asObjId(self))!
    const chosen: Record<string, string> = {}
    const log: { key: string; cands: string[] }[] = []
    for (let i = 0; i < 6; i++) {
      const req = t.nextChoice?.(st, playEv(self), chosen)
      if (!req) break
      log.push({ key: req.key, cands: req.candidates.map((c) => c.id) })
      chosen[req.key] = answers[req.key] ?? req.candidates[0]!.id
    }
    return { log, chosen, t }
  }

  test('★第一问没候选时,必须【继续问第二问】(不是就此收尾)', () => {
                                               
                                        
    const st = scene([card('x', 'SFD-132'), plain('foe', P2)])
    const { log } = askAll(st, 'x')
    expect(log.map((q) => q.key)).toEqual(['foe'])
  })

  test('★某一问的 when 为假时,后面的问题【照样要问】(不是就此收尾)', () => {
                                                          
                                                             
                                                
    const st = scene([card('x', 'OGN-141'), plain('a'), plain('b')])
    const t = compileTrigger({
      id: 'TEST:whenSkip', event: 'playUnit', by: 'you',
      when: [{ kind: 'subjectIsSelf' }],
      chooses: [
        { key: 'skipped', prompt: '这一问永远不问', selector: OTHER_FRIENDLY_FOR_TEST, when: () => false },
        { key: 'asked', prompt: '这一问必须问得到', selector: OTHER_FRIENDLY_FOR_TEST },
      ],
      effect: () => [],
    }, asObjId('x'), P1)
    const req = t.nextChoice?.(st, playEv('x'), {})
    expect(req?.key).toBe('asked')                    
  })

  test('★OGN-223:两处战场都有友方时,只有【我这一处】的拿增益(atSelfZone 的唯一区分点)', () => {
                                                           
                                              
                                                 
    const st = scene([card('x', 'OGN-223'), plain('sameBf'),
      plain('otherBf', P1, { zone: asZoneId('battlefield:shared:1') })])
    const s2 = playAndResolve(st, 'x')
    expect(s2.objects['sameBf']!.counters['buff']).toBe(1)
    expect(s2.objects['otherBf']!.counters['buff'] ?? 0).toBe(0)            
  })

  test('★OGN-141 均衡僧侣:第二问【剔掉】第一问选过的那名(同一名不能算两名)', () => {
    const st = scene([card('x', 'OGN-141'), plain('a'), plain('b'), plain('c')])
    const { log } = askAll(st, 'x', { a: 'a' })
    expect(log).toHaveLength(2)
    expect(log[0]!.cands.sort()).toEqual(['a', 'b', 'c'])
    expect(log[1]!.cands.sort()).toEqual(['b', 'c'])          
    expect(log[1]!.cands).not.toContain('x')                        
  })

  test('★OGN-141:场上只有一名其他友方单位 ⇒ 只给一个增益(§355.17 不是整条作废)', () => {
    const st = scene([card('x', 'OGN-141'), plain('only')])
    const s2 = playAndResolve(st, 'x')
    expect(s2.objects['only']!.counters['buff']).toBe(1)
    expect(s2.objects['x']!.counters['buff'] ?? 0).toBe(0)           
  })

  test('★SFD-132 海渊巨兽:一友一敌各问一次,画像不同,弹回【所属者】手牌', () => {
    const st = scene([card('x', 'SFD-132'), plain('mate'), plain('foe', P2)])
    const { log } = askAll(st, 'x')
    expect(log.map((q) => q.key)).toEqual(['mate', 'foe'])
    expect(log[0]!.cands).toEqual(['mate'])
    expect(log[1]!.cands).toEqual(['foe'])
    const s2 = playAndResolve(st, 'x')
    expect(s2.zones[`hand:${P1}`]!.contents).toHaveLength(1)          
    expect(s2.zones[`hand:${P2}`]!.contents).toHaveLength(1)             
  })

  test('★OGN-223 巅峰守护者:打到【战场】⇒ 此处所有友方都得增益(含我)', () => {
    const st = scene([card('x', 'OGN-223'), plain('here'),
      plain('far', P1, { zone: asZoneId(`base:${P1}`) }), plain('foe', P2)])
    const s2 = playAndResolve(st, 'x')
    expect(s2.objects['x']!.counters['buff']).toBe(1)
    expect(s2.objects['here']!.counters['buff']).toBe(1)
    expect(s2.objects['far']!.counters['buff'] ?? 0).toBe(0)        
    expect(s2.objects['foe']!.counters['buff'] ?? 0).toBe(0)        
  })

  test('★OGN-223:打到【基地】⇒ 只有我自己得增益(第二句的条件不成立)', () => {
                                                                    
    const base = `base:${P1}`
    const st = scene([card('x', 'OGN-223', P1, { zone: asZoneId(base) }),
      plain('mateAtBase', P1, { zone: asZoneId(base) })])
    const s2 = playAndResolve(st, 'x')
    expect(s2.objects['x']!.counters['buff']).toBe(1)
    expect(s2.objects['mateAtBase']!.counters['buff'] ?? 0).toBe(0)
  })
})

                                                                          
                      
  
                                                    
                                                   
                                                
                                                 
  
                                         
                                                         
                                                                 
                                                                          
describe('★850 补测:三张零覆盖的进场卡', () => {
  test('前提:三张都在 registry 里、类别费用对得上卡面', () => {
    for (const id of ['OGN-188', 'SFD-061', 'VEN-026']) expect(cardKind(id)).toBe('unit')
                                                                           
                                                                 
    expect(cardCost('OGN-188').pips).toEqual([['purple'], ['purple']])            
    expect(cardCost('SFD-061').pips).toEqual([['blue']])                      
    expect(cardCost('VEN-026').pips ?? []).toHaveLength(0)                   
  })

  test('★VEN-026 战地乐团:给【一名单位】本回合 [S]+3', () => {
    const st = scene([card('x', 'VEN-026'), plain('mate')])
    const s = playAndResolve(st, 'x', 'mate')
    expect(effectiveMight(recomputeContinuous(s).objects['mate']!).actual).toBe(2 + 3)
  })

  test('★VEN-026 卡文没写敌我 ⇒ 敌方单位也在候选里(㊵)', () => {
    const st = scene([card('x', 'VEN-026'), plain('foe', P2)])
    expect(candidatesFor(st, 'x')).toContain('foe')
  })

  test('★OGN-188 祖安保镖:把【另一名】单位弹回其【所属】手牌 —— 回的是 owner 的手,不是我的', () => {
    const foe = plain('foe', P2)
    const st = scene([card('x', 'OGN-188'), foe])
    const s = playAndResolve(st, 'x', 'foe')
                                                         
                                                             
    const inHand = (p: typeof P1): string[] =>
      (s.zones[`hand:${p}`]?.contents ?? []).map((oid) => s.objects[oid]!.defId)
    expect(inHand(P2), '★「其所属的」= owner(P2)的手牌').toContain('BLK')
    expect(inHand(P1), '★别弹进我自己手里').not.toContain('BLK')
    expect(s.zones[BF0]?.contents.map((o) => s.objects[o]!.defId) ?? [], '★战场上那名单位已经走了')
      .not.toContain('BLK')
  })

  test('★OGN-188「另一名」⇒ 自己不在候选里(excludeSelf)', () => {
    const st = scene([card('x', 'OGN-188'), plain('mate')])
    const cands = candidatesFor(st, 'x')
    expect(cands, '★「另一名」把自己排除掉').not.toContain('x')
    expect(cands, '★没写敌我 ⇒ 自己人也能弹').toContain('mate')
  })

  test('★SFD-061 见习工程师:从【我的废牌堆】把一件【装备】收回手牌', () => {
    const gear = card('g', 'SFD-153', P1, { zone: asZoneId(`discard:${P1}`) })           
    const st = scene([card('x', 'SFD-061'), gear])
    const s = playAndResolve(st, 'x', 'g')
                                  
    expect((s.zones[`hand:${P1}`]?.contents ?? []).map((o) => s.objects[o]!.defId)).toContain('SFD-153')
    expect((s.zones[`discard:${P1}`]?.contents ?? []).map((o) => s.objects[o]!.defId),
      '★从废牌堆走掉了').not.toContain('SFD-153')
  })

  test('★SFD-061 只收【装备】:废牌堆里的单位不在候选里', () => {
    const unitInDiscard = plain('u', P1, { zone: asZoneId(`discard:${P1}`) })
    const gear = card('g', 'SFD-153', P1, { zone: asZoneId(`discard:${P1}`) })
    const st = scene([card('x', 'SFD-061'), gear, unitInDiscard])
    const cands = candidatesFor(st, 'x')
    expect(cands).toContain('g')
    expect(cands, '★选择器写的是 type:equipment,单位不该进候选').not.toContain('u')
  })

  test('★SFD-061 只收【我的】废牌堆:对手废牌堆里的装备不在候选里', () => {
    const mine = card('g', 'SFD-153', P1, { zone: asZoneId(`discard:${P1}`) })
    const theirs = card('gf', 'SFD-153', P2, { zone: asZoneId(`discard:${P2}`) })
    const st = scene([card('x', 'SFD-061'), mine, theirs])
    const cands = candidatesFor(st, 'x')
    expect(cands).toContain('g')
    expect(cands, '★owner:you ⇒ 对手废牌堆的不算').not.toContain('gf')
  })
})
