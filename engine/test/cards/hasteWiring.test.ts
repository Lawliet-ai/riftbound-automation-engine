import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { InteractiveGame } from '../../src/session/interactiveGame'

                                                 
                                                    

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

function card(id: string, defId: string): GameObject {
  return {
    oid: asObjId(id), defId, owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], mana = 0, runes: Record<string, number> = {}): GameState {
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
const deps = (over: Record<string, unknown> = {}) => ({
  getTriggers: () => [],
  handPlaySpecs: () => [],
  cardCost: () => ({ mana: 2 }),
  cardKeywords: (d: string) => (d === 'HASTE-U' ? ['急速'] : []),
  cardKind: () => 'unit',
  cardDomains: () => ['orange'],
  ...over,
})

const plays = (g: InteractiveGame): { to?: string; haste?: boolean }[] =>
  g.legalActions(P1).filter((a) => a.kind === 'PLAY_UNIT') as never

describe('★枚举:带急速且付得起 → 多出一条"付急速"的变体', () => {
  test('钱够基础费但不够急速 → 只有普通那条', () => {
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 2), deps())
    const acts = plays(g)
    expect(acts.length).toBeGreaterThan(0)
    expect(acts.every((a) => a.haste !== true)).toBe(true)
  })

  test('钱够急速额外费({1}+[橙])→ 同一落点两条变体都在', () => {
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { orange: 1 }), deps())
    const acts = plays(g)
    expect(acts.some((a) => a.haste === true)).toBe(true)
    expect(acts.some((a) => a.haste !== true)).toBe(true)
  })

  test('没有急速的单位 → 永远不出急速变体', () => {
    const g = new InteractiveGame(scene([card('u', 'PLAIN-U')], 9, { orange: 9 }), deps())
    expect(plays(g).every((a) => a.haste !== true)).toBe(true)
  })
})

describe('★§805.6 进场姿态是【替换】', () => {
  test('宣告急速 → 落地即活跃(不带 dormant)', () => {
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { orange: 1 }), deps())
    const act = plays(g).find((a) => a.haste === true)!
    g.apply(act as never)
    const placed = Object.values(g.state.objects).find((o) => o.defId === 'HASTE-U' && o.zone !== `hand:${P1}`)
    expect(placed).toBeDefined()
    expect(placed!.status.dormant).toBeUndefined()
  })

  test('不宣告 → 照 §359.2.c 休眠进场', () => {
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { orange: 1 }), deps())
    const act = plays(g).find((a) => a.haste !== true)!
    g.apply(act as never)
    const placed = Object.values(g.state.objects).find((o) => o.defId === 'HASTE-U' && o.zone !== `hand:${P1}`)
    expect(placed!.status.dormant).toBe(true)
  })

  test('宣告急速 → 真的多付了钱(基础2 + 急速1)', () => {
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { orange: 1 }), deps())
    g.apply(plays(g).find((a) => a.haste === true)! as never)
    expect(g.state.runePools[P1]!.mana).toBe(0)
  })

  test('★服务端权威:对没有急速的牌硬发 haste 动作 → 拒绝执行', () => {
    const s = scene([card('u', 'PLAIN-U')], 9, { orange: 9 })
    const g = new InteractiveGame(s, deps())
    g.apply({ kind: 'PLAY_UNIT', player: P1, oid: 'u', to: `base:${P1}`, haste: true } as never)
    expect(g.state.objects['u' as never]!.zone).toBe(`hand:${P1}`)        
  })
})

describe('卡文自带的活跃进场条件(啃啃 UNL-035 同款通道)', () => {
  test('entryReadyFor 为真 → 不宣告急速也活跃进场', () => {
    const g = new InteractiveGame(scene([card('u', 'PLAIN-U')], 5), deps({ entryReadyFor: () => true }))
    g.apply(plays(g)[0]! as never)
    const placed = Object.values(g.state.objects).find((o) => o.defId === 'PLAIN-U' && o.zone !== `hand:${P1}`)
    expect(placed!.status.dormant).toBeUndefined()
  })

  test('entryReadyFor 为假 → 照常休眠', () => {
    const g = new InteractiveGame(scene([card('u', 'PLAIN-U')], 5), deps({ entryReadyFor: () => false }))
    g.apply(plays(g)[0]! as never)
    const placed = Object.values(g.state.objects).find((o) => o.defId === 'PLAIN-U' && o.zone !== `hand:${P1}`)
    expect(placed!.status.dormant).toBe(true)
  })

  test('★不提供 entryReadyFor ⇒ 通道关闭,行为与接线前一致', () => {
    const g = new InteractiveGame(scene([card('u', 'PLAIN-U')], 5), deps())
    g.apply(plays(g)[0]! as never)
    const placed = Object.values(g.state.objects).find((o) => o.defId === 'PLAIN-U' && o.zone !== `hand:${P1}`)
    expect(placed!.status.dormant).toBe(true)
  })
})

describe('§805.1.a.1/a.2 急速的 [C] 按【本单位特性】限定', () => {
                                               
                                   
  test('单位有特性 → 只能用【匹配该特性】的符能付', () => {
                                          
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { blue: 5 }), deps())
    expect(plays(g).every((a) => a.haste !== true)).toBe(true)
                
    const g2 = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { orange: 1 }), deps())
    expect(plays(g2).some((a) => a.haste === true)).toBe(true)
  })

  test('★单位【无特性】→ [C] 视为 [A],任意符能都能付', () => {
    const g = new InteractiveGame(scene([card('u', 'HASTE-U')], 3, { blue: 1 }), deps({ cardDomains: () => [] }))
    expect(plays(g).some((a) => a.haste === true)).toBe(true)
  })
})
