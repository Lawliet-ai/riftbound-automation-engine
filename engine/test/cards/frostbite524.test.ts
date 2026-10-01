import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import {
  DESTROY_SPELLS, DESTROY_SPELL_SPECS, destroyVictims,
} from '../../data/cards/destroy-spells'
import {
  recursionCostOptions, isRecursionSource, parseRecursionCost,
} from '../../src/keywords/recursion'

                                                            
                                                                  
  
                             
                                                         
                                                                
                             
                                                                                
                                                        
                                                     
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const gear = (oid: string, who: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'SFD-150', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)
const unit = (oid: string, who: PlayerId, zone = BF0): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

const row = () => DESTROY_SPELLS.find((r) => r.defId === 'VEN-003')!
                                                                                
                                                                  
                                                         
const spec = DESTROY_SPELL_SPECS['VEN-003']!
const cands = (s: GameState) => (spec.legalTargets as (st: GameState) => string[])(s)
const cast = (s: GameState, target: string) =>
  spec.makeResolve({ target, movedCardOid: 'sp', controller: P1 } as never)(s, {} as never)

describe('★ 前提:卡面与接线', () => {
  test('★2费 1红pip,进族表与 PLAY_SPECS', () => {
    expect(CARD_COSTS['VEN-003']).toEqual({ mana: 2, pips: 1, colors: ['red'] })
    expect(cardKind('VEN-003')).toBe('spell')
    expect(playSpecFor('VEN-003')).toBeDefined()
    expect([row().scope, row().energy]).toEqual(['oneEquipment', 2])
  })

  test('🔴★★★★★后效三格【一个都没填】(它是"缺省不给"的回归样本)', () => {
    expect(row().draw, '★★★不抽牌').toBeUndefined()
    expect(row().goldByAllegiance, '★★★不给金币').toBeUndefined()
    expect(row().drawByTargetController, '★★★也不让对方抽 —— 那是印爆术那张').toBeUndefined()
    expect(row().maxMight, '★战力上限那格是单位档专用').toBeUndefined()
  })

  test('★卡号原样:没有 /221 后缀(① 现场量,别自己补)', () => {
    expect(row().cardNo).toBe('VEN·003')
  })
})

describe('🔴🔴🔴★★★★★★[流转4红色]:族表【自动生成】的关键词喂不喂得饱 §829 通道', () => {
  test('🔴★★★★★★印刷关键词三处同源,自动登记那条路也认', () => {
    expect(row().keywords).toEqual(['流转4红色'])
    expect(cardKeywords('VEN-003'), '★★★族表 .map 出来的那份真进了注册表').toEqual(['流转4红色'])
  })

  test('🔴★★★★★★§829 三个读口拿它当真的流转卡', () => {
    const kw = cardKeywords('VEN-003')
                                                                  
    expect(recursionCostOptions(kw).length > 0, '★★★这是本族第一张 —— 之前七张一个流转都没有').toBe(true)
    expect(recursionCostOptions(kw), '★★★4 法力 + 1 枚红 pip').toEqual([{ mana: 4, pips: [['red']] }])
  })

  test('🔴★★★★★★流转费用是【替代费用】,与基础费用不是一回事(§829.1.c.1)', () => {
    const base = CARD_COSTS['VEN-003']
    const alt = recursionCostOptions(cardKeywords('VEN-003'))[0]!
    expect(base!.mana, '★基础 2 法力').toBe(2)
    expect(alt.mana, '★★★流转 4 法力 —— 贵一倍,不是加价也不是打折').toBe(4)
  })

  test('🔴★★★★★★来源限【自己的】废牌堆(§829.1.b)', () => {
    expect(isRecursionSource(`discard:${P1}`, P1), '★我的废牌堆 ⇒ 行').toBe(true)
    expect(isRecursionSource(`discard:${P2}`, P1), '★★★对手废牌堆 ⇒ 不行').toBe(false)
    expect(isRecursionSource(`hand:${P1}`, P1), '★★★手牌走的是基础费用那条路').toBe(false)
  })

  test('🔴★★★★★族里那七张老卡【一张流转都没有】(样本有分辨力)', () => {
    const others = DESTROY_SPELLS.filter((r) => r.defId !== 'VEN-003')
    expect(others.length).toBe(7)
    expect(others.filter((r) => recursionCostOptions(r.keywords).length > 0).map((r) => r.defId),
      '★★★这条断言就是"第一张"这个说法的证据').toEqual([])
  })

  test('🔴★★★★解析口本身:数字与颜色都从字面量里读(不是写死的)', () => {
    expect(parseRecursionCost('流转4红色')).toEqual({ mana: 4, pips: [['red']] })
    expect(parseRecursionCost('流转2'), '★没写颜色 ⇒ 只有法力').toEqual({ mana: 2 })
    expect(parseRecursionCost('迅捷'), '★★★不是流转 ⇒ null').toBeNull()
  })
})

