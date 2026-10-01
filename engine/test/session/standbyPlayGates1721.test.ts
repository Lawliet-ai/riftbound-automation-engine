   
                                                          
                                                       
  
                       
          
                                                                                                                     
                                                          
                                                                          
                                                          
                                                                         
                                                     
                                              
  
                                                           
                                                                     
   
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { makeGameDeps } from '../../data/gameDeps'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS = makeGameDeps(1)
const mk = (oid: string, defId: string, ctrl: typeof P1, zone: string, st: Record<string, unknown> = {}): GameObject => ({
  oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
  baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: st,
} as GameObject)

const sbIdOf = (s: GameState): string =>
  String(Object.values(s.zones).find((z) => z.kind === 'standby' && (z as { parentBattlefield?: string }).parentBattlefield === BF0)!.id)

                                        
function scene(holder: typeof P1, card: (sb: string) => GameObject): GameState {
  const s0 = createInitialState([P1, P2], 2)
  const sb = sbIdOf(s0)
  const c = card(sb)
  return {
    ...s0, activePlayer: P1, phase: 'main', priority: null,
    objects: { mine: mk('mine', 'U-ONE', holder, BF0), [c.oid]: c },
    zones: {
      ...s0.zones,
      [BF0]: { ...s0.zones[BF0]!, contents: [asObjId('mine')] },
      [sb]: { ...s0.zones[sb]!, contents: [c.oid] },
    },
  } as GameState
}

const kindOf = (g: InteractiveGame, oid: string): string =>
  String(g.state.zones[g.state.objects[oid as never]!.zone]?.kind)

describe('★1721 §811.1.c.3 从待命打出的两道门', () => {
  test('① 🔴⭐⭐⭐⭐⭐【S1 拥有者门:不许打【对手的】待命牌】', () => {
    const g = new InteractiveGame(scene(P2, (sb) => mk('c', 'OGN-135', P2, sb, { faceDown: true })), DEPS)
    g.apply({ kind: 'PLAY_STANDBY', player: P1, oid: 'c' } as never)
                                                
    expect({ zone: kindOf(g, 'c'), ctrl: String(g.state.objects['c' as never]!.controller) },
      '★必须原样留在待命区').toEqual({ zone: 'standby', ctrl: 'P2' })
  })

  test('② 🔴⭐⭐⭐⭐【S2 面朝下门:正面朝上的牌不处于待命状态,不能按「从待命打出」走】', () => {
    const g = new InteractiveGame(scene(P1, (sb) => mk('c', 'OGN-135', P1, sb, {})), DEPS)
    g.apply({ kind: 'PLAY_STANDBY', player: P1, oid: 'c' } as never)
    expect(kindOf(g, 'c'), '★没有 faceDown ⇒ 不是待命牌').toBe('standby')
  })

  test('③ ⭐⭐【对照:自己的、面朝下、不是本回合刚布置的 ⇒ 照常打得出】', () => {
    const g = new InteractiveGame(scene(P1, (sb) => mk('c', 'OGN-135', P1, sb, { faceDown: true })), DEPS)
    g.apply({ kind: 'PLAY_STANDBY', player: P1, oid: 'c' } as never)
    expect(kindOf(g, 'c'), '★这一档该进场,否则闸就成了"谁都打不出"').toBe('battlefield')
  })

  test('④ ⭐⭐【第三截仍在:本回合刚布置的(standbyFresh)不许打出(★1671 量过的那半)】', () => {
    const g = new InteractiveGame(scene(P1, (sb) => mk('c', 'OGN-135', P1, sb, { faceDown: true, standbyFresh: true })), DEPS)
    g.apply({ kind: 'PLAY_STANDBY', player: P1, oid: 'c' } as never)
    expect(kindOf(g, 'c')).toBe('standby')
  })
})
