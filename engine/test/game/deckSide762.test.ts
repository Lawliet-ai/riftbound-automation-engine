import { describe, expect, test } from 'vitest'
import {
  checkDeckLegality,
  MAX_SIDE_DECK,
  MIN_MAIN_DECK,
  SIDE_FORBIDDEN_KINDS,
  type CardFacts,
  type DeckToCheck,
} from '../../src/game/deckLegality'
import { draftSummary, draftToDeck, addToSide, removeFromSide, canAddToSide, sideEntries, type DeckDraft } from '../../src/game/deckDraft'
import { decodeDeck, encodeDeck } from '../../src/game/deckCode'
import { deckFacts } from '../../data/registry'

                                  
  
                                               
                                       
                                      
                                                         
                                                  
                                        
                                                     
  
                                          
                                                       

                                      
const filler = (n: number, prefix = 'F'): string[] => Array.from({ length: n }, (_, i) => `${prefix}${i}`)

const FACTS: Readonly<Record<string, CardFacts>> = {
  LEGEND: { name: '皎月女神', heroTag: '黛安娜', domains: ['purple'], kind: 'legend' },
  SPELL: { name: '月落', kind: 'spell' },
  GEAR: { name: '月刃武装', kind: 'equipment' },
  SOLO: { name: '炉火斗篷', solitary: true, kind: 'unit' },
  SPIDER: { name: '小蜘蛛', anyNumber: true, kind: 'unit' },
  EXCL: { name: '月刃', exclusive: true, heroTag: '黛安娜', kind: 'unit' },
  OFFCOLOR: { name: '烈焰兵', domains: ['red'], kind: 'unit' },
                                         
  BF_CARD: { name: '帝柳之林', kind: 'battlefield' },
  LEGEND_CARD: { name: '不灭狂雷', kind: 'legend' },
  RUNE_CARD: { name: '符文·purple', domains: ['purple'], kind: 'rune' },
}
const facts = (id: string): CardFacts | undefined =>
  FACTS[id] ?? (id.startsWith('F') ? { name: `填充${id}`, kind: 'unit' } : undefined)

const base = (over: Partial<DeckToCheck> = {}): DeckToCheck => ({
  mainDeck: filler(MIN_MAIN_DECK),
  battlefields: ['BF1', 'BF2', 'BF3'], // §485.4.a 1v1 每人提供三个战场
  legend: 'LEGEND',
  ...over,
})
const rules = (d: DeckToCheck): string[] => checkDeckLegality(d, facts).map((v) => v.rule)

describe('★762 赛规 §601.1.c.1 备牌张数上限', () => {
  test('10 张备牌:合法(条文是"10张或更少",不是"必须凑满")', () => {
    expect(rules(base({ side: filler(MAX_SIDE_DECK, 'S') }))).toEqual([])
  })

  test('🔴 11 张备牌 → 赛规 §601.1.c.1', () => {
    const v = checkDeckLegality(base({ side: filler(11, 'S') }), facts)
    expect(v.map((x) => x.rule)).toContain('§601.1.c.1')      
    expect(v.find((x) => x.rule === '§601.1.c.1')?.excess).toBe(1)      
  })

  test('★超得更多 → excess 变大(构筑界面靠它拦"已经超了还继续加")', () => {
    const of = (n: number): number | undefined =>
      checkDeckLegality(base({ side: filler(n, 'S') }), facts).find((x) => x.rule === '§601.1.c.1')?.excess      
    expect(of(12)).toBe(2)
    expect(of(15)).toBe(5)
  })

  test('MAX_SIDE_DECK 就是条文里的 10', () => {
    expect(MAX_SIDE_DECK).toBe(10)
  })
})

