import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { resetTurnLedgers } from '../../src/scoring/score'
import { cardKind, cardKeywords, spellChainItems, spellChainItemsUnderCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { specLookup } from '../../data/decks'
import { NEGATE_SPELLS, makeNegateSpellSpec, opponentsPlayedOtherSpell } from '../../data/cards/negate-spells'

                                            
                                          
  
                                                        
                                              
                           
                                                          
                                                 
                                        
  
                            
                                                              
                                                
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')

const row = NEGATE_SPELLS.find((r) => r.defId === 'VEN-039')!
const spec = makeNegateSpellSpec(row, spellChainItems, spellChainItemsUnderCost)

function scene(onChain: readonly string[] = ['OGN-133'], players: readonly ReturnType<typeof asPlayerId>[] = [P1, P2]): GameState {
  const base = createInitialState([...players], 2)
  const objects: Record<string, GameObject> = {}
  const chain = onChain.map((defId, i) => {
    const oid = `c${i}`
    objects[oid] = {
      oid: asObjId(oid), defId, owner: P2, controller: P2, zone: asZoneId('chain'),
      baseMight: 0, baseKeywords: [], baseTypes: [] as never, damage: 0, counters: {}, status: {},
    } as GameObject
    return { id: `play:${oid}`, kind: 'spell' as const, controller: P2, cardOid: asObjId(oid) }
  })
  return { ...base, activePlayer: P1, phase: 'main', objects, chain } as unknown as GameState
}
                                              
const played = (s: GameState, p: ReturnType<typeof asPlayerId>, n: number): GameState => {
  let out = s
  for (let i = 0; i < n; i++) {
    out = applyEvents(out, [{ kind: 'playSpell', player: p, cardOid: asObjId(`x${i}`) } as GameEvent], {}).state
  }
  return out
}
const resolve = (s: GameState, target = 'play:c0') =>
  spec.makeResolve({ movedCardOid: 'sp', target, controller: P1 } as never)(s) as readonly GameEvent[]

describe('🔴🔴🔴★★★★★★581 崩解之沙:前提与接线', () => {
  test('★前提:法术、1法力+1绿pip、印刷[反应];进了 negate 族表', () => {
    expect(CARD_COSTS['VEN-039'], '★费用查 CARD_COSTS 不从卡文推').toEqual({ mana: 1, pips: 1, colors: ['green'] })
    expect(row.cost, '★表里那份也要一致').toEqual({ mana: 1, pips: [['green']] })
    expect(cardKind('VEN-039')).toBe('spell')
    expect(cardKeywords('VEN-039')).toContain('反应')
    expect(specLookup('VEN-039').baseKeywords, '★★★两处印刷关键词一字不差(全仓闸)').toContain('反应')
    expect(row.cardEffect).toBe('如果对手在本回合内打出过其他法术，则无效化一个法术。')
  })

  test('🔴🔴★★★★★★【与同族的分野】它带前置条件,老四张一条都没有', () => {
                                                   
    expect(row.requiresOpponentPlayedOtherSpell).toBe(true)
    const others = NEGATE_SPELLS.filter((r) => r.defId !== 'VEN-039')
    expect(others.map((r) => r.requiresOpponentPlayedOtherSpell), '★★★老四张必须全是 undefined')
      .toEqual(others.map(() => undefined))
    expect(row.maxMana, '★它【没有】费用上限(那是蔑视的)').toBeUndefined()
    expect(row.banSpellsForController, '★它【不】附带禁令(那是夜阑谣的)').toBeUndefined()
  })
})

describe('🔴🔴🔴★★★★★★581 判据:「其他」= 对手确认过的法术数 ≥ 2', () => {
  test('🔴🔴🔴★★★★★★【会换答案·命门】对手只确认过【一个】⇒ 不成立(那一个就是被无效化的目标)', () => {
                                                   
    const s = played(scene(), P2, 1)
    expect(s.playedSpellThisTurn?.[P2], '★前提自证:布尔旗已经是 true 了').toBe(true)
    expect(opponentsPlayedOtherSpell(s, P1), '★★★但计数只有 1 ⇒ 没有"其他"').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【另一个方向】对手确认过【两个】⇒ 成立', () => {
    expect(opponentsPlayedOtherSpell(played(scene(), P2, 2), P1)).toBe(true)
  })

  test('🔴🔴🔴★★★★★★【FAQ③·多人局】两名【不同】对手各确认一个 ⇒ 照样成立', () => {
                                              
    let s = scene(['OGN-133'], [P1, P2, P3])
    s = played(s, P2, 1)
    s = played(s, P3, 1)
    expect(opponentsPlayedOtherSpell(s, P1), '★★★写成"只看 P2"这条会红').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【我自己打的不算】我确认过一堆法术,对手一个都没有 ⇒ 不成立', () => {
                                                     
    expect(opponentsPlayedOtherSpell(played(scene(), P1, 5), P1), '★★★卡文写的是"**对手**"').toBe(false)
  })

  test('🔴🔴★★★★★★【FAQ②·只增不减】那些法术之后被无效化了,账照旧算数', () => {
                                        
                                      
    const s = played(scene([]), P2, 2)                   
    expect(s.chain.length, '★前提:链是空的').toBe(0)
    expect(opponentsPlayedOtherSpell(s, P1), '★★★照样成立').toBe(true)
  })

  test('🔴🔴★★★★★★【回合末清账】过了回合就不算数了(第十九本与另外十八本同批刷新)', () => {
    const s = played(scene(), P2, 3)
    expect(opponentsPlayedOtherSpell(s, P1), '★前提:本回合成立').toBe(true)
    expect(opponentsPlayedOtherSpell(resetTurnLedgers(s), P1), '★★★清账后不成立').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★581 结算:条件成立才发 negate', () => {
  test('🔴🔴🔴★★★★★★【会换答案】条件成立 ⇒ 发一条 negate(不返手,§425 缺省进废牌堆)', () => {
    const evs = resolve(played(scene(), P2, 2))
    expect(evs).toEqual([{ kind: 'negate', target: 'play:c0' }])
    expect((evs[0] as { returnToHand?: boolean }).returnToHand, '★同族纪律:不返手').toBeUndefined()
  })

  test('🔴🔴🔴★★★★★★【另一个方向】条件不成立 ⇒ **一条事件都不发**(法术照打、只是没效果)', () => {
    expect(resolve(played(scene(), P2, 1)), '★★★不判条件的话这里会照发 negate').toEqual([])
  })

  test('🔴🔴🔴★★★★★★【条件判在结算层·承重】打出时不成立、结算前对手又确认一个 ⇒ 照样无效化', () => {
                                                                
                                                     
    let s = played(scene(), P2, 1)
    expect(resolve(s), '★前提:此刻还不成立').toEqual([])
    s = played(s, P2, 1)                          
    expect(resolve(s), '★★★结算时成立 ⇒ 照样无效化').toEqual([{ kind: 'negate', target: 'play:c0' }])
  })

  test('🔴★★★★★★没目标 ⇒ 一条都不发(与条件无关)', () => {
                                                                        
                                                  
    const evs = spec.makeResolve({ movedCardOid: 'sp', target: undefined, controller: P1 } as never)(
      played(scene(), P2, 2),
    ) as readonly GameEvent[]
    expect(evs).toEqual([])
  })
})

describe('🔴🔴★★★★★★581 第十九本账:写入点与老账并存', () => {
  test('🔴🔴★★★★★★`playSpell` 一次 ⇒ 计数 +1,且第十七本布尔旗照旧置起', () => {
                                  
    const s = played(scene(), P2, 3)
    expect(s.playedSpellCountThisTurn?.[P2], '★★★计数').toBe(3)
    expect(s.playedSpellThisTurn?.[P2], '★★★老账照旧').toBe(true)
  })

  test('🔴🔴★★★★★★按【玩家】分别记,不串账', () => {
    let s = played(scene(), P2, 2)
    s = played(s, P1, 1)
    expect(s.playedSpellCountThisTurn?.[P2]).toBe(2)
    expect(s.playedSpellCountThisTurn?.[P1]).toBe(1)
  })
})
