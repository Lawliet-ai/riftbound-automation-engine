                                                 
                                          
  
                                
                                 
                                  
                                        
import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor } from '../../data/registry'
import { seedRunes } from '../../src/game/economy'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor }

function scene(): GameState {
  let s = createInitialState([P1, P2], 2)
  s = { ...s, activePlayer: P1, priority: null, phase: 'main' }
  s = seedRunes(s, P1, 'purple', 3)
  s = seedRunes(s, P2, 'blue', 3)
  return s
}

                                            
function myRunes(s: GameState, p = P1): GameObject[] {
  return (s.zones[`base:${p}`]?.contents ?? [])
    .map((oid) => s.objects[oid]!)
    .filter((o) => o.defId.startsWith('rune:'))
}

describe('★758 §164.2 符文的两条技能进入动作面', () => {
  test('每枚活跃符文列出两条动作:横置产法力 / 回收产符能', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const runes = myRunes(g.state)
    expect(runes.length).toBe(3)
    const acts = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && a.oid === runes[0]!.oid)
    const keys = acts.map((a) => (a as { ability: string }).ability).sort()
    expect(keys).toEqual(['rune:recycle:purple', 'rune:tap:purple'])
  })

  test('横置产法力:符文变横置、池里多 1 点法力(§164.2.a)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const oid = myRunes(g.state)[0]!.oid
    const tap = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === oid && (a as { ability: string }).ability.startsWith('rune:tap'))
    expect(tap).toBeDefined()
    g.apply(tap!)
    expect(g.state.objects[oid]!.status.tapped).toBe(true)
    expect(g.state.runePools[P1]!.mana).toBe(1)
                                          
    expect(g.state.chain).toHaveLength(0)
    expect(g.pending()).toEqual({ mode: 'action', player: P1 })
  })

  test('回收产符能:符文离场进符文牌堆、池里多 1 点【本域】符能(§164.2.b/§164.2.b.1)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const before = myRunes(g.state).length
    const oid = myRunes(g.state)[0]!.oid
    const rec = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === oid && (a as { ability: string }).ability.startsWith('rune:recycle'))
    expect(rec).toBeDefined()
    g.apply(rec!)
    expect(myRunes(g.state).length).toBe(before - 1)          
    expect(g.state.runePools[P1]!.runes['purple']).toBe(1)            
    expect(g.state.runePools[P1]!.runes['blue'] ?? 0).toBe(0)
    expect(g.state.chain).toHaveLength(0)
  })

  test('★同枚双产:已横置的符文【仍可】回收(§164.2.b 费用逐字只有"回收此牌")', () => {
                                             
                                                
    const g = new InteractiveGame(scene(), DEPS)
    const oid = myRunes(g.state)[0]!.oid
    g.apply(g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === oid && (a as { ability: string }).ability.startsWith('rune:tap'))!)
    expect(g.state.objects[oid]!.status.tapped).toBe(true)
    const rec = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === oid && (a as { ability: string }).ability.startsWith('rune:recycle'))
    expect(rec).toBeDefined()           
    g.apply(rec!)
    expect(g.state.runePools[P1]!.mana).toBe(1)                   
    expect(g.state.runePools[P1]!.runes['purple']).toBe(1)        
  })

  test('已横置的符文不能【再】横置(tapSelf 要求当前未横置)', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const oid = myRunes(g.state)[0]!.oid
    g.apply(g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === oid && (a as { ability: string }).ability.startsWith('rune:tap'))!)
    const again = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === oid && (a as { ability: string }).ability.startsWith('rune:tap'))
    expect(again).toBeUndefined()
  })

  test('只列自己的符文:对手那三枚不出现在我的动作面里', () => {
    const g = new InteractiveGame(scene(), DEPS)
    const foeOids = new Set(myRunes(g.state, P2).map((o) => String(o.oid)))
    const mine = g.legalActions(P1).filter((a) => a.kind === 'ACTIVATE' && foeOids.has(String((a as { oid: string }).oid)))
    expect(mine).toHaveLength(0)
  })

  test('先手动产资源、再打牌:池里的资源确实能用出去(委托人要的那个玩法)', () => {
    const g = new InteractiveGame(scene(), DEPS)
                       
    for (const r of myRunes(g.state)) {
      const tap = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && a.oid === r.oid && (a as { ability: string }).ability.startsWith('rune:tap'))
      if (tap) g.apply(tap)
    }
    expect(g.state.runePools[P1]!.mana).toBe(3)
                                
    expect(myRunes(g.state).every((o) => o.status.tapped === true)).toBe(true)
  })
})
