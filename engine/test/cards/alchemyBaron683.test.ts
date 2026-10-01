import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { activeTriggers, activatedFor, cardKind, cardCost } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { alchemyBaronGoldBonus, BARON_SCORE_GAP } from '../../data/cards/SFD-201'

                                                        
                                              
                                                  
                      
  
           
                          
                                                           
                                                                 
                                                 
                                                
                                          
                                                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, defId: string, ctrl: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
} as GameObject)

function scene(objs: readonly GameObject[], scores: Record<string, number> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, scores: { ...base.scores, ...scores } } as GameState
}

const baron = (extra: Partial<GameObject> = {}): GameObject => obj('bn', 'SFD-201', P1, `legend:${P1}`, extra)

                                       
function holdAndResolve(st: GameState, who: PlayerId = P1): GameState {
  let s = landAndEnqueueTriggers(
    st, [{ kind: 'hold', player: who, battlefield: BF0 } as never], activeTriggers, who, {})
  for (let i = 0; i < 5 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
                                                                
      const paid = it.basePerform ? it.basePerform(s, {}) : s
      if (paid === null) continue
      s = applyEvents(paid, it.resolve(paid, {}, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
const chainLen = (st: GameState, who: PlayerId): number =>
  landAndEnqueueTriggers(st, [{ kind: 'hold', player: who, battlefield: BF0 } as never], activeTriggers, who, {}).chain.length

describe('★ 前提:①传奇登记/双印次', () => {
  test('★★★★★传奇 0费 两号一组;UNIT_COST {mana:0}(★650 传奇必登);阈值=3(㊶ 一处)', () => {
    expect(CARD_COSTS['SFD-201']).toEqual({ mana: 0, pips: 0, colors: ['blue', 'yellow'] })
    expect(cardKind('SFD-201')).toBe('legend')
    expect(VARIANT_GROUPS['SFD-201']).toEqual(['SFD-201', 'SFD-249'])
    expect(cardCost('SFD-201')).toEqual({ mana: 0 })
    expect(BARON_SCORE_GAP).toBe(3)
  })
})

describe('★★★★★★★ ②句①:据守 ⇒ 可选自休眠换休眠金币', () => {
  test('★★★★★★我据守 ⇒ 入链;resolve ⇒ 男爵 tapped(传奇休眠口径)+金币落我基地且 tapped(「休眠的」)', () => {
    const s = holdAndResolve(scene([baron()]))
    const bn = s.objects[asObjId('bn')]!
    const gold = Object.values(s.objects).find((o) => o.defId === 'token:金币')!
    expect(bn.status.tapped, '★「让我变为休眠状态」是费用,传奇休眠=tapped(第87/609轮口径)').toBe(true)
    expect(gold.zone).toBe(`base:${P1}`)
    expect(gold.status.tapped, '★「打出一个【休眠的】金币」').toBe(true)
  })

  test('★★★★★★敌方据守不触发(by:你;1v1 友方玩家=∅);已横置男爵付不出费 ⇒ 不入链(㊹ 不白拿)', () => {
    expect(chainLen(scene([baron()]), P2), '★对手据守不是「你或友方玩家」').toBe(0)
    expect(chainLen(scene([baron({ status: { tapped: true } })]), P1), '★canDormantSelf 入链门').toBe(0)
    expect(chainLen(scene([baron()]), P1), '★正样对照:活跃男爵+我据守=入链').toBe(1)
  })
})

describe('★★★★★★★ ③④句②:分差≤3 时金币{获得}额外+{1}', () => {
  const at = (objs: readonly GameObject[], myScore: number): boolean =>
    alchemyBaronGoldBonus(scene(objs, { [P1 as string]: myScore }), P1)

  test('★★★★★★判定六档:分差3成立/4不成立(㉙ 边界);无男爵/敌方男爵/手牌男爵全否;249 异画+休眠男爵都罩', () => {
    const wt = createInitialState([P1, P2], 2).winTarget
    expect(at([baron()], wt - 3), '★「不超过3分」= ≤3 含等').toBe(true)
    expect(at([baron()], wt - 4), '★差 4 分不够').toBe(false)
    expect(at([], wt - 1), '★没有男爵').toBe(false)
    expect(at([obj('bn', 'SFD-249', P2, `legend:${P2}`)], wt - 1), '★敌方男爵不是「你的」').toBe(false)
    expect(at([obj('bn', 'SFD-201', P1, `hand:${P1}`)], wt - 1), '★手牌里的男爵不在场').toBe(false)
    expect(at([obj('bn', 'SFD-249', P1, `legend:${P1}`)], wt - 1), '★任一印次都算').toBe(true)
    expect(at([baron({ status: { tapped: true } })], wt - 1), '★卡文没写活跃 ⇒ 休眠男爵也罩(句①付费后句②照常)').toBe(true)
  })

  test('★★★★★★④消费点:金币 resolve 现判 ⇒ 加成时 gainResource 带 mana:1,否则不带', () => {
    const wt = createInitialState([P1, P2], 2).winTarget
    const spec = activatedFor('token:金币')[0]!
    const mk = (st: GameState) => spec.makeResolve({ selfOid: 'g1', controller: P1 } as never)(st, {} as never, undefined as never)
    expect(mk(scene([baron()], { [P1 as string]: wt - 3 }))).toEqual(
      [{ kind: 'gainResource', player: P1, energy: { '*': 1 }, mana: 1 }])
    expect(mk(scene([baron()], { [P1 as string]: 0 })), '★分差大 ⇒ 原样 [A]').toEqual(
      [{ kind: 'gainResource', player: P1, energy: { '*': 1 } }])
    expect(mk(scene([], { [P1 as string]: wt - 1 })), '★无男爵 ⇒ 原样').toEqual(
      [{ kind: 'gainResource', player: P1, energy: { '*': 1 } }])
  })
})
