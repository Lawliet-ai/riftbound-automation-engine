import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, entryReadyFor } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { UNL_008, UNL_008_KEYWORDS, ENTER_READY_DEFIDS } from '../../data/cards/enter-ready'
import { warSpoilsCostMods } from '../../data/cards/cost-modifiers'
import { valuedKeywordTotal } from '../../src/effects/valuedKeyword'

                                                                              
                                                       
  
                                
                                                           
                                                                    
                                       
  
                                              
                                       
                                             
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

                                
function ledger(died: readonly PlayerId[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const led: Record<string, true> = {}
  for (const p of died) led[p as string] = true
  return { ...b, activePlayer: P1, phase: 'main', unitDestroyedThisTurn: led } as unknown as GameState
}
const ready = (s: GameState, who: PlayerId = P1) => entryReadyFor(s, who, 'UNL-008')

describe('★ 前提:卡面与接线', () => {
  test('★6费 0pip 红、6 战力,印 [强攻],进条件表清单', () => {
    expect(CARD_COSTS['UNL-008']).toEqual({ mana: 6, pips: 0, colors: ['red'] })
    expect([UNL_008.power, UNL_008.energy]).toEqual([6, 6])
    expect(cardKind('UNL-008')).toBe('unit')
    expect(cardKeywords('UNL-008'), '★② 印刷关键词三处同源').toEqual(['强攻'])
    expect(UNL_008_KEYWORDS).toEqual(['强攻'])
    expect(specLookup('UNL-008').baseKeywords).toEqual(['强攻'])
    expect(ENTER_READY_DEFIDS).toContain('UNL-008')
  })

  test('🔴★★★★★裸 [强攻] 真被 §807 那条路认下来(不是只当字符串挂着)', () => {
                                                         
                                                                                            
    const b = createInitialState([P1, P2], 2)
    const o = {
      oid: asObjId('e'), defId: 'UNL-008', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'),
      baseMight: 6, baseKeywords: [...UNL_008_KEYWORDS], baseTypes: ['unit'],
      damage: 0, counters: {}, status: {},
    } as unknown as GameObject
    const st = { ...b, objects: { e: o } } as unknown as GameState
    expect(valuedKeywordTotal(st, o, '强攻', (e, x, g) => e.predicate(x as never, g)),
      '★§807.1.c 裸关键词 = 1').toBe(1)
  })
})

describe('🔴🔴🔴★★★★★★条件:本回合内有单位被摧毁', () => {
  test('🔴★★★★★★死过 ⇒ 活跃进场', () => {
    expect(ready(ledger([P2]))).toBe(true)
  })

  test('🔴★★★★★★一个都没死过 ⇒ 休眠进场(⑩① 会换答案的反例)', () => {
    expect(ready(ledger([]))).toBe(false)
  })

  test('🔴★★★★★账本字段整个不存在时也不能炸(回合初/老存档)', () => {
    const b = createInitialState([P1, P2], 2)
    const s = { ...b, activePlayer: P1, phase: 'main' } as unknown as GameState
    expect(s.unitDestroyedThisTurn, '★前提:这盘确实没这本账').toBeUndefined()
    expect(ready(s)).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★门:卡文【没有阵营词】⇒ 自己的单位死了也算', () => {
  test('🔴★★★★★★只有【我自己】的单位死过 ⇒ 照样活跃进场', () => {
    expect(ready(ledger([P1]), P1), '★★★没写「敌方」,自家的也算').toBe(true)
  })

  test('🔴★★★★★★换个人问,答案一样(这条根本不看谁在打出)', () => {
    const s = ledger([P1])
    expect([ready(s, P1), ready(s, P2)], '★★★判据里没有 player').toEqual([true, true])
  })

  test('🔴🔴★★★★★★对照 OGN-144:同一本账、同一个盘面,它的答案【相反】', () => {
                                            
                                                      
    const mine = ledger([P1])
    expect(ready(mine, P1), '★本张:算').toBe(true)
    expect(warSpoilsCostMods(mine, P1, 'OGN-144'), '★★★它:不算(卡文写了「敌方」)').toEqual([])

                                       
    const theirs = ledger([P2])
    expect(ready(theirs, P1)).toBe(true)
    expect(warSpoilsCostMods(theirs, P1, 'OGN-144')).toHaveLength(1)
  })
})

describe('🔴🔴★★★★★共用件:同读【第十四本】那一本账', () => {
  test('🔴★★★★★★两张卡读的是同一个字段 —— 砍掉那本账,两边一起失效', () => {
                                                   
    const s = ledger([P2])
    expect(ready(s, P1)).toBe(true)
    expect(warSpoilsCostMods(s, P1, 'OGN-144')).toHaveLength(1)
    const empty = ledger([])
    expect(ready(empty, P1)).toBe(false)
    expect(warSpoilsCostMods(empty, P1, 'OGN-144')).toEqual([])
  })

  test('🔴★★★★★它与【第六本】不是同一本(当年那条判断依然成立)', () => {
                                                         
                              
    const b = createInitialState([P1, P2], 2)
    const s = {
      ...b, activePlayer: P1, phase: 'main', allyDiedInStartPhaseThisTurn: { [P1 as string]: true },
    } as unknown as GameState
    expect(ready(s, P1), '★★★读错账本的话这里会是 true').toBe(false)
  })
})
