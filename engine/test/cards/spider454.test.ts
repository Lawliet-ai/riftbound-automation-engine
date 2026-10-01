import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import {
  UNL_117, UNL_117_CARD_EFFECT, lonelyEnemyBattlefields, extraPlayZonesFor,
  LONGTAIL19_DEFIDS, EXTRA_PLAY_ZONE_DEFIDS, BOARD_WIDE_EXTRA_PLAY_ZONE_DEFIDS,
} from '../../data/cards/longtail-19'

                                                         
                                            
                                            
                                                                    
                                                     
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

function unit(id: string, ctrl: typeof P1, zone: string, types: readonly string[] = ['unit'], defId = 'BLK'): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: types as never, damage: 0, counters: {}, status: {} } as GameObject
}
function scene(objs: GameObject[], players: readonly (typeof P1)[] = [P1, P2]): GameState {
  const base = createInitialState(players as never, 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) { objects[o.oid] = o; const z = zones[o.zone]; if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

describe('★ 前提:卡面事实与接线(四步查法落测)', () => {
  test('官方名恐怖蛛怪;6费1橙pip 6S;[狩猎2] 两条通道;无变体;三份清单对账', () => {
    expect(UNL_117.name, '③教训:卡名以 cardNames.ts 为准(第一版编错过)').toBe('恐怖蛛怪')
    expect(CARD_COSTS['UNL-117']).toEqual({ mana: 6, pips: 1, colors: ['orange'] })
    expect(UNL_117.power, '上游实测 6S').toBe(6)
    expect(UNL_117.keywords, '带数字先例 level-self').toEqual(['狩猎2'])
    expect(cardKeywords('UNL-117'), 'CARD_KEYWORDS 通道(教训②)').toEqual(['狩猎2'])
    expect(VARIANT_GROUPS['UNL-117'], '无变体号').toBeUndefined()
    expect(UNL_117_CARD_EFFECT).toContain('落单')
    expect(LONGTAIL19_DEFIDS).toContain('UNL-117')
    expect(EXTRA_PLAY_ZONE_DEFIDS, '轴①登了').toContain('UNL-117')
    expect(BOARD_WIDE_EXTRA_PLAY_ZONE_DEFIDS, '轴②登了').toContain('UNL-117')
  })
})

describe('🔴★★★★lonelyEnemyBattlefields:「落单」按那个单位自己的阵营数', () => {
  test('🔴★★★敌方1个 ⇒ 入列;敌方2个 ⇒ 不入;我的单位在场不影响它落单', () => {
    expect(lonelyEnemyBattlefields(scene([unit('e1', P2, BF0)]), P1)).toEqual([BF0])
    expect(lonelyEnemyBattlefields(scene([unit('e1', P2, BF0), unit('e2', P2, BF0)]), P1), '敌方有伴 ⇒ 不落单').toEqual([])
    expect(lonelyEnemyBattlefields(scene([unit('e1', P2, BF0), unit('m1', P1, BF0)]), P1), '我的单位不是它的友方').toEqual([BF0])
  })

  test('🔴★★★只有我自己的单位落单 ⇒ 不算(要的是【敌方】落单);基地不算战场', () => {
    expect(lonelyEnemyBattlefields(scene([unit('m1', P1, BF0)]), P1), '我方落单不触发').toEqual([])
    expect(lonelyEnemyBattlefields(scene([unit('e1', P2, `base:${P2}`)]), P1), '基地里的敌方不算').toEqual([])
  })

  test('🔴★★★贴附装备混在战场 contents 不计数(isUnit 过滤)', () => {
    const s = scene([unit('e1', P2, BF0), unit('g1', P2, BF0, ['equipment'], 'SFD-150')])
    expect(lonelyEnemyBattlefields(s, P1), '装备不是单位,e1 仍落单').toEqual([BF0])
  })

  test('★三人局:BF0 上 P2 与 P3 各一个 ⇒ 各自落单(互相不是友方)', () => {
    const s = scene([unit('e1', P2, BF0), unit('f1', P3, BF0)], [P1, P2, P3])
    expect(lonelyEnemyBattlefields(s, P1)).toEqual([BF0])
  })

  test('★多战场各自独立判', () => {
    const s = scene([unit('e1', P2, BF0), unit('e2', P2, BF0), unit('e3', P2, BF1)])
    expect(lonelyEnemyBattlefields(s, P1), 'BF0 两个不入,BF1 一个入').toEqual([BF1])
  })
})

describe('🔴★★★★两条轴(厄运小姐同构)', () => {
  const lonely = () => scene([unit('e1', P2, BF0)])

  test('🔴★★★轴①:蛛怪自己(defId=UNL-117)不在场也享有落单落点(她还在手上)', () => {
    expect(extraPlayZonesFor(lonely(), P1, 'UNL-117')).toContain(BF0)
  })

  test('🔴★★★轴②:蛛怪在场(基地也算 §363)⇒ 任意友方单位享有;不在场 ⇒ 不享有', () => {
    const withSpider = scene([unit('e1', P2, BF0), unit('sp', P1, `base:${P1}`, ['unit'], 'UNL-117')])
    expect(extraPlayZonesFor(withSpider, P1, 'BLK'), '别的单位也能打过去').toContain(BF0)
    expect(extraPlayZonesFor(lonely(), P1, 'BLK'), '场上没蛛怪 ⇒ 普通单位没这许可').not.toContain(BF0)
  })

  test('🔴★★★轴②是【我控的】蛛怪:对手场上的蛛怪不给我开门;但给对手自己开(对称)', () => {
    const foeSpider = scene([unit('m1', P1, BF0), unit('sp', P2, `base:${P2}`, ['unit'], 'UNL-117')])
                                                     
    expect(extraPlayZonesFor(foeSpider, P2, 'BLK')).toContain(BF0)
    expect(extraPlayZonesFor(foeSpider, P1, 'BLK'), 'P1 打自己单位去 BF0 没许可(那儿落单的是 P1 自己人)').not.toContain(BF0)
  })
})
