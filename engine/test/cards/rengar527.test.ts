import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import {
  SFD_025, SFD_025A, SFD_025_KEYWORDS, myAttackingBattlefields,
  extraPlayZonesFor, LONGTAIL19_DEFIDS,
} from '../../data/cards/longtail-19'

                                                                        
                                       
  
                                        
                               
                                                  
                                                
                                          
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

type Role = 'attacking' | 'defending' | undefined
const mk = (oid: string, who: PlayerId, zone: string, role: Role = undefined): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: role === undefined ? {} : { [role]: true },
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
const zones = (s: GameState, p: PlayerId = P1) => [...extraPlayZonesFor(s, p, 'SFD-025')].sort()

describe('★ 前提:卡面与接线(主号与异画各一份)', () => {
  test('★3费 1红pip、3 战力,印 [反应]+[强攻2]', () => {
    expect(CARD_COSTS['SFD-025']).toEqual({ mana: 3, pips: 1, colors: ['red'] })
    expect(CARD_COSTS['SFD-025a']).toEqual({ mana: 3, pips: 1, colors: ['red'] })
    expect([SFD_025.power, SFD_025.energy]).toEqual([3, 3])
    expect(cardKind('SFD-025')).toBe('unit')
    expect(cardKeywords('SFD-025'), '★② 印刷关键词三处同源').toEqual(['反应', '强攻2'])
    expect(cardKeywords('SFD-025a'), '★★★异画那份别漏').toEqual(['反应', '强攻2'])
    expect(SFD_025_KEYWORDS).toEqual(['反应', '强攻2'])
    expect(specLookup('SFD-025').baseKeywords).toEqual(['反应', '强攻2'])
  })

  test('★异画卡号照上游原样(带 ·P 后缀,别自己删)', () => {
    expect(SFD_025A.cardNo).toBe('SFD·025a/221·P')
    expect({ ...SFD_025A, id: SFD_025.id, cardNo: SFD_025.cardNo }).toEqual(SFD_025)
    expect(LONGTAIL19_DEFIDS).toContain('SFD-025a')
  })
})

describe('🔴🔴🔴★★★★★★判的是【身份】不是【阵营】', () => {
  test('🔴★★★★★★我的单位在那儿【进攻】⇒ 那处算', () => {
    expect(zones(scene([mk('me', P1, BF0, 'attacking')]))).toEqual([BF0])
  })

  test('🔴★★★★★★我的单位在那儿【防守】⇒ 那处【不算】(这条就是身份≠阵营的证据)', () => {
    expect(zones(scene([mk('me', P1, BF0, 'defending')])),
      '★★★人是我的、场也有我的单位,但我不是在那儿进攻').toEqual([])
  })

  test('🔴★★★★★★我的单位在那儿【没有身份】⇒ 不算(没在打)', () => {
    expect(zones(scene([mk('me', P1, BF0)]))).toEqual([])
  })

  test('🔴★★★★★★【敌人】在那儿进攻 ⇒ 不算(得是"你"正在进攻)', () => {
    expect(zones(scene([mk('foe', P2, BF0, 'attacking')]))).toEqual([])
  })

  test('🔴★★★★★★两处战场:只有我进攻的那处算', () => {
    const s = scene([
      mk('atk', P1, BF0, 'attacking'), // 我在 BF0 进攻
      mk('def', P1, BF1, 'defending'), // 我在 BF1 防守
      mk('foe', P2, BF1, 'attacking'), // 敌人在 BF1 进攻
    ])
    expect(zones(s), '★★★只有 BF0').toEqual([BF0])
  })

  test('🔴★★★★★★同一处两个人各打各的 ⇒ 按【我】那个的身份算', () => {
    const s = scene([mk('mine', P1, BF0, 'defending'), mk('theirs', P2, BF0, 'attacking')])
    expect(zones(s), '★★★我在防守 ⇒ 不算').toEqual([])
    const s2 = scene([mk('mine', P1, BF0, 'attacking'), mk('theirs', P2, BF0, 'defending')])
    expect(zones(s2), '★★★我在进攻 ⇒ 算').toEqual([BF0])
  })

  test('🔴★★★★★★对手视角:同一个盘面换个人问,答案不一样', () => {
    const s = scene([mk('mine', P1, BF0, 'attacking'), mk('theirs', P2, BF0, 'defending')])
    expect(zones(s, P1)).toEqual([BF0])
    expect(zones(s, P2), '★★★他在防守 ⇒ 他那边不算').toEqual([])
  })

  test('🔴★★★★★★【战斗前后答案会变】—— 这一档与前三档的分野', () => {
    const before = scene([mk('me', P1, BF0)])        
    expect(zones(before)).toEqual([])
    const during = scene([mk('me', P1, BF0, 'attacking')])                   
    expect(zones(during), '★★★同一处战场,姿态变了答案就变').toEqual([BF0])
  })

  test('🔴★★★★★只算【战场】—— 基地里带着身份的不算', () => {
    const s = scene([mk('me', P1, `base:${P1}`, 'attacking')])
    expect(myAttackingBattlefields(s, P1), '★★★基地不是战场').toEqual([])
  })

  test('🔴★★★★★非单位不算(装备带不了身份,但判据里那道门要在)', () => {
    const s0 = scene([mk('me', P1, BF0, 'attacking')])
    const gear = {
      ...s0.objects[asObjId('me')]!, baseTypes: ['equipment'],
    } as unknown as GameObject
    const s = { ...s0, objects: { ...s0.objects, me: gear } } as GameState
    expect(myAttackingBattlefields(s, P1), '★★★⑩① 异类样本').toEqual([])
  })
})

describe('🔴🔴★★★★★★与族里另外三档【互不干扰】', () => {
  test('🔴★★★★★★别的卡问同一个盘面,拿到的是【它自己那档】的答案', () => {
                                        
    const s = scene([mk('me', P1, BF0, 'attacking'), mk('foe', P2, BF0, 'defending')])
    expect([...extraPlayZonesFor(s, P1, 'SFD-025')].sort(), '★我进攻的那处').toEqual([BF0])
    expect([...extraPlayZonesFor(s, P1, 'OGN-176')].sort(), '★★★开放那档:BF0 有人占了,只剩 BF1')
      .toEqual([BF1])
    expect([...extraPlayZonesFor(s, P1, 'SFD-093')], '★★★敌方控制那档:这盘没人控制').toEqual([])
  })

  test('🔴★★★★★没登记的卡一处都不多给(样本有分辨力)', () => {
    const s = scene([mk('me', P1, BF0, 'attacking')])
    expect(extraPlayZonesFor(s, P1, 'OGN-012'), '★★★白板单位没有落点加宽').toEqual([])
  })

  test('🔴★★★★★★异画那个号也吃同一档(漏登会红)', () => {
    const s = scene([mk('me', P1, BF0, 'attacking')])
    expect([...extraPlayZonesFor(s, P1, 'SFD-025a')].sort()).toEqual([BF0])
  })
})
