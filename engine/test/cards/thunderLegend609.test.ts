import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { StaticEffect } from '../../src/effects/continuousView'
import type { GameEvent } from '../../src/loop/events'
import { activeTriggers, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { canDormantSelf } from '../../data/cards/dormant-self-cost'
import { POWERFUL_MIN_MIGHT } from '../../data/cards/conditional-self-passives'
import {
  OGN_249, OGN_249_CARD_EFFECT, OGN_249_RUNE_COUNT, playedPowerfulUnit, makeThunderLegendTrigger,
} from '../../data/cards/OGN-249'

                                            
                                               
                              
                                                                           
                                    
  
                                                 
                                                                 
                                                 

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'thunder'

const unit = (oid: string, might: number, ctrl = P1, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                     
const legend = (tapped = false, ctrl = P1): GameObject => ({
  oid: asObjId(SELF), defId: 'OGN-249', owner: ctrl, controller: ctrl,
  zone: asZoneId(`legend:${ctrl}`), baseMight: 0, baseKeywords: [], baseTypes: [],
  damage: 0, counters: {}, status: tapped ? { tapped: true } : {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[], effects: readonly StaticEffect[] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return recomputeContinuous({
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(effects.length > 0 ? { continuousEffects: effects } : {}),
  } as GameState)
}
                                                         
const bump = (target: string, delta: number): StaticEffect => ({
  id: `bump:${target}`, duration: 'permanent', fromPassive: false, timestamp: 1,
  predicate: (x: GameObject) => (x.oid as string) === target,
  modification: { kind: 'addMight', delta },
} as unknown as StaticEffect)

const play = (oid: string, who = P1): GameEvent =>
  ({ kind: 'playUnit', unit: asObjId(oid), player: who } as unknown as GameEvent)
const trig = (ctrl = P1) => makeThunderLegendTrigger(asObjId(SELF), ctrl)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)

describe('🔴🔴🔴★★★★★★609 不灭狂雷:前提与接线', () => {
  test('★前提:**传奇牌** 0费 0pip 红+橙、**四个卡号**、卡文一字不差', () => {
    expect(cardKind('OGN-249'), '★★★是传奇,不是单位').toBe('legend')
    for (const id of ['OGN-249', 'OGN-300', 'OGN-300*', 'FND-249']) {
      expect(CARD_COSTS[id], `★${id}`).toEqual({ mana: 0, pips: 0, colors: ['red', 'orange'] })
    }
    expect(OGN_249.category).toBe('legend')
    expect(OGN_249.domains).toEqual(['red', 'orange'])
    expect(OGN_249_CARD_EFFECT).toBe(
      '当你打出一名{{强力}}单位时，你可以选择让我变为休眠状态，以此召出一枚休眠的符文。（战力达到5或以上时，即为强力单位。）')
  })

  test('🔴🔴🔴★★★★★★接线:触发表**四个卡号都查得到**(再版走 variantAliases 折叠,只登一行)', () => {
    for (const id of ['OGN-249', 'OGN-300', 'OGN-300*', 'FND-249']) {
      const s = scene([{ ...legend(), defId: id } as GameObject])
      const mine = activeTriggers(s).filter((t) => t.sourceDefId === 'OGN-249')
      expect(mine.length, `★★★${id} 登记漏了 ⇒ 这张传奇在真对局里是死的`).toBe(1)
      expect(mine[0]!.event).toBe('playUnit')
    }
  })
})

describe('🔴🔴🔴★★★★★★609 判据:「打出一名{强力}单位」', () => {
  test('🔴🔴🔴★★★★★★【真判据·两个方向都推】战力 **5** 算强力、**4** 不算(㉙ 边界两头压)', () => {
    expect(POWERFUL_MIN_MIGHT, '★㊼ 阈值只有一处定义,别再写一个 5').toBe(5)
    const s = scene([legend(), unit('big', 5), unit('small', 4)])
    expect(playedPowerfulUnit(s, play('big')), '★5 ⇒ 强力').toBe(true)
    expect(playedPowerfulUnit(s, play('small')), '★★★4 ⇒ 不是强力,不触发').toBe(false)
    expect(trig().filter?.(play('big'), s) ?? true).toBe(true)
    expect(trig().filter?.(play('small'), s) ?? true).toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】读的是**派生**战力:4[S] 被加到 5 也算强力', () => {
                                                                    
    const s = scene([legend(), unit('pumped', 4)], [bump('pumped', 1)])
    expect(s.objects[asObjId('pumped')]!.baseMight, '★前提:印刷值仍是 4').toBe(4)
    expect(playedPowerfulUnit(s, play('pumped')), '★★★派生到 5 ⇒ 算强力').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「**你**打出」——`by` 是 you(对手打出不触发)', () => {
    expect(trig().by, '★★★写成 any/opponent 就是另一张卡').toBe('you')
  })

  test('🔴🔴🔴★★★★★★【会换答案·场景要造到位】只吃 `playUnit` —— **`unitMoved` 同样带 `unit` 字段,不能误吃**', () => {
                                                              
                                                                               
                                                             
                                                                 
                                                
    const s = scene([legend(), unit('big', 5)])
    const moved = { kind: 'unitMoved', unit: asObjId('big'), player: P1,
      from: asZoneId(`base:${P1}`), to: asZoneId(BF0) } as unknown as GameEvent
    expect(playedPowerfulUnit(s, moved), '★★★移动 ≠ 打出').toBe(false)
    expect(playedPowerfulUnit(s, { kind: 'draw', player: P1, count: 1 } as unknown as GameEvent)).toBe(false)
    expect(playedPowerfulUnit(s, play('ghost')), '★物件不存在').toBe(false)
  })

  test('🔴🔴🔴★★★★★★【会换答案】「你可以选择」⇒ `mayChoose`(§383.3.a)', () => {
    expect(trig().mayChoose, '★★★漏了就成强制:没符文可召也逼你横置传奇').toBe(true)
  })
})

describe('🔴🔴🔴★★★★★★609 费用:「让我变为休眠状态」——传奇也付得出', () => {
  test('🔴🔴🔴★★★★★★【会换答案·本轮共用件扩容】传奇在 `legend` 区 ⇒ **付得出**', () => {
                                                                       
                                                    
    const s = scene([legend()])
    expect(canDormantSelf(s, asObjId(SELF)), '★★★砍掉 legend 那半这条当场红').toBe(true)
  })

  test('🔴🔴🔴★★★★★★【会换答案】已横置(=已休眠)⇒ **付不出**,整条不执行(不能白召符文,㊹)', () => {
    const s = scene([legend(true), unit('big', 5)])
    expect(canDormantSelf(s, asObjId(SELF))).toBe(false)
    expect(trig().effect(s, play('big'), {}) as readonly GameEvent[], '★★★一条都不发').toEqual([])
  })

  test('🔴🔴★★★★★★扩容**没放宽多余的**:手牌/废牌堆里的仍然付不出', () => {
    const inHand = { ...legend(), zone: asZoneId(`hand:${P1}`) } as GameObject
    expect(canDormantSelf(scene([inHand]), asObjId(SELF))).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★609 结算:「以此召出一枚休眠的符文」', () => {
  test('🔴🔴🔴★★★★★★【真结算】先付费(横置我)、后收益(召符文),两条按序', () => {
    const s = scene([legend(), unit('big', 5)])
    const evs = trig().effect(s, play('big'), {}) as readonly GameEvent[]
    expect(kinds(evs), '★★★费用在前、收益在后').toEqual(['statusChange', 'summonRune'])
    expect(evs[0]).toMatchObject({ target: SELF, key: 'tapped', value: true })
  })

  test('🔴🔴🔴★★★★★★【会换答案】召的是 **`dormant: true`** 的符文(漏了就白送一点资源)', () => {
    const s = scene([legend(), unit('big', 5)])
    const rune = (trig().effect(s, play('big'), {}) as readonly GameEvent[])
      .find((e) => (e as { kind: string }).kind === 'summonRune') as unknown as
      { player: string; count: number; dormant?: boolean }
    expect(rune.dormant, '★★★§430.2「**休眠的**符文」').toBe(true)
    expect(rune.count, '★「**一枚**」').toBe(OGN_249_RUNE_COUNT)
    expect(OGN_249_RUNE_COUNT).toBe(1)
  })

  test('🔴🔴🔴★★★★★★【会换答案】符文召给**我的控制者**,不是打出那名单位的人', () => {
                                                    
    const s = scene([legend(false, P2), unit('big', 5)])
    const rune = (trig(P2).effect(s, play('big'), {}) as readonly GameEvent[])
      .find((e) => (e as { kind: string }).kind === 'summonRune') as unknown as { player: string }
    expect(rune.player, '★★★写成 ev.player 这条当场红').toBe(P2)
  })
})
