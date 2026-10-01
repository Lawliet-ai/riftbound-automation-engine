import { describe, expect, test } from 'vitest'
import { setupGame, type Deck } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { specLookup } from '../../data/decks'

const RUNES = (n: number): string[] => Array.from({ length: n }, () => 'rune:purple')

                                   
const deck = (hero?: string): Deck => ({
  name: 't',
  mainDeck: ['UNL-079', 'UNL-079', 'UNL-149', 'BLK', 'BLK'],
  runeDeck: RUNES(6),
  battlefields: ['OGN-280'],
  legend: 'UNL-197',
  ...(hero ? { hero } : {}),
})

function count(zone: readonly string[] | undefined, objects: Record<string, { defId: string }>, defId: string): number {
  return (zone ?? []).filter((o) => objects[o]?.defId === defId).length
}

describe('§103.2/§133.4 选定英雄从主牌堆扣一张(不是凭空多一张)', () => {
  test('选 UNL-079:英雄区1张,牌堆里同名只剩1张,总数守恒', () => {
    const { state } = setupGame(deck('UNL-079'), deck('UNL-079'), specLookup, makeRng(7))
    const objs = state.objects as unknown as Record<string, { defId: string }>
    const hz = state.zones['heroZone:P1']?.contents as unknown as string[]
    expect(count(hz, objs, 'UNL-079')).toBe(1)
                                                   
    const deckZone = state.zones['mainDeck:P1']?.contents as unknown as string[]
    const hand = state.zones['hand:P1']?.contents as unknown as string[]
    expect(count(deckZone, objs, 'UNL-079') + count(hand, objs, 'UNL-079')).toBe(1)
                                  
    expect((deckZone?.length ?? 0) + (hand?.length ?? 0)).toBe(4)
  })

  test('换个英雄(UNL-149)同样守恒:UNL-079 两张都还在牌堆', () => {
    const { state } = setupGame(deck('UNL-149'), deck('UNL-149'), specLookup, makeRng(11))
    const objs = state.objects as unknown as Record<string, { defId: string }>
    const hz = state.zones['heroZone:P1']?.contents as unknown as string[]
    expect(count(hz, objs, 'UNL-149')).toBe(1)
    const deckZone = state.zones['mainDeck:P1']?.contents as unknown as string[]
    const hand = state.zones['hand:P1']?.contents as unknown as string[]
    expect(count(deckZone, objs, 'UNL-079') + count(hand, objs, 'UNL-079')).toBe(2)
    expect(count(deckZone, objs, 'UNL-149') + count(hand, objs, 'UNL-149')).toBe(0)
  })

  test('牌表里没有该英雄(旧式牌组定义)也不崩:英雄区照放,牌堆不动', () => {
    const d: Deck = { ...deck(), hero: 'OGN-121' }
    const { state } = setupGame(d, d, specLookup, makeRng(3))
    const objs = state.objects as unknown as Record<string, { defId: string }>
    const hz = state.zones['heroZone:P1']?.contents as unknown as string[]
    expect(count(hz, objs, 'OGN-121')).toBe(1)
    const deckZone = state.zones['mainDeck:P1']?.contents as unknown as string[]
    const hand = state.zones['hand:P1']?.contents as unknown as string[]
    expect((deckZone?.length ?? 0) + (hand?.length ?? 0)).toBe(5)
  })
})
