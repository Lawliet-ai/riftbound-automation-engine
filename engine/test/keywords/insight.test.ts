import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { DEFAULT_INSIGHT, insight, topOfDeck } from '../../src/keywords/insight'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                                                
function deckState(ids: string[]): GameState {
  const base = createInitialState([P1, P2])
  const objects: Record<string, GameObject> = {}
  for (const id of ids) objects[id] = { oid: asObjId(id), defId: 'C', owner: P1, controller: P1, zone: asZoneId('mainDeck:P1'), baseMight: 0, damage: 0, counters: {}, status: {} }
  const z = base.zones['mainDeck:P1']!
  return { ...base, objects, zones: { ...base.zones, 'mainDeck:P1': { ...z, contents: ids.map(asObjId) } } }
}
const deckContents = (s: GameState) => s.zones['mainDeck:P1']!.contents.map(String)

describe('洞察 §436 + 回收 §416', () => {
  test('X 缺省=1(§436.3.a)', () => {
    expect(DEFAULT_INSIGHT).toBe(1)
  })
  test('洞察1 不回收:顶牌留在顶部', () => {
    const s = deckState(['c', 'b', 'a'])                  
    const after = insight(s, P1, 1, () => [])       
    expect(deckContents(after)).toEqual(['c', 'b', 'a'])
    expect(topOfDeck(after, P1, 1)).toEqual([asObjId('a')])
  })
  test('洞察1 回收:顶牌→牌堆底,次牌上顶(§416.1)', () => {
    const s = deckState(['c', 'b', 'a'])       
    const after = insight(s, P1, 1, (top) => [top[0]!])          
    expect(deckContents(after)).toEqual(['a', 'c', 'b'])                      
    expect(topOfDeck(after, P1, 1)).toEqual([asObjId('b')])
  })
  test('洞察2 回收其一:查顶2张,回收a到底,保b在顶', () => {
    const s = deckState(['d', 'c', 'b', 'a'])           
    const after = insight(s, P1, 2, (top) => [top[0]!])                      
    expect(deckContents(after)).toEqual(['a', 'd', 'c', 'b'])              
    expect(topOfDeck(after, P1, 2)).toEqual([asObjId('b'), asObjId('c')])
  })
  test('§436.4 超过牌堆则尽可能多、§436.4.a 不燃尽', () => {
    const s = deckState(['b', 'a'])           
    const after = insight(s, P1, 3, (top) => top)                   
    expect(deckContents(after).sort()).toEqual(['a', 'b'])              
    expect(after.winner).toBeNull()          
  })
  test('空牌堆:洞察无操作、不燃尽', () => {
    const s = deckState([])
    const after = insight(s, P1, 1, () => [])
    expect(after.winner).toBeNull()
  })
})