describe('★762 赛规 §601.1.c.2 备牌中仅可包含主牌堆内也有效的卡牌', () => {
                                          
                                                        
  test('🔴 备牌里放战场 → 赛规 §601.1.c.2,且违规指名到这张牌', () => {
    const v = checkDeckLegality(base({ side: ['BF_CARD'] }), facts)
    const hit = v.find((x) => x.rule === '§601.1.c.2')      
    expect(hit).toBeDefined()
    expect(hit?.subject).toBe('帝柳之林')
  })

  test('🔴 备牌里放传奇 → 赛规 §601.1.c.2', () => {
    expect(rules(base({ side: ['LEGEND_CARD'] }))).toContain('§601.1.c.2')      
  })

  test('🔴 备牌里放符文 → 赛规 §601.1.c.2', () => {
    expect(rules(base({ side: ['RUNE_CARD'] }))).toContain('§601.1.c.2')      
  })

  test('单位 / 法术 / 装备进备牌:合法(这三类主牌堆装得下)', () => {
    expect(rules(base({ side: ['F0', 'SPELL', 'GEAR'] }))).toEqual([])
  })

  test('★同一张战场在备牌里放三份 = 一个错,不是三个错(按名称去重)', () => {
    const v = checkDeckLegality(base({ side: ['BF_CARD', 'BF_CARD', 'BF_CARD'] }), facts)
    expect(v.filter((x) => x.rule === '§601.1.c.2')).toHaveLength(1)      
  })

  test('★查不到类别的卡【放行】——宁可漏报也不误报(卡库不全时误报会把合法牌组判死)', () => {
    const noKind = (id: string): CardFacts | undefined =>
      id === 'X' ? { name: '不认识的卡' } : facts(id)
    expect(checkDeckLegality(base({ side: ['X'] }), noKind).map((v) => v.rule)).not.toContain('§601.1.c.2')      
  })

  test('禁放的三类就是 战场/传奇/符文', () => {
    expect([...SIDE_FORBIDDEN_KINDS].sort()).toEqual(['battlefield', 'legend', 'rune'])
  })
})

describe('★762 §403.3 / 赛规 §601.1.c.3 同名限张:主牌堆与备牌【统一计算】', () => {
  const dup = (id: string): CardFacts | undefined =>
    id === 'D' ? { name: '亚索 - 迷途怅惘', kind: 'unit' } : facts(id)

  test('🔴 主 3 张 + 备 1 张同名 = 4 张 → §103.2.b(单看主牌堆是合法的,这就是本条的意义)', () => {
    const d = base({ mainDeck: [...filler(37), 'D', 'D', 'D'], side: ['D'] })
    expect(checkDeckLegality(d, dup).map((v) => v.rule)).toContain('§103.2.b')
                           
    expect(checkDeckLegality({ ...d, side: undefined }, dup)).toEqual([])
  })

  test('主 2 张 + 备 1 张 = 3 张:合法(恰好卡在上限)', () => {
    const d = base({ mainDeck: [...filler(38), 'D', 'D'], side: ['D'] })
    expect(checkDeckLegality(d, dup)).toEqual([])
  })

  test('🔴 §825.3.a 唯我也吃统一计算:主 1 张 + 备 1 张 → 违规', () => {
    const d = base({ mainDeck: [...filler(39), 'SOLO'], side: ['SOLO'] })
    const v = checkDeckLegality(d, facts)
    expect(v.map((x) => x.rule)).toContain('§825.3.a')
    expect(v.find((x) => x.rule === '§825.3.a')?.excess).toBe(1)
  })

  test('§825.3.a 唯我:主 1 张 + 备牌不放,仍然合法', () => {
    expect(rules(base({ mainDeck: [...filler(39), 'SOLO'], side: [] }))).toEqual([])
  })

  test('★第510轮「可以包含任意数量」的豁免跨主备照样有效(主3+备3 的小蜘蛛)', () => {
    const d = base({ mainDeck: [...filler(37), 'SPIDER', 'SPIDER', 'SPIDER'], side: ['SPIDER', 'SPIDER', 'SPIDER'] })
    expect(checkDeckLegality(d, facts)).toEqual([])
  })
})

