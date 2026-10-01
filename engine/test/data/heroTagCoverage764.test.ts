                                 
  
                                                 
                                                          
                                                      
                                          
                                                          
  
                                                       
                                            
import { describe, expect, test } from 'vitest'
                                                                
import { CARD_FACTS } from '../../data/cardFacts'
import { CARD_CATEGORIES } from '../../data/cardCategories'
import { CARD_NAMES } from '../../data/cardNames'
import { deckFacts } from '../../data/registry'
import { DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

describe('★764 ① 每一张专属卡都必须有英雄标签', () => {
  const exclusives = Object.keys(CARD_FACTS).filter((no) => CARD_FACTS[no]?.exclusive === true)

  test('卡池里确实有专属卡(前提别被静默改没)', () => {
    expect(exclusives.length).toBeGreaterThan(40)
  })

  test('★没有一张专属卡的 heroTag 是空的', () => {
    const missing = exclusives.filter((no) => !deckFacts(no).heroTag).map((no) => `${no} ${CARD_NAMES[no] ?? ''}`)
    expect(missing).toEqual([])
  })

  test('委托人那张:〈奥义!雷铠〉VEN-156 → 凯南', () => {
    expect(deckFacts('VEN-156').heroTag).toBe('凯南')
    expect(deckFacts('VEN-156').exclusive).toBe(true)
  })

  test('它与凯南传奇〈狂暴之心〉标签一致(§103.2.d.2 判据本身)', () => {
    expect(deckFacts('VEN-155').heroTag).toBe(deckFacts('VEN-156').heroTag)
  })

  test('传奇也要有标签 —— 缺了会连锁影响"这副牌能放哪些专属卡"', () => {
    const legends = Object.keys(CARD_CATEGORIES).filter((no) => CARD_CATEGORIES[no] === 'legend')
    const missing = legends.filter((no) => !deckFacts(no).heroTag).map((no) => `${no} ${CARD_NAMES[no] ?? ''}`)
    expect(missing).toEqual([])
  })
})

describe('★764 ② 演示牌组里不许有占位卡', () => {
  const placeholders = new Set(['BLK', 'DEMO-BOLT'])

  for (const [label, deck] of [['混沌·黛安娜', DEMO_DECK_A], ['灵光·提莫', DEMO_DECK_B]] as const) {
    test(`${label}:主牌堆每一张都是真卡`, () => {
      const bad = deck.mainDeck.filter((id) => placeholders.has(id) || CARD_NAMES[id] === undefined)
      expect(bad).toEqual([])
    })
  }

  test('占位卡本身仍然存在 —— 测试脚手架还在用,别顺手删了', () => {
                                      
    expect(deckFacts('BLK')).toBeDefined()
  })
})
