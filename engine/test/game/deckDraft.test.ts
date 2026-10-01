import { describe, expect, test } from 'vitest'
import {
  emptyDraft, addToMain, removeFromMain, canAddToMain, canAddBattlefield,
  draftEntries, draftSummary, draftToDeck, costCurve, CURVE_MAX, type DeckDraft,
} from '../../src/game/deckDraft'
import { setupGame, OPENING_HAND } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { DEMO_DECK_A, specLookup } from '../../data/decks'
import type { CardFacts } from '../../src/game/deckLegality'
import { validateDeck, cardFacts, deckFacts } from '../../data/registry'

                                   
                                 

const FACTS: Readonly<Record<string, CardFacts>> = {
  A: { name: '普通卡甲' },
  B: { name: '普通卡乙' },
  SOLO: { name: '唯我卡', solitary: true },
  EX1: { name: '专属一', exclusive: true, heroTag: '黛安娜' },
  EX2: { name: '专属二', exclusive: true, heroTag: '黛安娜' },
  EX3: { name: '专属三', exclusive: true, heroTag: '黛安娜' },
  EX4: { name: '专属四', exclusive: true, heroTag: '黛安娜' },
  EXOTHER: { name: '别家专属', exclusive: true, heroTag: '亚索' },
  LEG: { name: '传奇·皎月', heroTag: '黛安娜' },
  BF1: { name: '战场甲' },
  BF2: { name: '战场乙' },
                                   
  'A-ALT': { name: '普通卡甲' },
}
const facts = (id: string): CardFacts | undefined => FACTS[id]
const withMain = (ids: readonly string[], rest: Partial<DeckDraft> = {}): DeckDraft =>
  ({ ...emptyDraft(), mainDeck: [...ids], ...rest })

describe('§103.2.b 同名上限:第 4 张加不进去', () => {
  test('已有 3 张同名 → canAdd 为 false 并说明是哪条规则', () => {
    const d = withMain(['A', 'A', 'A'])
    const r = canAddToMain(d, 'A', facts)
    expect(r.ok).toBe(false)
    expect(r.blockedBy[0]?.rule).toBe('§103.2.b')
  })

  test('第 3 张仍可加', () => {
    expect(canAddToMain(withMain(['A', 'A']), 'A', facts).ok).toBe(true)
  })

  test('★异画卡号不同但同名 → 照样算同一张(§132.4)', () => {
    const d = withMain(['A', 'A', 'A'])
    expect(canAddToMain(d, 'A-ALT', facts).ok).toBe(false)
  })

  test('不同名的卡不受影响', () => {
    expect(canAddToMain(withMain(['A', 'A', 'A']), 'B', facts).ok).toBe(true)
  })
})

describe('§825.3.a [唯我]:每副只能一张', () => {
  test('第 2 张唯我卡加不进去,报的是 §825.3.a 不是同名上限', () => {
    const r = canAddToMain(withMain(['SOLO']), 'SOLO', facts)
    expect(r.ok).toBe(false)
    expect(r.blockedBy[0]?.rule).toBe('§825.3.a')
  })

  test('第 1 张可加', () => {
    expect(canAddToMain(emptyDraft(), 'SOLO', facts).ok).toBe(true)
  })
})

describe('§103.2.d 专属卡', () => {
  test('专属总数已 3 张 → 第 4 张加不进(不论名称)', () => {
    const r = canAddToMain(withMain(['EX1', 'EX2', 'EX3'], { legend: 'LEG' }), 'EX4', facts)
    expect(r.ok).toBe(false)
    expect(r.blockedBy.some((v) => v.rule === '§103.2.d.1')).toBe(true)
  })

  test('★英雄标签与传奇不符的专属卡加不进(§103.2.d.2)', () => {
    const r = canAddToMain(withMain([], { legend: 'LEG' }), 'EXOTHER', facts)
    expect(r.ok).toBe(false)
    expect(r.blockedBy.some((v) => v.rule === '§103.2.d.2')).toBe(true)
  })
})

describe('§103.4.c 战场不得同名重复', () => {
  test('同名战场第二张加不进', () => {
    const d: DeckDraft = { ...emptyDraft(), battlefields: ['BF1'] }
    expect(canAddBattlefield(d, 'BF1', facts).ok).toBe(false)
    expect(canAddBattlefield(d, 'BF2', facts).ok).toBe(true)
  })
})

