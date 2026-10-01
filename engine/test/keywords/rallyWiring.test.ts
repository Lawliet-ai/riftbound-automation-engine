import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { advanceFepr } from '../../src/loop/chainFepr'
import { confirmedCountThisTurn, isRallyActive } from '../../src/keywords/rally'
import { resetTurnLedgers } from '../../src/scoring/score'

                                        
                                  

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(id: string, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: P1, controller: P1, zone: asZoneId(`base:${P1}`),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(...objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones }
}
                                    
function cardItem(id: string, cardOid: string, controller = P1): ChainItem {
  return {
    id, controller, kind: 'spell', status: 'pending', cardOid: asObjId(cardOid),
    resolve: () => [],
  }
}
                            
function abilityItem(id: string, controller = P1): ChainItem {
  return { id, controller, kind: 'ability', status: 'pending', resolve: () => [] }
}

describe('§812.1.c 确认计数:判据是【卡牌】完成确认', () => {
  test('卡牌项目被确认 → 计数 +1', () => {
    const s0 = { ...scene(obj('card')), chain: [cardItem('i1', 'card')] }
    const out = advanceFepr(s0)
    expect(confirmedCountThisTurn(out.state, P1)).toBe(1)
  })

  test('★技能项目被确认 → 【不】计数(§812.1.c 说的是"另一张卡牌")', () => {
    const s0 = { ...scene(), chain: [abilityItem('i1')] }
    expect(confirmedCountThisTurn(advanceFepr(s0).state, P1)).toBe(0)
  })

  test('两张牌各确认一次 → 计数 2', () => {
    const s0 = { ...scene(obj('a'), obj('b')), chain: [cardItem('i1', 'a'), cardItem('i2', 'b')] }
    expect(confirmedCountThisTurn(advanceFepr(s0).state, P1)).toBe(2)
  })

  test('对手确认的算在【对手】账上,不给我点亮鼓舞', () => {
    const theirs = obj('t', { owner: P2, controller: P2 })
    const s0 = { ...scene(theirs), chain: [cardItem('i1', 't', P2)] }
    const s = advanceFepr(s0).state
    expect(confirmedCountThisTurn(s, P2)).toBe(1)
    expect(confirmedCountThisTurn(s, P1)).toBe(0)
  })
})

describe('★§812.1.c 自己那次确认不能点亮自己身上的鼓舞', () => {
  test('本回合只打出过它自己 → 它的鼓舞【不】生效', () => {
    const s0 = { ...scene(obj('rally')), chain: [cardItem('i1', 'rally')] }
    const s = advanceFepr(s0).state
    expect(confirmedCountThisTurn(s, P1)).toBe(1)           
    expect(isRallyActive(s, s.objects['rally' as never])).toBe(false)              
  })

  test('先打别的牌,再看它 → 鼓舞生效', () => {
    const s0 = { ...scene(obj('other'), obj('rally')), chain: [cardItem('i1', 'other')] }
    const s = advanceFepr(s0).state
    expect(isRallyActive(s, s.objects['rally' as never])).toBe(true)
  })

  test('§812.2 一次确认点亮【所有】带鼓舞的牌(不是各数各的)', () => {
    const s0 = { ...scene(obj('other'), obj('r1'), obj('r2')), chain: [cardItem('i1', 'other')] }
    const s = advanceFepr(s0).state
    expect(isRallyActive(s, s.objects['r1' as never])).toBe(true)
    expect(isRallyActive(s, s.objects['r2' as never])).toBe(true)
  })
})

describe('回合末清账', () => {
  test('resetTurnLedgers 把确认计数清零', () => {
    const s0 = { ...scene(obj('a')), chain: [cardItem('i1', 'a')] }
    const s = advanceFepr(s0).state
    expect(confirmedCountThisTurn(s, P1)).toBe(1)
    expect(confirmedCountThisTurn(resetTurnLedgers(s), P1)).toBe(0)
  })

  test('★得分账本也一起清(合并到一处的意义就在这:三处交接点不会各漏各的)', () => {
    const s = resetTurnLedgers({
      ...scene(),
      confirmedThisTurn: { [P1]: 3 },
      scoredBattlefieldsThisTurn: { [P1]: ['battlefield:shared:0'] },
      unitsConqueredThisTurn: [asObjId('x')],
    })
    expect(s.confirmedThisTurn).toEqual({})
    expect(s.scoredBattlefieldsThisTurn).toEqual({})
    expect(s.unitsConqueredThisTurn).toEqual([])
  })
})
