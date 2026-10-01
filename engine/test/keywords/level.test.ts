import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  experienceOf, gainExperience, spendExperience,
  parseLevel, hasLevel, activeLevels, isLevelActive,
} from '../../src/keywords/level'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function obj(ctrl: typeof P1): GameObject {
  return {
    oid: asObjId('u'), defId: 'BLK', owner: P1, controller: ctrl, zone: asZoneId('battlefield:shared:0'),
    baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {},
  }
}
function scene(): GameState {
  return createInitialState([P1, P2], 2)
}

describe('§728-733 经验(玩家资源)', () => {
  test('§729 开局为 0', () => {
    expect(experienceOf(scene(), P1)).toBe(0)
  })

  test('§730.1 获得经验数值提升;§733 没有上限', () => {
    let s = gainExperience(scene(), P1, 3)
    expect(experienceOf(s, P1)).toBe(3)
    s = gainExperience(s, P1, 97)
    expect(experienceOf(s, P1)).toBe(100)       
  })

  test('§730.2 消耗经验数值减少;不足时夹到 0(不为负)', () => {
    const s = gainExperience(scene(), P1, 2)
    expect(experienceOf(spendExperience(s, P1, 1), P1)).toBe(1)
    expect(experienceOf(spendExperience(s, P1, 5), P1)).toBe(0)
  })

  test('§732 不与他人共享:动 P1 不影响 P2', () => {
    const s = gainExperience(scene(), P1, 5)
    expect(experienceOf(s, P2)).toBe(0)
  })

  test('数量为 0 的调整:返回原引用(无操作)', () => {
    const before = scene()
    expect(gainExperience(before, P1, 0)).toBe(before)
    expect(spendExperience(before, P1, 0)).toBe(before)
  })
})

describe('§824 等级(依赖性关键词)', () => {
  test('§824.1.a 格式「等级N」;N 是必填的(没有"缺省1"条款)', () => {
    expect(parseLevel('等级3')).toBe(3)
    expect(parseLevel('等级')).toBeNull()                    
    expect(parseLevel('坚守2')).toBeNull()
  })

  test('正则首尾锚定:复合词不误匹配', () => {
    expect(parseLevel('等级3以上')).toBeNull()
    expect(parseLevel('超等级3')).toBeNull()
  })

  test('§824.2 是卡的特性', () => {
    expect(hasLevel(['等级2'])).toBe(true)
    expect(hasLevel(['强攻2'])).toBe(false)
  })

  test('§824.1.b.1「不少于」→ 判据是 >= 不是 >', () => {
    const s = gainExperience(scene(), P1, 2)
    expect(isLevelActive(s, obj(P1), 2)).toBe(true)           
    expect(isLevelActive(s, obj(P1), 3)).toBe(false)
  })

  test('§824.1.c 经验够 → 依赖性技能生效', () => {
    const s = gainExperience(scene(), P1, 5)
    expect(activeLevels(s, obj(P1), ['等级2', '等级4', '等级6'])).toEqual([2, 4])         
  })

  test('§824.1.d 经验一旦【低于】N,立即失效(每次现算,不悬停)', () => {
    let s = gainExperience(scene(), P1, 3)
    expect(isLevelActive(s, obj(P1), 3)).toBe(true)
    s = spendExperience(s, P1, 1)        
    expect(isLevelActive(s, obj(P1), 3)).toBe(false)        
  })

  test('§824.1.c.1 控制者变化 → 按【新控制者】的经验重判', () => {
                                            
    const s = gainExperience(scene(), P1, 5)
    expect(isLevelActive(s, obj(P1), 3)).toBe(true)            
    expect(isLevelActive(s, obj(P2), 3)).toBe(false)              
  })

  test('没有等级关键词的卡:生效列表为空', () => {
    const s = gainExperience(scene(), P1, 99)
    expect(activeLevels(s, obj(P1), ['强攻2'])).toEqual([])
  })
})
