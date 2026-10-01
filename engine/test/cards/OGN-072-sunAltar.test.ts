import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activeTriggers, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { canDormantSelf } from '../../data/cards/dormant-self-cost'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost } from '../../data/registry'

                                                          
                                                       

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = asZoneId('battlefield:shared:0')

function altar(oid = 'k', extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup('OGN-072')
  return {
    oid: asObjId(oid), defId: 'OGN-072', owner: P1, controller: P1, zone: asZoneId(`base:${P1}`),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function unit(oid: string, controller = P2, extra: Partial<GameObject> = {}): GameObject {
  return {
    oid: asObjId(oid), defId: 'BLK', owner: controller, controller, zone: BF0,
    baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
    status: { stunned: true }, ...extra,
  }
}
                                     
function deckCards(): GameObject[] {
  return ['d1', 'd2'].map((id) => ({
    oid: asObjId(id), defId: 'DECK', owner: P1, controller: P1, zone: asZoneId(`mainDeck:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['unit'] as const, damage: 0, counters: {}, status: {},
  }))
}
function scene(objs: GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [...objs, ...deckCards()]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones }
}
                                        
function killAndResolve(st: GameState, victim: string, take = true, actor = P1): GameState {
  let s = landAndEnqueueTriggers(st, [{ kind: 'destroy', target: asObjId(victim) }], activeTriggers, actor, {})
  for (let i = 0; i < 8 && s.chain.length > 0; i++) {
    const items = s.chain.filter((it: { status: string }) => it.status === 'pending')
    if (items.length === 0) break
    for (const it of items) {
      if (take) s = applyEvents(s, it.resolve(s, {}, it), {}).state
    }
    s = { ...s, chain: s.chain.filter((it: unknown) => !items.includes(it as never)) }
  }
  return s
}
function handSize(s: GameState): number {
  return s.zones[`hand:${P1}`]?.contents.length ?? 0
}

describe('前提', () => {
  test('这张卡在真 registry 里是装备', () => {
    expect(cardKind('OGN-072')).toBe('equipment')
    expect(specLookup('OGN-072').baseTypes).toEqual(['equipment'])
  })

  test('牌堆里真有牌可抽(否则"抽一张"的断言压不住任何东西)', () => {
    expect(scene([altar()]).zones[`mainDeck:${P1}`]!.contents.length).toBeGreaterThan(0)
  })

  test('真 registry 收得到它的触发', () => {
    expect(activeTriggers(scene([altar(), unit('e')])).some((t) => t.sourceOid === asObjId('k'))).toBe(true)
  })
})

describe('★摧毁被眩晕的敌方单位', () => {
  test('★接受触发 → 圣坛横置、抽一张', () => {
    const st = scene([altar(), unit('e')])
    const before = handSize(st)
    const s = killAndResolve(st, 'e')
    expect(s.objects['k']!.status.tapped).toBe(true)         
    expect(handSize(s)).toBe(before + 1)      
  })

  test('★不接受(可选)→ 圣坛没横置、也没抽', () => {
    const st = scene([altar(), unit('e')])
    const before = handSize(st)
    const s = killAndResolve(st, 'e', false)
    expect(s.objects['k']!.status.tapped).not.toBe(true)
    expect(handSize(s)).toBe(before)
  })

  test('★被【战斗伤害】打死的也算(§428.1.a.2 被动摧毁,不只是摧毁指令)', () => {
    const st = scene([altar(), unit('e', P2, { baseMight: 2 })])
    const before = handSize(st)
    let s = landAndEnqueueTriggers(st, [{ kind: 'damage', target: asObjId('e'), amount: 2 }], activeTriggers, P1, {})
    expect(s.objects['e']).toBeUndefined()             
    expect(s.chain).toHaveLength(1)
    const it = s.chain[0]!
    s = applyEvents(s, it.resolve(s, {}, it), {}).state
    expect(handSize(s)).toBe(before + 1)
  })
})

describe('★不该触发的情形', () => {
  test('★死者没被眩晕 → 不触发', () => {
    const st = scene([altar(), unit('e', P2, { status: {} })])
    const s = killAndResolve(st, 'e')
    expect(s.objects['k']!.status.tapped).not.toBe(true)
    expect(handSize(s)).toBe(handSize(st))
  })

  test('★死的是【自己的】被眩晕单位 → 不触发(卡文写的是"敌方单位")', () => {
    const st = scene([altar(), unit('m', P1)])
    const s = killAndResolve(st, 'm')
    expect(s.objects['k']!.status.tapped).not.toBe(true)
    expect(handSize(s)).toBe(handSize(st))
  })

  test('★死的是被眩晕的敌方【装备】→ 不触发(卡文写的是"一名单位")', () => {
    const gear = unit('g', P2, { defId: 'G', baseTypes: ['equipment'], baseMight: 0 })
    const st = scene([altar(), gear])
    const s = killAndResolve(st, 'g')
    expect(s.objects['k']!.status.tapped).not.toBe(true)
    expect(handSize(s)).toBe(handSize(st))
  })

  test('★圣坛已横置 → 付不出费用,整条不执行(不能白抽一张)', () => {
    const st = scene([altar('k', { status: { tapped: true } }), unit('e')])
    expect(canDormantSelf(st, asObjId('k'))).toBe(false)
    const s = killAndResolve(st, 'e')
    expect(handSize(s)).toBe(handSize(st))
  })

  test('★§383.2.c 圣坛在手牌里 → 不生效', () => {
    const inHand = { ...altar(), zone: asZoneId(`hand:${P1}`) }
    const st = scene([inHand, unit('e')])
    expect(canDormantSelf(st, asObjId('k'))).toBe(false)
    const s = killAndResolve(st, 'e')
    expect(handSize(s)).toBe(handSize(st))
  })
})

describe('★真会话·真战斗(第106轮补:这条路以前是断的)', () => {
  const DEPS: InteractiveDeps = { getTriggers: activeTriggers, handPlaySpecs, cardKeywords, standbyAltCost, playSpecFor, cardCost }

                            
  function walk(g: InteractiveGame): void {
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: p.request.candidates[0]!.id })
        continue
      }
      break
    }
  }

  test('★P1 进攻打死一名被眩晕的敌方单位 → 圣坛真的响了', () => {
                                                             
                                                
    const st = scene([
      altar(),
      { ...unit('atk', P1, { baseMight: 3 }), status: {} }, // 进攻方:3战力
      unit('e', P2, { baseMight: 2 }), // 防守方:被眩晕的 2战力,必死
    ])
    const before = handSize(st)
    const g = new InteractiveGame(st, DEPS)
    g.apply({ kind: 'ATTACK', player: P1, battlefield: BF0 })
    walk(g)
    expect(g.state.objects['e']).toBeUndefined()             
    expect(g.state.objects['k']!.status.tapped).toBe(true)        
    expect(handSize(g.state)).toBe(before + 1)       
  })

  test('★被打死的是【我自己的】单位 → 不响(§428.5.c.2 归因到对手)', () => {
                                                    
                                
    const st = scene([
      altar(),
      unit('mine', P1, { baseMight: 2 }),
      { ...unit('foe', P2, { baseMight: 3 }), status: {} },
    ])
    const before = handSize(st)
    const g = new InteractiveGame({ ...st, activePlayer: P2 }, DEPS)
    g.apply({ kind: 'ATTACK', player: P2, battlefield: BF0 })
    walk(g)
    expect(g.state.objects['mine']).toBeUndefined()           
    expect(handSize(g.state)).toBe(before)
    expect(g.state.objects['k']!.status.tapped).not.toBe(true)
  })
})
