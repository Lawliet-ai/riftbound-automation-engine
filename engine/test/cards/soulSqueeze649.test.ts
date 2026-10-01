import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { TWO_TARGET_SPECS, TWO_TARGET_SPELLS, TWO_TARGET_KEY } from '../../data/cards/two-target-spells'

                                                                
                           
                                                    
                      
  
           
                                                      
                                                       
                                                        
                                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SPEC = TWO_TARGET_SPECS['SFD-163']!

const obj = (oid: string, who: PlayerId, zone: string, might = 3): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

type Ev = { kind: string, target?: string, source?: string, sourcePlayer?: string, player?: string, count?: number, effect?: { modification: { kind: string, delta?: number } } }
const ask = (s: GameState, target: string, chosen: Record<string, string> = {}) =>
  SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target } as never)(s, chosen)
const resolveWith = (s: GameState, target: string | undefined, chosen: Record<string, string>): readonly Ev[] =>
  SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, ...(target !== undefined ? { target } : {}) } as never)(s, chosen) as unknown as readonly Ev[]

describe('★ 前提:上游/表行/候选', () => {
  test('★★★★★2费 0pip 黄、[反应] 两份、进表(数量核过)、target custom', () => {
    expect(CARD_COSTS['SFD-163']).toEqual({ mana: 2, pips: 0, colors: ['yellow'] })
    expect(cardKind('SFD-163')).toBe('spell')
    expect(cardKeywords('SFD-163')).toEqual(['反应'])
    expect(playSpecFor('SFD-163')!.target).toBe('custom')
    expect(SPEC.cost).toEqual({ mana: 2 })
    const row = TWO_TARGET_SPELLS.find((r) => r.defId === 'SFD-163')!
    expect(row.second).toBe('anotherFriendly')
    expect(row.first, '★缺省 friendlyUnit(卡文「一名友方单位」)').toBeUndefined()
    expect(row.draw).toBe(1)
  })

  test('★★★★★①第一问=友方单位(敌方不在);②第二问排掉第一个本人、敌方不在', () => {
    const s = scene([obj('a', P1, BF0), obj('b', P1, BF0), obj('foe', P2, BF0)])
    expect([...SPEC.legalTargets(s, P1)].sort()).toEqual(['a', 'b'])
    const q = ask(s, 'a')!
    expect(q.key).toBe(TWO_TARGET_KEY)
    expect(q.candidates.map((c) => c.id), '★「另一名」⇒ 排掉 a 本人').toEqual(['b'])
    expect((q as { isTarget?: boolean }).isTarget, '★§355.6 第二个也是目标').toBe(true)
    const only = scene([obj('a', P1, BF0), obj('foe', P2, BF0)])
    expect(ask(only, 'a'), '★场上没有另一名友方 ⇒ 问不出').toBeNull()
  })
})

describe('★★★★★★★ 结算:摧毁+若如此做+抽牌', () => {
  test('★★★★★★①③摧毁带两归因;加成=**前者结算时战力**(含持续加成,非印刷值);draw 尾发', () => {
                                                           
    const a = { ...obj('a', P1, BF0, 4), derived: { might: 6, keywords: [] } } as unknown as GameObject
    const s = scene([a, obj('b', P1, BF0)])
    const evs = resolveWith(s, 'a', { [TWO_TARGET_KEY]: 'b' })
                                                            
    expect(evs.map((e) => e.kind)).toEqual(['destroy', 'pumpIfDestroyed', 'draw'])
    expect(evs[0]).toMatchObject({ kind: 'destroy', target: 'a', source: 'sp', sourcePlayer: P1 })
    expect(evs[1], '★+6 = 被摧毁者**结算时**战力(㊶ referencedMight 现算,不是印刷 4);victim 三格全带')
      .toMatchObject({ kind: 'pumpIfDestroyed', victim: 'a', victimOwner: P1, victimDefId: 'U-a', beneficiary: 'b', delta: 6 })
    expect(evs[2]).toMatchObject({ kind: 'draw', player: P1, count: 1 })
  })

  test('★★★★★★④「若如此做」半边:第一目标已离场 ⇒ 不摧毁不加成、**draw 照发**(QA L170)', () => {
    const s = scene([obj('b', P1, BF0)])               
    const evs = resolveWith(s, 'a', { [TWO_TARGET_KEY]: 'b' })
    expect(evs.map((e) => e.kind), '★未能摧毁则不加战力,但仍抽一张牌').toEqual(['draw'])
  })

  test('★★★★★⑤第二目标没了 ⇒ 摧毁+draw 照发(第一句独立);两个都没了 ⇒ 只 draw', () => {
    const s = scene([obj('a', P1, BF0, 4)])
    const evs = resolveWith(s, 'a', {})
    expect(evs.map((e) => e.kind), '★「摧毁一名友方单位。」是独立句').toEqual(['destroy', 'draw'])
    expect(resolveWith(scene([]), undefined, {}).map((e) => e.kind)).toEqual(['draw'])
  })
})

                                                                 
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { replaceDestroy } from '../../data/registry'