describe('★差分实现的两条关键性质(它们正是"另写一套规则"会做错的地方)', () => {
  test('★40 张下限【不】影响"这张能不能加":空牌组照样加得进去', () => {
                                                   
                                           
    const s = draftSummary(emptyDraft(), facts)
    expect(s.legal).toBe(false)           
    expect(canAddToMain(emptyDraft(), 'A', facts).ok).toBe(true)         
  })

  test('★牌组已有【无关的】违规时,不会把合法添加也拦住', () => {
                                    
    const dirty = withMain(['A', 'A', 'A', 'A'])
    expect(draftSummary(dirty, facts).violations.length).toBeGreaterThan(0)
    expect(canAddToMain(dirty, 'B', facts).ok).toBe(true)
                  
    expect(canAddToMain(dirty, 'A', facts).ok).toBe(false)
  })
})

describe('增删与聚合', () => {
  test('removeFromMain 只移一份,不是同名全清', () => {
    expect(removeFromMain(withMain(['A', 'A', 'B']), 'A').mainDeck).toEqual(['A', 'B'])
  })

  test('移除不存在的卡 → 原样返回', () => {
    const d = withMain(['A'])
    expect(removeFromMain(d, 'B')).toBe(d)
  })

  test('★清单按【名称】聚合:异画与正画合并成一行 2 张', () => {
    const e = draftEntries(withMain(['A', 'A-ALT']), facts)
    expect(e).toHaveLength(1)
    expect(e[0]!.count).toBe(2)
  })

  test('addToMain 不改原草稿(不可变)', () => {
    const d = withMain(['A'])
    const d2 = addToMain(d, 'B')
    expect(d.mainDeck).toEqual(['A'])
    expect(d2.mainDeck).toEqual(['A', 'B'])
  })

  test('summary 的 needed 是距 40 张的差额,够了就是 0', () => {
    expect(draftSummary(withMain(Array(10).fill('A')), facts).needed).toBe(30)
    expect(draftSummary(withMain(Array(40).fill('A')), facts).needed).toBe(0)
  })
})

describe('★与真 registry 对接:构筑界面用的是【同一套】校验', () => {
  test('draftSummary 的违规清单与 validateDeck 逐条一致(真卡号)', () => {
                                         
    const d = withMain(['VEN-043', 'VEN-043', 'VEN-043', 'VEN-043'])
    const mine = draftSummary(d, cardFacts).violations
    const authoritative = validateDeck({ mainDeck: d.mainDeck, battlefields: [] })
    expect(mine).toEqual(authoritative)                  
  })

  test('真卡号下 canAdd 也说得出理由', () => {
    const d = withMain(['VEN-043', 'VEN-043', 'VEN-043'])
    const r = canAddToMain(d, 'VEN-043', cardFacts)
    expect(r.ok).toBe(false)
    expect(r.blockedBy[0]?.detail).toContain('同名最多')
  })
})

                                                            
describe('★draftToDeck:不合法就不给开局', () => {
  test('违规草稿被拒,并把违规原样带出来', () => {
    const r = draftToDeck(withMain(['A']), facts, '半成品')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.violations.map((v) => v.rule)).toContain('§103.2')
  })

  test('★合法草稿 → 拿得到可开局的 Deck,字段逐项对上', () => {
                                                                   
                                   
    const filler = Array.from({ length: 40 }, (_, i) => `F${i}`)
    const d: DeckDraft = {
      mainDeck: filler,
      battlefields: ['BF1', 'BF2', 'BFX'],
      runeDeck: Array(12).fill('rune:green'),
      legend: 'LEG',
    }
                                                    
    expect(draftSummary(d, facts).legal).toBe(true)
    const r = draftToDeck(d, facts, '测试组')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.deck.name).toBe('测试组')
      expect(r.deck.mainDeck).toHaveLength(40)
      expect(r.deck.runeDeck).toHaveLength(12)
      expect(r.deck.battlefields).toHaveLength(3)
      expect(r.deck.legend).toBe('LEG')
    }
  })

  test('★不信界面上一次的校验结果:draftToDeck 自己【再校验一遍】', () => {
                                        
                        
    const d: DeckDraft = {
      mainDeck: ['SOLO', 'SOLO', ...Array.from({ length: 38 }, (_, i) => `G${i}`)],
      battlefields: ['BF1', 'BF2', 'BFX'],
      runeDeck: Array(12).fill('rune:green'),
    }
    const r = draftToDeck(d, facts, 'x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.violations.map((v) => v.rule)).toContain('§825.3.a')              
  })
})

