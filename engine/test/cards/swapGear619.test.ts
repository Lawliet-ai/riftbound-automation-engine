import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { cardKind, cardCost, cardKeywords, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { canPlayInTiming } from '../../src/loop/timing'
import {
  TWO_TARGET_SPELLS, TWO_TARGET_SPECS, TWO_TARGET_KEY,
  firstCandidates, secondCandidates, attachOrDetach,
} from '../../data/cards/two-target-spells'

                                                         
                                     
                                                              
                                          
                                                                
                                            
  
             
                                              
                                                                   
                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, ctrl: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                                                     
const gear = (oid: string, ctrl: PlayerId, extra: Partial<GameObject> = {}, tags: readonly string[] = ['武装']): GameObject => ({
  oid: asObjId(oid), defId: `G-${oid}`, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: tags,
  damage: 0, counters: {}, status: {}, ...extra,
} as unknown as GameObject)

   
                                          
                                                                        
                                                         
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [
    unit('mine', P1), unit('foe', P2), unit('home', P1, `base:${P1}`),
    gear('loose', P1),
    gear('onMine', P1, { status: { attachedTo: asObjId('mine') } }),
    gear('onHome', P1, { status: { attachedTo: asObjId('home') }, zone: asZoneId(`base:${P1}`) }),
    gear('foeGear', P2),
    gear('plainEquip', P1, {}, []), // ★没有[武装]标签
                                                          
    gear('inHand', P1, { zone: asZoneId(`hand:${P1}`) }),
  ]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
}

const spec = () => TWO_TARGET_SPECS['SFD-011']!
const row = () => TWO_TARGET_SPELLS.find((r) => r.defId === 'SFD-011')!
const second = (first: string | undefined, s: GameState = scene()): string[] =>
  secondCandidates('armamentOfSameController', s, P1, first).slice().sort()
const resolveEvs = (first?: string, snd?: string, s: GameState = scene()): readonly GameEvent[] =>
  spec().makeResolve({ movedCardOid: 'sp', ...(first !== undefined ? { target: first } : {}), controller: P1 })(
    s, snd === undefined ? {} : { [TWO_TARGET_KEY]: snd })
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)