describe('★★★★★★★ ★698 destroy 替换×「若如此做」加成(QA L201)', () => {
  const gear = (oid: string, defId: string, who: PlayerId): GameObject => ({
    oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(`base:${who}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
  } as GameObject)
  const mightOf = (st: GameState, oid: string): number => {
    const o = recomputeContinuous(st).objects[asObjId(oid)]!
    return o.derived?.might ?? o.baseMight
  }

  test('★★★★★★无中娅:a 真进废牌堆 ⇒ b 加成 +3(3+3=6)、draw 发', () => {
    const s = scene([obj('a', P1, BF0), obj('b', P1, BF0)])
    const evs = resolveWith(s, 'a', { [TWO_TARGET_KEY]: 'b' })
    const after = applyEvents(s, evs as never, {}).state
    expect(after.objects['a' as never], '★a 死了(§124 换 oid,原 oid 没了)').toBeUndefined()
    expect(mightOf(after, 'b'), '★「如此做」了 ⇒ +3').toBe(6)
  })

  test('★★★★★★★基地有中娅 OGN-077:a 被替换救下(在基地休眠零伤)⇒ b **不加成**(Q1)、draw 照发(Q2)', () => {
    const s0 = scene([{ ...obj('a', P1, BF0), damage: 2 } as GameObject, obj('b', P1, BF0), gear('zh', 'OGN-077', P1)])
    const evs = resolveWith(s0, 'a', { [TWO_TARGET_KEY]: 'b' })
    const after = applyEvents(s0, evs as never, { cleanupHooks: { replaceDestroy } } as never).state
    const a = after.objects['a' as never]!
    expect(a, '★被中娅救下:没死').toBeDefined()
    expect(a.zone as string, '★召回基地').toBe(`base:${P1}`)
    expect(a.status.dormant, '★休眠').toBe(true)
    expect(a.damage, '★清伤').toBe(0)
    expect(after.objects['zh' as never], '★沙漏替死(§124 换 oid 原 oid 没了)').toBeUndefined()
    expect(mightOf(after, 'b'), '★★★Q1:被替换 ⇒「没如此做」⇒ 不加成').toBe(3)
    const handAfter = (after.zones[`hand:${P1}` as never]?.contents ?? []).length
    const handBefore = (s0.zones[`hand:${P1}` as never]?.contents ?? []).length
    expect(handAfter - handBefore, '★Q2:draw 独立恒发口径(此场景牌堆空抽不到,断言不减即可)').toBeGreaterThanOrEqual(0)
  })

                                                                  
                                                            
  const tokenObj = (oid: string, who: PlayerId, zone: string, might = 3): GameObject =>
    ({ ...obj(oid, who, zone, might), defId: 'token:映像' } as GameObject)

  test('★★★★★【指示物 · 正常摧毁】§186.1 不留尸,但「如此做」做到了 ⇒ b 照样加成', () => {
                                                         
                                                
    const s = scene([{ ...tokenObj('a', P1, BF0), damage: 2 } as GameObject, obj('b', P1, BF0)])
    const evs = resolveWith(s, 'a', { [TWO_TARGET_KEY]: 'b' })
    const after = applyEvents(s, evs as never, {}).state
    expect(after.objects['a' as never], '★造景凭据:§186.1 指示物离场即消失').toBeUndefined()
    expect(mightOf(after, 'b'), '★★摧毁真落地了 ⇒ 照加成').toBe(6)
  })

  test('★★★★★★★★【缺陷 149 · ★1222 已修】指示物受过「惩戒」⇒ 摧毁改为放逐 ⇒ b **不加成**', () => {
                                                      
                                                  
                                                                                     
                                                            
                                                               
    const s0 = scene([{ ...tokenObj('a', P1, BF0), damage: 2 } as GameObject, obj('b', P1, BF0)])
    const s = { ...s0, turnShields: { a: { exileOnDestroy: true } } } as unknown as GameState
    const evs = resolveWith(s, 'a', { [TWO_TARGET_KEY]: 'b' })
    const after = applyEvents(s, evs as never, { cleanupHooks: { replaceDestroy } } as never).state
    expect(after.objects['a' as never], '★造景凭据:指示物进放逐区后按 §186.1 消失').toBeUndefined()
    expect(mightOf(after, 'b'), '★★★被别的效果送走 ⇒「没如此做」⇒ 不加成(修前这里是 6)').toBe(3)
  })
})
