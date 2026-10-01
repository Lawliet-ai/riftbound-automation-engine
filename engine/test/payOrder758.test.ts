import { describe, expect, test } from 'vitest'
import { canPay, solvePayment, type Capacity } from '../src/state/runePool'
import { asPlayerId } from '../src/state/ids'
import { createInitialState } from '../src/state/gameState'
import { InteractiveGame, type InteractiveDeps } from '../src/session/interactiveGame'
import { activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor } from '../data/registry'
import { seedRunes, payFromState } from '../src/game/economy'

   
                              
  
                                         
                              
                              
  
                                     
                              
   
const cap = (o: Partial<Capacity>): Capacity => ({
  mana: 0, activeRunes: 0, energy: {}, runes: {}, ...o,
} as Capacity)

describe('★758 付费取用序:池内符能优先于回收符文', () => {
  test('跨域:池里有紫符能、场上有蓝符文,付 [蓝|紫] 该花池不该回收', () => {
                                            
    const plan = solvePayment(cap({ energy: { purple: 1 }, runes: { blue: 1 } }), { pips: [['blue', 'purple']] })
    expect(plan).not.toBeNull()
    expect(plan!.energyUsed).toEqual({ purple: 1 })
    expect(plan!.runesRecycled).toEqual({})           
  })

  test('[A] 任意域:同样先花池,不碰场上符文', () => {
    const plan = solvePayment(cap({ energy: { red: 1 }, runes: { green: 1 } }), { pips: [[]] })
    expect(plan).not.toBeNull()
    expect(plan!.energyUsed).toEqual({ red: 1 })
    expect(plan!.runesRecycled).toEqual({})
  })

  test('池不够时照常回收补齐(只改先后,不改能不能付)', () => {
    const plan = solvePayment(cap({ energy: { blue: 1 }, runes: { blue: 2 } }), { pips: [['blue'], ['blue']] })
    expect(plan).not.toBeNull()
    expect(plan!.energyUsed).toEqual({ blue: 1 })
    expect(plan!.runesRecycled).toEqual({ blue: 1 })                     
  })

  test('只有符文没有池:原样回收(单通道场景不受影响)', () => {
    const plan = solvePayment(cap({ runes: { red: 2 } }), { pips: [['red'], ['red']] })
    expect(plan!.runesRecycled).toEqual({ red: 2 })
    expect(plan!.energyUsed).toEqual({})
  })

  test('解的存在性一字不变:付不起的还是付不起', () => {
    const poor = cap({ energy: { blue: 1 }, runes: { blue: 1 } })
    expect(canPay(poor, { pips: [['blue'], ['blue']] })).toBe(true)
    expect(canPay(poor, { pips: [['blue'], ['blue'], ['blue']] })).toBe(false)
    expect(canPay(poor, { pips: [['red']] })).toBe(false)        
  })

  test('法力与 pip 互不挤占:法力仍走池优先、不足才横置', () => {
    const plan = solvePayment(cap({ mana: 2, activeRunes: 3, energy: { blue: 1 } }), { mana: 4, pips: [['blue']] })
    expect(plan).not.toBeNull()
    expect(plan!.manaFromPool).toBe(2)
    expect(plan!.runesTapped).toBe(2)                          
    expect(plan!.energyUsed).toEqual({ blue: 1 })
    expect(plan!.runesRecycled).toEqual({})                  
  })
})

   
                                                   
                              
                                                         
                                         
                                                
                                 
   
describe('★758 手动产资源 → 打牌时先花池里的(委托人第七条的实际路径)', () => {
  const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
  const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, activatedFor }

  test('端到端:手动回收一枚产符能,再付一笔紫 pip —— 场上第二枚符文不该被动', () => {
    let s0 = createInitialState([P1, P2], 2)
    s0 = { ...s0, activePlayer: P1, priority: null, phase: 'main' }
    s0 = seedRunes(s0, P1, 'purple', 3)
    const g = new InteractiveGame(s0, DEPS)
    const runesOf = (st = g.state): readonly string[] =>
      (st.zones[`base:${P1}`]?.contents ?? []).filter((o) => st.objects[o]!.defId.startsWith('rune:'))

                            
    const rec = g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && String((a as { ability: string }).ability).startsWith('rune:recycle'))
    expect(rec).toBeDefined()
    g.apply(rec!)
    expect(g.state.runePools[P1]!.runes['purple']).toBe(1)
    const afterRecycle = runesOf().length         

                                     
    const paid = payFromState(g.state, P1, { pips: [['purple']] })
    expect(paid.ok).toBe(true)
    expect(paid.state.runePools[P1]!.runes['purple'] ?? 0).toBe(0)        
    expect(runesOf(paid.state).length).toBe(afterRecycle)                    
  })
})
