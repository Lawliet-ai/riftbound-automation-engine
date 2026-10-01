import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind, cardCost, activatedFor, scoringBonus } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { seedRunes } from '../../src/game/economy'

                                      
  
                                         
                  
                                            
                                            
                                                         
                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const BASE = `base:${P1}`

function card(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function plain(oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, ...['d1', 'd2', 'd3'].map((id) => plain(id, P1, { zone: asZoneId(`mainDeck:${P1}`) }))]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}

const evConquer = (bf = BF0): GameEvent => ({ kind: 'conquer', player: P1, battlefield: bf })
const evHold = (bf = BF0): GameEvent => ({ kind: 'hold', player: P1, battlefield: bf })
const evMoved = (self: string, to = BF0, from = BASE): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(self), player: P1, from: asZoneId(from), to: asZoneId(to) })

                          
function firing(st: GameState, self: string, ev: GameEvent) {
  return activeTriggers(st).filter(
    (t) => t.sourceOid === asObjId(self) && t.event === ev.kind && (t.filter?.(ev, st) ?? true))
}
                   
function run(st: GameState, ev: GameEvent, pick?: string): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, P1, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
                                                                   
      const paid = it.basePerform ? it.basePerform(s, {}) : s
      if (paid === null) continue
      s = paid
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
const goldsIn = (s: GameState, zone: string) =>
  (s.zones[zone]?.contents ?? []).map((o) => s.objects[o]!).filter((o) => o.defId === 'token:金币')
const handSize = (s: GameState) => s.zones[`hand:${P1}`]?.contents.length ?? 0

