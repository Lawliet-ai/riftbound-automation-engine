import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { isEmpowered } from '../../src/keywords/empower'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'

                                            
                                
                                                               

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const might = (o: GameObject): number => effectiveMight(o).actual

function wolf(oid = 'w', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-032')
  return {
    oid: asObjId(oid), defId: 'VEN-032', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
   
                                           
                              
   
function runes(n: number, tapped = true): GameObject[] {
  return Array.from({ length: n }, (_, i) => ({
    oid: asObjId(`r${i}`), defId: 'rune:green', owner: P1, controller: P1,
    zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune' as const],
    damage: 0, counters: {}, status: tapped ? { tapped: true } : {},
  }))
}
function scene(objs: GameObject[], mana: number): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: { ...base.runePools, [P1]: { mana, runes: { green: 9 } } },
  }
}
const realDeps = { getTriggers: activeTriggers, handPlaySpecs: () => [], activatedFor, cardCost, cardKeywords, cardKind }
const settle = (g: InteractiveGame): void => {
  for (let i = 0; i < 16 && g.state.chain.length > 0; i++) {
    for (const p of [P1, P2]) {
      const pass = g.legalActions(p).find((a) => a.kind === 'PASS')
      if (pass) g.apply(pass)
    }
  }
}
const empowerAct = (g: InteractiveGame): InteractiveAction | undefined =>
  g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && (a as { ability: string }).ability === 'VEN-032:empower')

describe('★§827.1.c.3 变量减免:减免额随符文数变', () => {
  test('真 registry 出得来这条规格,印刷基础费是 12', () => {
    const spec = activatedFor('VEN-032').find((s) => s.key === 'VEN-032:empower')
    expect(spec).toBeDefined()
    expect(spec!.cost).toEqual({ mana: 12 })
  })

  test('★5 枚符文 → 12−5=7:有 7 法力就激活得了,有 6 就不行', () => {
    const ok = new InteractiveGame(scene([wolf(), ...runes(5)], 7), realDeps)
    const no = new InteractiveGame(scene([wolf(), ...runes(5)], 6), realDeps)
    expect(empowerAct(ok)).toBeDefined()
    expect(empowerAct(no)).toBeUndefined()
  })

  test('★符文越多越便宜:8 枚 → 12−8=4', () => {
    const ok = new InteractiveGame(scene([wolf(), ...runes(8)], 4), realDeps)
    const no = new InteractiveGame(scene([wolf(), ...runes(8)], 3), realDeps)
    expect(empowerAct(ok)).toBeDefined()
    expect(empowerAct(no)).toBeUndefined()
  })

  test('★12 枚符文 → 减到 0,一点法力都不用付', () => {
    const g = new InteractiveGame(scene([wolf(), ...runes(12)], 0), realDeps)
    expect(empowerAct(g)).toBeDefined()
  })

  test('★§356 减免不会把费用压成负数:13 枚符文仍是 0 费(不是 −1)', () => {
    const g = new InteractiveGame(scene([wolf(), ...runes(13)], 0), realDeps)
    const act = empowerAct(g)
    expect(act).toBeDefined()
    g.apply(act!)
    expect(g.state.runePools[P1]!.mana).toBe(0)          
  })

  test('零符文 → 无减免,原价 12', () => {
    const no = new InteractiveGame(scene([wolf()], 11), realDeps)
    const ok = new InteractiveGame(scene([wolf()], 12), realDeps)
    expect(empowerAct(no)).toBeUndefined()
    expect(empowerAct(ok)).toBeDefined()
  })

  test('★付费侧与枚举侧同一份计算:5 枚符文时【真的只扣 7】', () => {
    const g = new InteractiveGame(scene([wolf(), ...runes(5)], 9), realDeps)
    g.apply(empowerAct(g)!)
    expect(g.state.runePools[P1]!.mana).toBe(2)                                 
  })

  test('★「你每控制一枚符文」含【横置】的:5 枚全横置照样减 5', () => {
                                                           
    const g = new InteractiveGame(scene([wolf(), ...runes(5, true)], 7), realDeps)
    expect(empowerAct(g)).toBeDefined()
  })

  test('★§206.1 印刷基础费不被回写', () => {
    const spec = activatedFor('VEN-032').find((s) => s.key === 'VEN-032:empower')!
    const g = new InteractiveGame(scene([wolf(), ...runes(5)], 9), realDeps)
    g.apply(empowerAct(g)!)
    expect(spec.cost).toEqual({ mana: 12 })
  })

  test('§827.1.c.1 已强化后不再列出', () => {
    const g = new InteractiveGame(scene([wolf('w', { counters: { empower: 1 } }), ...runes(12)], 9), realDeps)
    expect(empowerAct(g)).toBeUndefined()
  })
})

describe('★整张卡串起来:强化后 3[M] → 6[M]', () => {
  test('激活 → settle → 已强化且 §828 的 {S}+3 生效', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([wolf(), ...runes(12)], 0), realDeps)
    expect(might(recomputeContinuous(g.state).objects['w']!)).toBe(3)
    g.apply(empowerAct(g)!)
    settle(g)
    expect(isEmpowered(g.state.objects['w']!)).toBe(true)
    expect(might(recomputeContinuous(g.state).objects['w']!)).toBe(6)
  })
})
