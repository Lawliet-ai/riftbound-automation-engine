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
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'

                                         
                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const might = (o: GameObject): number => effectiveMight(o).actual
const kws = (o: GameObject): readonly string[] => (o.derived ? o.derived.keywords : (o.baseKeywords ?? []))

function card(oid: string, defId: string, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId)
  return {
    oid: asObjId(oid), defId, owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  }
}
function runes(n: number): GameObject[] {
  return Array.from({ length: n }, (_, i) => ({
    oid: asObjId(`r${i}`), defId: 'rune:green', owner: P1, controller: P1,
    zone: asZoneId(`base:${P1}`), baseMight: 0, baseKeywords: [], baseTypes: ['rune' as const],
    damage: 0, counters: {}, status: { tapped: true }, // ⚠️横置:未横置的符文是隐形的钱(§430)
  }))
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
    runePools: { ...base.runePools, [P1]: { mana, runes: { green: 5, orange: 5 } } },
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
   
                          
                                         
                                                         
   
const passToChoice = (g: InteractiveGame): void => {
  for (let i = 0; i < 12; i++) {
    const p = g.pending()
    if (p.mode === 'choice' || g.state.chain.length === 0) return
    let moved = false
    for (const pl of [P1, P2]) {
      const pass = g.legalActions(pl).find((a) => a.kind === 'PASS')
      if (pass) { g.apply(pass); moved = true }
    }
    if (!moved) return
  }
}

const empowerAct = (g: InteractiveGame, oid: string): InteractiveAction | undefined =>
  g.legalActions(P1).find(
    (a) => a.kind === 'ACTIVATE' && (a as { oid: string }).oid === oid && (a as { ability: string }).ability.includes('empower'),
  )

describe('★残暴猎手 VEN-070:[强化3] + [已强化>]{S}+2 和 [游走]', () => {
  test('先钉住前提:真 registry 认得它的印刷关键词是 [强化3]', () => {
    expect(cardKeywords('VEN-070')).toContain('强化3')
  })

  test('通用工厂出得来强化规格,费用 3', () => {
    const spec = activatedFor('VEN-070').find((s) => s.key.startsWith('empower'))
    expect(spec).toBeDefined()
    expect(spec!.cost).toEqual({ mana: 3 })
  })

  test('★激活 → settle → 战力 4→6【且】拿到 [游走](两张表都登记了才会都生效)', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([card('h', 'VEN-070')]), realDeps)
    const before = recomputeContinuous(g.state).objects['h']!
    expect(might(before)).toBe(4)
    expect(kws(before)).not.toContain('游走')
    g.apply(empowerAct(g, 'h')!)
    settle(g)
    expect(isEmpowered(g.state.objects['h']!)).toBe(true)
    const after = recomputeContinuous(g.state).objects['h']!
    expect(might(after)).toBe(6)       
    expect(kws(after)).toContain('游走')                           
  })
})

describe('★凶暴的岩熊 VEN-050:与霜衣狼母同句减费,共用实现', () => {
  test('真 registry 出得来规格,印刷基础费 12', () => {
    const spec = activatedFor('VEN-050').find((s) => s.key === 'VEN-050:empower')
    expect(spec).toBeDefined()
    expect(spec!.cost).toEqual({ mana: 12 })
  })

  test('★8 枚符文 → 12−8=4:有 4 法力激活得了,3 就不行', () => {
    const ok = new InteractiveGame(scene([card('b', 'VEN-050'), ...runes(8)], 4), realDeps)
    const no = new InteractiveGame(scene([card('b', 'VEN-050'), ...runes(8)], 3), realDeps)
    expect(empowerAct(ok, 'b')).toBeDefined()
    expect(empowerAct(no, 'b')).toBeUndefined()
  })

  test('★激活后拿到 [法盾] 与 [坚守3]', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([card('b', 'VEN-050'), ...runes(12)], 0), realDeps)
    g.apply(empowerAct(g, 'b')!)
    settle(g)
    const after = recomputeContinuous(g.state).objects['b']!
    expect(kws(after)).toContain('法盾')
    expect(kws(after)).toContain('坚守3')
  })

  test('减免与霜衣狼母同源:同样 5 枚符文时两张卡的实付一致', () => {
    const mk = (defId: string): InteractiveGame =>
      new InteractiveGame(scene([card('x', defId), ...runes(5)], 9), realDeps)
    const bear = mk('VEN-050'); bear.apply(empowerAct(bear, 'x')!)
    const wolf = mk('VEN-032'); wolf.apply(empowerAct(wolf, 'x')!)
    expect(bear.state.runePools[P1]!.mana).toBe(wolf.state.runePools[P1]!.mana)
  })
})