describe('★「当…一处战场时」一族(第133轮开张)', () => {
  test('前提:七个卡号全部进了三处登记,费用照 cardCosts 对得上', () => {
    for (const id of ['SFD-069', 'UNL-222', 'SFD-152', 'VEN-042', 'VEN-170', 'OGN-222', 'SFD-038']) {
      expect(cardKind(id)).toBe('unit')
      expect(specLookup(id).baseMight).toBeGreaterThan(0)
    }
    expect(cardCost('VEN-042').pips).toEqual([['green']])
    expect(cardCost('SFD-069').pips ?? []).toHaveLength(0)
  })

  test('★同卡两版号:合并前必须逐字比对过卡文与费用(不是靠名字一样就假定相同)', () => {
                                              
    for (const [a, b] of [['SFD-069', 'UNL-222'], ['VEN-042', 'VEN-170']] as const) {
      expect(CARD_COSTS[a]).toEqual(CARD_COSTS[b])
      expect(specLookup(a).baseMight).toBe(specLookup(b).baseMight)
      expect(cardKind(a)).toBe(cardKind(b))
    }
  })

                                                               
  test('★坏坏魄罗:征服【我所在的那处】才响,征服别处不响', () => {
    const st = scene([card('x', 'SFD-069')])           
    expect(firing(st, 'x', evConquer(BF0))).toHaveLength(1)
    expect(firing(st, 'x', evConquer(BF1))).toHaveLength(0)
  })

  test('★坏坏魄罗:征服后基地多一个【横置的】金币', () => {
    const s2 = run(scene([card('x', 'SFD-069')]), evConquer())
    const golds = goldsIn(s2, BASE)
    expect(golds).toHaveLength(1)
    expect(golds[0]!.status.tapped).toBe(true)                          
  })

  test('★坏坏魄罗的再版号 UNL-222 走同一份实现,行为一致', () => {
    expect(goldsIn(run(scene([card('x', 'UNL-222')]), evConquer()), BASE)).toHaveLength(1)
  })

                                                               
  test('★显赫金主:据守出【两个】金币,而且是 hold 不是 conquer', () => {
    const st = scene([card('x', 'SFD-152')])
    expect(goldsIn(run(st, evHold()), BASE)).toHaveLength(2)
    expect(firing(st, 'x', evConquer())).toHaveLength(0)         
  })

  test('★慎:此处己方其他单位【恰好一名】才抽 —— 零名不抽、两名也不抽', () => {
                                                   
    const none = scene([card('x', 'VEN-042')])
    expect(handSize(run(none, evHold()))).toBe(handSize(none))

    const one = scene([card('x', 'VEN-042'), plain('a')])
    expect(handSize(run(one, evHold()))).toBe(handSize(one) + 1)

    const two = scene([card('x', 'VEN-042'), plain('a'), plain('b')])
    expect(handSize(run(two, evHold()))).toBe(handSize(two))
  })

  test('★慎:只数【此处】的、只数【我控制的】、且不把自己数进去', () => {
                                               
    const st = scene([card('x', 'VEN-042'), plain('here'),
      plain('elsewhere', P1, { zone: asZoneId(BF1) }), plain('foe', P2)])
    expect(handSize(run(st, evHold()))).toBe(handSize(st) + 1)
  })

  test('★慎的再版号 VEN-170 走同一份实现,行为一致', () => {
    const st = scene([card('x', 'VEN-170'), plain('a')])
    expect(handSize(run(st, evHold()))).toBe(handSize(st) + 1)
  })

                                                          
  test('★诺克萨斯鼓手:移动【到战场】才响,移回基地不响', () => {
    const st = scene([card('x', 'OGN-222')])
    expect(firing(st, 'x', evMoved('x', BF0))).toHaveLength(1)
                                                         
                                            
    expect(firing(st, 'x', evMoved('x', BASE, BF0))).toHaveLength(0)
  })

  test('★诺克萨斯鼓手:别人移动到战场,我不响(主角判据不能漏)', () => {
    const st = scene([card('x', 'OGN-222'), plain('other')])
    expect(firing(st, 'x', evMoved('other', BF0))).toHaveLength(0)
  })

  test('★诺克萨斯鼓手:随从落在【此处】,而且【休眠】进场(卡文没写"活跃的")', () => {
    const st = scene([card('x', 'OGN-222')])
    const s2 = run(st, evMoved('x', BF0))
    const minions = (s2.zones[BF0]!.contents).map((o) => s2.objects[o]!).filter((o) => o.defId === 'token:随从')
    expect(minions).toHaveLength(1)
    expect(minions[0]!.baseMight).toBe(1)
    expect(minions[0]!.status.dormant).toBe(true)
  })

  test('★绸舞士:候选是【场上任意】友方单位 —— 卡文没写「此处」,别处的也能选', () => {
                                 
                                                 
    const st = scene([card('x', 'SFD-038'), plain('here'),
      plain('elsewhere', P1, { zone: asZoneId(BF1) }), plain('foe', P2)])
    const t = firing(st, 'x', evMoved('x', BF0))[0]!
    const cands = (t.nextChoice?.(st, evMoved('x', BF0), {})?.candidates ?? []).map((c) => c.id)
    expect(cands.sort()).toEqual(['elsewhere', 'here'])             
  })

  test('★绸舞士:选中的那名本回合 [M]+1', () => {
    const st = scene([card('x', 'SFD-038'), plain('mate')])
    const s2 = recomputeContinuous(run(st, evMoved('x', BF0), 'mate'))
    expect(effectiveMight(s2.objects['mate']!).actual).toBe(2 + 1)
  })
})

                                                                          
                               
            
                                                                   
                                                 
                                                     
                                                                          
describe('★这一族里的传奇 + 阿狸的得分修正(第134轮)', () => {
  const LEGEND_ZONE = `legend:${P1}`
  function legend(oid: string, defId: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
    return {
      oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(`legend:${ctrl}`),
      baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {}, status: {}, ...extra,
    }
  }

  test('前提:五个卡号进了登记;两对再版的费用/战力/类别逐项相同(可复算,不是注释里说说)', () => {
    for (const [a, b] of [['UNL-193', 'UNL-232'], ['UNL-203', 'UNL-237']] as const) {
      expect(CARD_COSTS[a]).toEqual(CARD_COSTS[b])
      expect(specLookup(a).baseMight).toBe(specLookup(b).baseMight)
    }
    expect(cardCost('OGN-066').pips).toEqual([['green']])
  })

  test('★传奇的触发走的是同一条 TRIGGER_FACTORIES(传奇区在 ACTIVE_ZONES 里)', () => {
    const st = scene([legend('lg', 'UNL-193')])
    expect(st.zones[LEGEND_ZONE]!.contents).toContain('lg')              
    expect(firing(st, 'lg', evHold())).toHaveLength(1)
  })

  test('★愁云使者:据守→可让自己【休眠】换抽1;费用在前收益在后(★1581 起费用在确认阶段 basePerform)', () => {
    const st = scene([legend('lg', 'UNL-193')])
    const t = firing(st, 'lg', evHold())[0]!
                                                                                                                             
                                                                                                
                                                                               
    const paid = t.basePerform!(st, evHold(), {})
    expect(paid, '★确认阶段付得出').not.toBeNull()
    expect(paid!.objects['lg']!.status.tapped, '★付的就是休眠我(归一后 tapped)').toBe(true)
    const evs = t.effect(paid!, evHold(), {})
    expect(evs.map((e) => e.kind), '★effect 只剩收益').toEqual(['draw'])
    const s2 = run(st, evHold())
    expect(s2.objects['lg']!.status.tapped, '★1083 缺陷 64:传奇只有一根轴,dormant 写入归一成 tapped').toBe(true)
    expect(handSize(s2)).toBe(handSize(st) + 1)
  })

  test('★愁云使者:铁律70 —— 我【已经休眠】时这个费用付不出,一张牌都不给(★1581 缺陷 207:按归一后的真状态测)', () => {
                                                                      
                                                                                                  
                                                                         
    const st = scene([legend('lg', 'UNL-193', P1, { status: { tapped: true } })])
    expect(handSize(run(st, evHold())), '★已休眠(归一后 tapped)⇒ 付不出 ⇒ 不入链、不抽').toBe(handSize(st))
                                                
    const once = run(scene([legend('lg', 'UNL-193')]), evHold())
    expect(handSize(once), '★第一次:付了、抽 1').toBe(1)
    expect(once.objects['lg']!.status.tapped, '★第一次付完归一成 tapped').toBe(true)
    expect(handSize(run(once, evHold())), '★★★★★第二次据守:已休眠 ⇒ 付不出 ⇒ 不抽(修前这里是 2)').toBe(1)
    // 手搓 dormant 那一景(★1581 前的写法)在归一口径下不是传奇的合法状态,只作对照留档:它现在会被 canDormantSelf 放行
  })

  test('★愁云使者:据守的是【对手】时不响', () => {
    const st = scene([legend('lg', 'UNL-193')])
    const foeHold: GameEvent = { kind: 'hold', player: P2, battlefield: BF0 }
    expect(firing(st, 'lg', foeHold)).toHaveLength(0)
  })

  test('★圣锤之毅:据守→获得1经验(这一句没有"你可以选择",是强制的)', () => {
    const st = scene([legend('lg', 'UNL-203')])
    const s2 = run(st, evHold())
    expect(s2.experience[P1]).toBe(1)
    expect(s2.objects['lg']!.status.dormant).toBeFalsy()             
  })

  test('★圣锤之毅的主动技能:经验够才付得起,且【横置】走 tapped 轴不是 dormant', () => {
    const spec = activatedFor('UNL-203')[0]!
    expect(spec.tapSelf).toBe(true)                 
    const poor = scene([legend('lg', 'UNL-203')])        
    expect(spec.extraCost!.pay(poor, P1, 'lg')).toBeNull()
    const rich = { ...poor, experience: { ...poor.experience, [P1]: 3 } }
    const paid = spec.extraCost!.pay(rich, P1, 'lg')
    expect(paid).not.toBeNull()
    expect(paid!.experience[P1]).toBe(0)            
  })

  test('★圣锤之毅的再版号 UNL-237 共用同一份主动技能规格', () => {
    expect(activatedFor('UNL-237')[0]!.key).toBe(activatedFor('UNL-203')[0]!.key)
  })

  test('★阿狸:据守此处 +1 分,而且走【得分修正】不是触发(不发事件)', () => {
    const st = scene([card('x', 'OGN-066')])           
    expect(scoringBonus(st, P1, BF0, 'hold')).toBe(1)
                                                     
    expect(firing(st, 'x', evHold())).toHaveLength(0)
  })

  test('★阿狸:只加【据守】不加征服;只加【我所在的那处】;对手据守不加', () => {
    const st = scene([card('x', 'OGN-066')])
    expect(scoringBonus(st, P1, BF0, 'conquer')).toBe(0)           
    expect(scoringBonus(st, P1, BF1, 'hold')).toBe(0)              
    expect(scoringBonus(st, P2, BF0, 'hold')).toBe(0)                
  })
})

                                                                          
                        
            
                                                               
                                      
                                                       
                                   
                                  
                                                                          
describe('★这一族剩下的单卡(第135轮)', () => {
  const evDefend = (bf = BF0): GameEvent => ({ kind: 'defend', player: P1, battlefield: bf })
  const zoneOf = (s: GameState, oid: string) => s.objects[oid]?.zone as string | undefined

  test('前提:四个卡号进了登记', () => {
    for (const id of ['UNL-112', 'SFD-125', 'SFD-126']) expect(cardKind(id)).toBe('unit')
    expect(cardCost('SFD-125').mana).toBe(4)
  })

  test('★诱人仙灵:把一名敌方单位拉到【我刚移动到的那处】,而且要发 unitMoved(否则连锁触发收不到)', () => {
    const st = scene([card('x', 'UNL-112', P1, { zone: asZoneId(BASE) }),
      plain('foe', P2, { zone: asZoneId(BF1) })])
    const t = firing(st, 'x', evMoved('x', BF0, BASE))[0]!
    const evs = t.effect(st, evMoved('x', BF0, BASE), { foe: 'foe' })
                                                          
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
    const s2 = run(st, evMoved('x', BF0, BASE), 'foe')
    expect(zoneOf(s2, 'foe')).toBe(BF0)
  })

  test('★诱人仙灵:候选是【敌方】单位,基地上的也能拉(卡文没限定位置)', () => {
    const st = scene([card('x', 'UNL-112', P1, { zone: asZoneId(BASE) }),
      plain('foeBase', P2, { zone: asZoneId(`base:${P2}`) }), plain('mate')])
    const t = firing(st, 'x', evMoved('x', BF0, BASE))[0]!
    const cands = (t.nextChoice?.(st, evMoved('x', BF0, BASE), {})?.candidates ?? []).map((c) => c.id)
    expect(cands).toEqual(['foeBase'])         
  })

  test('★大力仙灵:「支付紫色」是费用 —— 有紫符能才走得通', () => {
    const st = scene([card('x', 'SFD-125', P1, { zone: asZoneId(BASE) }), plain('mate', P1, { zone: asZoneId(BF1) })])
    const withRune = seedRunes(st, P1, 'purple', 2)
    const t = firing(withRune, 'x', evMoved('x', BF0, BASE))[0]!
                                                                 
                                                                        
                                                                   
                                                     
    const paid = t.basePerform!(withRune, evMoved('x', BF0, BASE), {})
    expect(paid, '★★费用在【确认阶段】付掉').not.toBeNull()
    const evs = t.effect(paid!, evMoved('x', BF0, BASE), { mate: 'mate' })
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])            
  })

  test('★大力仙灵:一枚紫符能都没有 ⇒ 整条不执行(㊹ 费用付不起)', () => {
    const st = scene([card('x', 'SFD-125', P1, { zone: asZoneId(BASE) }), plain('mate', P1, { zone: asZoneId(BF1) })])
    const t = firing(st, 'x', evMoved('x', BF0, BASE))[0]!
                                                                         
                                                           
    expect(t.basePerform!(st, evMoved('x', BF0, BASE), {}), '★★没紫符能 ⇒ basePerform 给 null').toBeNull()
  })

  test('★忠诚的猎犬:主角是【你】不是我 —— 我不在那处也照样响,然后把我移过去', () => {
                                                                            
    const st = scene([card('x', 'SFD-126', P1, { zone: asZoneId(BASE) })])
    expect(firing(st, 'x', evDefend(BF0))).toHaveLength(1)
    const s2 = run(st, evDefend(BF0))
    expect(zoneOf(s2, 'x')).toBe(BF0)
  })

  test('★忠诚的猎犬:防守的是对手时不响;我本来就在那处时不产生移动', () => {
    const st = scene([card('x', 'SFD-126', P1, { zone: asZoneId(BASE) })])
    const foeDefend: GameEvent = { kind: 'defend', player: P2, battlefield: BF0 }
    expect(firing(st, 'x', foeDefend)).toHaveLength(0)
    const already = scene([card('x', 'SFD-126')])                  
    const t = firing(already, 'x', evDefend(BF0))[0]!
    expect(t.effect(already, evDefend(BF0), {})).toEqual([])               
  })

  test('★德玛西亚之力:「不少于四名」是 >=4 —— 三名不抽,四名/五名都抽2', () => {
    const legendObj = (oid: string): GameObject => ({
      oid: asObjId(oid), defId: 'OGS-023', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
      baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {}, status: {},
    })
    const withN = (n: number) => scene([legendObj('lg'),
      ...Array.from({ length: n }, (_, i) => plain(`u${i}`))])
    const three = withN(3)
    expect(handSize(run(three, evConquer()))).toBe(handSize(three))
    const four = withN(4)
    expect(handSize(run(four, evConquer()))).toBe(handSize(four) + 2)
    const five = withN(5)
    expect(handSize(run(five, evConquer()))).toBe(handSize(five) + 2)
  })

  test('★德玛西亚之力:只数【该战场上】的、只数【我控制的】', () => {
    const legendObj: GameObject = {
      oid: asObjId('lg'), defId: 'OGS-023', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
      baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {}, status: {},
    }
                                                           
    const st = scene([legendObj, plain('a'), plain('b'), plain('c'),
      plain('far', P1, { zone: asZoneId(BF1) }), plain('foe', P2)])
    expect(handSize(run(st, evConquer(BF0)))).toBe(handSize(st))
  })
})

                                                                
describe('★第440轮 黄慎 VEN-138:据守时此处我控其他单位恰好一个→得1分', () => {
  const score = (s: GameState): number => s.scores[P1] ?? 0

  test('★前提:两号费用/关键词/清单一致([坚守] 2黄pip)', () => {
    expect(CARD_COSTS['VEN-138']).toEqual({ mana: 6, pips: 2, colors: ['yellow'] })
    expect(CARD_COSTS['VEN-138a']).toEqual(CARD_COSTS['VEN-138'])
    expect(specLookup('VEN-138').baseMight, '上游实测 7[S]').toBe(7)
    expect(specLookup('VEN-138').baseKeywords, '[坚守] 印刷').toContain('坚守')
  })

  test('★恰好一名才得分 —— 零名不得、两名也不得(三档都压)', () => {
    const none = scene([card('x', 'VEN-138')])
    expect(score(run(none, evHold()))).toBe(score(none))

    const one = scene([card('x', 'VEN-138'), plain('a')])
    expect(score(run(one, evHold()))).toBe(score(one) + 1)

    const two = scene([card('x', 'VEN-138'), plain('a'), plain('b')])
    expect(score(run(two, evHold()))).toBe(score(two))
  })

  test('★对手的单位不计入「受你控制的」;别处的我方单位不计入「此处」;征服不响', () => {
                                      
    const foeOnly = scene([card('x', 'VEN-138'), plain('foe', P2)])
    expect(score(run(foeOnly, evHold()))).toBe(score(foeOnly))
                                             
    const mixed = scene([card('x', 'VEN-138'), plain('a'), plain('far', P1, { zone: asZoneId(BF1) })])
    expect(score(run(mixed, evHold()))).toBe(score(mixed) + 1)
                         
    const one = scene([card('x', 'VEN-138'), plain('a')])
    expect(firing(one, 'x', evConquer())).toHaveLength(0)
  })

  test('★变体 VEN-138a 走同一份实现,行为一致', () => {
    const one = scene([card('x', 'VEN-138a'), plain('a')])
    expect(score(run(one, evHold()))).toBe(score(one) + 1)
  })
})
