import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous, expireThisTurnEffects } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { canPlayInTiming } from '../../src/loop/timing'
import { cardKind, cardKeywords, cardCost, playSpecFor, grantedSpec } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { CARD_FACTS } from '../../data/cardFacts'
import { PUMP_SPELLS, PUMP_SPELL_SPECS } from '../../data/cards/pump-spells'
import {
  VEN_142_CARD_EFFECT, VEN_142_GRANT_KEY, VEN_142_GRANTED_SPEC, VEN_142_ABILITY_COST,
} from '../../data/cards/VEN-142'

                                                              
                              
                                                                      
                                            
                                                            
  
             
                                          
                                                           
                                                            
                                               
                                                      
                                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, ctrl: PlayerId, zone: string, might = 6): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

                                                 
function scene(might = 6): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [unit('mine', P1, BF0, might), unit('foe', P2, BF0, might), unit('home', P1, `base:${P1}`, might)]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
}

const spec = () => PUMP_SPELL_SPECS['VEN-142']!
const row = () => PUMP_SPELLS.find((r) => r.defId === 'VEN-142')!
const resolve = (target: string, s: GameState = scene()): readonly GameEvent[] =>
  spec().makeResolve({ movedCardOid: 'sp', target, controller: P1 })(s)
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)
const mightOf = (s: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(s).objects[asObjId(oid)]!).actual

describe('🔴🔴🔴★★★★★★617 终极统治:前提与接线', () => {
  test('★前提:**专属法术** 4费 **0pip**(双色却无 pip)、**单印次**、卡文一字不差', () => {
    expect(cardKind('VEN-142')).toBe('spell')
                                                        
    expect(CARD_COSTS['VEN-142']).toEqual({ mana: 4, pips: 0, colors: ['red', 'orange'] })
    expect(CARD_COSTS['VEN-142a'], '★单印次:没有 a 号').toBeUndefined()
    expect(CARD_FACTS['VEN-142']?.exclusive, '★§103.2.d 专属卡(只影响构筑,不影响结算)').toBe(true)
    expect(row().cost.pips ?? [], '★spec 里也别凭空造 pip').toEqual([])
    expect(VEN_142_CARD_EFFECT).toBe(
      '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
      + '在本回合内，让一名单位的战力翻倍，并给予其“{{A}}{{A}}：让我变为活跃状态。”')
  })

  test('🔴🔴🔴★★★★★★接线:打出规格查得到;[迅捷] **两处都要登**;法术不进 `UNIT_COST`', () => {
    expect(playSpecFor('VEN-142'), '★★★汇总口漏了 ⇒ 这张卡打不出来').toBeDefined()
    expect(spec().keywords, '★①时机门读的是 spec.keywords').toEqual(['迅捷'])
                                                 
                                                
    expect(cardKeywords('VEN-142'), '★★★②`cardKeywords()` 不看 `Card.keywords` 字面量').toEqual(['迅捷'])
    expect(cardCost('VEN-142'), '★法术不进 UNIT_COST').toEqual({ mana: 0 })
  })

  test('🔴🔴🔴★★★★★★【真时机·会换答案】法术对决态下带 [迅捷] 才打得出(§308.1.a)', () => {
    const duel = { ...scene(), spellDuelActive: true } as GameState
    expect(canPlayInTiming(duel, spec().keywords, false), '★★★keywords 漏了迅捷这条当场红').toBe(true)
    expect(canPlayInTiming(duel, [], false), '★反方向:不带权限关键词的法术在对决里打不出').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★617 候选:「一名单位」——一个限定词都没有', () => {
  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】照抄背水一战 OGN-069 的「**友方**」这条当场红', () => {
                                                               
                                                                
    const got = (spec().legalTargets(scene(), P1) as string[]).slice().sort()
    expect(got, '★★★写成 friendlyUnit 会漏掉 foe;写成"战场上的"会漏掉 home').toEqual(['foe', 'home', 'mine'])
    expect(row().targets, '★★★这一列**必须缺省**(给了任何一档都是收窄)').toBeUndefined()
  })
})

