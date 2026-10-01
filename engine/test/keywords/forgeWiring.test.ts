import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { Cost } from '../../src/state/runePool'
import { makeForgeTriggers, reduceByOneAnyPip } from '../../src/keywords/forge'
import { detectTriggers } from '../../src/dsl/trigger'
import { canPayFromState } from '../../src/game/economy'

                                                

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(id: string, defId: string, zone: string, ctrl = P1, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(id), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {}, ...extra,
  }
}
function scene(objs: GameObject[], mana = 9, runes: Record<string, number> = { blue: 9 }): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, objects, zones, runePools: { ...base.runePools, [P1]: { mana, runes } } }
}
                                         
const GEAR_COST: Cost = { mana: 1, pips: [[]] }
const deps = (over: Record<string, unknown> = {}) => ({
                                                             
  sourcesOf: (o: { defId: string }) => (o.defId === 'FORGE-U' ? ['百炼'] : o.defId === 'FORGE2-U' ? ['百炼', '百炼'] : []),
  hasTag: (d: string, tag: string) => tag === '武装' && d.startsWith('GEAR'),
  equipCostOf: (d: string) => (d.startsWith('GEAR') ? GEAR_COST : undefined),
  canPay: canPayFromState,
  ...over,
})
const playEv = (oid: string) => ({ kind: 'playUnit' as const, unit: asObjId(oid), player: P1 })

describe('§821.1.c「减少[A]」', () => {
  test('费用含 [A](空数组 pip)→ 扣掉一枚', () => {
    expect(reduceByOneAnyPip({ mana: 1, pips: [[]] })).toEqual({ mana: 1, pips: [] })
  })

  test('★§821.1.c.3 费用【不含】[A] → 原样返回(仍可付,只是不减)', () => {
    const c: Cost = { mana: 1, pips: [['blue']] }
    expect(reduceByOneAnyPip(c)).toEqual(c)
  })

  test('多枚 pip 只扣掉【一枚】[A]', () => {
    expect(reduceByOneAnyPip({ mana: 0, pips: [[], []] }).pips).toEqual([[]])
  })
})

describe('触发生成', () => {
  test('带百炼的单位 → 一条触发;打出它就响', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    const trigs = makeForgeTriggers(s, deps())
    expect(trigs).toHaveLength(1)
    expect(detectTriggers(s, playEv('u'), trigs, P1)).toHaveLength(1)
  })

  test('★§821.1.d 两个百炼 → 两条【分别】触发(与灵便"只算一个"相反)', () => {
    const s = scene([obj('u', 'FORGE2-U', BF0), obj('g', 'GEAR-A', BF0)])
    expect(makeForgeTriggers(s, deps())).toHaveLength(2)
  })

  test('没有百炼的单位不产触发', () => {
    expect(makeForgeTriggers(scene([obj('u', 'PLAIN', BF0)]), deps())).toHaveLength(0)
  })

  test('打出【别的】单位不触发("我"=自己)', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    expect(detectTriggers(s, playEv('other'), makeForgeTriggers(s, deps()), P1)).toHaveLength(0)
  })
})

describe('候选:§821.1.c.4/c.5 付不起或没装配费用的不列', () => {
  const t = (s: GameState, d = deps()) => makeForgeTriggers(s, d)[0]!

  test('列出己方武装 + "不装配"退出口', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    const req = t(s).nextChoice!(s, playEv('u'), {})!
    expect(req.candidates.map((c) => c.id)).toEqual(['g', 'skip'])
  })

  test('★对手的武装不在候选里("你控制的")', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0, P2)])
    expect(t(s).nextChoice!(s, playEv('u'), {})).toBeNull()
  })

  test('★§821.1.c.4 没有装配费用的卡 → 不列(付不起)', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    const d = deps({ equipCostOf: () => undefined })
    expect(t(s, d).nextChoice!(s, playEv('u'), {})).toBeNull()
  })

  test('★§821.1.c.5 钱不够 → 不列,一个都装不起就不问空问题', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)], 0, {})
    expect(t(s).nextChoice!(s, playEv('u'), {})).toBeNull()
  })

  test('已答过 → 不再追问', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    expect(t(s).nextChoice!(s, playEv('u'), { forge0: 'g' })).toBeNull()
  })
})

describe('效果:付减后费用 + 贴到【拥有百炼的那个单位】', () => {
  const t = (s: GameState) => makeForgeTriggers(s, deps())[0]!

  test('选中一件 → 产出"付费 + 贴附"两条,费用已减掉 [A]', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    const evs = t(s).effect(s, playEv('u'), { forge0: 'g' })
    expect(evs).toEqual([
      { kind: 'spend', player: P1, cost: { mana: 1, pips: [] } },
      { kind: 'attach', obj: 'g', to: 'u', player: P1 }, // ★437 起带执行者(「当你为我贴附」那族按它判)
    ])
  })

  test('★贴附方向【固定】贴到百炼单位,不由玩家选', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('other', 'PLAIN', BF0), obj('g', 'GEAR-A', BF0)])
    const evs = t(s).effect(s, playEv('u'), { forge0: 'g' })
    expect((evs[1] as { to: string }).to).toBe('u')
  })

  test('选"不装配" → 不产生任何事件', () => {
    const s = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    expect(t(s).effect(s, playEv('u'), { forge0: 'skip' })).toEqual([])
  })

  test('★结算时那件武装已离场 → 什么都不发生(§821.1.c.5 停留原位)', () => {
    const s0 = scene([obj('u', 'FORGE-U', BF0), obj('g', 'GEAR-A', BF0)])
    const gone = scene([obj('u', 'FORGE-U', BF0)])
    expect(t(s0).effect(gone, playEv('u'), { forge0: 'g' })).toEqual([])
  })
})
