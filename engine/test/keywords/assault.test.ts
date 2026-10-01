import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { valuedKeywordTotal, parseValuedKeyword } from '../../src/effects/valuedKeyword'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function unit(id: string, kws: string[], status: GameObject['status'] = {}, might = 3): GameObject {
  return { oid: asObjId(id), defId: 'BLK', owner: P1, controller: P1, zone: BF0, baseMight: might, baseKeywords: kws, damage: 0, counters: {}, status }
}

function scene(objs: Record<string, GameObject>, effects: GameState['continuousEffects'] = []): GameState {
  const base = createInitialState([P1, P2], 2)
  return recomputeContinuous({ ...base, objects: objs, continuousEffects: effects })
}

const mightOf = (s: GameState, id: string): number => effectiveMight(s.objects[id]!).reference

describe('§807 强攻:如果我是进攻方,则[M]+X', () => {
  test('§807.1.c 持有进攻方身份才吃加成;无身份不吃', () => {
    const off = scene({ u: unit('u', ['强攻2'], { attacking: true }) })
    expect(mightOf(off, 'u')).toBe(5)         

    const idle = scene({ u: unit('u', ['强攻2']) })
    expect(mightOf(idle, 'u')).toBe(3)             
  })

  test('§807.1.b.3 X 缺省为 1', () => {
    const s = scene({ u: unit('u', ['强攻'], { attacking: true }) })
    expect(mightOf(s, 'u')).toBe(4)
  })

  test('§807.2 多来源强攻值【一并相加】(官方例:印刷强攻 + 获得强攻3 = 强攻4)', () => {
                                     
    const s = scene(
      { u: unit('u', ['强攻'], { attacking: true }) },
      [{
        id: 'e1', duration: 'thisTurn', predicate: (x) => x.oid === 'u',
        modification: { kind: 'grantKeyword', keyword: '强攻3' }, timestamp: 1, fromPassive: false,
      }],
    )
    expect(mightOf(s, 'u')).toBe(3 + 4)
  })

  test('§807.2 同名多次给予各计各的(不能被 Set 去重成一份)', () => {
    const s = scene(
      { u: unit('u', [], { attacking: true }) },
      [
        { id: 'a', duration: 'thisTurn', predicate: (x) => x.oid === 'u', modification: { kind: 'grantKeyword', keyword: '强攻2' }, timestamp: 1, fromPassive: false },
        { id: 'b', duration: 'thisTurn', predicate: (x) => x.oid === 'u', modification: { kind: 'grantKeyword', keyword: '强攻2' }, timestamp: 2, fromPassive: false },
      ],
    )
    expect(mightOf(s, 'u')).toBe(3 + 4)               
  })

  test('§124.1 临时给予的关键词也算一份来源', () => {
    const s = scene({ u: unit('u', ['强攻1'], { attacking: true, tempKeywords: ['强攻2'] }) })
    expect(mightOf(s, 'u')).toBe(3 + 3)
  })

  test('§807.1.d.1 随身份实时开关:身份撤掉,加成同一瞬间消失(不是"本次战斗+X")', () => {
    const on = scene({ u: unit('u', ['强攻2'], { attacking: true }) })
    expect(mightOf(on, 'u')).toBe(5)
    const off = recomputeContinuous({ ...on, objects: { u: { ...on.objects['u']!, status: {} } } })
    expect(mightOf(off, 'u')).toBe(3)
  })

  test('强攻与坚守互不串味:防守方不吃强攻、进攻方不吃坚守', () => {
    const s = scene({
      atk: unit('atk', ['强攻2', '坚守5'], { attacking: true }),
      def: unit('def', ['强攻5', '坚守2'], { defending: true }),
    })
    expect(mightOf(s, 'atk')).toBe(3 + 2)        
    expect(mightOf(s, 'def')).toBe(3 + 2)        
  })

  test('§807.3 "拥有强攻值"与"加成生效"是两回事:不在战斗中仍可读出总值', () => {
    const s = scene({ u: unit('u', ['强攻2']) })       
    const o = s.objects['u']!
    expect(valuedKeywordTotal(s, o, '强攻', () => true)).toBe(2)        
    expect(mightOf(s, 'u')).toBe(3)         
  })
})

describe('带数值关键词的解析(§807.1.b.3 / §814.1.b.3)', () => {
  test('缺省1、带数字取该数、不匹配返回 null', () => {
    expect(parseValuedKeyword('强攻', '强攻')).toBe(1)
    expect(parseValuedKeyword('强攻3', '强攻')).toBe(3)
    expect(parseValuedKeyword('坚守2', '强攻')).toBeNull()
  })

  test('正则首尾锚定:复合词不被误匹配', () => {
    expect(parseValuedKeyword('强攻光环', '强攻')).toBeNull()
    expect(parseValuedKeyword('超强攻2', '强攻')).toBeNull()
  })
})
