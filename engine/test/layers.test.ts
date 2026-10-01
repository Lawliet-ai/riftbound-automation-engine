import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { effectiveMight } from '../src/state/might'
import {
  computeDerived,
  computeSnapshotDelta,
  expireThisTurnEffects,
  layerOf,
  recomputeContinuous,
  type Modification,
  type StaticEffect,
} from '../src/effects/continuousView'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

let ts = 0
function eff(mod: Modification, over: Partial<StaticEffect> = {}): StaticEffect {
  return { id: `e${ts}`, duration: 'permanent', fromPassive: false, predicate: () => true, modification: mod, timestamp: ts++, ...over }
}
function unit(baseMight: number, baseKeywords: string[] = []): GameObject {
  return { oid: asObjId('a'), defId: 'U', owner: P1, controller: P1, zone: asZoneId('battlefield:shared:0'), baseMight, baseKeywords, damage: 0, counters: {}, status: {} }
}
function withEffects(o: GameObject, effects: StaticEffect[]): GameState {
  return { ...createInitialState([P1, P2]), objects: { [o.oid]: o }, continuousEffects: effects }
}

describe('层归类(§477.1/.2/.3)', () => {
  test('setMight→特质层 / 关键词→技能层 / addMight→计算层', () => {
    expect(layerOf({ kind: 'setMight', value: 4 })).toBe('characteristic')
    expect(layerOf({ kind: 'grantKeyword', keyword: 'x' })).toBe('ability')
    expect(layerOf({ kind: 'addRestriction', restriction: 'move' })).toBe('ability')                 
    expect(layerOf({ kind: 'addMight', delta: 2 })).toBe('calc')
    expect(layerOf({ kind: 'doubleMight' })).toBe('calc')
  })
})

describe('层序:特质层先于计算层', () => {
  test('setMight 4 后 addMight +2 → 6(特质设值再加减)', () => {
    const o = unit(3)
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'setMight', value: 4 }), eff({ kind: 'addMight', delta: 2 })])
    expect(d.might).toBe(6)
  })
})

describe('§477.3.e 计算层:增值先于减值', () => {
  test('base3 +2 -1 → 4', () => {
    const o = unit(3)
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'addMight', delta: -1 }), eff({ kind: 'addMight', delta: 2 })])
    expect(d.might).toBe(4)
  })
})

describe('§477.3.b 快照 + §477.3.c 负增值改+0', () => {
  test('computeSnapshotDelta: -4不得低于1 对 2战力 → 有效增量-1', () => {
    expect(computeSnapshotDelta(2, -4, 1)).toBe(-1)
  })
  test('减值带floor(非被动): base2 -4不得低于1 → 1', () => {
    const o = unit(2)
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'addMight', delta: -4, floor: 1 })])
    expect(d.might).toBe(1)
  })
  test('§477.3.c 负战力翻倍→+0: base-2 doubleMight → 仍-2', () => {
    const o = unit(-2)
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'doubleMight' })])
    expect(d.might).toBe(-2)
  })
  test('正战力翻倍: base3 → 6', () => {
    const o = unit(3)
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'doubleMight' })])
    expect(d.might).toBe(6)
  })
})

describe('技能层:关键词增删 + 限制(§477.2)', () => {
  test('授予/移除关键词', () => {
    const o = unit(3, ['据守'])
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'grantKeyword', keyword: '迅捷' }), eff({ kind: 'removeKeyword', keyword: '据守' })])
    expect(d.keywords).toContain('迅捷')
    expect(d.keywords).not.toContain('据守')
  })
  test('限制 cannot move 进派生态(供 legalActions 门控)', () => {
    const o = unit(3)
    const d = computeDerived(o, withEffects(o, []), [eff({ kind: 'addRestriction', restriction: 'move' })])
    expect(d.restrictions).toContain('move')
  })
})

describe('recompute 集成 + effectiveMight + duration 到期', () => {
  test('recomputeContinuous 填 derived,effectiveMight 读派生', () => {
    const o = unit(3)
    const s = recomputeContinuous(withEffects(o, [eff({ kind: 'addMight', delta: 2 })]))
    expect(s.objects['a']!.derived!.might).toBe(5)
    expect(effectiveMight(s.objects['a']!).actual).toBe(5)
  })
  test('无效果 recompute:派生态回落基线(⚠️不再恒等——旧契约会让 thisTurn 到期后战力悬停)', () => {
    const o = unit(3)
    const s = createInitialState([P1, P2])
                 
    expect(recomputeContinuous(s).objects).toEqual(s.objects)
    expect(effectiveMight(o).actual).toBe(3)
                                            
    const stale = withEffects({ ...o, derived: { might: 99, keywords: [], restrictions: [], controller: P1 } }, [])
    expect(recomputeContinuous(stale).objects['a']!.derived!.might).toBe(3)
  })
  test('§317.2.c 3d: thisTurn 效果到期,permanent 留存', () => {
    const o = unit(3)
    ts = 100
    const thisTurn = eff({ kind: 'addMight', delta: 3 }, { duration: 'thisTurn' })
    const perm = eff({ kind: 'addMight', delta: 1 }, { duration: 'permanent' })
    let s = recomputeContinuous(withEffects(o, [thisTurn, perm]))
    expect(s.objects['a']!.derived!.might).toBe(7)         
    s = expireThisTurnEffects(s)
    expect(s.continuousEffects).toHaveLength(1)
    expect(s.objects['a']!.derived!.might).toBe(4)                   
  })
})
