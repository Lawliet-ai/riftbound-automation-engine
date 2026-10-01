import { describe, expect, test } from 'vitest'
import { asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { solvePayment, addRune, addMana, type Capacity } from '../../src/state/runePool'
import { payFromState, canPayFromState, seedRunes, manaAvailable, resourceCapacity } from '../../src/game/economy'
import { runAwakenPhase } from '../../src/loop/turnStructure'

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function base(): GameState {
  return createInitialState([P1, P2], 2)
}

                                         
function cap(c: { mana?: number; energy?: Record<string, number>; runes?: Record<string, number>; active?: number }): Capacity {
  const runesTotal = Object.values(c.runes ?? {}).reduce((a, b) => a + b, 0)
  return { mana: c.mana ?? 0, energy: c.energy ?? {}, runes: c.runes ?? {}, activeRunes: c.active ?? runesTotal }
}

describe('符能分色 · 匹配求解(§131/§135.2.e/§164.2 + 官方QA:横置仍可回收)', () => {
  test('[A](空pip)可用任意域符文付;纯法力不能付pip(§163)', () => {
    expect(solvePayment(cap({ runes: { green: 1 } }), { pips: [[]] })).not.toBeNull()
    expect(solvePayment(cap({ mana: 5 }), { pips: [[]] })).toBeNull()         
  })

  test('[C]双域卡(§135.2.e.6.c):green|purple 任一域可付', () => {
    expect(solvePayment(cap({ runes: { purple: 1 } }), { pips: [['green', 'purple']] })).not.toBeNull()
    expect(solvePayment(cap({ runes: { blue: 1 } }), { pips: [['green', 'purple']] })).toBeNull()
  })

  test('域约束挤占须回溯:[green]pip+[A]pip,green/purple各1 → [A]拿purple', () => {
    const plan = solvePayment(cap({ runes: { green: 1, purple: 1 } }), { pips: [['green'], []] })
    expect(plan).not.toBeNull()
    expect(plan!.runesRecycled).toEqual({ green: 1, purple: 1 })
  })

  test('官方QA:同一符文可先横置产法力再回收产符能——2绿符文付{2法力+[G]}可行', () => {
                                                       
    const plan = solvePayment(cap({ runes: { green: 2 }, active: 2 }), { mana: 2, pips: [['green']] })
    expect(plan).not.toBeNull()
    expect(plan!.runesTapped).toBe(2)
    expect(plan!.runesRecycled).toEqual({ green: 1 })
  })

  test('横置符文仍是回收源:active=0 仍可付 pip;但法力只看活跃数', () => {
    expect(solvePayment(cap({ runes: { green: 1 }, active: 0 }), { pips: [['green']] })).not.toBeNull()
    expect(solvePayment(cap({ runes: { green: 1 }, active: 0 }), { mana: 1 })).toBeNull()
  })

  test('多 pip 混付:池符能+回收符文交错,3pip 跨域', () => {
    const c = cap({ energy: { red: 1 }, runes: { red: 1, blue: 1 }, active: 2 })
    const plan = solvePayment(c, { pips: [['red'], ['red'], ['blue']] })
    expect(plan).not.toBeNull()
    expect(plan!.energyUsed).toEqual({ red: 1 })
    expect(plan!.runesRecycled).toEqual({ red: 1, blue: 1 })
                       
    expect(solvePayment(c, { pips: [['red'], ['red'], ['blue'], []] })).toBeNull()
  })

  test('池符能优先于回收符文(留符文在场)', () => {
    const plan = solvePayment(cap({ energy: { green: 1 }, runes: { green: 1 } }), { pips: [['green']] })
    expect(plan!.energyUsed).toEqual({ green: 1 })
    expect(plan!.runesRecycled).toEqual({})
  })
})

describe('状态级支付 payFromState(§164.2/§416.1.b)', () => {
  test('同枚双产:2绿符文付{2法力+[G]}→场上1横置、牌堆+1、可用法力0', () => {
    let s = base()
    s = seedRunes(s, P1, 'green', 2)
    const pay = payFromState(s, P1, { mana: 2, pips: [['green']] })
    expect(pay.ok).toBe(true)
    s = pay.state
    const baseRunes = s.zones[asZoneId('base:P1')]!.contents.map((o) => s.objects[o]!).filter((o) => o.defId.startsWith('rune:'))
    expect(baseRunes).toHaveLength(1)              
    expect(baseRunes[0]!.status.tapped).toBe(true)
    expect(s.zones[asZoneId('runeDeck:P1')]!.contents).toHaveLength(1)
    expect(manaAvailable(s, P1)).toBe(0)
  })

  test('回收放牌堆【底】(§416.1.b):预置牌堆非空,回收的在 index 0、原顶仍在顶', () => {
    let s = base()
    s = seedRunes(s, P1, 'green', 1)              
                    
    const deckId = asZoneId('runeDeck:P1')
    let s2 = s
    for (const c of ['blue', 'purple']) {
      const tmp = seedRunes(s2, P1, c, 1)                    
      s2 = tmp
    }
                                            
    const baseZ = s2.zones[asZoneId('base:P1')]!
    const movers = baseZ.contents.filter((o) => { const d = s2.objects[o]!.defId; return d === 'rune:blue' || d === 'rune:purple' })
    const deck = s2.zones[deckId]!
    s2 = {
      ...s2,
      objects: Object.fromEntries(Object.entries(s2.objects).map(([k, v]) => movers.includes(k as never) ? [k, { ...v, zone: deckId }] : [k, v])),
      zones: {
        ...s2.zones,
        [baseZ.id]: { ...baseZ, contents: baseZ.contents.filter((o) => !movers.includes(o)) },
        [deckId]: { ...deck, contents: [...deck.contents, ...movers] }, // 尾=顶:purple 在顶
      },
    }
    const topBefore = s2.zones[deckId]!.contents.at(-1)!
    const pay = payFromState(s2, P1, { pips: [['green']] })
    expect(pay.ok).toBe(true)
    const after = pay.state.zones[deckId]!.contents
    expect(after).toHaveLength(3)
    expect(pay.state.objects[after[0]!]!.defId).toBe('rune:green')          
    expect(after.at(-1)).toBe(topBefore)        
  })

  test('回收优先选已横置符文(留活跃在场)', () => {
    let s = base()
    s = seedRunes(s, P1, 'green', 2)
               
    const oid = s.zones[asZoneId('base:P1')]!.contents[0]!
    s = { ...s, objects: { ...s.objects, [oid]: { ...s.objects[oid]!, status: { tapped: true } } } }
    const pay = payFromState(s, P1, { pips: [['green']] })
    expect(pay.ok).toBe(true)
    const remaining = pay.state.zones[asZoneId('base:P1')]!.contents.map((o) => pay.state.objects[o]!)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.status.tapped).not.toBe(true)          
    expect(manaAvailable(pay.state, P1)).toBe(1)
  })

  test('横置产法力留场;唤醒解横置(§315.1.b);回收的仍在牌堆待召', () => {
    let s = base()
    s = seedRunes(s, P1, 'green', 2)
    const pay = payFromState(s, P1, { mana: 1, pips: [['green']] })
    expect(pay.ok).toBe(true)
    s = pay.state
                                        
    expect(manaAvailable(s, P1)).toBe(1)
    s = runAwakenPhase({ ...s, activePlayer: P1 })
    expect(manaAvailable(s, P1)).toBe(1)
  })

  test('付不起不改态;池纯法力可付法力数但付不了pip', () => {
    let s = base()
    s = { ...s, runePools: { ...s.runePools, [P1]: addMana(s.runePools[P1]!, 3) } }
    expect(canPayFromState(s, P1, { mana: 3 })).toBe(true)
    expect(canPayFromState(s, P1, { pips: [[]] })).toBe(false)            
    const pay = payFromState(s, P1, { mana: 1, pips: [['red']] })
    expect(pay.ok).toBe(false)
    expect(pay.state).toBe(s)
  })

  test('池内符能(效果所得)可付pip且不动板面符文', () => {
    let s = base()
    s = seedRunes(s, P2, 'purple', 1)
    s = { ...s, runePools: { ...s.runePools, [P2]: addRune(s.runePools[P2]!, 'purple', 1) } }
    const pay = payFromState(s, P2, { pips: [['purple']] })
    expect(pay.ok).toBe(true)
    expect(resourceCapacity(pay.state, P2).runes).toEqual({ purple: 1 })          
    expect(pay.state.runePools['P2']!.runes['purple']).toBe(0)
  })
})
