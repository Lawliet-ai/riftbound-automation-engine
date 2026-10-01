import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, playSpecFor, entryReadyFor } from '../../data/registry'
import { UTILITY_SPELLS, UTILITY_SPELL_SPECS } from '../../data/cards/utility-spells'
import { allUnitsEnterReadyOf, nextUnitReadyOf } from '../../src/effects/nextUnitReady'

                                                
                                          
  
                                                     
                                                  
                                                  
                                                        
                                                       
                               
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const row = () => UTILITY_SPELLS.find((r) => r.defId === 'SFD-004')!
const evs = (p: PlayerId = P1): readonly GameEvent[] =>
  (row().effects as (x: PlayerId) => readonly GameEvent[])(p)
const base = () => createInitialState([P1, P2], 2)

describe('★ 前提:卡面与接线', () => {
  test('★2费【1 红pip】,印着 [待命],族表自动登 PLAY_SPECS', () => {
    expect(CARD_COSTS['SFD-004'], '★1 pip 不是 0').toEqual({ mana: 2, pips: 1, colors: ['red'] })
    expect(cardKind('SFD-004')).toBe('spell')
    expect(cardKeywords('SFD-004'), '★[待命] 三处都要登(②)').toEqual(['待命'])
    expect(playSpecFor('SFD-004')).toBeDefined()
    expect(UTILITY_SPELL_SPECS['SFD-004']?.keywords, '★spec 侧同样要有').toEqual(['待命'])
  })

  test('★卡文逐字(用例按它对账)', () => {
    expect(row().cardEffect).toContain('在本回合内，友方单位以活跃状态进场')
    expect(row().cardEffect).toContain('打出一个休眠的“金币”装备指示物')
  })
})

describe('🔴🔴🔴★★★★★★两句各发一条,次序照卡文', () => {
  test('🔴★★★★★★先授予、后出金币', () => {
    const kinds = evs().map((e) => e.kind)
    expect(kinds, '★★★两条,顺序照卡文').toEqual(['markAllUnitsEnterReady', 'spawnToken'])
  })

  test('🔴★★★★★授予的是【打出者】那本账', () => {
    const e = evs(P2)[0] as unknown as { player: string }
    expect(e.player, '★★★不是写死 P1').toBe(P2)
  })

  test('🔴★★★★★金币落【打出者】基地、而且是休眠的(卡文写死了)', () => {
    const t = evs()[1] as unknown as { zone: string; owner: string; dormant: boolean }
    expect([t.zone, t.owner, t.dormant]).toEqual([`base:${P1}`, P1, true])
  })
})

describe('🔴🔴★★★★★★真落地:那本回合账挂上了,进场姿态跟着变', () => {
  test('🔴★★★★★★打之前休眠进场、打之后活跃进场(前后各断一次)', () => {
    const s0 = base()
    expect(entryReadyFor(s0, P1, 'OGN-012'), '★前提:这张卡本来是休眠进场的').toBe(false)
    const { state: s1 } = applyEvents(s0, evs())
    expect(allUnitsEnterReadyOf(s1, P1), '★★★账挂上了').toBe(true)
    expect(entryReadyFor(s1, P1, 'OGN-012'), '★★★汇总口跟着放行').toBe(true)
  })

  test('🔴★★★★★★【读不消费】—— 整回合罩着,打第二个单位照样活跃', () => {
    const { state: s1 } = applyEvents(base(), evs())
    expect(entryReadyFor(s1, P1, 'OGN-012'), '★第一次').toBe(true)
    expect(entryReadyFor(s1, P1, 'OGN-012'), '★★★第二次仍然是(与"下一名"那条轴的分水岭)').toBe(true)
    expect(allUnitsEnterReadyOf(s1, P1), '★账还在').toBe(true)
  })

  test('🔴★★★★★★只罩【打出者自己】—— 对手不沾光', () => {
    const { state: s1 } = applyEvents(base(), evs())
    expect(allUnitsEnterReadyOf(s1, P2), '★★★对手那本账没挂').toBe(false)
    expect(entryReadyFor(s1, P2, 'OGN-012'), '★★★对手照旧休眠进场').toBe(false)
  })

  test('🔴★★★★★它走的是【本回合所有】那条轴,不是【下一名】那条', () => {
    const { state: s1 } = applyEvents(base(), evs())
    expect(nextUnitReadyOf(s1, P1), '★★★"下一名"那本账一点没动(两本账各判各的)').toBe(false)
  })
})

describe('🔴★★★★★金币真的进了场', () => {
  test('🔴★★★★★落地后基地里多了一枚休眠金币', () => {
    const s0 = base()
    const before = (s0.zones[`base:${P1}` as never] as { contents: readonly string[] }).contents.length
    const { state: s1 } = applyEvents(s0, evs())
    const after = s1.zones[`base:${P1}` as never] as { contents: readonly string[] }
    expect(after.contents.length - before, '★★★多了一枚').toBe(1)
    const tok = s1.objects[after.contents[after.contents.length - 1] as never] as GameObject
    expect(tok.status.tapped, '★★★装备/指示物的"休眠"是 tapped(㉝)').toBe(true)
  })

  test('🔴★★★★两句并列不互相依赖:金币那条不看第一句成没成', () => {
                                      
    const { state: s1 } = applyEvents(base(), [evs()[0]!])
    const beforeCount = (s1.zones[`base:${P1}` as never] as { contents: readonly string[] }).contents.length
    const { state: s2 } = applyEvents(s1, evs())
    const after = (s2.zones[`base:${P1}` as never] as { contents: readonly string[] }).contents.length
    expect(after - beforeCount, '★★★账已经挂着也照样出金币').toBe(1)
  })
})

describe('🔴🔴★★★★★共用件自证:两张卡走【同一条轴】(㊼)', () => {
  test('🔴★★★★★★迎敌号令与丛林伏击发的是同一种事件', () => {
    const other = UTILITY_SPELLS.find((r) => r.defId === 'OGN-129')!
    const otherKinds = (other.effects as (x: PlayerId) => readonly GameEvent[])(P1).map((e) => e.kind)
    expect(otherKinds, '★那张:先授予后抽牌').toEqual(['markAllUnitsEnterReady', 'draw'])
    expect(evs().map((e) => e.kind)[0], '★★★两张的第一条一模一样').toBe(otherKinds[0])
  })

  test('🔴★★★★★★两张各自打出后,汇总口都放行(每条轴各配一个"应答是"的正例,516)', () => {
    const fromThis = applyEvents(base(), evs()).state
    const fromOther = applyEvents(
      base(),
      (UTILITY_SPELLS.find((r) => r.defId === 'OGN-129')!.effects as (x: PlayerId) => readonly GameEvent[])(P1),
    ).state
    expect(entryReadyFor(fromThis, P1, 'OGN-012'), '★这张').toBe(true)
    expect(entryReadyFor(fromOther, P1, 'OGN-012'), '★★★那张(同一条轴)').toBe(true)
  })
})
