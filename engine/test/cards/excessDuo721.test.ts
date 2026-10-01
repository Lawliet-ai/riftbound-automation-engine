import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { checkTrigger } from '../../src/dsl/trigger'
import { cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { UNL_187, ENFORCER_EXCESS_MIN, makeEnforcerTrigger } from '../../data/cards/UNL-187'
import { HUNTING_EXCESS_MIN, EXTRA_BF_DEFIDS, makeHuntingGroundsTrigger, UNL_217_CARD_EFFECT } from '../../data/cards/battlefields-extra'

                                                        
                                                               
                                                                 
  
                                            
                                                 
                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string, extra: Partial<GameObject> = {}): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  ...extra,
} as GameObject)
const enforcer = (status: Record<string, boolean> = {}): GameObject =>
  ({ ...obj('en', P1, `legend:${P1}`), defId: 'UNL-187', baseTypes: ['legend'], status } as GameObject)

function scene(objs: readonly GameObject[], excess?: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    ...(excess !== undefined ? { maxExcessDamageThisTurn: { [P1 as string]: excess } } : {}) } as GameState
}

const conquer = (player: PlayerId, battlefield = BF0): GameEvent =>
  ({ kind: 'conquer', player, battlefield } as unknown as GameEvent)
const trig = makeEnforcerTrigger(asObjId('en'), P1)

describe('★★★★★★★ ①②③共判据(两卡各钉)', () => {
  test('★★★★★★执法官:恰3响/2不响(㉙ 边界)/账缺保守不响/对手征服不响', () => {
    expect(checkTrigger(trig, conquer(P1), scene([enforcer()], 3), P1)).toBe(true)
    expect(checkTrigger(trig, conquer(P1), scene([enforcer()], 2), P1), '★2 点不够').toBe(false)
    expect(checkTrigger(trig, conquer(P1), scene([enforcer()]), P1), '★账缺=0 ⇒ 不响').toBe(false)
    expect(checkTrigger(trig, conquer(P2), scene([enforcer()], 3), P2), '★对手征服').toBe(false)
    expect(ENFORCER_EXCESS_MIN, '★阈值钉字面量').toBe(3)
  })

  test('★★★★★捕猎场:此处响/别处不响/恰3响 2不响;对手征服不响', () => {
    const bfTrig = makeHuntingGroundsTrigger(BF0, P1)
    expect(checkTrigger(bfTrig, conquer(P1, BF0), scene([], 3), P1)).toBe(true)
    expect(checkTrigger(bfTrig, conquer(P1, BF1), scene([], 3), P1), '★「此处」').toBe(false)
    expect(checkTrigger(bfTrig, conquer(P1, BF0), scene([], 2), P1)).toBe(false)
    expect(checkTrigger(bfTrig, conquer(P2, BF0), scene([], 3), P2), '★每玩家一份(★686)').toBe(false)
    expect(HUNTING_EXCESS_MIN).toBe(3)
  })
})