describe('★762 【不】跟着改口径的那些', () => {
  test('🔴 §103.2 的 40 张下限只数主牌堆:主 35 + 备 5 仍然违规', () => {
                                                           
                                             
    const v = checkDeckLegality(base({ mainDeck: filler(35), side: filler(5, 'S') }), facts)
    expect(v.map((x) => x.rule)).toContain('§103.2')
    expect(v.find((x) => x.rule === '§103.2')?.excess).toBe(5)
  })

  test('★边界标记(不是规则主张):§103.2.d.1 专属卡总数本轮仍只数主牌堆', () => {
                                                 
                                                 
    const d = base({ mainDeck: [...filler(37), 'EXCL', 'EXCL', 'EXCL'], side: ['EXCL', 'EXCL'] })
    expect(checkDeckLegality(d, facts).map((v) => v.rule)).not.toContain('§103.2.d.1')
  })
})

describe('★762 §103.2.c 符文特性:备牌也得是这副牌放得下的卡', () => {
  test('🔴 备牌里放不符合传奇符文特性的卡 → §103.2.c', () => {
    const v = checkDeckLegality(base({ side: ['OFFCOLOR'] }), facts)
    const hit = v.find((x) => x.rule === '§103.2.c')
    expect(hit).toBeDefined()
    expect(hit?.subject).toBe('烈焰兵')
  })

  test('★主备各放一张同名的异色卡 → 只报一条(rule+subject 是违规的身份,重复条目会骗过差分)', () => {
    const d = base({ mainDeck: [...filler(39), 'OFFCOLOR'], side: ['OFFCOLOR'] })
    expect(checkDeckLegality(d, facts).filter((v) => v.rule === '§103.2.c')).toHaveLength(1)
  })
})

describe('★762 老存档:没有 side 字段时行为一个字都不变', () => {
  test('不传 side → 一条 赛规 §601 违规都不报(undefined = 没管备牌,不校验)', () => {
    expect(rules(base())).toEqual([])
    expect(rules(base({ side: undefined }))).toEqual([])
  })

  test('★undefined 与 [] 分得开:空数组 = 明写零张,同样合法但语义不同', () => {
    expect(rules(base({ side: [] }))).toEqual([])
                                                    
    expect(encodeDeck({ mainDeck: [], battlefields: [], side: [] })).toContain('备牌:')
    expect(encodeDeck({ mainDeck: [], battlefields: [] })).not.toContain('备牌:')
  })

  test('★不传 side 时同名仍然只数主牌堆(逐条比对改造前后的违规清单)', () => {
    const dup = (id: string): CardFacts | undefined =>
      id === 'D' ? { name: '亚索 - 迷途怅惘', kind: 'unit' } : facts(id)
    const four = base({ mainDeck: [...filler(36), 'D', 'D', 'D', 'D'] })
    const v = checkDeckLegality(four, dup)
    expect(v).toHaveLength(1)
    expect(v[0]!.rule).toBe('§103.2.b')
    expect(v[0]!.excess).toBe(1)
  })
})

