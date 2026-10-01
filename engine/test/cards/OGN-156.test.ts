import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { OGN_156_SPEC, OGN_156_PICK_KEY, opponentsOf, nonUnitsInHand } from '../../data/cards/OGN-156'

                                      
                                             
  
                 
                                                           
                                               
                                                           
                                                     
                                                           
                                     
                          
                                 
                                                         
                                           
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

   
           
                                                            
                                         
                                             
   
function scene(): GameState {
  const base = createInitialState([P1, P2, P3], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const card = (oid: string, defId: string, who: PlayerId, types: readonly string[]): GameObject => ({
    oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(`hand:${who}`),
    baseMight: 0, baseKeywords: [], baseTypes: types as never,
    damage: 0, counters: {}, status: {},
  })
  put(card('foeSpell', 'OGN-009', P2, ['spell']))
  put(card('foeGear', 'OGN-017', P2, ['equipment']))
  put(card('foeUnit', 'OGN-003', P2, ['unit']))
  put(card('p3Spell', 'OGN-133', P3, ['spell']))
  put(card('myGear', 'OGN-021', P1, ['equipment']))
  put(card('sp', 'OGN-156', P1, ['spell']))
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { orange: 3, colorless: 3 } },
    },
  } as GameState
}

const ask = (s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>) =>
  OGN_156_SPEC.makeNextChoice!({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const resolveOf = (
  s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] =>
  OGN_156_SPEC.makeResolve({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const without = (s: GameState, ...oids: readonly string[]): GameState => {
  const zones = Object.fromEntries(
    Object.entries(s.zones).map(([id, z]) => [id, { ...z, contents: z.contents.filter((o) => !oids.includes(o)) }]),
  )
  return {
    ...s, zones,
    objects: Object.fromEntries(Object.entries(s.objects).filter(([id]) => !oids.includes(id))),
  } as GameState
}

describe('★ 前提:法术 1费 + 1橙pip,不印关键词(㊶⑪);场景是三人局', () => {
  test('★费用/类别/关键词', () => {
    expect(CARD_COSTS['OGN-156'], '★上游印刷费').toEqual({ mana: 1, pips: 1, colors: ['orange'] })
    expect(OGN_156_SPEC.cost).toEqual({ mana: 1, pips: [['orange']] })
    expect(cardKind('OGN-156')).toBe('spell')
    expect(cardKeywords('OGN-156')).toEqual([])
    expect(playSpecFor('OGN-156')).toBeDefined()
    expect(scene().players.length, '★三人局才分得出"指定一名对手"').toBe(3)
  })
})

describe('★★★★★★ 目标是【玩家】,不是物件', () => {
  test('★★★★★★合法目标 = 两名对手的玩家 id(★不含我自己)', () => {
    const s = scene()
    expect(OGN_156_SPEC.legalTargets(s, P1).slice().sort()).toEqual([P2, P3].sort())
    expect(OGN_156_SPEC.legalTargets(s, P1), '★我自己不是"对手"').not.toContain(P1)
  })

  test('★★★★★视角对称:换 P2 来打,候选变成 P1 与 P3(㊵)', () => {
    expect(opponentsOf(scene(), P2).slice().sort()).toEqual([P1, P3].sort())
  })
})

describe('★★★★★★★ 「非单位卡牌」+ 看的是【被指定那个人】的手牌', () => {
  test('★★★★★★★指定 P2 ⇒ 候选是他的法术与装备,【单位不在内】', () => {
    const s = scene()
    expect(nonUnitsInHand(s, P2 as string).slice().sort()).toEqual(['foeGear', 'foeSpell'])
    const req = ask(s, P2 as string, {})
    expect(req!.key).toBe(OGN_156_PICK_KEY)
    expect(req!.candidates.map((c) => c.id).sort(), '★收口自证:与 `nonUnitsInHand` 逐个相等')
      .toEqual(nonUnitsInHand(s, P2 as string).slice().sort())
    expect(req!.candidates.map((c) => c.id), '★★单位牌被挡在外面').not.toContain('foeUnit')
  })

  test('★★★★★★★指定谁就看谁的手牌:指定 P3 ⇒ 只列得出他那一张', () => {
    const s = scene()
    expect(ask(s, P3 as string, {})!.candidates.map((c) => c.id), '㊵ 问 P3 自己的答案')
      .toEqual(['p3Spell'])
  })

  test('★★★★★★我自己手里的非单位卡【绝不】进候选', () => {
    const s = scene()
    for (const p of [P2, P3]) {
      expect(ask(s, p as string, {})!.candidates.map((c) => c.id), `★指定 ${p} 时看不到我的牌`)
        .not.toContain('myGear')
    }
  })

  test('★★★★★他手里没有非单位卡 ⇒ 不问', () => {
    const bare = without(scene(), 'foeSpell', 'foeGear')
    expect(nonUnitsInHand(bare, P2 as string), '前提自证:只剩那张单位牌').toEqual([])
    expect(ask(bare, P2 as string, {})).toBeNull()
  })

  test('★★★★答过一次就不再问;目标不是对手 / 没目标 ⇒ 不问', () => {
    const s = scene()
    expect(ask(s, P2 as string, { [OGN_156_PICK_KEY]: 'foeSpell' }), '★答过 ⇒ 收口').toBeNull()
    expect(ask(s, P1 as string, {}), '★★指到自己头上 ⇒ 不问').toBeNull()
    expect(ask(s, undefined, {})).toBeNull()
  })
})

describe('★★★★★★★ 「选择」归我、「回收」归他 —— 两个归属各管一头', () => {
  test('★★★★★★★这一问由【我】作答(不是被指定的那个人)', () => {
    const s = scene()
    expect(ask(s, P2 as string, {})!.controller, '★★选择的主语是打出者').toBe(P1)
  })

  test('★★★★★★★`recycle` 事件的 `player` 是【他】,不是我', () => {
    const s = scene()
    expect(resolveOf(s, P2 as string, { [OGN_156_PICK_KEY]: 'foeSpell' }), '★★回收动作归对手').toEqual([
      { kind: 'recycle', player: P2, objs: ['foeSpell'] },
    ])
                                  
    expect(resolveOf(s, P3 as string, { [OGN_156_PICK_KEY]: 'p3Spell' })).toEqual([
      { kind: 'recycle', player: P3, objs: ['p3Spell'] },
    ])
  })

  test('★★★★★★结算侧再验一次:那张牌已不在他手里 ⇒ 一条都不发', () => {
    const s = scene()
    const gone = without(s, 'foeSpell')
    expect(resolveOf(gone, P2 as string, { [OGN_156_PICK_KEY]: 'foeSpell' })).toEqual([])
                               
    expect(resolveOf(gone, P2 as string, { [OGN_156_PICK_KEY]: 'foeGear' }).length).toBe(1)
  })

  test('★★★★★硬塞一张【单位】牌也不发(判据在结算侧也跑)', () => {
    expect(resolveOf(scene(), P2 as string, { [OGN_156_PICK_KEY]: 'foeUnit' }), '★单位不是合法选择')
      .toEqual([])
  })

  test('★★★没答 / 没目标 ⇒ 一条都不发', () => {
    expect(resolveOf(scene(), P2 as string, {})).toEqual([])
    expect(resolveOf(scene(), undefined, { [OGN_156_PICK_KEY]: 'foeSpell' })).toEqual([])
  })
})

describe('★★★★★★★ 真流程:对手那张牌真的回了牌堆底', () => {
  function play(target: string, pick: string): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'sp' && (a as { target?: string }).target === target)
    expect(act, `前提自证:target=${target} 打得出来`).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const want = p.request.candidates.find((c) => c.id === pick)?.id ?? p.request.candidates[0]!.id
        g.apply({ kind: 'CHOOSE', player: p.request.controller, key: p.request.key, answer: want })
        continue
      }
      break
    }
    return g
  }
  const hand = (g: InteractiveGame, p: PlayerId): readonly string[] => g.state.zones[`hand:${p}`]!.contents
     
                      
                                                       
                                                                 
     
  const deckDefIds = (g: InteractiveGame, p: PlayerId): string[] =>
    (g.state.zones[`mainDeck:${p}`]!.contents).map((oid) => g.state.objects[oid]!.defId)

  test('★★★★★★★被挑中的那张离开手牌、进了他的主牌堆', () => {
    const g = play(P2 as string, 'foeSpell')
    expect(hand(g, P2), '★不在他手里了').not.toContain('foeSpell')
    expect(deckDefIds(g, P2), '★★§416 回收 = 进他自己的主牌堆(按 defId 找,§124 换了 oid)').toContain('OGN-009')
    expect(hand(g, P2), '★他另外两张没动').toEqual(expect.arrayContaining(['foeGear', 'foeUnit']))
  })

  test('★★★★★★动作枚举:恰好两条,对应两名对手', () => {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const targets = [...new Set(g.legalActions(P1)
      .filter((a) => (a as { cardOid?: string }).cardOid === 'sp')
      .map((a) => (a as { target?: string }).target))].sort()
    expect(targets).toEqual([P2, P3].sort())
  })

  test('★★★★★指定 P3 时,P2 的手牌【一张不动】', () => {
    const before = scene()
    const g = play(P3 as string, 'p3Spell')
    expect(hand(g, P2).slice().sort(), '★P2 毫发无损')
      .toEqual(before.zones[`hand:${P2}`]!.contents.slice().sort())
    expect(deckDefIds(g, P3), '★P3 那张进了他的牌堆').toContain('OGN-133')
  })
})