describe('★闭环:构建器出的牌组真的能开起局来', () => {
  test('用【真卡号+真 registry】走完 draftToDeck → setupGame,双方手牌各 4 张', () => {
                                                         
                                              
                                      
    const distinct = [...new Set(DEMO_DECK_A.mainDeck)]
    const mainDeck = distinct.flatMap((id) => [id, id, id]).slice(0, 40)
    const draft: DeckDraft = {
      mainDeck,
      battlefields: [...DEMO_DECK_A.battlefields],
      runeDeck: Array(12).fill('rune:purple'),
    }
    const r = draftToDeck(draft, deckFacts, '闭环测试组')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { state } = setupGame(r.deck, r.deck, specLookup, makeRng(7))
    expect(state.zones['hand:P1']!.contents).toHaveLength(OPENING_HAND)
    expect(state.zones['hand:P2']!.contents).toHaveLength(OPENING_HAND)
                                      
    expect(Object.values(state.zones).filter((z) => z.kind === 'battlefield').length).toBeGreaterThan(0)
  })
})

describe('★双方用【不同】牌组开局:两副真的分开进各自的牌堆', () => {
  test('P1 只拿得到 A 组的卡,P2 只拿得到 B 组的卡', () => {
    const mk = (id: string): DeckDraft => ({
      mainDeck: Array.from({ length: 40 }, (_, i) => `${id}-${i}`), // 互不同名,免得撞 §103.2.b
      battlefields: [...DEMO_DECK_A.battlefields],
      runeDeck: Array(12).fill('rune:purple'),
    })
    const a = draftToDeck(mk('AAA'), facts, 'A组')
    const b = draftToDeck(mk('BBB'), facts, 'B组')
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    const { state } = setupGame(a.deck, b.deck, specLookup, makeRng(11))
    const defIdsIn = (zone: string): string[] =>
      (state.zones[zone]?.contents ?? []).map((oid) => state.objects[oid]?.defId ?? '')
    const p1 = [...defIdsIn('mainDeck:P1'), ...defIdsIn('hand:P1')]
    const p2 = [...defIdsIn('mainDeck:P2'), ...defIdsIn('hand:P2')]
    expect(p1.every((d) => d.startsWith('AAA-'))).toBe(true)
    expect(p2.every((d) => d.startsWith('BBB-'))).toBe(true)
                                               
    expect(p1.length).toBeGreaterThan(0)
    expect(p2.length).toBeGreaterThan(0)
  })
})

describe('★费用曲线:查不到费用的卡绝不能算进 0 费', () => {
  const energy: Record<string, number> = { A: 0, B: 1, C: 1, D: 3, E: 7, F: 9 }
  const energyOf = (id: string): number | undefined => energy[id]

  test('按费用分格,0..7 每格都在(空格也给 0,曲线才画得出形状)', () => {
    const c = costCurve(withMain(['A', 'B', 'C', 'D']), energyOf)
    expect(c.buckets).toHaveLength(CURVE_MAX + 1)
    expect(c.buckets[0]!.count).toBe(1)        
    expect(c.buckets[1]!.count).toBe(2)          
    expect(c.buckets[3]!.count).toBe(1)
    expect(c.buckets[2]!.count).toBe(0)
  })

  test('★7 及以上并进最后一格', () => {
    const c = costCurve(withMain(['E', 'F']), energyOf)         
    expect(c.buckets[CURVE_MAX]!.count).toBe(2)
  })

  test('★查不到费用的卡进 unknown,【不是】0 费格', () => {
    const c = costCurve(withMain(['A', 'NOPE', 'NOPE']), energyOf)
    expect(c.unknown).toBe(2)
    expect(c.buckets[0]!.count).toBe(1)                         
  })

  test('总数 = 各格之和 + unknown(对得上账才敢显示)', () => {
    const c = costCurve(withMain(['A', 'B', 'NOPE']), energyOf)
    const sum = c.buckets.reduce((n, b) => n + b.count, 0)
    expect(sum + c.unknown).toBe(c.total)
    expect(c.total).toBe(3)
  })

  test('空牌组 → 全零,不报错', () => {
    const c = costCurve(emptyDraft(), energyOf)
    expect(c.total).toBe(0)
    expect(c.buckets.every((b) => b.count === 0)).toBe(true)
  })
})