describe('★762 编解码:备牌能存下来、往返一致', () => {
  const sorted = (a: readonly string[] | undefined): string[] => [...(a ?? [])].sort()

  test('★带备牌的牌组编码后再解码,主备两侧都逐项还原', () => {
    const d: DeckDraft = {
      mainDeck: ['OGN-121', 'OGN-121', 'OGN-121', 'SFD-138'],
      battlefields: ['OGN-280', 'UNL-214', 'OGN-288'],
      legend: 'UNL-197',
      hero: 'UNL-079',
      runeDeck: Array(12).fill('rune:purple'),
      side: ['VEN-043', 'VEN-043', 'SFD-138'],
    }
    const r = decodeDeck(encodeDeck(d, '带备牌的组'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(sorted(r.draft.mainDeck)).toEqual(sorted(d.mainDeck))
    expect(sorted(r.draft.side)).toEqual(sorted(d.side))
    expect(r.draft.runeDeck).toHaveLength(12)
    expect(r.draft.legend).toBe('UNL-197')
    expect(r.draft.hero).toBe('UNL-079')
    expect(r.name).toBe('带备牌的组')
  })

  test('★备牌段排在最后,不会把主牌堆的尾巴吞进去', () => {
    const d: DeckDraft = { mainDeck: ['A', 'B'], battlefields: [], side: ['C'] }
    const text = encodeDeck(d)
    expect(text.indexOf('备牌:')).toBeGreaterThan(text.indexOf('1 B'))
    const r = decodeDeck(text)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(sorted(r.draft.mainDeck)).toEqual(['A', 'B'])
      expect(r.draft.side).toEqual(['C'])
    }
  })

  test('★没配备牌的草稿 → 编出来没有备牌段 → 解回来 side 仍是 undefined(老存档不被吃掉)', () => {
    const r = decodeDeck(encodeDeck({ mainDeck: ['A'], battlefields: [] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.draft.side).toBeUndefined()
  })

  test('★明写零张备牌 → 解回来是空数组不是 undefined', () => {
    const r = decodeDeck(encodeDeck({ mainDeck: ['A'], battlefields: [], side: [] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.draft.side).toEqual([])
  })

  test('★英文段标题 Sideboard: 同样认;段里的张数行进备牌', () => {
    const r = decodeDeck('3 OGN-121\nSideboard:\n2 VEN-043')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.draft.mainDeck).toHaveLength(3)
    expect(r.draft.side).toEqual(['VEN-043', 'VEN-043'])
  })

  test('★备牌段之后再出现别的段标题 → 切回主牌堆', () => {
    const r = decodeDeck('备牌:\n1 A\nMain:\n2 B')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.draft.side).toEqual(['A'])
    expect(r.draft.mainDeck).toEqual(['B', 'B'])
  })

  test('★备牌里写了张战场 → 原样收进 side 交给校验层报,【不】被"好心"挪进 battlefields', () => {
                                        
    const opts = { kindOf: (id: string) => (id === 'OGN-280' ? 'battlefield' : 'unit') }
    const r = decodeDeck('备牌:\n1 OGN-280', opts)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.draft.battlefields).toEqual([])
    expect(r.draft.side).toEqual(['OGN-280'])
                                       
    expect(draftSummary(r.draft, deckFacts).violations.map((v) => v.rule)).toContain('§601.1.c.2')      
  })

  test('★不再有「备牌N张已忽略」这条 warning(备牌是真解析出来的)', () => {
    const r = decodeDeck('备牌:\n2 VEN-043')
    expect(r.ok).toBe(true)
    if (r.ok) expect('warnings' in r).toBe(false)
  })
})

describe('★762 草稿层与开局:side 到得了校验,进不了 Deck', () => {
  test('DeckDraft.side 透传到校验(draftSummary 能报 赛规 §601.1.c.1)', () => {
    const d: DeckDraft = { mainDeck: filler(MIN_MAIN_DECK), battlefields: ['BF1', 'BF2', 'BF3'], legend: 'LEGEND', side: filler(11, 'S') }
    expect(draftSummary(d, facts).violations.map((v) => v.rule)).toContain('§601.1.c.1')      
    expect(draftSummary(d, facts).legal).toBe(false)
  })

  test('★备牌【不进 Deck】:换备牌发生在开局前,内核收到的就是换完的 40 张', () => {
    const d: DeckDraft = {
      mainDeck: filler(MIN_MAIN_DECK),
      battlefields: ['BF1', 'BF2', 'BF3'],
      legend: 'LEGEND',
      runeDeck: Array(12).fill('rune:purple'),
      side: ['F0', 'SPELL'],
    }
    const built = draftToDeck(d, facts, '带备牌的组')
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect('side' in built.deck).toBe(false)
    expect(built.deck.mainDeck).toHaveLength(MIN_MAIN_DECK)
  })

  test('🔴 备牌违规 → 开不了局(draftToDeck 拒绝,不是只在界面上飘红字)', () => {
    const d: DeckDraft = {
      mainDeck: filler(MIN_MAIN_DECK),
      battlefields: ['BF1', 'BF2', 'BF3'],
      legend: 'LEGEND',
      runeDeck: Array(12).fill('rune:purple'),
      side: filler(11, 'S'),
    }
    const built = draftToDeck(d, facts, '超量备牌')
    expect(built.ok).toBe(false)
    if (!built.ok) expect(built.violations.map((v) => v.rule)).toContain('§601.1.c.1')      
  })
})

describe('★762 真卡数据:赛规 §601.1.c.2 不是一条没有数据源的死校验', () => {
  test('deckFacts 给得出类别(战场 / 传奇 / 符文 / 单位)', () => {
    expect(deckFacts('OGN-280').kind).toBe('battlefield')      
    expect(deckFacts('UNL-197').kind).toBe('legend')      
    expect(deckFacts('rune:purple').kind).toBe('rune')           
    expect(deckFacts('OGN-121').kind).toBe('unit')
  })

  test('🔴 拿真卡号往备牌里塞战场 → 赛规 §601.1.c.2', () => {
    const d: DeckDraft = { mainDeck: [], battlefields: [], side: ['OGN-280'] }
    expect(draftSummary(d, deckFacts).violations.map((v) => v.rule)).toContain('§601.1.c.2')      
  })
})

   
                             
                                                   
                                                
   
describe('★763 备牌增删 API', () => {
  test('addToSide:undefined → 数组', () => {
    const d = base({})
    expect(d.side).toBeUndefined()
    expect(addToSide(d, 'X').side).toEqual(['X'])
  })

  test('addToSide 累加,同一张可以放多份(受 §403.3 同名上限管,不是这里管)', () => {
    let d = addToSide(base({}), 'X')
    d = addToSide(d, 'X')
    expect(d.side).toEqual(['X', 'X'])
  })

  test('removeFromSide 只移一份', () => {
    const d = removeFromSide({ ...base({}), side: ['X', 'X', 'Y'] }, 'X')
    expect(d.side).toEqual(['X', 'Y'])
  })

  test('★减到零保留空数组,不退回 undefined', () => {
    const d = removeFromSide({ ...base({}), side: ['X'] }, 'X')
    expect(d.side).toEqual([])
    expect(d.side).not.toBeUndefined()
  })

  test('removeFromSide:不在备牌里 / 压根没备牌,都原样返回', () => {
    expect(removeFromSide({ ...base({}), side: ['Y'] }, 'X').side).toEqual(['Y'])
    expect(removeFromSide(base({}), 'X').side).toBeUndefined()
  })

  test('canAddToSide:满 10 张之后加不进第 11 张(赛规 §601.1.c.1)', () => {
    const d = { ...base({}), side: filler(MAX_SIDE_DECK, 'S') }
    const chk = canAddToSide(d, 'S99', facts)
    expect(chk.ok).toBe(false)
    expect(chk.blockedBy.map((v) => v.rule)).toContain('§601.1.c.1')      
  })

  test('canAddToSide:战场进不了备牌(赛规 §601.1.c.2)', () => {
                                                          
                                                           
    const chk = canAddToSide(base({}), 'BF_CARD', facts)
    expect(chk.ok).toBe(false)
    expect(chk.blockedBy.map((v) => v.rule)).toContain('§601.1.c.2')      
  })

  test('★本来就不合法的牌组,照样能往备牌里加(差值判据,不是绝对判据)', () => {
                                                    
    const broken = { ...base({}), mainDeck: ['F0'] }
    expect(canAddToSide(broken, 'S1', facts).ok).toBe(true)
  })

  test('sideEntries 按名称聚合,与主牌堆同一套口径', () => {
    const d = { ...base({}), side: ['F0', 'F0', 'F1'] }
    const e = sideEntries(d, facts)
    expect(e.reduce((a, x) => a + x.count, 0)).toBe(3)
    expect(e.length).toBe(2)
  })
})