describe('★见习法师 VEN-047:强化2 + 变为已强化时洞察2 + [已强化>]{S}+1', () => {
  test('先钉住前提:印刷关键词是 [强化2]', () => {
    expect(cardKeywords('VEN-047')).toContain('强化2')
  })

  test('通用工厂出规格,费用 2', () => {
    const spec = activatedFor('VEN-047').find((s) => s.key.startsWith('empower'))
    expect(spec).toBeDefined()
    expect(spec!.cost).toEqual({ mana: 2 })
  })

  test('真 registry 收得到那条触发(字段是 sourceOid)', () => {
    const st = scene([card('m', 'VEN-047')])
    expect(activeTriggers(st).some((t) => t.sourceOid === asObjId('m'))).toBe(true)
  })

  test('★激活强化 → settle → 已强化、战力 3→4', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([card('m', 'VEN-047')]), realDeps)
    expect(might(recomputeContinuous(g.state).objects['m']!)).toBe(3)
    g.apply(empowerAct(g, 'm')!)
    settle(g)
    expect(isEmpowered(g.state.objects['m']!)).toBe(true)
    expect(might(recomputeContinuous(g.state).objects['m']!)).toBe(4)
  })

  test('★洞察 2 现在是【真交互】:结算期会问"回收哪几张"(第101轮补上)', () => {
                                             
                                                          
    const st = scene([card('m', 'VEN-047')])
    const deckId = `mainDeck:${P1}`
    const cards = ['d1', 'd2', 'd3'].map((oid) => ({
      oid: asObjId(oid), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(deckId),
      baseMight: 1, baseKeywords: [], baseTypes: ['unit' as const], damage: 0, counters: {}, status: {},
    }))
    const withDeck: GameState = {
      ...st,
      objects: { ...st.objects, ...Object.fromEntries(cards.map((c) => [c.oid, c])) },
      zones: { ...st.zones, [deckId]: { ...st.zones[deckId]!, contents: cards.map((c) => c.oid) } },
    }
    const g = new InteractiveGame(withDeck, realDeps)
    g.apply(empowerAct(g, 'm')!)
    passToChoice(g)
    const p = g.pending()
                             
    expect(p.mode).toBe('choice')
    if (p.mode !== 'choice') return
    const ids = p.request.candidates.map((c) => c.id)
    expect(ids).toContain('d3')                   
    expect(ids).toContain('d2')
    expect(ids).not.toContain('d1')              
    expect(ids).toContain(MULTI_SELECT_DONE)                   
  })

  test('★选"够了"→ 一张不回收,牌堆张数与顺序都不变', () => {
    const st = scene([card('m', 'VEN-047')])
    const deckId = `mainDeck:${P1}`
    const cards = ['d1', 'd2', 'd3'].map((oid) => ({
      oid: asObjId(oid), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(deckId),
      baseMight: 1, baseKeywords: [], baseTypes: ['unit' as const], damage: 0, counters: {}, status: {},
    }))
    const withDeck: GameState = {
      ...st,
      objects: { ...st.objects, ...Object.fromEntries(cards.map((c) => [c.oid, c])) },
      zones: { ...st.zones, [deckId]: { ...st.zones[deckId]!, contents: cards.map((c) => c.oid) } },
    }
    const g = new InteractiveGame(withDeck, realDeps)
    g.apply(empowerAct(g, 'm')!)
    passToChoice(g)
    const done = g.legalActions(P1).find(
      (a) => a.kind === 'CHOOSE' && (a as { answer: string }).answer === MULTI_SELECT_DONE,
    )
    expect(done).toBeDefined()
    g.apply(done!)
    settle(g)
    expect(g.state.zones[deckId]!.contents).toEqual([asObjId('d1'), asObjId('d2'), asObjId('d3')])
    expect(g.state.zones[`hand:${P1}`]!.contents).toHaveLength(0)          
  })

  test('★挑一张回收 → 它被置底,牌堆张数不变(§416.1 回收进牌堆底)', () => {
    const st = scene([card('m', 'VEN-047')])
    const deckId = `mainDeck:${P1}`
    const cards = ['d1', 'd2', 'd3'].map((oid) => ({
      oid: asObjId(oid), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(deckId),
      baseMight: 1, baseKeywords: [], baseTypes: ['unit' as const], damage: 0, counters: {}, status: {},
    }))
    const withDeck: GameState = {
      ...st,
      objects: { ...st.objects, ...Object.fromEntries(cards.map((c) => [c.oid, c])) },
      zones: { ...st.zones, [deckId]: { ...st.zones[deckId]!, contents: cards.map((c) => c.oid) } },
    }
    const g = new InteractiveGame(withDeck, realDeps)
    g.apply(empowerAct(g, 'm')!)
    passToChoice(g)
    const pick = g.legalActions(P1).find(
      (a) => a.kind === 'CHOOSE' && (a as { answer: string }).answer === 'd3',
    )
    expect(pick).toBeDefined()
    g.apply(pick!)
                               
    const done = g.legalActions(P1).find(
      (a) => a.kind === 'CHOOSE' && (a as { answer: string }).answer === MULTI_SELECT_DONE,
    )
    if (done) g.apply(done)
    settle(g)
    const after = g.state.zones[deckId]!.contents
    expect(after).toHaveLength(3)               
    expect(after[0]).toBe(asObjId('d3'))                       
  })

})

