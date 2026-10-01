import { describe, expect, test } from 'vitest'
import { encodeDeck, decodeDeck } from '../../src/game/deckCode'
import type { DeckDraft } from '../../src/game/deckDraft'
import { draftSummary } from '../../src/game/deckDraft'
import { deckFacts } from '../../data/registry'

                                    
                                           
                                                       

const sorted = (a: readonly string[]): string[] => [...a].sort()

describe('★往返一致', () => {
  test('全字段的牌组编码后再解码,逐项还原', () => {
    const d: DeckDraft = {
      mainDeck: ['OGN-121', 'OGN-121', 'OGN-121', 'SFD-138'],
      battlefields: ['OGN-280', 'UNL-214', 'OGN-288'],
      legend: 'UNL-197',
      hero: 'UNL-079',
      runeDeck: Array(12).fill('rune:purple'),
    }
    const r = decodeDeck(encodeDeck(d, '测试组'))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(sorted(r.draft.mainDeck)).toEqual(sorted(d.mainDeck))
    expect(r.draft.battlefields).toEqual(d.battlefields)
    expect(r.draft.legend).toBe('UNL-197')
    expect(r.draft.hero).toBe('UNL-079')
    expect(r.draft.runeDeck).toHaveLength(12)
    expect(r.name).toBe('测试组')
  })

  test('★异画卡号不被合并掉(按卡号聚合,不按名称)', () => {
                                           
    const d: DeckDraft = { mainDeck: ['OGN-121', 'SFD-230', 'SFD-230'], battlefields: [] }
    const r = decodeDeck(encodeDeck(d))
    expect(r.ok).toBe(true)
    if (r.ok) expect(sorted(r.draft.mainDeck)).toEqual(sorted(d.mainDeck))
  })

  test('空牌组也能往返', () => {
    const r = decodeDeck(encodeDeck({ mainDeck: [], battlefields: [] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.draft.mainDeck).toEqual([])
  })

  test('★没配符文的草稿 → 编出来没有符文行 → 解回来 runeDeck 仍是 undefined', () => {
                                                           
    const r = decodeDeck(encodeDeck({ mainDeck: ['A'], battlefields: [] }))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.draft.runeDeck).toBeUndefined()
  })

  test('★明写零张符文 → 解回来是空数组不是 undefined', () => {
    const r = decodeDeck('符文 purple x0\n1 A')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.draft.runeDeck).toEqual([])
  })
})

describe('★坏输入:报错而不是静默丢卡', () => {
  test('★认不得的行 → 整体失败,并给出行号与原文', () => {
    const r = decodeDeck('3 OGN-121\n这是一行胡话\n1 SFD-138')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]!.line).toBe(2)
    expect(r.errors[0]!.text).toBe('这是一行胡话')
  })

  test('★不是"能读多少读多少":有一行坏就不返回半副牌', () => {
    const r = decodeDeck('3 OGN-121\n???\n')
    expect(r.ok).toBe(false)                                
  })

  test('张数为 0 或负 → 报错', () => {
    expect(decodeDeck('0 OGN-121').ok).toBe(false)
  })

  test('空行与 // 注释被忽略', () => {
    const r = decodeDeck('\n// 这是注释\n\n2 OGN-121\n')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.draft.mainDeck).toHaveLength(2)
  })

  test('首行 # 当名称;后面再出现 # 不覆盖', () => {
    const r = decodeDeck('# 甲\n# 乙\n1 A')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.name).toBe('甲')
  })
})

describe('★与构筑校验的分工:解析成功 ≠ 牌组合法', () => {
  test('★违规牌组照样解析得出来,再由 deckDraft 说出违反了哪条', () => {
                                   
    const r = decodeDeck('4 VEN-043')
    expect(r.ok).toBe(true)         
    if (!r.ok) return
    const rules = draftSummary(r.draft, deckFacts).violations.map((v) => v.rule)
    expect(rules).toContain('§103.2.b')               
    expect(rules).toContain('§103.2')
  })

  test('导入一副真合法的牌组 → 校验层判它合法', () => {
    const distinct = Array.from({ length: 14 }, (_, i) => `FILLER-${i}`)
    const text = [
      '# 合法组',
      '战场 OGN-280', '战场 UNL-214', '战场 OGN-288',
      '符文 purple x12',
      ...distinct.map((id) => `3 ${id}`),
    ].join('\n')
    const r = decodeDeck(text)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.draft.mainDeck).toHaveLength(42)
    const s = draftSummary({ ...r.draft, mainDeck: r.draft.mainDeck.slice(0, 40) }, deckFacts)
    expect(s.violations).toEqual([])
  })
})
