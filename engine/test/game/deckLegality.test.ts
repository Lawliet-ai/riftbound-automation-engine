import { describe, expect, test } from 'vitest'
import { checkDeckLegality, type CardFacts, type DeckToCheck, MIN_MAIN_DECK } from '../../src/game/deckLegality'

                                      
function filler(n: number, prefix = 'F'): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}${i}`)
}

const FACTS: Record<string, CardFacts> = {
  LEGEND: { name: '皎月女神', heroTag: '黛安娜' },
  HERO: { name: '黛安娜 - 皎月化身', heroTag: '黛安娜', heroUnit: true },
  SOLO: { name: '炉火斗篷', solitary: true },
  EXCL: { name: '提伯斯', exclusive: true, heroTag: '安妮' },
  EXCL_OK: { name: '月刃', exclusive: true, heroTag: '黛安娜' },
  BF1: { name: '帝柳之林' },
  BF2: { name: '班德尔树' },
}
const facts = (id: string): CardFacts | undefined =>
  FACTS[id] ?? (id.startsWith('F') ? { name: `填充${id}` } : undefined)

const base = (over: Partial<DeckToCheck> = {}): DeckToCheck => ({
  mainDeck: filler(MIN_MAIN_DECK),
  battlefields: ['BF1', 'BF2', 'BF3'], // §485.4.a 1v1 每人提供三个战场
  legend: 'LEGEND',
  ...over,
})

describe('§101/§103 卡组构筑合法性', () => {
  test('合法底板:无违规', () => {
    expect(checkDeckLegality(base(), facts)).toHaveLength(0)
  })

  test('§103.2 主牌堆少于 40 张 → 违规', () => {
    const v = checkDeckLegality(base({ mainDeck: filler(39) }), facts)
    expect(v.map((x) => x.rule)).toContain('§103.2')
  })

  test('§103.2.b 同名最多三张;第四张即违规', () => {
    const four = [...filler(36), 'D', 'D', 'D', 'D']
    const factsD = (id: string): CardFacts | undefined => (id === 'D' ? { name: '亚索 - 迷途怅惘' } : facts(id))
    const v = checkDeckLegality(base({ mainDeck: four }), factsD)
    expect(v.map((x) => x.rule)).toContain('§103.2.b')
  })

  test('§103.2.b 恰好三张同名:合法', () => {
    const three = [...filler(37), 'D', 'D', 'D']
    const factsD = (id: string): CardFacts | undefined => (id === 'D' ? { name: '亚索 - 迷途怅惘' } : facts(id))
    expect(checkDeckLegality(base({ mainDeck: three }), factsD)).toHaveLength(0)
  })

  test('§132.4 同名按【完整名称】算:简称相同、副标不同 = 不同名,各三张合法', () => {
                                         
    const mixed = [...filler(34), 'A', 'A', 'A', 'B', 'B', 'B']
    const f = (id: string): CardFacts | undefined =>
      id === 'A' ? { name: '亚索 - 迷途怅惘' } : id === 'B' ? { name: '亚索 - 乘风归' } : facts(id)
    expect(checkDeckLegality(base({ mainDeck: mixed }), f)).toHaveLength(0)
  })

  test('§825.3.a 唯我:每副卡组只能一张该名称', () => {
    const v = checkDeckLegality(base({ mainDeck: [...filler(38), 'SOLO', 'SOLO'] }), facts)
    expect(v.map((x) => x.rule)).toContain('§825.3.a')
  })

  test('§825.3.a 唯我只放一张:合法', () => {
    expect(checkDeckLegality(base({ mainDeck: [...filler(39), 'SOLO'] }), facts)).toHaveLength(0)
  })

  test('§825.4 唯我在对局中无效果:它只在构筑期被检出,不进对局逻辑', () => {
                                                                
                                             
    const v = checkDeckLegality(base({ mainDeck: [...filler(39), 'SOLO'] }), facts)
    expect(v).toHaveLength(0)
  })

  test('§103.2.d.1 专属卡总数最多三张(不论名称)', () => {
    const four = [...filler(36), 'EXCL_OK', 'EXCL_OK', 'EXCL_OK', 'EXCL_OK']
    const v = checkDeckLegality(base({ mainDeck: four }), facts)
    expect(v.map((x) => x.rule)).toContain('§103.2.d.1')
  })

  test('§103.2.d.2 专属卡的英雄标签必须与传奇一致', () => {
    const v = checkDeckLegality(base({ mainDeck: [...filler(39), 'EXCL'] }), facts)
    expect(v.map((x) => x.rule)).toContain('§103.2.d.2')                   
  })

  test('§103.2.a.2 选定英雄必须是英雄单位', () => {
    const v = checkDeckLegality(base({ mainDeck: [...filler(39), 'SOLO'], hero: 'SOLO' }), facts)
    expect(v.map((x) => x.rule)).toContain('§103.2.a.2')
  })

  test('§103.2.a.2 选定英雄的标签必须与传奇一致;一致则合法', () => {
    expect(checkDeckLegality(base({ mainDeck: [...filler(39), 'HERO'], hero: 'HERO' }), facts)).toHaveLength(0)
  })

  test('§103.4.c 不得包含一个以上的同名战场', () => {
    const v = checkDeckLegality(base({ battlefields: ['BF1', 'BF1', 'BF2'] }), facts)
    expect(v.map((x) => x.rule)).toContain('§103.4.c')
  })

  test('卡库查不到的卡按普通卡处理(宁可漏报不误报,免得把合法牌组判死)', () => {
    const v = checkDeckLegality(base({ mainDeck: filler(MIN_MAIN_DECK, 'UNKNOWN_') }), () => undefined)
    expect(v).toHaveLength(0)
  })
})
