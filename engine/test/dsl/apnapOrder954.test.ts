import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { Trigger } from '../../src/dsl/trigger'
import { detectTriggersForBatch } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'

                                                                  
                                                  
                                         
  
                                                 
                                                         
                                                      
                                                        
                                          
  
                                                       
                                                                    
                                                                  
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(oid: string, ctrl: typeof P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'U', owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  } as GameObject
}
function scene(active: typeof P1): GameState {
  const base = createInitialState([P1, P2], 2)
  const a = unit('a', P1)
  const b = unit('b', P2)
  const z = base.zones[asZoneId(BF0)]!
  return {
    ...base, activePlayer: active, phase: 'main',
    objects: { a, b },
    zones: { ...base.zones, [asZoneId(BF0)]: { ...z, contents: [a.oid, b.oid] } },
  } as GameState
}
const trig = (id: string, ctrl: typeof P1, srcOid: string, event = 'damage'): Trigger => ({
  id, controller: ctrl, sourceOid: asObjId(srcOid), event, by: 'any',
  effect: (st: GameState) => st,
} as unknown as Trigger)

const dmg: GameEvent = { kind: 'damage', target: asObjId('a'), amount: 1 } as GameEvent
const ctrlOf = (items: readonly { controller: unknown }[]): string[] => items.map((i) => String(i.controller))

describe('★954 §383.3.d.1 跨玩家:从回合玩家开始,按回合顺序', () => {
                                    
                                                            
  const arr = [trig('t-P2', P2, 'b'), trig('t-P1', P1, 'a')]

  test('回合玩家是 P1 ⇒ P1 的先入链(尽管它在数组里排后面)', () => {
    expect(ctrlOf(detectTriggersForBatch(scene(P1), [dmg], arr, P1))).toEqual(['P1', 'P2'])
  })

  test('★换回合玩家 ⇒ 顺序跟着翻转(修复前这里一字不变)', () => {
    expect(ctrlOf(detectTriggersForBatch(scene(P2), [dmg], arr, P2))).toEqual(['P2', 'P1'])
  })

  test('⚠️放开侧:分完组之后,组内相对次序不动(§383.3.d 是他自己的选择权)', () => {
                                                 
                                    
                                                       
                                                              
                                     
    const mixed = [
      trig('p2a', P2, 'b'), trig('p1a', P1, 'a'), trig('p2b', P2, 'b'), trig('p1b', P1, 'a'),
    ]
    const ids = detectTriggersForBatch(scene(P1), [dmg], mixed, P1).map((i) => i.id.split(':')[1])
                                                          
    expect(ids).toEqual(['p1a', 'p1b', 'p2a', 'p2b'])
  })

  test('⚠️放开侧:全是同一控制者时原样返回(没有跨玩家问题,不该动它)', () => {
    const sameOwner = [trig('x1', P1, 'a'), trig('x2', P1, 'a'), trig('x3', P1, 'a')]
    const ids = detectTriggersForBatch(scene(P1), [dmg], sameOwner, P1).map((i) => i.id.split(':')[1])
    expect(ids).toEqual(['x1', 'x2', 'x3'])
  })

  test('⚠️放开侧:只有一条触发时不动它(没有跨玩家问题)', () => {
    const one = detectTriggersForBatch(scene(P2), [dmg], [trig('solo', P1, 'a')], P2)
    expect(ctrlOf(one)).toEqual(['P1'])
  })
})

describe('★954 连带纠正:入链顺序的主键是触发器数组,不是事件序', () => {
                                                                  
                                  
                                                              
  const evs: GameEvent[] = [
    { kind: 'attack', player: P1, battlefield: BF0, responsible: [P1] } as unknown as GameEvent,
    { kind: 'defend', player: P2, battlefield: BF0, responsible: [P2] } as unknown as GameEvent,
  ]
  const tDef = trig('t-def', P2, 'b', 'defend')
  const tAtk = trig('t-atk', P1, 'a', 'attack')

  test('回合玩家=进攻方 ⇒ 进攻方触发先入链(即使触发器数组把防守方排前面)', () => {
    const items = detectTriggersForBatch(scene(P1), evs, [tDef, tAtk], P1)
    expect(items.map((i) => i.id.split(':')[1])).toEqual(['t-atk', 't-def'])
  })

  test('同一条触发匹配一批中的多个事件时,那几条【才】按事件序', () => {
    const multi: GameEvent[] = [
      { kind: 'damage', target: asObjId('a'), amount: 1 } as GameEvent,
      { kind: 'damage', target: asObjId('b'), amount: 1 } as GameEvent,
    ]
    const items = detectTriggersForBatch(scene(P1), multi, [trig('t', P1, 'a')], P1)
    expect(items.map((i) => i.id.split(':').pop())).toEqual(['a', 'b'])
  })
})
