import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../../src/state/ids'
import { cardKeywords, cardKind, deckFacts } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { setupGame, type Deck } from '../../src/game/setup'
import { controlledRuneCount } from '../../src/game/economy'
import { makeRng } from '../../src/util/rng'
import {
  RUNE_CARD_COLORS, RUNE_CARD_DEFIDS, TOKEN_UNIT_DEFIDS,
  normalizeRuneEntry, runeDeckOf, OGN_274, OGN_274_KEYWORDS,
} from '../../data/cards/token-cards-535'

                                                                      
  
                                
                                                                      
                             
  
                                        
                                                        
const P1 = asPlayerId('P1')

describe('★ 前提:十张的卡面', () => {
  test('★六张符文六个色,类别是 rune', () => {
    expect(RUNE_CARD_DEFIDS).toHaveLength(6)
    expect(Object.values(RUNE_CARD_COLORS).slice().sort())
      .toEqual(['blue', 'green', 'orange', 'purple', 'red', 'yellow'])
    for (const id of RUNE_CARD_DEFIDS) {
      expect(cardKind(id), `${id} 的类别`).toBe('rune')
    }
  })

  test('🔴🔴★★★★★★符文的 §178 类型是 rune —— 这才是 `Card.category` 真正承重的地方', () => {
                                                                    
                                                                          
                                                                              
                                                         
    for (const id of RUNE_CARD_DEFIDS) {
      expect(specLookup(id).baseTypes, `${id} 的 §178 类型`).toEqual(['rune'])
    }
                                    
    expect(specLookup('OGN-271').baseTypes).toEqual(['unit'])
  })

  test('★四张指示物:三只随从 1[S]、精灵 3[S]', () => {
    expect(TOKEN_UNIT_DEFIDS).toEqual(['OGN-271', 'OGN-272', 'OGN-273', 'OGN-274'])
    for (const id of ['OGN-271', 'OGN-272', 'OGN-273']) {
      expect(specLookup(id).baseMight, `${id} 战力`).toBe(1)
      expect(specLookup(id).baseTypes, `${id} §178 类型必须声明`).toEqual(['unit'])
    }
    expect(specLookup('OGN-274').baseMight).toBe(3)
  })

  test('🔴★★★★★★精灵印着 [瞬息] —— ② 三处同源(漏一处 printedKeywordParity 当场红)', () => {
    expect(OGN_274.keywords).toEqual(['瞬息'])
    expect(OGN_274_KEYWORDS).toEqual(['瞬息'])
    expect(cardKeywords('OGN-274'), '★CARD_KEYWORDS 那一处').toEqual(['瞬息'])
    expect(specLookup('OGN-274').baseKeywords, '★spec 那一处').toEqual(['瞬息'])
  })

  test('🔴★★★★★对照:随从【没有】关键词(⑩① 会换答案的反例)', () => {
    for (const id of ['OGN-271', 'OGN-272', 'OGN-273']) {
      expect(cardKeywords(id), `${id} 不该凭空多出关键词`).toEqual([])
    }
  })
})

describe('🔴🔴🔴★★★★★★符文卡号 → `rune:<色>` 的归一化', () => {
  test('🔴★★★★★★三种写法都收:真卡号 / 已归一 / 裸色名', () => {
    expect(normalizeRuneEntry('OGN-007'), '★真卡号').toBe('rune:red')
    expect(normalizeRuneEntry('rune:red'), '★已经归一好的原样过').toBe('rune:red')
    expect(normalizeRuneEntry('red'), '★裸色名补前缀').toBe('rune:red')
  })

  test('🔴★★★★★★不认识的【原样返回】—— 归一化不是校验,别把错卡悄悄吞掉', () => {
    expect(normalizeRuneEntry('OGN-999')).toBe('OGN-999')
    expect(normalizeRuneEntry('')).toBe('')
  })

  test('🔴★★★★★★六个卡号各自归到各自的色(不是一律红)', () => {
    expect(RUNE_CARD_DEFIDS.map(normalizeRuneEntry))
      .toEqual(['rune:red', 'rune:green', 'rune:blue', 'rune:orange', 'rune:purple', 'rune:yellow'])
  })

  test('🔴★★★★★整栏归一', () => {
    expect(runeDeckOf(['OGN-089', 'blue', 'rune:blue'])).toEqual(['rune:blue', 'rune:blue', 'rune:blue'])
  })
})

describe('🔴🔴🔴★★★★★★端到端:照卡牌本身构筑,建出来的符文引擎【认得出】', () => {
  const mkDeck = (runeEntries: readonly string[]): Deck => ({
    name: 'T', mainDeck: Array.from({ length: 12 }, () => 'BLK'),
    runeDeck: runeEntries,
    battlefields: ['OGN-284', 'OGN-290', 'OGN-294'],
  })
  const rng = () => makeRng(7)

  test('🔴🔴★★★★★★没归一化 ⇒ 那些"符文"一枚都数不出来(这就是那个真缺口)', () => {
                                                             
                           
    const raw = Array.from({ length: 12 }, () => 'OGN-007')
    const { state } = setupGame(mkDeck(raw), mkDeck(raw), specLookup, rng())
    expect(controlledRuneCount(state, P1), '★★★引擎不认 ⇒ 一枚符文都数不出来').toBe(0)
  })

  test('🔴🔴★★★★★★套上归一化 ⇒ 与直接写颜色【结果全等】', () => {
    const byCardNo = runeDeckOf(Array.from({ length: 12 }, () => 'OGN-007'))
    const byColor = Array.from({ length: 12 }, () => 'rune:red')
    expect(byCardNo, '★两种写法归一后逐字相同').toEqual(byColor)

    const a = setupGame(mkDeck(byCardNo), mkDeck(byCardNo), specLookup, rng()).state
    const b = setupGame(mkDeck(byColor), mkDeck(byColor), specLookup, rng()).state
    const countA = controlledRuneCount(a, P1)
    const countB = controlledRuneCount(b, P1)
    expect(countA, '★★★真的建出符文了').toBeGreaterThan(0)
    expect(countA, '★★★与写颜色那条路结果一致').toBe(countB)
  })
})

describe('🔴🔴★★★★★构筑层:符文的域(§103.3.a.1 要靠它判合规)', () => {
  test('🔴★★★★★★真卡号问得出域,与合成 defId 同解', () => {
    expect(deckFacts('OGN-007').domains, '★炽烈符文是红的').toEqual(['red'])
    expect(deckFacts('rune:red').domains, '★合成 defId 那条路').toEqual(['red'])
    expect(deckFacts('OGN-166').domains, '★混沌符文是紫的').toEqual(['purple'])
  })

  test('🔴★★★★★★六张各自的域【互不相同】(不是全落到同一个色)', () => {
    const domains = RUNE_CARD_DEFIDS.map((id) => deckFacts(id).domains?.[0])
    expect(new Set(domains).size, '★六个色六个样').toBe(6)
  })

  test('★卡号归一化表与构筑层的域【逐张对得上】(两处口径同解)', () => {
    for (const [id, color] of Object.entries(RUNE_CARD_COLORS)) {
      expect(deckFacts(id).domains, `${id}`).toEqual([color])
      expect(normalizeRuneEntry(id)).toBe(`rune:${color}`)
    }
  })
})
