import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../src/state/ids'
import { createInitialState, type GameState } from '../src/state/gameState'
import type { GameObject } from '../src/state/object'
import { InteractiveGame } from '../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../data/registry'
import { applyEvents } from '../src/loop/reduce'
import type { GameEvent } from '../src/loop/events'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

function unit(id: string, ctrl: typeof P1, defId: string, kw: string[] = []): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0), baseMight: 3, baseKeywords: kw, damage: 0, counters: {}, status: {} }
}

describe('审查修复回归', () => {
                                                              
  test('#1 打单位触发对手技能→窗口开给触发控制者(P2),不受传入残留 priority=P1 影响', () => {
    const base = createInitialState([P1, P2], 2)
    const vegas = unit('vegas', P2, 'UNL-150', ['法盾'])
    const hand: GameObject = { oid: asObjId('h1'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId('hand:P1'), baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {} }
    const bz = base.zones[BF0]!, hz = base.zones['hand:P1']!
    const s: GameState = {
      ...base, activePlayer: P1, priority: P1, // ← 残留非空 priority(模拟 endTurn 置态)
      objects: { vegas, h1: hand },
      zones: { ...base.zones, [BF0]: { ...bz, contents: [asObjId('vegas')] }, 'hand:P1': { ...hz, contents: [asObjId('h1')] } },
    }
    const g = new InteractiveGame(s, DEPS)
                                                        
                                                    
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'h1', to: 'base:P1' })
    const p = g.pending()
    expect(p.mode).toBe('window')
    if (p.mode !== 'window') throw new Error('应进窗口')
    expect(p.player).toBe(P2)                                
  })

                                                                
  test('#2/#4 非回合玩家 END_TURN/PLAY_UNIT 被 apply 忽略', () => {
    const base = createInitialState([P1, P2], 2)
    const hand: GameObject = { oid: asObjId('e1'), defId: 'BLK', owner: P2, controller: P2, zone: asZoneId('hand:P2'), baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {} }
    const hz = base.zones['hand:P2']!
    const s: GameState = { ...base, activePlayer: P1, priority: null, objects: { e1: hand }, zones: { ...base.zones, 'hand:P2': { ...hz, contents: [asObjId('e1')] } } }
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'END_TURN', player: P2 })                   
    expect(g.state.activePlayer).toBe(P1)              
    g.apply({ kind: 'PLAY_UNIT', player: P2, oid: 'e1', to: BF0 })                 
    expect(g.state.zones[BF0]!.contents).toHaveLength(0)
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
  })

                                      
  test('#5 END_TURN 后新回合玩家抽牌、结束方不抽', () => {
    const base = createInitialState([P1, P2], 2)
    const mk = (id: string, owner: typeof P1, zone: string): GameObject => ({ oid: asObjId(id), defId: 'BLK', owner, controller: owner, zone: asZoneId(zone), baseMight: 2, baseKeywords: [], damage: 0, counters: {}, status: {} })
    const d1 = mk('d1', P1, 'mainDeck:P1'), d2 = mk('d2', P2, 'mainDeck:P2')
    const dz1 = base.zones['mainDeck:P1']!, dz2 = base.zones['mainDeck:P2']!
    const s: GameState = {
      ...base, activePlayer: P1, priority: null, objects: { d1, d2 },
      zones: { ...base.zones, 'mainDeck:P1': { ...dz1, contents: [asObjId('d1')] }, 'mainDeck:P2': { ...dz2, contents: [asObjId('d2')] } },
    }
    const g = new InteractiveGame(s, DEPS)
    g.apply({ kind: 'END_TURN', player: P1 })
    expect(g.state.activePlayer).toBe(P2)
    expect(g.state.zones['hand:P2']!.contents).toHaveLength(1)                             
    expect(g.state.zones['hand:P1']!.contents).toHaveLength(0)             
  })

                                                
  test('#7 addEffect 降战力至≤伤害 → 清理立即摧毁', () => {
    const base = createInitialState([P1, P2], 2)
    const u: GameObject = { oid: asObjId('u'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0), baseMight: 5, baseKeywords: [], damage: 4, counters: {}, status: {} }
    const bz = base.zones[BF0]!
    const s: GameState = { ...base, objects: { u }, zones: { ...base.zones, [BF0]: { ...bz, contents: [asObjId('u')] } } }
                                            
    const ev: GameEvent = {
      kind: 'addEffect',
      effect: { id: 'test-setmight3', duration: 'permanent', fromPassive: true, predicate: (o) => o.oid === asObjId('u'), modification: { kind: 'setMight', value: 3 } },
    }
    const after = applyEvents(s, [ev]).state
    expect(after.objects['u']).toBeUndefined()                             
    const disc = after.zones['discard:P1']!.contents.map((o) => after.objects[o]!)
    expect(disc.some((o) => o.defId === 'BLK')).toBe(true)            
  })
})
