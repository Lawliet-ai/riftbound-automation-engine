                          
  
                                              
                         
  
                                          
                                                                 
                                                                   
                                                             
                                                    
                                        
                               
                                               
                                                
import { describe, expect, test } from 'vitest'
import {
  emptyDraft, addToMain, canAddToMain,
  canAddRune, addToRune, removeFromRune, runeEntries,
  battlefieldEntries, removeBattlefield,
  type DeckDraft,
} from '../../src/game/deckDraft'
import { RUNE_DECK_SIZE } from '../../src/game/deckLegality'
import { deckFacts, runeIdOf } from '../../data/registry'

                                                                              
const RUNE_CARDS = ['OGN-007', 'OGN-042', 'OGN-089', 'OGN-126', 'OGN-166', 'OGN-214'] as const

describe('★769 ① 病灶复现:符文卡走主牌堆通道,第 4 张就被 §103.2.b 拦', () => {
  test('前三张能进主牌堆(所以委托人看到的是"只能加 3 张")', () => {
    let d: DeckDraft = emptyDraft()
    for (let i = 0; i < 3; i++) {
      expect(canAddToMain(d, 'OGN-007', deckFacts).ok, `第 ${i + 1} 张`).toBe(true)
      d = addToMain(d, 'OGN-007')
    }
    expect(d.mainDeck).toHaveLength(3)
  })

  test('★第 4 张被拦,拦它的正是同名上限 §103.2.b(不是符文的什么限制)', () => {
    let d: DeckDraft = emptyDraft()
    for (let i = 0; i < 3; i++) d = addToMain(d, 'OGN-007')
    const chk = canAddToMain(d, 'OGN-007', deckFacts)
    expect(chk.ok).toBe(false)
    expect(chk.blockedBy.map((v) => v.rule)).toContain('§103.2.b')
  })
})

describe('★769 ② 符文通道:一路加到 12,第 13 枚才拦', () => {
  test('归一化是 data 层的活儿:卡号 → rune:<色>', () => {
                                                             
                                                        
    expect(RUNE_CARDS.map((no) => runeIdOf(no))).toEqual([
      'rune:red', 'rune:green', 'rune:blue', 'rune:orange', 'rune:purple', 'rune:yellow',
    ])
  })

  test('★同一个色连加 12 枚全部放行(符文没有同名上限)', () => {
    let d: DeckDraft = emptyDraft()
    for (let i = 0; i < RUNE_DECK_SIZE; i++) {
      expect(canAddRune(d, 'rune:red', deckFacts).ok, `第 ${i + 1} 枚`).toBe(true)
      d = addToRune(d, 'rune:red')
    }
    expect(d.runeDeck).toHaveLength(RUNE_DECK_SIZE)
  })

  test('★第 13 枚被 §103.3.a 拦', () => {
    let d: DeckDraft = emptyDraft()
    for (let i = 0; i < RUNE_DECK_SIZE; i++) d = addToRune(d, 'rune:red')
    const chk = canAddRune(d, 'rune:red', deckFacts)
    expect(chk.ok).toBe(false)
    expect(chk.blockedBy.map((v) => v.rule)).toContain('§103.3.a')
  })

  test('★第一枚必须加得进去(before 把 undefined 当 [] 的那道保险)', () => {
                                                                 
                                                            
    const fresh = emptyDraft()
    expect(fresh.runeDeck).toBeUndefined()
    expect(canAddRune(fresh, 'rune:red', deckFacts).ok).toBe(true)
  })

  test('减一枚只减一份,减到零保留空数组(不退回 undefined)', () => {
    let d: DeckDraft = addToRune(addToRune(emptyDraft(), 'rune:red'), 'rune:blue')
    d = removeFromRune(d, 'rune:red')
    expect(d.runeDeck).toEqual(['rune:blue'])
    d = removeFromRune(d, 'rune:blue')
    expect(d.runeDeck).toEqual([])                                      
  })
})

describe('★769 ③ 顺带接上 §103.3.a.1:符文须符合传奇的符文特性', () => {
                                                     
  const legendDomains = deckFacts('FND-249').domains ?? []

  test('前提自证:这张传奇确实是双色 red/orange', () => {
    expect([...legendDomains].sort()).toEqual(['orange', 'red'])
  })

  test('★传奇特性内的符文放行', () => {
    const d: DeckDraft = { ...emptyDraft(), legend: 'FND-249' }
    expect(canAddRune(d, 'rune:red', deckFacts).ok).toBe(true)
    expect(canAddRune(d, 'rune:orange', deckFacts).ok).toBe(true)
  })

  test('★传奇特性外的符文被 §103.3.a.1 拦(此前界面上的 +green 照加不误)', () => {
    const d: DeckDraft = { ...emptyDraft(), legend: 'FND-249' }
    const chk = canAddRune(d, 'rune:green', deckFacts)
    expect(chk.ok).toBe(false)
    expect(chk.blockedBy.map((v) => v.rule)).toContain('§103.3.a.1')
  })
})

describe('★769 ④ 牌组面板分组要用的聚合清单', () => {
  test('符文按名称聚合出张数', () => {
    let d: DeckDraft = emptyDraft()
    for (let i = 0; i < 8; i++) d = addToRune(d, 'rune:red')
    for (let i = 0; i < 4; i++) d = addToRune(d, 'rune:blue')
    const rows = runeEntries(d, deckFacts)
    expect(rows.map((r) => r.count).reduce((a, b) => a + b, 0)).toBe(12)
    expect(rows.find((r) => r.defId === 'rune:red')?.count).toBe(8)
    expect(rows.find((r) => r.defId === 'rune:blue')?.count).toBe(4)
  })

  test('战场聚合与按卡号移除', () => {
    const d: DeckDraft = { ...emptyDraft(), battlefields: ['OGN-280', 'OGN-281'] }
    expect(battlefieldEntries(d, deckFacts)).toHaveLength(2)
    expect(removeBattlefield(d, 'OGN-280').battlefields).toEqual(['OGN-281'])
    expect(removeBattlefield(d, '不在里面').battlefields).toEqual(['OGN-280', 'OGN-281'])
  })

  test('★分组判据只认引擎的 deckFacts(...).kind —— ui 侧不许另写一套', () => {
                                                
                               
    expect(deckFacts('OGN-121').kind).toBe('unit')
    expect(deckFacts('OGN-004').kind).toBe('spell')
    expect(deckFacts('OGN-101').kind).toBe('equipment')
    expect(deckFacts('OGN-280').kind).toBe('battlefield')
    expect(deckFacts('FND-249').kind).toBe('legend')
    expect(deckFacts('rune:red').kind).toBe('rune')
  })
})