describe('🔴🔴🔴★★★★★★617 产出:「战力翻倍」+「授予一条主动技能」两条,都本回合', () => {
  test('🔴🔴🔴★★★★★★【真结算】发**两条**持续效果,都打在**同一个目标**上、都 `thisTurn`', () => {
    const evs = resolve('mine')
    expect(evs.length, '★★★两条都要发(只发一条就是"半张卡")').toBe(2)
    expect(kinds(evs)).toEqual(['addEffect', 'addEffect'])
    const eff = evs.map((e) => (e as unknown as {
      effect: { id: string; duration: string; fromPassive: boolean; modification: { kind: string; specKey?: string } }
    }).effect)
    expect(eff.map((e) => e.modification.kind), '★★★翻倍在前、授予在后').toEqual(['doubleMight', 'grantActivated'])
                                                            
    expect(eff.map((e) => e.duration), '★★★授予那条写成 permanent 这条当场红').toEqual(['thisTurn', 'thisTurn'])
    expect(eff.map((e) => e.fromPassive), '★法术不是被动来源 ⇒ §477.3.b 要快照').toEqual([false, false])
    expect(eff[1]!.modification.specKey, '★★★授予的是本卡那条技能的 key').toBe(VEN_142_GRANT_KEY)
    expect(eff.map((e) => e.id), '★两条 id 互不相同,否则会塌成一份')
      .toEqual(['VEN-142:dbl:mine', 'VEN-142:gact:mine'])
  })

  test('🔴🔴🔴★★★★★★【会换答案·端到端】战力真的翻倍(§432.1),**负战力翻倍→+0**(§477.3.c)', () => {
    const s = scene(6)
    expect(mightOf(applyEvents(s, resolve('mine', s), {}).state, 'mine'), '★6 ⇒ 12').toBe(12)
                                                            
    const neg = scene(-3)
    expect(mightOf(applyEvents(neg, resolve('mine', neg), {}).state, 'mine'), '★★★-3 ⇒ -3(+0)').toBe(-3)
  })

  test('🔴🔴🔴★★★★★★【会换答案】翻的是**被选中那个**,别人一点不动', () => {
    const s = scene(6)
    const after = applyEvents(s, resolve('foe', s), {}).state
    expect(mightOf(after, 'foe'), '★选了敌方就翻敌方(候选不分敌我)').toBe(12)
    expect(mightOf(after, 'mine'), '★★★predicate 写宽了这条当场红').toBe(6)
  })

  test('🔴🔴🔴★★★★★★【会换答案】没选目标 ⇒ **一条都不发**', () => {
    expect(spec().makeResolve({ movedCardOid: 'sp', controller: P1 })(scene())).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★617 被授予的那条技能:「{A}{A}:让我变为活跃状态。」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】费用是**两枚【任意域】符能**,不是 2 点法力', () => {
                                                                                   
                                                                   
    expect(VEN_142_ABILITY_COST).toEqual({ pips: [[], []] })
    expect(VEN_142_GRANTED_SPEC.cost.mana, '★★★写成 mana:2 这条当场红').toBeUndefined()
    expect((VEN_142_GRANTED_SPEC.cost.pips ?? []).length, '★★★**两**枚,不是一枚').toBe(2)
    expect(VEN_142_GRANTED_SPEC.cost.pips, '★★★写成 [[\'red\'],[\'orange\']] 会变成"要红要橙"').toEqual([[], []])
    expect(VEN_142_GRANTED_SPEC.tapSelf, '★冒号前**没有**横置符号').toBeUndefined()
  })

  test('🔴🔴🔴★★★★★★【会换答案】`GRANTED_SPECS` 里查得到(㉕ 不登记 = 通道关闭)', () => {
    const got = grantedSpec(VEN_142_GRANT_KEY)
    expect(got, '★★★登记漏了 ⇒ 技能授予出去也按不出来').toBeDefined()
    expect(got!.key).toBe(VEN_142_GRANT_KEY)
  })

  test('🔴🔴🔴★★★★★★【会换答案】那条技能里的「**我**」= **被授予的那名单位**(§718.5.g)', () => {
                                                                   
                                    
    const evs = VEN_142_GRANTED_SPEC.makeResolve({ selfOid: 'foe', controller: P2 })(scene())
    expect(evs, '★★★对**自己**解除休眠').toEqual([
      { kind: 'statusChange', target: 'foe' as ObjId, key: 'dormant', value: false },
    ])
  })

  test('🔴🔴🔴★★★★★★【会换答案】「变为活跃」解的是 **`dormant`**(单位)不是 `tapped`(装备)', () => {
                                                             
    const dormant = { ...scene(), objects: {} } as GameState
    const me = { ...unit('me', P1, BF0), status: { dormant: true } } as unknown as GameObject
    const s = {
      ...dormant,
      objects: { me },
      zones: { ...dormant.zones, [asZoneId(BF0)]: { ...dormant.zones[asZoneId(BF0)]!, contents: [asObjId('me')] } },
    } as GameState
    const after = applyEvents(s, VEN_142_GRANTED_SPEC.makeResolve({ selfOid: 'me', controller: P1 })(s), {}).state
    expect(after.objects[asObjId('me')]!.status.dormant, '★★★写成 tapped 这条当场红').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★617 端到端:授予真的落到派生态上,而且只管本回合', () => {
  test('🔴🔴🔴★★★★★★【会换答案】结算后 `derived` 里带上那个 key;**回合结束就没了**', () => {
    const s = scene(6)
    const after = applyEvents(s, resolve('mine', s), {}).state
    const live = recomputeContinuous(after)
    expect(live.objects[asObjId('mine')]!.derived?.grantedActivated, '★★★没落到派生态 = 玩家按不到这条技能')
      .toContain(VEN_142_GRANT_KEY)
    expect(live.objects[asObjId('foe')]!.derived?.grantedActivated ?? [], '★别人没有').not.toContain(VEN_142_GRANT_KEY)
                                           
    const next = recomputeContinuous(expireThisTurnEffects(after))
    expect(next.objects[asObjId('mine')]!.derived?.grantedActivated ?? [], '★★★写成 permanent 这条当场红')
      .not.toContain(VEN_142_GRANT_KEY)
    expect(effectiveMight(next.objects[asObjId('mine')]!).actual, '★战力也回到 6').toBe(6)
  })
})