describe('🔴🔴🔴★★★★★★摧毁那半:`oneEquipment` 只认【装备】', () => {
  const board = () => scene([
    gear('myGear', P1), gear('foeGear', P2), // 两件装备(敌我都算 —— 卡文没写阵营词,⑳)
    unit('myUnit', P1), unit('foeUnit', P2), // 两名单位:一个都不该进候选
  ])

  test('🔴★★★★★★候选只有装备,单位【一个都不算】(⑩① 异类样本)', () => {
    expect(destroyVictims('oneEquipment', board()).sort()).toEqual(['foeGear', 'myGear'])
  })

  test('🔴★★★★★★卡文没有阵营词 ⇒ 敌我装备都能炸(⑳)', () => {
    expect(cands(board()).sort()).toEqual(['foeGear', 'myGear'])
  })

  test('🔴★★★★★★真炸:发的是 destroy、只炸选中的那一件(㊾)', () => {
    const evs = cast(board(), 'foeGear')
    expect(evs.map((e) => e.kind)).toEqual(['destroy'])
    expect((evs[0] as unknown as { target: string }).target).toBe('foeGear')
  })

  test('🔴★★★★★★后效那三格真的没发:只有一条事件,不抽牌不给金币', () => {
    const evs = cast(board(), 'myGear')
    expect(evs.map((e) => e.kind), '★★★对比印爆术那张会多一条 draw').toEqual(['destroy'])
  })

  test('🔴★★★★★场上没有装备 ⇒ 不问、不发(§355.17)', () => {
    const s = scene([unit('myUnit', P1), unit('foeUnit', P2)])
    expect(destroyVictims('oneEquipment', s)).toEqual([])
    expect(cands(s), '★★★候选空 ⇒ 这张打不出去').toEqual([])
  })

  test('🔴★★★★★★不是「最多一件」⇒ 【必选档】,没有"不选"那条路(与废物利用的分野)', () => {
    expect(spec.target, '★★★必选一个 ⇒ 走 target 那条路').toBe('custom')
    expect(spec.makeNextChoice, '★★★没有追问 = 给不出「不摧毁」那一档').toBeUndefined()
    const optional = DESTROY_SPELL_SPECS['OGN-224']!
    expect(optional.makeNextChoice, '★★★废物利用那张才有(样本有分辨力)').toBeDefined()
    expect(optional.target, '★★★它反过来不走 target').toBe('none')
  })

  test('🔴★★★★★★选了不存在的东西 ⇒ 什么都不发(结算侧再筛一次,㉖)', () => {
    expect(cast(board(), 'ghost')).toEqual([])
    expect(cast(board(), 'myUnit'), '★★★结算时也不许把单位当装备炸').toEqual([])
  })
})

describe('★ 回归:印爆术那张一字未变(同档第一张)', () => {
  test('🔴★★★★★它仍然多一条「让其控制者抽两张」', () => {
    const s = scene([gear('foeGear', P2)])
    const evs = DESTROY_SPELL_SPECS['SFD-005']!
      .makeResolve({ target: 'foeGear', movedCardOid: 'sp', controller: P1 } as never)(
        s, {} as never,
      ) as readonly GameEvent[]
                                                                
    expect(evs.map((e) => e.kind)).toEqual(['destroy', 'drawForDestroyVictim'])
    expect((evs[1] as unknown as { player: string; count: number }),
      '★★★抽的是【被炸那件的控制者】,不是我').toMatchObject({ player: P2, count: 2 })
  })

  test('🔴★★★★两张同档卡的候选口是【同一个】(㊼ 收口没被本轮破坏)', () => {
    const s = scene([gear('a', P1), gear('b', P2), unit('u', P1)])
    expect(destroyVictims('oneEquipment', s).sort()).toEqual(['a', 'b'])
  })
})
