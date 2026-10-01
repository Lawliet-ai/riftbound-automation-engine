import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'
import { setupGame } from '../../src/game/setup'
import { makeRng } from '../../src/util/rng'
import { specLookup, DEMO_DECK_A, DEMO_DECK_B } from '../../data/decks'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor }

function unit(id: string, defId: string, ctrl: typeof P1, zone: string, might: number): GameObject {
  return { oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone), baseMight: might, baseKeywords: [], damage: 0, counters: {}, status: {} }
}
function scene(extra: GameObject[], bfCards: Record<string, { defId: string; owner: typeof P1 }>): GameState {
  let s = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...s.zones }
  for (const o of extra) { objects[o.oid] = o; const z = zones[o.zone]!; zones[o.zone] = { ...z, contents: [...z.contents, o.oid] } }
  s = { ...s, activePlayer: P1, priority: null, phase: 'main', objects, zones, battlefieldCards: bfCards }
  let i = 0
  for (const p of [P1, P2]) for (let k = 0; k < 4; k++) {
    const id = `d${i++}`; const c = unit(id, 'BLK', p, `mainDeck:${p}`, 2)
    s = { ...s, objects: { ...s.objects, [id]: c }, zones: { ...s.zones, [`mainDeck:${p}`]: { ...s.zones[`mainDeck:${p}`]!, contents: [...s.zones[`mainDeck:${p}`]!.contents, asObjId(id)] } } }
  }
  s = seedRunes(s, P1, 'purple', 3)
  s = seedRunes(s, P2, 'blue', 3)
  return s
}
function drain(g: InteractiveGame): void {
  for (let i = 0; i < 10; i++) {
    const p = g.pending()
    if (p.mode === 'window') g.apply({ kind: 'PASS', player: p.player })
    else break
  }
}

describe('战场卡§170:班德尔树/暮色玫瑰/强化阵地', () => {
  test('setup 确立战场身份;班德尔树容量2可布两张待命', () => {
                                                      
    for (let seed = 1; seed < 60; seed++) {
      const { state, chosenBattlefields } = setupGame(DEMO_DECK_A, DEMO_DECK_B, specLookup, makeRng(seed))
      expect(state.battlefieldCards).toBeDefined()
      if (chosenBattlefields['P2'] === 'OGN-278') {
        expect(state.zones['standby:shared:1']!.capacity).toBe(2)                       
        return
      }
    }
    throw new Error('60种子内未随机到班德尔树(概率异常)')
  })

  test('暮色玫瑰:自己开始阶段可摧毁此处己方单位换1抽;跳过则不动', () => {
    const s = scene(
      [unit('sac', 'BLK', P2, BF0, 2)],
      { [BF0]: { defId: 'UNL-209', owner: P2 } },
    )
    const g = new InteractiveGame(s, DEPS)
    const handBefore = g.state.zones['hand:P2']!.contents.length
    g.apply({ kind: 'END_TURN', player: P1 })                    
    drain(g)
    const c = g.pending()
    expect(c.mode).toBe('choice')
    if (c.mode !== 'choice') return
    expect(c.request.candidates.some((x) => x.id === 'sac')).toBe(true)
    g.apply({ kind: 'CHOOSE', player: P2, key: c.request.key, answer: 'sac' })
    drain(g)
                          
    expect(g.state.zones[BF0]!.contents.includes('sac' as never)).toBe(false)
    expect(g.state.zones['discard:P2']!.contents.length).toBeGreaterThan(0)
    expect(g.state.zones['hand:P2']!.contents.length).toBe(handBefore + 2)              
  })

  test('强化阵地:防守方触发→选单位坚守2(防守时+2)→3[M]攻不死2[M]守', () => {
                                                                            
    const s = scene(
      [unit('atk', 'BLK', P2, BF0, 3), unit('def', 'BLK', P1, BF0, 2)],
      { [BF0]: { defId: 'OGN-279', owner: P1 } },
    )
    let s2: GameState = { ...s, activePlayer: P2 }             
    const g = new InteractiveGame(s2, DEPS)
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    drain(g)
    const c = g.pending()
    expect(c.mode).toBe('choice')
    if (c.mode !== 'choice') return
    expect(c.player).toBe(P1)          
    g.apply({ kind: 'CHOOSE', player: P1, key: c.request.key, answer: 'def' })
    drain(g)
                                                      
    expect(g.state.zones[BF0]!.contents.some((o) => g.state.objects[o]?.controller === P1)).toBe(true)
    expect(g.state.zones[BF0]!.contents.some((o) => g.state.objects[o]?.controller === P2)).toBe(false)
  })
})
