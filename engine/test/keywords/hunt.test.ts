import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { huntValueOf, hasHunt, huntExperienceGain, HUNT_TIMINGS } from '../../src/keywords/hunt'
import { gainExperience, experienceOf } from '../../src/keywords/level'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(kws: string[], status: GameObject['status'] = {}): GameObject {
  return {
    oid: asObjId('u'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: kws, damage: 0, counters: {}, status,
  }
}
function scene(o: GameObject, effects: GameState['continuousEffects'] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  return { ...base, objects: { u: o }, continuousEffects: effects }
}

describe('§823 狩猎:征服或据守时控制者获得X经验', () => {
  test('§823.1.c.2 X 缺省为 1', () => {
    const s = scene(unit(['狩猎']))
    expect(huntValueOf(s, s.objects['u']!)).toBe(1)
  })

  test('§823.1.c 带数字取该数', () => {
    const s = scene(unit(['狩猎3']))
    expect(huntValueOf(s, s.objects['u']!)).toBe(3)
  })

  test('§823.2 多来源狩猎值【一并相加】(与强攻§807.2/坚守§814.2 同侧)', () => {
                                     
    const s = scene(unit(['狩猎']), [{
      id: 'e1', duration: 'thisTurn', predicate: (x) => x.oid === 'u',
      modification: { kind: 'grantKeyword', keyword: '狩猎2' }, timestamp: 1, fromPassive: false,
    }])
    expect(huntValueOf(s, s.objects['u']!)).toBe(3)
  })

  test('§823.2 同名多次给予各计各的(不被 Set 去重)', () => {
    const s = scene(unit([]), [
      { id: 'a', duration: 'thisTurn', predicate: (x) => x.oid === 'u', modification: { kind: 'grantKeyword', keyword: '狩猎2' }, timestamp: 1, fromPassive: false },
      { id: 'b', duration: 'thisTurn', predicate: (x) => x.oid === 'u', modification: { kind: 'grantKeyword', keyword: '狩猎2' }, timestamp: 2, fromPassive: false },
    ])
    expect(huntValueOf(s, s.objects['u']!)).toBe(4)
  })

  test('§124.1 临时给予的关键词也算一份来源', () => {
    const s = scene(unit(['狩猎1'], { tempKeywords: ['狩猎2'] }))
    expect(huntValueOf(s, s.objects['u']!)).toBe(3)
  })

  test('§823.3 没有狩猎的单位:值为 0、不该发经验事件', () => {
    const s = scene(unit(['强攻2']))
    expect(hasHunt(s, s.objects['u']!)).toBe(false)
    expect(huntExperienceGain(s, s.objects['u']!)).toBe(0)
  })

  test('§823.1.b 征服【和】据守都触发,不是二选一', () => {
    expect(HUNT_TIMINGS).toEqual(['conquer', 'hold'])
  })

  test('§823.1.c.1 给的是【经验】(接上 §728-733 的资源),控制者收', () => {
    const s = scene(unit(['狩猎2']))
    const gain = huntExperienceGain(s, s.objects['u']!)
    const after = gainExperience(s, s.objects['u']!.controller, gain)
    expect(experienceOf(after, P1)).toBe(2)
    expect(experienceOf(after, P2)).toBe(0)            
  })

  test('与强攻不串味:狩猎值只数狩猎', () => {
    const s = scene(unit(['狩猎1', '强攻5', '坚守5']))
    expect(huntValueOf(s, s.objects['u']!)).toBe(1)
  })

  test('狩猎是【触发式】不是持续被动:值不随任何状态开关(战力不受影响)', () => {
                                          
    const s = scene(unit(['狩猎3']))
    expect(s.objects['u']!.baseMight).toBe(3)          
    expect(huntValueOf(s, s.objects['u']!)).toBe(3)
  })
})
