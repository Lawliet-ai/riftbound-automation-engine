import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers } from '../../data/registry'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { seedRunes } from '../../src/game/economy'
import type { GameEvent } from '../../src/loop/events'
import { EXTRA_BF_DEFIDS, OGN_287_CARD_EFFECT } from '../../data/cards/battlefields-extra'

                   
  
                                                                        
                                            
  
                  
                                                 
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function unit(oid: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
                                                  
function scene(bfDef: string, objs: GameObject[] = [], runes = 6): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, ...['d1', 'd2'].map((id) => unit(id, P1, { zone: asZoneId(`mainDeck:${P1}`) }))]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  let s: GameState = {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    battlefieldCards: { [BF0]: { defId: bfDef, owner: P1 } },
  }
  if (runes > 0) s = seedRunes(s, P1, 'green', runes)
  return s
}
const evConquer = (p = P1, bf = BF0): GameEvent => ({ kind: 'conquer', player: p, battlefield: bf })
const evHold = (p = P1, bf = BF0): GameEvent => ({ kind: 'hold', player: p, battlefield: bf })

                                                               
function run(st: GameState, ev: GameEvent, actor = P1, pick?: string): GameState {
  let s = landAndEnqueueTriggers(st, [ev], activeTriggers, actor, {})
  for (let i = 0; i < 6 && s.chain.length > 0; i++) {
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
                                                                                            
      const paid = it.basePerform ? it.basePerform(s, {}) : s
      if (paid === null) continue
      s = applyEvents(paid, it.resolve(paid, chosen, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const tokensIn = (s: GameState, zone: string, defId: string) =>
  (s.zones[zone]?.contents ?? []).map((o) => s.objects[o]!).filter((o) => o.defId === defId)
const handSize = (s: GameState, p = P1) => s.zones[`hand:${p}`]?.contents.length ?? 0
const manaRunes = (s: GameState) =>
  Object.values(s.objects).filter((o) => o.defId.startsWith('rune:') && o.controller === P1 && o.status.tapped !== true).length

describe('★单句战场卡批量(第144轮)', () => {
  test('前提:本文件用到的这几张确实在实现表里', () => {
                                                   
                                                  
                                                         
                                                                       
                                              
    for (const d of ['OGN-291', 'OGN-275', 'OGN-283', 'OGN-298', 'SFD-220', 'SFD-210', 'UNL-207', 'VEN-162',
      'OGN-282', 'OGN-287', 'SFD-212', 'SFD-217', 'SFD-218', 'SFD-219', 'OGN-285']) {
      expect(EXTRA_BF_DEFIDS, d).toContain(d)
    }
  })

  test('★战场卡的判据是 eventAtBattlefield:征服【别处】不响;「你」是【对称】的', () => {
                                                                          
                                                
                                                    
                                                              
    const st = scene('SFD-220')
    const fireFor = (ev: GameEvent, who: typeof P1) => activeTriggers(st).filter(
      (t) => t.sourceDefId === 'SFD-220' && t.controller === who
        && t.event === ev.kind && (t.filter?.(ev, st) ?? true))
    expect(fireFor(evConquer(P1, BF0), P1)).toHaveLength(1)               
    expect(fireFor(evConquer(P1, BF1), P1)).toHaveLength(0)           
    expect(fireFor(evConquer(P2, BF0), P1)).toHaveLength(0)                   
    expect(fireFor(evConquer(P2, BF0), P2)).toHaveLength(1)                  
  })

  test('★团结圣坛 OGN-275:随从进【基地】,不是此处;且休眠进场', () => {
    const s = run(scene('OGN-275'), evHold())
    const inBase = tokensIn(s, `base:${P1}`, 'token:随从')
    expect(inBase).toHaveLength(1)
    expect(inBase[0]!.baseMight).toBe(1)
    expect(inBase[0]!.status.dormant).toBe(true)             
    expect(tokensIn(s, BF0, 'token:随从')).toHaveLength(0)                   
  })

  test('★纳沃利角斗场 OGN-283:候选限【此处】,且不限敌我', () => {
    const st = scene('OGN-283', [unit('here'), unit('foeHere', P2), unit('far', P1, { zone: asZoneId(BF1) })])
    const t = activeTriggers(st).find((y) => y.sourceDefId === 'OGN-283')!
    const cands = (t.nextChoice?.(st, evHold(), {})?.candidates ?? []).map((c) => c.id)
    expect(cands.sort()).toEqual(['foeHere', 'here'])                 
    const s = run(st, evHold(), P1, 'foeHere')
    expect(s.objects['foeHere']!.counters['buff']).toBe(1)
  })

  test('★祖安地沟 OGN-298:弃一张抽一张;手上没牌时【抽牌照抽】', () => {
    const withCard = scene('OGN-298', [unit('h', P1, { zone: asZoneId(`hand:${P1}`) })])
    const s = run(withCard, evConquer())
    expect((s.zones[`discard:${P1}`]?.contents ?? [])).toHaveLength(1)
    expect(handSize(s)).toBe(1)              

    const empty = scene('OGN-298')
    expect(handSize(run(empty, evConquer()))).toBe(1)            
  })

  test('★珍宝堆 SFD-220:付得起 → 扣1法力 + 一个【横置的】金币', () => {
    const st = scene('SFD-220')
    const before = manaRunes(st)
    const s = run(st, evConquer())
    const golds = tokensIn(s, `base:${P1}`, 'token:金币')
    expect(golds).toHaveLength(1)
    expect(golds[0]!.status.tapped).toBe(true)                        
    expect(manaRunes(s)).toBe(before - 1)
  })

  test('★珍宝堆:一枚符文都没有 ⇒ ㊹ 付不起,整条不执行', () => {
    const s = run(scene('SFD-220', [], 0), evConquer())
    expect(tokensIn(s, `base:${P1}`, 'token:金币')).toHaveLength(0)
  })

  test('★传奇殿堂 SFD-210:让传奇解除【休眠】= 解除横置(★1083 缺陷 64:传奇只有一根轴 tapped)', () => {
    const legend: GameObject = {
      oid: asObjId('lg'), defId: 'LEG', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
      baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0, counters: {},
      status: { tapped: true },
    }
    const s = run(scene('SFD-210', [legend]), evConquer())
    expect(s.objects['lg']!.status.tapped, '§124.2 只有一个 Exhausted:「解除休眠」就是解除横置').toBe(false)
  })

  test('★业余排练厅 UNL-207:把单位赶回【其】基地,并补发 unitMoved(§446.1)', () => {
    const st = scene('UNL-207', [unit('foe', P2)])
    const t = activeTriggers(st).find((y) => y.sourceDefId === 'UNL-207')!
    const evs = t.effect(st, evHold(), { unit: 'foe' })
                                                   
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
    const s = run(st, evHold(), P1, 'foe')
    expect(s.objects['foe']!.zone).toBe(`base:${P2}`)                  
  })

  test('★藏古之漠 VEN-162:「不多于四枚」是 <=4,而且横置的符文也算', () => {
                          
    const four = scene('VEN-162', [], 4)
    const tapped = Object.values(four.objects).filter((o) => o.defId.startsWith('rune:'))[0]!
    const withTapped: GameState = {
      ...four,
      objects: { ...four.objects, [tapped.oid]: { ...tapped, status: { ...tapped.status, tapped: true } } },
    }
    expect(handSize(run(withTapped, evConquer()))).toBe(1)
                      
    expect(handSize(run(scene('VEN-162', [], 5), evConquer()))).toBe(0)
  })

  test('★974 藏古之漠:「四枚」只数【场上】的 —— 符文牌堆里的不算(去掉 guard 的 fielded 会红)', () => {
                                                         
                                                
    const four = scene('VEN-162', [], 4)
    const deckZone = asZoneId(`runeDeck:${P1}`)
    const extra = ['rd0', 'rd1', 'rd2'].map((id) => ({
      ...unit(id, P1, { zone: deckZone }), defId: 'rune:green', baseTypes: ['rune'] as const,
    }) as GameObject)
    const objects = { ...four.objects }
    const zones = { ...four.zones }
    for (const o of extra) {
      objects[o.oid] = o
      const z = zones[o.zone]
      if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
    }
    const st = { ...four, objects, zones } as GameState
    expect(handSize(run(st, evConquer())), '牌堆里那三枚不该被数进来').toBe(1)
  })
})

describe('★单句战场卡批量·第二批(第145轮)', () => {
  test('★军民市场 OGN-282:消耗增益是【费用】,没增益时白抽不了(铁律70)', () => {
    const buffed = unit('b1', P1, { counters: { buff: 1 } })
    const st = scene('OGN-282', [buffed])
    const s = run(st, evConquer(), P1, 'b1')
    expect(s.objects['b1']!.counters['buff']).toBeUndefined()         
    expect(handSize(s)).toBe(1)

                                            
                                                   
    expect(handSize(run(scene('OGN-282', [unit('plain')]), evConquer()))).toBe(0)
  })

  test('★军民市场:只能消耗【我控制的】单位身上的增益(§702.2.b.2)', () => {
    const st = scene('OGN-282', [unit('mine', P1, { counters: { buff: 1 } }),
      unit('foe', P2, { counters: { buff: 1 } }),
                                                     
                                                                  
      unit('inHand', P1, { counters: { buff: 1 }, zone: asZoneId(`hand:${P1}`) }),
      unit('inDiscard', P1, { counters: { buff: 1 }, zone: asZoneId(`discard:${P1}`) })])
    const t = activeTriggers(st).find((y) => y.sourceDefId === 'OGN-282' && y.controller === P1)!
    expect((t.nextChoice?.(st, evConquer(), {})?.candidates ?? []).map((c) => c.id),
      '手牌/废牌堆里带增益的也不算 —— 去掉 fielded 会红').toEqual(['mine'])
  })

  test('★★符文集市 OGN-287:符文回收进【符文牌堆底】,不是主牌堆(§178.1.a.2)', () => {
    const st = scene('OGN-287', [], 3)
    const rune = Object.values(st.objects).filter((o) => o.defId.startsWith('rune:'))[0]!
    const deckBefore = st.zones[`runeDeck:${P1}`]?.contents.length ?? 0
    const mainBefore = st.zones[`mainDeck:${P1}`]?.contents.length ?? 0
    const s = run(st, evConquer(), P1, rune.oid)
                                                     
    expect(s.zones[`runeDeck:${P1}`]!.contents).toHaveLength(deckBefore + 1)
    expect(s.zones[`mainDeck:${P1}`]!.contents).toHaveLength(mainBefore)
                                                       
    expect(s.zones[`runeDeck:${P1}`]!.contents[0]).not.toBe(rune.oid)                
    expect(s.objects[s.zones[`runeDeck:${P1}`]!.contents[0]!]!.defId).toBe(rune.defId)
    expect(s.objects[rune.oid]).toBeUndefined()          
  })

  test('★弃土荒漠 SFD-212:顶两张【进废牌堆】(不是回收进牌堆底)', () => {
    const st = scene('SFD-212')                                   
    const before = st.zones[`mainDeck:${P1}`]!.contents.length
    const s = run(st, evConquer())
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(2)
    expect(s.zones[`mainDeck:${P1}`]!.contents).toHaveLength(before - 2)
  })

  test('★弃土荒漠:牌堆只剩一张时【尽可能多】,不是报错也不是零', () => {
    const one = scene('SFD-212')
    const deck = one.zones[`mainDeck:${P1}`]!
    const keep = deck.contents.slice(-1)           
    const s = run({ ...one, zones: { ...one.zones, [deck.id]: { ...deck, contents: keep } } }, evConquer())
    expect(s.zones[`discard:${P1}`]!.contents).toHaveLength(1)
  })

  test('★群峰哨站 SFD-217:数的是【其他】战场,此处自己不算(压三档)', () => {
                                                
    expect(handSize(run(scene('SFD-217', [unit('u0', P1)]), evConquer()))).toBe(0)
                              
    expect(handSize(run(scene('SFD-217',
      [unit('u0', P1), unit('u1', P1, { zone: asZoneId(BF1) })]), evConquer()))).toBe(1)
                                       
    expect(handSize(run(scene('SFD-217',
      [unit('u0', P1), unit('u1', P1, { zone: asZoneId(BF1) }),
        unit('e1', P2, { zone: asZoneId(BF1) })]), evConquer()))).toBe(0)
  })

  test('★巨兽坟场 SFD-218:强力=当前战力≥5,复合判据两半各压一条(㉔)(★1586 按 errata:条件是触发条件、费用在确认阶段)', () => {
    const strong = (oid: string, ctrl = P1) => unit(oid, ctrl, { baseMight: 5 })
                        
    expect(handSize(run(scene('SFD-218', [strong('s')]), evConquer()))).toBe(1)
                                                                                                 
    expect(handSize(run(scene('SFD-218', [unit('w', P1, { baseMight: 4 })]), evConquer()))).toBe(0)
                                                                                   
    expect(handSize(run(scene('SFD-218', [strong('s')], 0), evConquer()))).toBe(0)
                                                                                    
                                                             
    expect(handSize(run(scene('SFD-218', [strong('es', P2)]), evConquer()))).toBe(0)
                         
    expect(handSize(run(scene('SFD-218',
      [unit('far', P1, { baseMight: 5, zone: asZoneId(BF1) })]), evConquer()))).toBe(0)
  })

  test('★符能矿脉 SFD-219:【每名玩家】各召出一枚,对手也拿', () => {
    const st = scene('SFD-219')
    const t = activeTriggers(st).find((y) => y.sourceDefId === 'SFD-219' && y.controller === P1)!
    const evs = t.effect(st, evHold(), {})
                                          
    expect(evs).toEqual([
      { kind: 'summonRune', player: P1, count: 1, dormant: true },
      { kind: 'summonRune', player: P2, count: 1, dormant: true },
    ])
  })
})

                                                                          
                                           
                           
                                                
                                                        
                                                
                                                   
                                     
                                                                          
describe('★867 雷霆之纹按现行文本:必须 ⇒ 非目标选取', () => {
  test('★★★结算期那一问不带 isTarget 标(选中的符文不被记为"目标")', () => {
    const st = scene('OGN-287', [], 3)
                                             
    const s = landAndEnqueueTriggers(st, [evConquer()], activeTriggers, P1, {})
    const item = s.chain.find((it) => it.sourceDefId === 'OGN-287')!
    expect(item, '★触发要真的入链').toBeDefined()
    const q = item.nextChoice!(s, {})
    expect(q, '★问还是要问的(结算时从自己的符文中选择一枚)').not.toBeNull()
    expect(q!.isTarget, '★§355.10.f 带「必须」⇒ 不视为目标选取,这一问不打目标标').toBeUndefined()
  })

  test('★卡文常量已是现行文本(勘误口径 A 的凭据)', () => {
    expect(OGN_287_CARD_EFFECT).toContain('你必须回收一枚你的符文')
  })
})
