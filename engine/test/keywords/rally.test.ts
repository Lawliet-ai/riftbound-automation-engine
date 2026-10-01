import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  RALLY, confirmedCountThisTurn, noteConfirmed, resetRallyForNewTurn,
  isRallyActive, markSelfConfirmed,
} from '../../src/keywords/rally'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(ctrl: typeof P1, status: GameObject['status'] = {}): GameObject {
  return {
    oid: asObjId('u'), defId: 'BLK', owner: ctrl, controller: ctrl, zone: asZoneId('base:P1'),
    baseMight: 2, baseKeywords: ['鼓舞'], damage: 0, counters: {}, status,
  }
}
const scene = (): GameState => createInitialState([P1, P2], 2)

describe('§812 鼓舞:本回合已确认过【其他】卡牌则生效', () => {
  test('§812.3 是卡的特性', () => {
                                                            
                                                                   
    expect(RALLY).toBe('鼓舞')
  })

  test('本回合一张都没确认过 → 不生效', () => {
    const s = scene()
    expect(confirmedCountThisTurn(s, P1)).toBe(0)
    expect(isRallyActive(s, obj(P1))).toBe(false)
  })

  test('§812.1.c 本回合确认过另一张牌 → 生效', () => {
    const s = noteConfirmed(scene(), P1)
    expect(isRallyActive(s, obj(P1))).toBe(true)
  })

  test('§812.1.c 必须是【另一张】牌:自己那次确认不能点亮自己', () => {
                                         
    const s = noteConfirmed(scene(), P1)
    const self = markSelfConfirmed(obj(P1))
    expect(isRallyActive(s, self)).toBe(false)
  })

  test('自己 + 另一张 → 生效(总数 2,扣掉自己还剩 1)', () => {
    let s = noteConfirmed(scene(), P1)       
    s = noteConfirmed(s, P1)      
    const self = markSelfConfirmed(obj(P1))
    expect(isRallyActive(s, self)).toBe(true)
  })

  test('§812.2 一张牌满足【所有】鼓舞:同一物件多个鼓舞技能共用同一个条件', () => {
                                               
    const s = noteConfirmed(scene(), P1)
    const three = { ...obj(P1), baseKeywords: ['鼓舞', '鼓舞', '鼓舞'] }
    expect(isRallyActive(s, three)).toBe(true)           
  })

  test('按【控制者】算,各人各的:P1 确认不点亮 P2 的鼓舞', () => {
    const s = noteConfirmed(scene(), P1)
    expect(isRallyActive(s, obj(P1))).toBe(true)
    expect(isRallyActive(s, obj(P2))).toBe(false)
  })

  test('§812.1.c「同一回合」:回合切换后清零,鼓舞熄灭', () => {
    const s = noteConfirmed(scene(), P1)
    expect(isRallyActive(s, obj(P1))).toBe(true)
    const next = resetRallyForNewTurn(s)
    expect(confirmedCountThisTurn(next, P1)).toBe(0)
    expect(isRallyActive(next, obj(P1))).toBe(false)
  })

  test('多次确认累加计数', () => {
    let s = scene()
    s = noteConfirmed(s, P1)
    s = noteConfirmed(s, P1)
    s = noteConfirmed(s, P1)
    expect(confirmedCountThisTurn(s, P1)).toBe(3)
  })

  test('不存在的物件:安全返回 false', () => {
    expect(isRallyActive(scene(), undefined)).toBe(false)
  })
})
