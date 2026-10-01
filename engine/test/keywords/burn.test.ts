import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { burn } from '../../src/keywords/burn'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function card(id: string, owner: typeof P1, zone: string): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner, controller: owner, zone: asZoneId(zone), baseMight: 1, baseKeywords: [], damage: 0, counters: {}, status: {} }
}

                                        
function scene(deck: number, disc = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const deckIds: string[] = []
  const discIds: string[] = []
  for (let i = 0; i < deck; i++) { const id = `d${i}`; objects[id] = card(id, P1, 'mainDeck:P1'); deckIds.push(id) }
  for (let i = 0; i < disc; i++) { const id = `g${i}`; objects[id] = card(id, P1, 'discard:P1'); discIds.push(id) }
  return {
    ...base, objects,
    zones: {
      ...base.zones,
      ['mainDeck:P1']: { ...base.zones['mainDeck:P1']!, contents: deckIds.map(asObjId) },
      ['discard:P1']: { ...base.zones['discard:P1']!, contents: discIds.map(asObjId) },
    },
  }
}

const n = (s: GameState, z: string): number => (s.zones[z]?.contents ?? []).length

describe('§440 燃烧X:主牌堆顶 X 张 → 自己的废牌堆', () => {
  test('§440.1 正常烧:牌堆够,烧几张进几张废牌堆', () => {
    const s = burn(scene(5), P1, 2)
    expect(n(s, 'mainDeck:P1')).toBe(3)
    expect(n(s, 'discard:P1')).toBe(2)
  })

  test('烧的是【顶】那几张(约定 contents 尾=顶)', () => {
    const s = burn(scene(3), P1, 1)
                                                          
    expect((s.zones['mainDeck:P1']!.contents as unknown as string[])).toEqual(['d0', 'd1'])
    expect(n(s, 'discard:P1')).toBe(1)
  })

  test('X=0 什么都不发生(不烧、不燃尽)', () => {
    const before = scene(3)
    const s = burn(before, P1, 0)
    expect(n(s, 'mainDeck:P1')).toBe(3)
    expect(s.scores['P2'] ?? 0).toBe(0)             
  })

  test('§431.1 牌堆张数【恰好等于】X:烧完即止,不燃尽(判据是"超过")', () => {
    const s = burn(scene(2), P1, 2)
    expect(n(s, 'mainDeck:P1')).toBe(0)
    expect(n(s, 'discard:P1')).toBe(2)
    expect(s.scores['P2'] ?? 0).toBe(0)                   
  })

  test('§440.4 数量不足走三段式:先烧能烧的 → 燃尽 → 再烧剩下的', () => {
                            
    const s = burn(scene(1, 3), P1, 3)
                                                       
    expect(s.scores['P2']).toBe(1)                      
    expect(n(s, 'mainDeck:P1')).toBe(2)               
    expect(n(s, 'discard:P1')).toBe(2)
  })

  test('§440.4 顺序不可交换:先烧的那张【会】被燃尽回收(这是可观测差异)', () => {
                                      
    const exact = burn(scene(1, 0), P1, 1)
    expect(exact.scores['P2'] ?? 0).toBe(0)
                                                            
    const over = burn(scene(1, 0), P1, 2)
    expect(over.scores['P2']).toBe(1)
                                       
                                              
    expect(n(over, 'discard:P1')).toBe(1)
    expect(n(over, 'mainDeck:P1')).toBe(0)
  })

  test('牌堆完全为空被指示燃烧:第一段烧 0 张,仍须燃尽', () => {
    const s = burn(scene(0, 2), P1, 1)
    expect(s.scores['P2']).toBe(1)       
    expect(n(s, 'mainDeck:P1')).toBe(1)              
    expect(n(s, 'discard:P1')).toBe(1)
  })

  test('牌堆与废牌堆皆空:不死循环(§440.4「尽可能」已尽到)', () => {
    const s = burn(scene(0, 0), P1, 5)
    expect(n(s, 'mainDeck:P1')).toBe(0)
    expect(s.scores['P2'] ?? 0).toBeGreaterThanOrEqual(1)          
  })

  test('燃烧的是【被指定玩家自己的】牌堆与废牌堆,不动别人', () => {
    const before = scene(4)
    const s = burn(before, P1, 2)
    expect(n(s, 'mainDeck:P2')).toBe(n(before, 'mainDeck:P2'))
    expect(n(s, 'discard:P2')).toBe(0)
  })
})