describe('★怒火放大器 VEN-018:常驻被动,强化只是把数值【改为】+2', () => {
  const derive = (st: GameState): GameState => { setCardPassiveProvider(cardPassives); return recomputeContinuous(st) }
  const ally = (oid: string): GameObject => ({
    oid: asObjId(oid), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  })

  test('先钉住前提:它在真 registry 里是装备,印刷关键词 [强化6红色]', () => {
    expect(cardKind('VEN-018')).toBe('equipment')
    expect(cardKeywords('VEN-018')).toContain('强化6红色')
  })

  test('★未强化时【也生效】:友方单位 2→3(这句不是 §828,不能只在已强化时给)', () => {
    const st = derive(scene([card('amp', 'VEN-018'), ally('u')]))
    expect(might(st.objects['u']!)).toBe(3)
  })

  test('★已强化 → 改为 +2:友方单位 2→4(不是 1+2=5)', () => {
    const st = derive(scene([card('amp', 'VEN-018', { counters: { empower: 1 } }), ally('u')]))
    expect(might(st.objects['u']!)).toBe(4)
  })

  test('★只加给【你的】单位,对手的不加', () => {
    const enemy: GameObject = { ...ally('e'), owner: P2, controller: P2 }
    const st = derive(scene([card('amp', 'VEN-018'), enemy]))
    expect(might(st.objects['e']!)).toBe(2)
  })

  test('它自己是装备,不给自己加战力', () => {
    const st = derive(scene([card('amp', 'VEN-018')]))
    expect(might(st.objects['amp']!)).toBe(0)
  })
})

describe('★帝国工具 VEN-077:[横置]给一名单位本回合+2,已强化改+4', () => {
  const ally = (oid: string): GameObject => ({
    oid: asObjId(oid), defId: 'BLK', owner: P1, controller: P1, zone: asZoneId(BF0),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
  })
  const pumpAct = (g: InteractiveGame, target: string): InteractiveAction | undefined =>
    g.legalActions(P1).find(
      (a) => a.kind === 'ACTIVATE' && (a as { ability: string }).ability === 'VEN-077:pump' && (a as { target?: string }).target === target,
    )

  test('真 registry 出得来这条技能', () => {
    expect(activatedFor('VEN-077').some((s) => s.key === 'VEN-077:pump')).toBe(true)
  })

  test('★未强化 → 目标本回合 2→4', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([card('t', 'VEN-077'), ally('u')]), realDeps)
    g.apply(pumpAct(g, 'u')!)
    settle(g)
    expect(might(recomputeContinuous(g.state).objects['u']!)).toBe(4)
  })

  test('★已强化 → 改为 +4:目标 2→6(不是 2+2+4)', () => {
    setCardPassiveProvider(cardPassives)
    const g = new InteractiveGame(scene([card('t', 'VEN-077', { counters: { empower: 1 } }), ally('u')]), realDeps)
    g.apply(pumpAct(g, 'u')!)
    settle(g)
    expect(might(recomputeContinuous(g.state).objects['u']!)).toBe(6)
  })

  test('★这条技能不消耗强化,只横置', () => {
    const g = new InteractiveGame(scene([card('t', 'VEN-077', { counters: { empower: 1 } }), ally('u')]), realDeps)
    g.apply(pumpAct(g, 'u')!)
    expect(isEmpowered(g.state.objects['t']!)).toBe(true)
    expect(g.state.objects['t']!.status.tapped).toBe(true)
  })

  test('已横置 → 付不出 [E],不出现', () => {
    const g = new InteractiveGame(scene([card('t', 'VEN-077', { status: { tapped: true } }), ally('u')]), realDeps)
    expect(pumpAct(g, 'u')).toBeUndefined()
  })
})
