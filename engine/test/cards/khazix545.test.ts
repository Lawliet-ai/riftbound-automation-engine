import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { cardKind, cardKeywords, cardCost, activeTriggers } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  UNL_143, UNL_143A, UNL_143_ABILITY, UNL_143_BONUS, UNL_143_XP, UNL_143_KEYWORDS,
  hasLonelyFoeHere, makeKhazix143Triggers,
} from '../../data/cards/UNL-143'

                                                       
                                                          
                                
  
                 
                                                            
                                              
                                                 
                                             
                                                    
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const SELF = 'kha'

function obj(
  oid: string, ctrl = P2, zone = BF0, defId = 'BLK', types: readonly string[] = ['unit'],
): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {},
  } as unknown as GameObject
}
const me = (zone = BF0, defId = 'UNL-143'): GameObject => obj(SELF, P1, zone, defId)

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

const trigs = (selfOid = SELF, ctrl = P1) => makeKhazix143Triggers(asObjId(selfOid), ctrl)
const atk = (unit = SELF): GameEvent =>
  ({ kind: 'attack', unit: asObjId(unit), player: P1, battlefield: asZoneId(BF0) } as unknown as GameEvent)
const def = (unit = SELF): GameEvent =>
  ({ kind: 'defend', unit: asObjId(unit), player: P1, battlefield: asZoneId(BF0) } as unknown as GameEvent)
                              
const fires = (s: GameState, ev: GameEvent): boolean[] =>
  trigs().map((t) => t.filter!(ev, s))

describe('★ 前提:卡面与接线(两个号都跑一遍)', () => {
  for (const [id, card] of [['UNL-143', UNL_143], ['UNL-143a', UNL_143A]] as const) {
    test(`★${id}:4费 1紫pip 4[S];印 [伏击];两条触发都挂得上`, () => {
      expect(CARD_COSTS[id]).toEqual({ mana: 4, pips: 1, colors: ['purple'] })
      expect(cardKind(id)).toBe('unit')
      expect(cardCost(id), '★进了 UNIT_COST(每号一行)').toEqual({ mana: 4, pips: [['purple']] })
      expect(specLookup(id).baseMight).toBe(4)
      expect(cardKeywords(id), '★[伏击] 是印刷关键词(再版号靠回退拿到)').toEqual(['伏击'])
      expect(card.category).toBe('unit')
      const s = scene([me(BF0, id)])
      expect(activeTriggers(s).filter((t) => t.sourceOid === asObjId(SELF)).length, '★两个时机').toBe(2)
    })
  }

  test('🔴★★★★★★两条触发是【同一条能力】的两个时机 ⇒ 共用 abilityKey', () => {
    const [a, d] = trigs()
    expect([a!.event, d!.event]).toEqual(['attack', 'defend'])
    expect(a!.abilityKey).toBe(UNL_143_ABILITY)
    expect(d!.abilityKey, '★★★写成两条独立能力的话去重就错了').toBe(UNL_143_ABILITY)
                                 
    expect(a!.id).not.toBe(d!.id)
  })

  test('★卡文没有「你可以选择」⇒ 不写 mayChoose(㊵)', () => {
    for (const t of trigs()) expect(t.mayChoose).toBeUndefined()
  })
})

describe('🔴🔴🔴★★★★★★时机:进攻【或】防守,而且必须是【我】', () => {
  const lonely = () => scene([me(), obj('foe', P2)])                    

  test('🔴★★★★★★两个时机各自都能点着(少一个就漏一半)', () => {
                                                                   
                                                             
    expect(trigs().map((t) => t.event), '★事件类型这一层').toEqual(['attack', 'defend'])
    expect(fires(lonely(), atk()), '★when 那一层:条件满足 ⇒ 两条都放行').toEqual([true, true])
    expect(fires(lonely(), def())).toEqual([true, true])
  })

  test('🔴★★★★★★★【队友】进攻/防守点不着我(by:you 挡不住这个)', () => {
    const s = scene([me(), obj('mate', P1), obj('foe', P2)])
    expect(fires(s, atk('mate')), '★★★队友进攻:两条都不中').toEqual([false, false])
    expect(fires(s, def('mate'))).toEqual([false, false])
  })
})

