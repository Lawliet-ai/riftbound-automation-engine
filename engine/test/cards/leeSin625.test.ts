import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { cardKind, cardCost, cardKeywords, activatedFor, cardPassives } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { buffLimitOf } from '../../src/keywords/buff'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import {
  OGN_078, OGN_078_CARD_EFFECT, OGN_078_KEYWORDS, OGN_078_BUFF_LIMIT, OGN_078_TAP_KEY, OGN_078_SPEC,
} from '../../data/cards/OGN-078'

                                                           
                                                              
                                                                 
  
                                                             
  
             
                                              
                                                                    
                               
                                                                             
                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const SELF = 'leesin'

const leeSin = (oid = SELF, ctrl: PlayerId = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-078', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 5, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
                                     
const other = (oid: string, ctrl: PlayerId = P1): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

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
const kinds = (evs: readonly GameEvent[]): string[] => evs.map((e) => (e as { kind: string }).kind)

                                                                     
                                                                       
setCardPassiveProvider(cardPassives)

describe('🔴🔴🔴★★★★★★625 李青 OGN-078:前提与接线', () => {
  test('★前提:英雄单位 5费 **1绿pip** 5战力、**两印次**、卡文一字不差', () => {
    expect(cardKind('OGN-078')).toBe('unit')
                                                              
    expect(CARD_COSTS['OGN-078']).toEqual({ mana: 5, pips: 1, colors: ['green'] })
    expect(CARD_COSTS['OGN-078a'], '★★★两印次:a 号也在').toEqual({ mana: 5, pips: 1, colors: ['green'] })
    expect(OGN_078.energy).toBe(5)
    expect(OGN_078.power).toBe(5)
    expect(OGN_078_CARD_EFFECT).toBe(
      '{{坚守}}（如果我是防守方，则{{S}}+1。）\n'
      + '{{横置}}：给予我增益。（我获得一个{{S}}+1增益。）\n'
      + '我可以拥有不限数量的增益。')
  })

  test('🔴🔴🔴★★★★★★接线:[坚守] **必须登**印刷表;技能查得到;⚠️费用带 **1 枚绿 pip**', () => {
    expect(cardKeywords('OGN-078'), '★★★[坚守]在 IMPL_KEYWORDS 白名单,漏登就不生效').toEqual(['坚守'])
    expect(OGN_078_KEYWORDS).toEqual(['坚守'])
                                                    
    expect(activatedFor('OGN-078').map((s) => s.key), '★正典号').toContain(OGN_078_TAP_KEY)
    expect(activatedFor('OGN-078a').map((s) => s.key), '★★★再版号经别名折叠也查得到').toContain(OGN_078_TAP_KEY)
    expect(cardCost('OGN-078'), '★★★漏了 pip 会让这张卡便宜一枚符能')
      .toEqual({ mana: 5, pips: [['green']] })
  })
})

describe('🔴🔴🔴★★★★★★625 「{横置}:给予我增益」', () => {
  test('🔴🔴🔴★★★★★★【会换答案】冒号前**只有横置**(无资源费);发的是 `grantBuff`、打在**我自己**身上', () => {
    expect(OGN_078_SPEC.tapSelf, '★★★漏了 tapSelf 就能无限连按').toBe(true)
    expect(OGN_078_SPEC.cost, '★★★冒号前没有资源符号').toEqual({})
    const evs = OGN_078_SPEC.makeResolve({ selfOid: SELF, controller: P1 })(scene([leeSin()]))
                                                                    
    expect(kinds(evs)).toEqual(['grantBuff'])
    expect(evs[0], '★★★打在我自己身上').toMatchObject({ target: SELF })
  })
})

describe('🔴🔴🔴★★★★★★625 「我可以拥有**不限数量**的增益」', () => {
  const limitOf = (s: GameState, oid: string): number =>
    buffLimitOf(recomputeContinuous(s).objects[asObjId(oid)])

  test('🔴🔴🔴★★★★★★【会换答案·近似实现冒充】只放宽**我自己**;同场别人仍是缺省上限 1', () => {
                                                     
    const s = scene([leeSin(), other('mate', P1), other('foe', P2)])
    expect(limitOf(s, SELF), '★★★我被放宽').toBe(OGN_078_BUFF_LIMIT)
    expect(limitOf(s, 'mate'), '★★★队友没被放宽(§702.3 缺省 1)').toBe(1)
    expect(limitOf(s, 'foe'), '★敌方更不该被放宽').toBe(1)
  })

  test('🔴🔴🔴★★★★★★【会换答案】没有这条被动 ⇒ 缺省上限就是 **1**(㉙ 两头压)', () => {
                                    
    const bare = scene([other('solo', P1)])
    expect(limitOf(bare, 'solo')).toBe(1)
    expect(OGN_078_BUFF_LIMIT, '★★★这个数得比缺省的 1 大得多,才算"不限"').toBeGreaterThan(1)
  })

  test('🔴🔴🔴★★★★★★【源码级·会换答案】走的是 `setLimit{limit:\'buff\'}`,不是别的档', () => {
                                                                               
    const s = scene([leeSin()])
    const mods = cardPassives(s.objects[asObjId(SELF)]!, s).map((e) => e.modification)
    const setLimits = mods.filter((m) => (m as { kind: string }).kind === 'setLimit')
    expect(setLimits.length, '★★★这条被动没挂上 ⇒ 整句话是死的').toBe(1)
    expect(setLimits[0]).toMatchObject({ limit: 'buff', value: OGN_078_BUFF_LIMIT })
  })

  test('🔴🔴🔴★★★★★★【真结算·端到端】连按两次都拿得到增益(缺省上限 1 时第二次会被 §702.3 挡掉)', () => {
    const s = scene([leeSin()])
    const one = applyEvents(s, OGN_078_SPEC.makeResolve({ selfOid: SELF, controller: P1 })(s), {}).state
    expect(one.objects[asObjId(SELF)]!.counters['buff'], '★第一个增益').toBe(1)
                                                      
    const live = recomputeContinuous(one)
    const two = applyEvents(live, OGN_078_SPEC.makeResolve({ selfOid: SELF, controller: P1 })(live), {}).state
    expect(two.objects[asObjId(SELF)]!.counters['buff'], '★★★没这条被动的话这里会卡在 1').toBe(2)
  })
})