describe('🔴🔴🔴★★★★★★619 取放自如:前提与接线', () => {
  test('★前提:法术 2费 **0pip** 红、**单印次**、卡文一字不差', () => {
    expect(cardKind('SFD-011')).toBe('spell')
    expect(CARD_COSTS['SFD-011']).toEqual({ mana: 2, pips: 0, colors: ['red'] })
    expect(CARD_COSTS['SFD-011a'], '★单印次:没有 a 号').toBeUndefined()
    expect(row().cost.pips ?? [], '★别凭空造 pip').toEqual([])
    expect(row().cardEffect).toBe(
      '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
      + '选择一名单位和其控制者的一件武装。为该单位贴附或卸除该武装。抽一张牌。')
  })

  test('🔴🔴🔴★★★★★★接线:打出规格查得到;[反应] **两处都要登**;法术不进 `UNIT_COST`', () => {
    expect(playSpecFor('SFD-011'), '★★★汇总口漏了 ⇒ 这张卡打不出来').toBeDefined()
    expect(spec().keywords, '★①时机门读 spec.keywords').toEqual(['反应'])
    expect(cardKeywords('SFD-011'), '★★★②`cardKeywords()` 不看 Card.keywords 字面量').toEqual(['反应'])
    expect(cardCost('SFD-011'), '★法术不进 UNIT_COST').toEqual({ mana: 0 })
  })

  test('🔴🔴🔴★★★★★★【真时机·会换答案】[反应] 可在**任意时机**打出(§309.1.a)', () => {
    const duel = { ...scene(), spellDuelActive: true } as GameState
    expect(canPlayInTiming(duel, spec().keywords, false), '★★★keywords 漏了反应这条当场红').toBe(true)
    expect(canPlayInTiming(duel, [], false), '★反方向:不带权限关键词的法术在对决里打不出').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★619 第一问:「一名单位」——一个限定词都没有', () => {
  test('🔴🔴🔴★★★★★★【会换答案】不分敌我、**含基地**;装备不在候选里', () => {
    expect(row().first, '★★★这一列必须是 anyUnit').toBe('anyUnit')
    const got = firstCandidates(scene(), P1, row().first).slice().sort()
    expect(got, '★★★写成 friendlyUnit 会漏掉 foe;写成"战场上的"会漏掉 home').toEqual(['foe', 'home', 'mine'])
  })
})

describe('🔴🔴🔴★★★★★★619 第二问:「**其控制者的**一件武装」', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】按【第一个目标的控制者】筛,**不是打出者的**', () => {
                                                      
                               
    expect(second('mine'), '★选我方 ⇒ 只列我的武装').toEqual(['loose', 'onHome', 'onMine'])
    expect(second('foe'), '★★★选敌方 ⇒ 列的是**敌方**武装').toEqual(['foeGear'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】只列 §150.1 **[武装]标签**,不是"装备"泛指', () => {
                                                                 
    expect(second('mine'), '★★★plainEquip 不该进来').not.toContain('plainEquip')
  })

  test('🔴🔴🔴★★★★★★【会换答案·QA L279 Q1】**已经贴在该单位身上**的那件**也在候选里**', () => {
                                                     
                                      
    expect(second('mine'), '★★★onMine 必须在候选里(它就是"卸除"那一支的入口)').toContain('onMine')
  })

  test('🔴🔴🔴★★★★★★【会换答案】没有位置词 ⇒ **含基地**;但只数**场上的**、手牌里的不算', () => {
                                                       
                                                       
    expect(second('mine'), '★onHome 贴在基地里的单位上,照样能选').toContain('onHome')
    expect(second('mine'), '★★★手牌里那件不该进来(砍掉位置过滤这条当场红)').not.toContain('inHand')
  })

  test('🔴🔴🔴★★★★★★【会换答案】第一个目标没选/不存在 ⇒ 第二问**问不出来**', () => {
    expect(second(undefined), '★★★没有第一个目标就谈不上"其控制者"').toEqual([])
    expect(second('ghost'), '★物件不存在也一样').toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★619 效果:「贴附**或**卸除」——由盘面唯一确定', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】已贴在**该单位**身上 ⇒ **卸除**(§435.1.a)', () => {
                                                           
                                                        
    const evs = attachOrDetach('mine', 'onMine', scene(), P1)
    expect(kinds(evs)).toEqual(['detach'])
    expect(evs[0]).toMatchObject({ obj: 'onMine' })
  })

  test('🔴🔴🔴★★★★★★【会换答案】散着的 ⇒ **贴附**;⚠️`attach` **必须带 `player`**(§437/479)', () => {
    const evs = attachOrDetach('mine', 'loose', scene(), P1)
    expect(kinds(evs)).toEqual(['attach'])
    expect(evs[0], '★★★漏了 player 会让"当【你】为我贴附武装时"那族认不出人').toMatchObject({
      obj: 'loose', to: 'mine', player: P1,
    })
  })

  test('🔴🔴🔴★★★★★★【会换答案】贴在**别人**身上的 ⇒ 对该单位是**贴附**(§434.1.f 自动换宿主)', () => {
                                                             
    const evs = attachOrDetach('mine', 'onHome', scene(), P1)
    expect(kinds(evs), '★★★它贴在 home 上,不是 mine 上').toEqual(['attach'])
    expect(evs[0]).toMatchObject({ obj: 'onHome', to: 'mine' })
  })

  test('🔴🔴🔴★★★★★★【会换答案】武装物件**不存在** ⇒ 一条都不发(不能对着空气发 attach)', () => {
                                                            
    expect(attachOrDetach('mine', 'ghost', scene(), P1)).toEqual([])
    expect(kinds(resolveEvs('mine', 'ghost')), '★★★端到端:只剩那句抽牌').toEqual(['draw'])
  })

  test('🔴🔴🔴★★★★★★【真结算·端到端】贴附落地后真的挂上;卸除落地后真的卸下', () => {
    const on = applyEvents(scene(), resolveEvs('mine', 'loose'), {}).state
    expect(on.objects[asObjId('loose')]!.status.attachedTo, '★★★贴上了').toBe(asObjId('mine'))
    const off = applyEvents(scene(), resolveEvs('mine', 'onMine'), {}).state
    expect(off.objects[asObjId('onMine')]!.status.attachedTo, '★★★卸下了').toBeUndefined()
  })
})

describe('🔴🔴🔴★★★★★★619 「抽一张牌」——独立一句,不与目标连坐', () => {
  test('🔴🔴🔴★★★★★★【真结算】两个目标都在 ⇒ 贴附/卸除**在前**、抽牌**在后**', () => {
    expect(row().draw).toBe(1)
    expect(kinds(resolveEvs('mine', 'loose')), '★★★顺序照卡文').toEqual(['attach', 'draw'])
    expect(kinds(resolveEvs('mine', 'onMine'))).toEqual(['detach', 'draw'])
  })

  test('🔴🔴🔴★★★★★★【会换答案】目标缺一半 / 一个都没有 ⇒ 前两句无操作,**抽牌照发**', () => {
                                                 
    expect(kinds(resolveEvs('mine', undefined)), '★★★只缺第二个').toEqual(['draw'])
    expect(kinds(resolveEvs(undefined, 'loose')), '★★★只缺第一个').toEqual(['draw'])
    expect(kinds(resolveEvs(undefined, undefined)), '★★★两个都没有').toEqual(['draw'])
    expect(resolveEvs(undefined, undefined)[0], '★抽牌人是打出者').toMatchObject({ player: P1, count: 1 })
  })
})
