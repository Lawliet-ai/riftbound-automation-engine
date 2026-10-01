import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs } from '../../data/registry'

const DEPS = { getTriggers: activeTriggers, handPlaySpecs }

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                           
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const vegas: GameObject = { oid: asObjId('vegas'), defId: 'UNL-150', owner: P2, controller: P2, zone: asZoneId(BF0), baseMight: 4, baseKeywords: ['法盾'], damage: 0, counters: {}, status: {} }
  const hand: GameObject = { oid: asObjId('h1'), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId('hand:P1'), baseMight: 3, baseKeywords: [], damage: 0, counters: {}, status: {} }
  const bfz = base.zones[BF0]!
  const hz = base.zones['hand:P1']!
  return {
    ...base, activePlayer: P1, priority: null,
    objects: { vegas, h1: hand },
    zones: { ...base.zones, [BF0]: { ...bfz, contents: [asObjId('vegas')] }, 'hand:P1': { ...hz, contents: [asObjId('h1')] } },
  }
}

                                     
function playedUnit(g: InteractiveGame): GameObject {
  const z = g.state.zones['base:P1']!
  const o = z.contents.map((id) => g.state.objects[id]!).find((x) => x.defId !== 'UNL-150')
  if (!o) throw new Error('未找到打出的单位')
  return o
}

                                             
                                             
                                              
                           
const TO = 'base:P1'

describe('InteractiveGame 热座真卡局(薇古丝反应窗口)', () => {
  test('起手:行动阶段属 P1,合法动作含打出手牌单位', () => {
    const g = new InteractiveGame(scene(), DEPS)
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
    const acts = g.legalActions(P1)
    expect(acts.some((a) => a.kind === 'PLAY_UNIT')).toBe(true)
    expect(g.legalActions(P2)).toEqual([])            
  })

  test('P1 打单位→薇古丝触发→反应窗口先给 P2;窗口内尚未眩晕', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'h1', to: TO })
    const p = g.pending()
    expect(p.mode).toBe('window')
    if (p.mode !== 'window') throw new Error('应进入反应窗口')
    expect(p.player).toBe(P2)                         
    expect(playedUnit(g).status.stunned).toBeUndefined()          
    expect(g.legalActions(P2)).toEqual([{ kind: 'PASS', player: P2 }])
  })

  test('双方各让过→结算眩晕+本回合不可移动→回到 P1 行动阶段', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'h1', to: TO })
    g.apply({ kind: 'PASS', player: P2 })            
    expect(g.pending()).toEqual({ mode: 'window', player: P1, chainDepth: 1 })           
    g.apply({ kind: 'PASS', player: P1 })             
    const played = playedUnit(g)
    expect(played.status.stunned).toBe(true)
    expect(played.derived?.restrictions ?? []).toContain('moveBy:P1')                        
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })              
  })

  test('非持优先权者在窗口里动作被忽略', () => {
    const g = new InteractiveGame(scene(), DEPS)
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'h1', to: TO })
    g.apply({ kind: 'PASS', player: P1 })                        
    expect(g.pending()).toEqual({ mode: 'window', player: P2, chainDepth: 1 })
  })
})
