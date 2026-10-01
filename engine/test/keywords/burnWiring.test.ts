import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'

                                                        

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function deckCard(i: number, owner = P1): GameObject {
  return {
    oid: asObjId(`d${owner}${i}`), defId: `CARD${i}`, owner, controller: owner,
    zone: asZoneId(`mainDeck:${owner}`), baseMight: 1, baseKeywords: [],
    baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(deckN: number, deckN2 = 0): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]!
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (let i = 0; i < deckN; i++) put(deckCard(i))
  for (let i = 0; i < deckN2; i++) put(deckCard(i, P2))
  return { ...base, activePlayer: P1, objects, zones }
}
const sizes = (s: GameState, p = P1): { deck: number; discard: number } => ({
  deck: s.zones[`mainDeck:${p}`]!.contents.length,
  discard: s.zones[`discard:${p}`]!.contents.length,
})
const burn = (p: typeof P1, count: number) => ({ kind: 'burn' as const, player: p, count })

describe('§440.1/§440.2 基本行为', () => {
  test('燃烧1 → 牌堆顶一张进【自己的】废牌堆', () => {
    const s = applyEvents(scene(5), [burn(P1, 1)]).state
    expect(sizes(s)).toEqual({ deck: 4, discard: 1 })
  })

  test('燃烧3 → 三张', () => {
    expect(sizes(applyEvents(scene(5), [burn(P1, 3)]).state)).toEqual({ deck: 2, discard: 3 })
  })

  test('★烧的是【指定玩家自己的】牌堆,不动别人', () => {
    const s = applyEvents(scene(5, 5), [burn(P2, 2)]).state
    expect(sizes(s, P1)).toEqual({ deck: 5, discard: 0 })
    expect(sizes(s, P2)).toEqual({ deck: 3, discard: 2 })
  })

  test('count<=0 → 什么都不做', () => {
    expect(sizes(applyEvents(scene(5), [burn(P1, 0)]).state)).toEqual({ deck: 5, discard: 0 })
  })

  test('★烧的是牌堆【顶】(约定 contents 尾=顶)', () => {
    const s0 = scene(3)
    const top = s0.zones[`mainDeck:${P1}`]!.contents.at(-1)!
    const topDefId = s0.objects[top]!.defId
    const s = applyEvents(s0, [burn(P1, 1)]).state
                              
    expect(s.objects[s.zones[`discard:${P1}`]!.contents[0]!]!.defId).toBe(topDefId)
  })
})

describe('★§431.1 边界:恰好等于 vs 超过', () => {
  test('牌堆张数【恰好等于】X → 烧完即止,不燃尽(没有"超过")', () => {
    const s = applyEvents(scene(3), [burn(P1, 3)]).state
    expect(sizes(s)).toEqual({ deck: 0, discard: 3 })
    expect(s.scores[P2] ?? 0).toBe(0)             
  })

  test('★§440.4 数量不足 → 三段式:先烧 → 燃尽(废牌堆收回牌堆+送分)→ 再烧剩下的', () => {
    const s = applyEvents(scene(2), [burn(P1, 3)]).state
                                       
    expect(s.scores[P2] ?? 0).toBe(1)
                                             
    expect(sizes(s)).toEqual({ deck: 1, discard: 1 })
  })

                                                  
                                             
                                               
                                     
  test('★牌堆与废牌堆皆空 → §431.3.a 持续燃尽直到对手达胜利分,并即刻判胜', () => {
    const s = applyEvents(scene(0), [burn(P1, 1)]).state
    expect(s.scores[P2]).toBe(s.winTarget)           
    expect(s.winner).toBe(P2)                   
  })

                                                   
                                              
                                                            
                            
                                   
  test('★一条燃烧指令可触发【多次】燃尽(每次各送 1 分)', () => {
    let s = applyEvents(scene(2), [burn(P1, 2)]).state
    expect(s.scores[P2] ?? 0).toBe(0)            
    s = applyEvents(s, [burn(P1, 3)]).state
    expect(s.scores[P2]).toBe(2)
    expect(s.winner).toBeNull()         
    expect(sizes(s)).toEqual({ deck: 1, discard: 1 })
  })
})
