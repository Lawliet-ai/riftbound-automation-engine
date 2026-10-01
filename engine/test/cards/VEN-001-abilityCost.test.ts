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

                                                       
const kws = (o: GameObject): readonly string[] => (o.derived ? o.derived.keywords : (o.baseKeywords ?? []))

                                                  
                                                       
  
                                                 
                                          
  
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function baccai(oid = 'b', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-001')
  return {
    oid: asObjId(oid), defId: 'VEN-001', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
   
                  
                                              
                                          
                                                        
                                            
                                                        
   
function runes(n: number, tapped = true): GameObject[] {
  return Array.from({ length: n }, (_, i) => ({
    oid: asObjId(`r${i}`), defId: 'rune:red', owner: P1, controller: P1,
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
    runePools: { ...base.runePools, [P1]: { mana, runes: { red: 9 } } },
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
  g.legalActions(P1).find((a) => a.kind === 'ACTIVATE' && (a as { ability: string }).ability === 'VEN-001:empower')

describe('★§827.1.c.3 技能自带的减费文本:实际付费必须按调整后的价', () => {
  test('真 registry 出得来这条规格', () => {
    expect(activatedFor('VEN-001').some((s) => s.key === 'VEN-001:empower')).toBe(true)
  })

  test('★符文 4 枚(≤4,减免生效):只有 2 法力也激活得了(5−3=2)', () => {
    const g = new InteractiveGame(scene([baccai(), ...runes(4)], 2), realDeps)
    expect(empowerAct(g)).toBeDefined()
  })

  test('★符文 5 枚(>4,无减免):2 法力不够,这条动作不出现', () => {
    const g = new InteractiveGame(scene([baccai(), ...runes(5)], 2), realDeps)
    expect(empowerAct(g)).toBeUndefined()
  })

  test('符文 5 枚且有 5 法力 → 按原价激活得了', () => {
    const g = new InteractiveGame(scene([baccai(), ...runes(5)], 5), realDeps)
    expect(empowerAct(g)).toBeDefined()
  })

  test('★付费侧与枚举侧同一份计算:减免生效时【真的只扣 2】', () => {
    const g = new InteractiveGame(scene([baccai(), ...runes(4)], 9), realDeps)
    g.apply(empowerAct(g)!)
    expect(g.state.runePools[P1]!.mana).toBe(7)                             
  })

  test('无减免时按原价扣 5', () => {
    const g = new InteractiveGame(scene([baccai(), ...runes(5)], 9), realDeps)
    g.apply(empowerAct(g)!)
    expect(g.state.runePools[P1]!.mana).toBe(4)       
  })

  test('★「不超过四枚」是 <=4 不是 <4:恰好 4 枚必须享受减免', () => {
    const cheap = new InteractiveGame(scene([baccai(), ...runes(4)], 2), realDeps)
    const dear = new InteractiveGame(scene([baccai(), ...runes(5)], 2), realDeps)
    expect(empowerAct(cheap)).toBeDefined()
    expect(empowerAct(dear)).toBeUndefined()
  })

  test('★「你控制的符文数量」含【横置】的:5 枚全横置仍算 5 枚,不享受减免', () => {
                                                               
    const g = new InteractiveGame(scene([baccai(), ...runes(5, true)], 2), realDeps)
    expect(empowerAct(g)).toBeUndefined()
  })

  test('对照:5 枚【未横置】符文时动作出得来——因为符文自己就能横置产法力付掉这 5 费', () => {
                                                 
    const g = new InteractiveGame(scene([baccai(), ...runes(5, false)], 2), realDeps)
    expect(empowerAct(g)).toBeDefined()
  })

  test('★§206.1 印刷基础费不被回写:减免只作用于本次付费', () => {
    const spec = activatedFor('VEN-001').find((s) => s.key === 'VEN-001:empower')!
    const g = new InteractiveGame(scene([baccai(), ...runes(4)], 9), realDeps)
    g.apply(empowerAct(g)!)
    expect(spec.cost).toEqual({ mana: 5 })                       
  })
})

describe('★整张卡串起来:强化后真的拿到 [法盾] 与 [强攻2]', () => {
  test('激活 → settle → 已强化,且 §828 授予的两个关键词都在身上', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([baccai(), ...runes(4)], 9), realDeps)
    expect(kws(g.state.objects['b']!)).not.toContain('法盾')
    g.apply(empowerAct(g)!)
    settle(g)
    expect(isEmpowered(g.state.objects['b']!)).toBe(true)
    const after = recomputeContinuous(g.state)
    expect(kws(after.objects['b']!)).toContain('法盾')
    expect(kws(after.objects['b']!)).toContain('强攻2')
  })
})