describe('★★★★★★★ ④执法官:★1500 搬通道后 —— 问在确认阶段、费用在确认阶段付', () => {
                                               
                                                              
                                                 
                                                                
                                                          
                                               
  test('★★★★★★问1搬到确认阶段 ⇒ 结算期第一问就是「选哪一名单位」(敌我全在;传奇不在)', () => {
    const s = scene([enforcer(), obj('mine', P1, BF0, { status: { dormant: true } } as Partial<GameObject>), obj('foe', P2, BF0)], 3)
    expect(trig.mayChoose, '★★§383.3.a:那一问在确认阶段').toBe(true)
    const q = trig.nextChoice!(s, conquer(P1), {})!
    expect(q.candidates.map((c) => c.id).sort(), '★「一名单位」零限定词=敌我全在;传奇不在').toEqual(['foe', 'mine'])
    expect(trig.nextChoice!(s, conquer(P1), { enforcerVictim: 'mine' }), '★答完就不问了').toBeNull()
  })

  test('🛑★★★★★★【§383.3.b】费用在【确认阶段】扣 + 付不起给 null;`effect` 里【只剩收益】', () => {
    const s = scene([enforcer(), obj('mine', P1, BF0, { status: { dormant: true } } as Partial<GameObject>)], 3)
                    
    const paid = trig.basePerform!(s, conquer(P1), {})
    expect(paid, '★付得起').not.toBeNull()
    expect(paid!.objects['en' as never]!.status.tapped, '★★★★★确认阶段就休眠了(修前要等结算才发)').toBe(true)
                                               
    const tapped = scene([enforcer({ tapped: true }), obj('u', P1, BF0)], 3)
    expect(trig.basePerform!(tapped, conquer(P1), {}), '★★已休眠 ⇒ null').toBeNull()
                                                  
    const evs = trig.effect(paid!, conquer(P1), { enforcerVictim: 'mine' })
    expect(evs.map((e) => (e as { kind: string }).kind), '★★★★★只剩收益那一条').toEqual(['statusChange'])
    expect(evs[0], '★「变为活跃」=dormant:false(㊼ IRONBLOOD)').toMatchObject({ target: 'mine', key: 'dormant', value: false })
    const after = applyEvents(paid!, evs as never, {}).state
    expect(after.objects['en' as never]!.status.tapped, '★费用已在确认阶段付掉').toBe(true)
    expect(after.objects['mine' as never]!.status.dormant).toBe(false)
  })

  test('★★★★★【费用门搬进 `when`】已休眠 ⇒ 连触发都不入链(与「不确认、视为未触发」可观测等价)', () => {
                                                                 
                                                           
    const tapped = scene([enforcer({ tapped: true }), obj('u', P1, BF0)], 3)
    expect(checkTrigger(trig, conquer(P1), tapped, P1), '★已休眠 ⇒ 不入链').toBe(false)
    expect(checkTrigger(trig, conquer(P1), scene([enforcer(), obj('u', P1, BF0)], 3), P1), '★前提自证:没休眠就入链').toBe(true)
    // ⚠️ 原来那条「答 skip ⇒ 不发」**没有载体了**:玩家现在是在确认阶段答「不执行」,
    //   §383.3.a.2 直接把项目从链上移除、视为未触发 ⇒ 结算期根本走不到 `effect`
    //   (那条路由 `chainFepr` 的 `MAY_CHOOSE_DECLINE` 分支管,有自己的闸)。
  })
})

describe('★★★★★★★ ⑤捕猎场:战鹰落地', () => {
  test('★★★★★★spawnToken 战鹰(1S+法盾+落我基地);卡自己不发打出信号 (集中闸 test/loop/tokenPlayOnce1258.test.ts);E2E 落地', () => {
    const bfTrig = makeHuntingGroundsTrigger(BF0, P1)
    const s = scene([], 3)
    const evs = bfTrig.effect(s, conquer(P1, BF0), {}) as unknown as readonly { kind: string, spec?: { defId: string, might?: number, keywords?: readonly string[] }, zone?: string, unit?: string }[]
                                                                                                                                         
    expect(evs.map((e) => e.kind)).toEqual(['spawnToken'])
    expect(evs[0]!.zone, '★「打出」落基地(㊼ UNL-160 同文)').toBe(`base:${P1}`)
    const after = applyEvents(s, evs as never, {}).state
    const hawk = Object.values(after.objects).find((o) => (o.defId as string).includes('战鹰'))!
    expect(hawk, '★战鹰落地').toBeTruthy()
    expect(hawk.baseMight, '★1[S]').toBe(1)
    expect(hawk.baseKeywords, '★「它拥有{{法盾}}」=token 自带(★693)').toContain('法盾')
    expect(UNL_217_CARD_EFFECT).toContain('战鹰')
  })
})

describe('★ 前提:登记(正典折叠+表行)', () => {
  test('★★★★★执法官:传奇 0费 红+黄、三号一组、keywords 三号空;捕猎场:战场卡+EXTRA_BF 表行', () => {
    expect(CARD_COSTS['UNL-187']).toEqual({ mana: 0, pips: 0, colors: ['red', 'yellow'] })
    expect(cardKind('UNL-187')).toBe('legend')
    expect(VARIANT_GROUPS['UNL-187']).toEqual(['UNL-187', 'UNL-229', 'UNL-229*'])
    for (const no of ['UNL-187', 'UNL-229', 'UNL-229*']) expect(cardKeywords(no), no).toEqual([])
    expect(UNL_187.energy).toBe(0)
    expect(cardKind('UNL-217')).toBe('battlefield')
    expect(EXTRA_BF_DEFIDS, '★表行删了当场红').toContain('UNL-217')
  })
})
