import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame, type InteractiveAction } from '../../src/session/interactiveGame'
import { activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { isEmpowered } from '../../src/keywords/empower'
import { akaliDamageCandidates, akaliDamageAmount } from '../../data/cards/VEN-021'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'

                                     
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'
const might = (o: GameObject): number => effectiveMight(o).actual

function akali(oid = 'a', zone = BF0, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('VEN-021')
  return {
    oid: asObjId(oid), defId: 'VEN-021', owner: P1, controller: P1, zone: asZoneId(zone),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function unit(oid: string, zone: string, owner = P1): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner, controller: owner, zone: asZoneId(zone),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], mana = 9): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana, runes: { red: 5 } } },
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
const empowerAct = (g: InteractiveGame, oid = 'a'): InteractiveAction | undefined =>
  g.legalActions(P1).find(
    (a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === oid && (a as { ability: string }).ability.startsWith('empower'),
  )

describe('★§827 带【域】的强化费用:强化2红色', () => {
  test('真 registry 出得来这条规格(parseCostSuffix 认得"2红色")', () => {
    const spec = activatedFor('VEN-021').find((s) => s.key.startsWith('empower'))
    expect(spec).toBeDefined()
    expect(spec!.cost).toEqual({ mana: 2, pips: [['red']] })                             
  })

  test('★有红符能 → 激活 → settle → 真的已强化', () => {
    const g = new InteractiveGame(scene([akali()]), realDeps)
    const act = empowerAct(g)
    expect(act).toBeDefined()
    g.apply(act!)
    settle(g)
    expect(isEmpowered(g.state.objects['a']!)).toBe(true)
  })

  test('★没有【红】符能 → 付不起,这条动作不出现(域是硬约束,不是摆设)', () => {
    const st = scene([akali()])
    const noRed: GameState = { ...st, runePools: { ...st.runePools, [P1]: { mana: 9, runes: { blue: 5 } } } }
    const g = new InteractiveGame(noRed, realDeps)
    expect(empowerAct(g)).toBeUndefined()
  })

  test('§441.1.b 已强化后不再列出', () => {
    const g = new InteractiveGame(scene([akali('a', BF0, { counters: { empower: 1 } })]), realDeps)
    expect(empowerAct(g)).toBeUndefined()
  })
})

describe('★移动触发:候选集与伤害值', () => {
  test('真 registry 收得到这条触发(字段是 sourceOid)', () => {
    const st = scene([akali()])
    expect(activeTriggers(st).some((t) => t.sourceOid === asObjId('a'))).toBe(true)
  })

  test('候选集 = 起点战场 ∪ 终点战场上的全部单位', () => {
    const st = scene([akali('a', BF1), unit('u0', BF0), unit('u1', BF1)])
    const c = akaliDamageCandidates(st, asZoneId(BF0), asZoneId(BF1))
    expect([...c].sort()).toEqual(['a', 'u0', 'u1'].sort())
  })

  test('★阿卡丽自己也是合法目标(卡文没写"其他",不能自作主张排除)', () => {
    const st = scene([akali('a', BF1)])
    expect(akaliDamageCandidates(st, asZoneId(BF0), asZoneId(BF1))).toContain(asObjId('a'))
  })

  test('★敌方单位也算(卡文没写"敌方",也没写"友方"——是并集不分敌我)', () => {
    const st = scene([akali('a', BF1), unit('e', BF1, P2)])
    expect(akaliDamageCandidates(st, asZoneId(BF0), asZoneId(BF1))).toContain(asObjId('e'))
  })

  test('★起点不是战场(如基地)时只算终点那边,不整条哑掉', () => {
    const st = scene([akali('a', BF0), unit('u0', BF0)])
    const c = akaliDamageCandidates(st, asZoneId(`base:${P1}`), asZoneId(BF0))
    expect([...c].sort()).toEqual(['a', 'u0'].sort())
  })

  test('非单位(符文等)不进候选', () => {
    const rune: GameObject = {
      oid: asObjId('r'), defId: 'rune:red', owner: P1, controller: P1, zone: asZoneId(BF0),
      baseMight: 0, baseKeywords: [], baseTypes: ['rune'], damage: 0, counters: {}, status: {},
    }
    const st = scene([akali(), rune])
    expect(akaliDamageCandidates(st, asZoneId(BF0), asZoneId(BF0))).not.toContain(asObjId('r'))
  })

  test('★「如果我已强化则【改为】2点」是替换不是叠加', () => {
    const plain = scene([akali()])
    expect(akaliDamageAmount(plain, asObjId('a'))).toBe(1)
    const emp = scene([akali('a', BF0, { counters: { empower: 1 } })])
    expect(akaliDamageAmount(emp, asObjId('a'))).toBe(2)        
  })
})

describe('★§828 [已强化>]{S}+1 与强化串起来', () => {
  test('未强化 3[M];激活强化后 settle → 4[M]', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([akali()]), realDeps)
    expect(might(recomputeContinuous(g.state).objects['a']!)).toBe(3)
    g.apply(empowerAct(g)!)
    settle(g)
    expect(isEmpowered(g.state.objects['a']!)).toBe(true)
    expect(might(recomputeContinuous(g.state).objects['a']!)).toBe(4)
  })
})