describe('🔴🔴🔴★★★★★★条件:「此处有一名【落单的敌方】单位」三道门', () => {
  const yes = (s: GameState): boolean => fires(s, atk())[0]!

  test('🔴★★★★★★正例:同区有一名孤零零的敌方 ⇒ 中', () => {
    expect(yes(scene([me(), obj('foe', P2)]))).toBe(true)
  })

  test('🔴★★★★★★【落单】那道:敌方有同伴就不落单 ⇒ 不中', () => {
    expect(yes(scene([me(), obj('foe', P2), obj('pal', P2)])), '★★★两名敌方互为友方').toBe(false)
  })

  test('🔴★★★★★★★「落单」看的是【它那边的友方】—— 我站在旁边【不解除】它的落单', () => {
                                                           
    expect(yes(scene([me(), obj('foe', P2), obj('mine', P1)]))).toBe(true)
  })

  test('🔴★★★★★★【阵营】那道:落单的是【我方】单位不算', () => {
    const s = scene([me(), obj('mine2', P1, BF1)])                
    expect(yes(s), '★★★卡文写的是"落单的【敌方】单位"').toBe(false)
  })

  test('🔴★★★★★★【此处】那道:别的战场上的落单敌方不算', () => {
    expect(yes(scene([me(), obj('faraway', P2, BF1)]))).toBe(false)
  })

  test('🔴★★★★★装备不算(「单位」二字是道真门)', () => {
    expect(yes(scene([me(), obj('g', P2, BF0, 'UNL-088', ['equipment'])]))).toBe(false)
  })

  test('🔴★★★★★判据函数本身也钉一条(它是本卡与将来同型卡的读口)', () => {
    const s = scene([me(), obj('foe', P2)])
    expect(hasLonelyFoeHere(s, s.objects[asObjId(SELF)]!)).toBe(true)
    const s2 = scene([me(), obj('foe', P2), obj('pal', P2)])
    expect(hasLonelyFoeHere(s2, s2.objects[asObjId(SELF)]!)).toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★产出:本回合 [S]+2 【并且】获得 2 经验', () => {
  const out = (): ReadonlyArray<Record<string, unknown>> => {
    const s = scene([me(), obj('foe', P2)])
    return trigs()[0]!.effect(s, atk(), {}) as unknown as ReadonlyArray<Record<string, unknown>>
  }

  test('🔴★★★★★★两条都要发 —— 少一条都不行', () => {
    const evs = out()
    const kinds = evs.map((e) => e.kind)
    expect(kinds, '★一条加战力 + 一条给资源(经验走同一通道)').toHaveLength(2)
    expect(kinds[0]).toBe('addEffect')
  })

  test('🔴★★★★★★加的是 +2、只【本回合】、只加给【我自己】', () => {
    const eff = (out()[0] as { effect: { duration: string; predicate: (x: { oid: unknown }) => boolean; modification: Record<string, unknown> } }).effect
    expect(eff.modification).toEqual({ kind: 'addMight', delta: UNL_143_BONUS })
    expect(UNL_143_BONUS).toBe(2)
    expect(eff.duration).toBe('thisTurn')
    expect(eff.duration).not.toBe('permanent')
    expect(eff.predicate({ oid: asObjId(SELF) }), '★加给我自己').toBe(true)
    expect(eff.predicate({ oid: asObjId('foe') }), '★★★不是加给那名敌方').toBe(false)
  })

  test('🔴★★★★★★经验是【2】点、给【我】(§730.1 经验是资源不是物体)', () => {
    const xp = out()[1]!
    expect(xp).toMatchObject({ player: P1, experience: UNL_143_XP })
    expect(UNL_143_XP, '★卡面写的是 2').toBe(2)
  })

  test('★两条触发产出【一模一样】(同一条能力,两个时机不该给不同东西)', () => {
    const s = scene([me(), obj('foe', P2)])
    const a = JSON.stringify(trigs()[0]!.effect(s, atk(), {}).map((e) => (e as { kind: string }).kind))
    const d = JSON.stringify(trigs()[1]!.effect(s, def(), {}).map((e) => (e as { kind: string }).kind))
    expect(a).toBe(d)
  })
})

describe('★ 再版号:规格一字不差', () => {
  test('★两个号的战力/费用/关键词逐项相同,只有卡号不同', () => {
    expect([UNL_143.energy, UNL_143.power, UNL_143.keywords])
      .toEqual([UNL_143A.energy, UNL_143A.power, UNL_143A.keywords])
    expect(UNL_143.name).toBe(UNL_143A.name)
    expect(UNL_143.id).not.toBe(UNL_143A.id)
    expect(UNL_143_KEYWORDS).toEqual(['伏击'])
  })
})
