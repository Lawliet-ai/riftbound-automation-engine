import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { PlaySpec } from '../../src/loop/playSpec'
import { InteractiveGame } from '../../src/session/interactiveGame'
import { deflectValue, deflectSurcharge } from '../../src/keywords/deflect'

                                                      
                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function unit(id: string, kws: readonly string[], ctrl = P2): GameObject {
  return {
    oid: asObjId(id), defId: `D-${id}`, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: 3, baseKeywords: kws, baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function spell(id: string): GameObject {
  return {
    oid: asObjId(id), defId: 'BOLT', owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['spell'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], mana = 9, runes: Record<string, number> = {}): GameState {
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
    runePools: { ...base.runePools, [P1]: { mana, runes } },
  }
}
const SPEC = {
  defId: 'BOLT', cardNo: 'X', name: '电击', kind: 'spell' as const,
  cost: { mana: 1 }, keywords: [], target: 'custom' as const,
  legalTargets: (st: GameState) => Object.values(st.objects).filter((o) => o.baseTypes?.includes('unit')).map((o) => o.oid as string),
  makeResolve: () => () => [],
} as unknown as PlaySpec
const deps = { getTriggers: () => [], handPlaySpecs: () => [SPEC], cardKeywords: () => [] }
const plays = (g: InteractiveGame) => g.legalActions(P1).filter((a) => a.kind === 'PLAY_CARD')

describe('§809.1.b/§809.2 法盾值', () => {
  test('「法盾」不带数字 → §809.1.b.3 默认 1', () => {
    expect(deflectValue(unit('a', ['法盾']))).toBe(1)
  })

  test('「法盾4」→ 4', () => {
    expect(deflectValue(unit('a', ['法盾4']))).toBe(4)
  })

  test('★§809.2 多来源【相加】', () => {
    expect(deflectValue(unit('a', ['法盾', '法盾2']))).toBe(3)
  })

  test('★§809.1.c 只对【对手】加费:打自己的单位不收钱', () => {
    const s = scene([unit('mine', ['法盾4'], P1)])
    expect(deflectSurcharge(s, asObjId('mine'), P1)).toBe(0)
  })
})

describe('★接线:枚举与支付两侧都真的收这笔钱', () => {
  test('目标带法盾1 → 打不出来(只有 1 法力、没有符能付 [A])', () => {
    const g = new InteractiveGame(scene([spell('s'), unit('t', ['法盾'])], 1, {}), deps)
    expect(plays(g).filter((a) => (a as { target?: string }).target === 't')).toEqual([])
  })

  test('给够任意特性符能 → 打得出来(§809.1.c.1 符能可为任何特性)', () => {
    const g = new InteractiveGame(scene([spell('s'), unit('t', ['法盾'])], 1, { blue: 1 }), deps)
    expect(plays(g).some((a) => (a as { target?: string }).target === 't')).toBe(true)
  })

  test('★同一局里:打【自己的】单位不用多付,打对手的要多付', () => {
    const g = new InteractiveGame(scene([spell('s'), unit('mine', ['法盾'], P1), unit('theirs', ['法盾'])], 1, {}), deps)
    const ts = plays(g).map((a) => (a as { target?: string }).target)
    expect(ts).toContain('mine')          
    expect(ts).not.toContain('theirs')          
  })

  test('★法盾4 要 4 枚符能:给 3 枚不够、4 枚才够', () => {
    const g3 = new InteractiveGame(scene([spell('s'), unit('t', ['法盾4'])], 1, { blue: 3 }), deps)
    expect(g3.legalActions(P1).filter((a) => a.kind === 'PLAY_CARD' && (a as { target?: string }).target === 't')).toEqual([])
    const g4 = new InteractiveGame(scene([spell('s'), unit('t', ['法盾4'])], 1, { blue: 4 }), deps)
    expect(g4.legalActions(P1).some((a) => a.kind === 'PLAY_CARD' && (a as { target?: string }).target === 't')).toBe(true)
  })

  test('★落地真的扣掉了那笔符能(不是只在枚举里做样子)', () => {
    const g = new InteractiveGame(scene([spell('s'), unit('t', ['法盾'])], 1, { blue: 2 }), deps)
    const act = plays(g).find((a) => (a as { target?: string }).target === 't')!
    g.apply(act)
    expect(g.state.runePools[P1]!.runes['blue']).toBe(1)         
  })

  test('没有法盾的目标不多收钱', () => {
    const g = new InteractiveGame(scene([spell('s'), unit('t', [])], 1, {}), deps)
    expect(plays(g).some((a) => (a as { target?: string }).target === 't')).toBe(true)
  })
})
