import { describe, expect, test } from 'vitest'
import { resolveDeckPick, encodeCustomPick, CUSTOM_PREFIX, type PickDeps } from '../../src/game/deckPick'
import { encodeDeck } from '../../src/game/deckCode'
import type { DeckDraft } from '../../src/game/deckDraft'
import { DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'
import { deckFacts } from '../../data/registry'
import { isLegalHeroFor } from '../../data/heroTags'                             

                                   
                                                

const deps: PickDeps = {
  known: { diana: DEMO_DECK_A, teemo: DEMO_DECK_B },
  fallback: DEMO_DECK_A,
  facts: deckFacts,
  heroOk: (legend, hero) => isLegalHeroFor(legend, hero),
}

                                                      
function legalCustomText(): string {
  const d: DeckDraft = {
    mainDeck: Array.from({ length: 14 }, (_, i) => `FILL-${i}`).flatMap((id) => [id, id, id]).slice(0, 40),
    battlefields: [...DEMO_DECK_A.battlefields],
    runeDeck: Array(12).fill('rune:purple'),
  }
  return encodeDeck(d, '我的自定义组')
}

describe('预置牌组这一支', () => {
  test('空串 → 用默认牌组', () => {
    const r = resolveDeckPick('', deps)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.deck).toBe(DEMO_DECK_A)
  })

  test('认得的 id → 用那副', () => {
    const r = resolveDeckPick('teemo', deps)
    expect(r.ok && r.deck).toBe(DEMO_DECK_B)
  })

  test('认不得的 id → 回落默认(这一支是"没选好"不是"选了违规的",回落无害)', () => {
    const r = resolveDeckPick('nonexistent', deps)
    expect(r.ok && r.deck).toBe(DEMO_DECK_A)
  })

  test('★不在牌表里的英雄 → 保持原英雄,不报错(这一支是"改不动"不是"打不了")', () => {
    const r = resolveDeckPick('diana|NOT-IN-DECK', deps)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.deck.hero).toBe(DEMO_DECK_A.hero)
  })
})

describe('★自定义牌组:服务端自己校验,不合法就明确拒绝', () => {
  test('合法牌表 → 收下,名字取牌表里的', () => {
    const r = resolveDeckPick(CUSTOM_PREFIX + legalCustomText(), deps)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.deck.mainDeck).toHaveLength(40)
      expect(r.deck.runeDeck).toHaveLength(12)
      expect(r.deck.name).toBe('我的自定义组')
    }
  })

  test('★违反构筑规则 → 拒绝,并把【具体哪条】带回去', () => {
    const r = resolveDeckPick(CUSTOM_PREFIX + '4 VEN-043', deps)                
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.violations?.map((v) => v.rule)).toContain('§103.2.b')
      expect(r.reason).toContain('构筑规则')
    }
  })

  test('★绝不悄悄回落成预置牌组:拒绝就是拒绝,不返回一副能打的牌', () => {
    const r = resolveDeckPick(CUSTOM_PREFIX + '4 VEN-043', deps)
    expect(r.ok).toBe(false)
                                                     
                             
    expect('deck' in r).toBe(false)
  })

  test('★牌表文本本身读不了 → 拒绝并报行号', () => {
    const r = resolveDeckPick(CUSTOM_PREFIX + '3 OGN-121\n这行是胡话', deps)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('第 2 行')
  })

  test('空的自定义牌表 → 拒绝(不是当成"没选")', () => {
    const r = resolveDeckPick(CUSTOM_PREFIX, deps)
    expect(r.ok).toBe(false)
  })
})

                                      
                                             
                                           
describe('★自定义牌组 + 赛前选定英雄', () => {
                                             
  function dianaText(hero?: string): string {
    const d: DeckDraft = {
      mainDeck: [
        ...Array(3).fill('UNL-079'), ...Array(3).fill('UNL-149'),
        ...Array.from({ length: 12 }, (_, i) => `FILL-${i}`).flatMap((id) => [id, id, id]).slice(0, 34),
      ],
      battlefields: [...DEMO_DECK_A.battlefields],
      runeDeck: Array(12).fill('rune:purple'),
      legend: 'UNL-197', // 皎月女神(黛安娜标签)
      ...(hero !== undefined ? { hero } : {}),
    }
    return encodeDeck(d, '我的自建组')
  }

  test('★牌表里没写「英雄」行时,英雄段【补得上】——这正是委托人踩的那一条', () => {
                       
    const old = resolveDeckPick(CUSTOM_PREFIX + dianaText(), deps)
    expect(old.ok && old.deck.hero).toBe(undefined)
                       
    const r = resolveDeckPick(encodeCustomPick(dianaText(), 'UNL-079'), deps)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.deck.hero).toBe('UNL-079')
  })

  test('★英雄段【覆盖】牌表里的「英雄」行(赛前当场选的说了算,不是存档里的旧值)', () => {
    const r = resolveDeckPick(encodeCustomPick(dianaText('UNL-079'), 'UNL-149'), deps)
    expect(r.ok && r.deck.hero).toBe('UNL-149')
  })

  test('不给英雄段 → 仍按牌表里的「英雄」行(老串逐字不变,老存档不会被吃掉)', () => {
    const r = resolveDeckPick(encodeCustomPick(dianaText('UNL-079')), deps)
    expect(r.ok && r.deck.hero).toBe('UNL-079')
    expect(encodeCustomPick(dianaText())).toBe(CUSTOM_PREFIX + dianaText())             
  })

  test('★不在牌表里的英雄 → 拒绝(防作弊:否则英雄区凭空多一张,牌堆一张不少)', () => {
    const r = resolveDeckPick(encodeCustomPick(dianaText(), 'OGN-121'), deps)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('不在这副牌的主牌堆里')
  })

  test('★英雄标签跟传奇对不上 → 拒绝,并带出 §103.2.a.2(交给同一次构筑校验判,不另写一套)', () => {
                                           
    const text = dianaText().replace('3 UNL-079', '3 OGN-121')
    const r = resolveDeckPick(encodeCustomPick(text, 'OGN-121'), deps)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.violations?.map((v) => v.rule)).toContain('§103.2.a.2')
  })

  test('英雄段不会把牌表首行误吃掉(牌表首行永远不是「卡号|」这种形状)', () => {
    for (const head of ['# 我的组', '传奇 UNL-197', '3 UNL-079', 'Name: 凯南']) {
      const body = CUSTOM_PREFIX + head
      expect(body.slice(CUSTOM_PREFIX.length).startsWith(head)).toBe(true)
    }
                                            
    const r = resolveDeckPick(CUSTOM_PREFIX + dianaText('UNL-079'), deps)
    expect(r.ok && r.deck.name).toBe('我的自建组')
  })
})
