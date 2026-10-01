import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { destroyableEquipment } from '../../data/cards/OGN-056'
import { OGN_179_SPEC, OGN_179_PREFIX, wreckOrder } from '../../data/cards/OGN-179'

                                         
                                 
  
                 
                                            
                                                     
                                         
                         
                                              
                                                     
                    
                                                
                                          

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

const gear = (oid: string, zone: string, controller: PlayerId, owner = controller): GameObject => ({
  oid: asObjId(oid), defId: `G-${oid}`, owner, controller,
  zone: asZoneId(zone), baseMight: 0, baseKeywords: [], baseTypes: ['equipment'] as never,
  damage: 0, counters: {}, status: {},
})

   
                 
                                              
                
                          
                                                 
                            
   
function scene(): GameState {
  const base = createInitialState([P1, P2, P3], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(gear('g1a', `base:${P1}`, P1))
  put(gear('g1b', bfs[0]!, P1))
  put(gear('g2', `base:${P2}`, P2))
  put(gear('stolen', bfs[0]!, P2, P3))               
  put({
    oid: asObjId('u1'), defId: 'U-u1', owner: P1, controller: P1, zone: asZoneId(bfs[0]!),
    baseMight: 2, baseKeywords: [], baseTypes: ['unit'] as never, damage: 0, counters: {}, status: {},
  })
  put({
    oid: asObjId('sp'), defId: 'OGN-179', owner: P1, controller: P1, zone: asZoneId(`hand:${P1}`),
    baseMight: 0, baseKeywords: [], baseTypes: ['spell'] as never, damage: 0, counters: {}, status: {},
  })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, green: 3, blue: 3, orange: 3, colorless: 3 } },
    },
  } as GameState
}

const k = (p: PlayerId): string => `${OGN_179_PREFIX}${p}`
const ask = (s: GameState, chosen: Readonly<Record<string, string>>) =>
  OGN_179_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const resolveOf = (s: GameState, chosen: Readonly<Record<string, string>>): readonly GameEvent[] =>
  OGN_179_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const without = (s: GameState, ...oids: readonly string[]): GameState => ({
  ...s,
  objects: Object.fromEntries(Object.entries(s.objects).filter(([id]) => !oids.includes(id))),
} as GameState)

describe('★ 前提:法术 1费 0pip 紫,印刷 [迅捷];场景是三人局(㊶⑪㊳)', () => {
  test('★费用/类别/关键词两处都对得上', () => {
    expect(CARD_COSTS['OGN-179'], '★上游印刷费').toEqual({ mana: 1, pips: 0, colors: ['purple'] })
    expect(OGN_179_SPEC.cost, '★0 pip 只写 mana').toEqual({ mana: 1 })
    expect(cardKind('OGN-179')).toBe('spell')
    expect(playSpecFor('OGN-179')?.keywords, '★spec 侧时机权限').toEqual(['迅捷'])
    expect(cardKeywords('OGN-179'), '★印刷表侧(316/326 两条闸盯着)').toEqual(['迅捷'])
  })

  test('㊳ 场景自证:三人局,且 P3 一件装备都没有', () => {
    const s = scene()
    expect(s.players.length, '★三人局才验得动"每名玩家"').toBe(3)
    expect(destroyableEquipment(s, P3), '★P3 名下为空').toEqual([])
  })
})

describe('★★★★★★ 「自己的」= 控制者;可选参 `of` 的回归闸', () => {
  test('★★★★★★逐人分组:我两件、P2 两件(含夺控那件)、P3 零件', () => {
    const s = scene()
    expect(destroyableEquipment(s, P1)).toEqual(['g1a', 'g1b'])
    expect(destroyableEquipment(s, P2), '★★"stolen" 由 P2 控制 ⇒ 算他的').toEqual(['g2', 'stolen'])
    expect(destroyableEquipment(s, P3), '★拥有者是 P3 但他不控制 ⇒ 不算他的').toEqual([])
  })

  test('★★★★★★回归闸:**缺省不给 `of`** 时行为与加参前完全一致(全场装备)', () => {
    const s = scene()
    expect(destroyableEquipment(s), '★不分人 = 四件装备,单位不在内')
      .toEqual(['g1a', 'g1b', 'g2', 'stolen'])
                               
    const union = [...new Set([
      ...destroyableEquipment(s, P1), ...destroyableEquipment(s, P2), ...destroyableEquipment(s, P3),
    ])].sort()
    expect(union).toEqual([...destroyableEquipment(s)].sort())
  })

  test('★★★★★单位不是装备,一个都不该进来', () => {
    expect(destroyableEquipment(scene())).not.toContain('u1')
  })
})

describe('★★★★★★★ 问链:每名玩家【各自】答一次', () => {
  test('★★★★★★★第一问归【回合玩家】,第二问归 P2,P3 被跳过', () => {
    const s = scene()
    const q1 = ask(s, {})
    expect(q1!.controller, '★★①由我自己答(「每名玩家」含我)').toBe(P1)
    expect(q1!.key).toBe(k(P1))
    expect(q1!.candidates.map((c) => c.id).sort(), '★候选只有我自己的两件').toEqual(['g1a', 'g1b'])

    const q2 = ask(s, { [k(P1)]: 'g1a' })
    expect(q2!.controller, '★★②轮到 P2 自己答').toBe(P2)
    expect(q2!.candidates.map((c) => c.id).sort()).toEqual(['g2', 'stolen'])

                            
    expect(ask(s, { [k(P1)]: 'g1a', [k(P2)]: 'g2' }), '★★★P3 被跳过 ⇒ 不再问').toBeNull()
  })

  test('★★★★★★没有退出口:「摧毁」是指示不是"可以"', () => {
    const ids = ask(scene(), {})!.candidates.map((c) => c.id)
    expect(ids, '★候选里不该有"够了"这种出口').toEqual(['g1a', 'g1b'])
  })

  test('★★★★★★顺序从【回合玩家】起绕一圈', () => {
    const s = scene()
    expect(wreckOrder(s), '★P1 是回合玩家').toEqual([P1, P2, P3])
                                  
    const p2turn = { ...s, activePlayer: P2 } as GameState
    expect(wreckOrder(p2turn)).toEqual([P2, P3, P1])
    expect(ask(p2turn, {})!.controller, '★★第一问归新的回合玩家').toBe(P2)
  })

  test('★★★★★全场一件装备都没有 ⇒ 一问都不问、一条都不发', () => {
    const bare = without(scene(), 'g1a', 'g1b', 'g2', 'stolen')
    expect(destroyableEquipment(bare), '前提自证:场上确实没装备了').toEqual([])
    expect(ask(bare, {})).toBeNull()
    expect(resolveOf(bare, {})).toEqual([])
  })
})

describe('★★★★★★★ 结算:每人一条 destroy', () => {
  test('★★★★★★★两个人各摧毁一件 ⇒ 两条,按回合顺序', () => {
    const s = scene()
    const evs = resolveOf(s, { [k(P1)]: 'g1b', [k(P2)]: 'stolen' })
    expect(evs).toEqual([
      { kind: 'destroy', target: 'g1b', sourcePlayer: P1 },
      { kind: 'destroy', target: 'stolen', sourcePlayer: P1 },
    ])
  })

  test('★★★★★★只摧毁【一件】:我有两件,另一件毫发无损', () => {
    const s = scene()
    const evs = resolveOf(s, { [k(P1)]: 'g1a' }) as readonly { target: string }[]
    expect(evs.map((e) => e.target), '★只有被选中的那件').toEqual(['g1a'])
  })

  test('★★★★★★★结算侧再验一次:选的那件已不在 / 换了控制者 ⇒ 跳过,其余照走', () => {
    const s = scene()
    const gone = without(s, 'g1b')
    expect(resolveOf(gone, { [k(P1)]: 'g1b', [k(P2)]: 'g2' }), '★没了的那件跳过,P2 那条照走')
      .toEqual([{ kind: 'destroy', target: 'g2', sourcePlayer: P1 }])
                                            
    const flipped = {
      ...s,
      objects: { ...s.objects, g2: { ...s.objects['g2' as ObjId]!, controller: P1 } },
    } as GameState
    expect(resolveOf(flipped, { [k(P2)]: 'g2' }), '★★判据真的在跑').toEqual([])
  })

  test('★★★没人答 ⇒ 一条都不发', () => {
    expect(resolveOf(scene(), {})).toEqual([])
  })
})

describe('★★★★★★★ 真流程:两名玩家的装备各少一件', () => {
  function play(answers: Readonly<Record<string, string>>): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'sp')
    expect(act, '前提自证:折戟再战打得出来').toBeDefined()
    g.apply(act!)
    const asked: PlayerId[] = []
    for (let i = 0; i < 24; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        if (p.request.key.startsWith(OGN_179_PREFIX)) asked.push(p.request.controller)
        const want = answers[p.request.key] ?? p.request.candidates[0]!.id
                                                                
                                                                                   
        g.apply({ kind: 'CHOOSE', player: p.request.controller, key: p.request.key, answer: want })
        continue
      }
      break
    }
    ;(g as unknown as { askedPlayers?: PlayerId[] }).askedPlayers = asked
    return g
  }
  const alive = (g: InteractiveGame, oid: string): boolean => g.state.objects[oid as ObjId] !== undefined

  test('★★★★★★★我与 P2 各被摧毁一件;P3 全程没被问过', () => {
    const g = play({ [k(P1)]: 'g1a', [k(P2)]: 'g2' })
    expect(alive(g, 'g1a'), '★我选的那件没了').toBe(false)
    expect(alive(g, 'g1b'), '★我另一件还在(只摧毁一件)').toBe(true)
    expect(alive(g, 'g2'), '★P2 选的那件没了').toBe(false)
    expect(alive(g, 'stolen'), '★P2 另一件还在').toBe(true)
    const asked = (g as unknown as { askedPlayers: PlayerId[] }).askedPlayers
    expect(asked, '★★★恰好问了两个人,顺序是回合玩家优先').toEqual([P1, P2])
  })

  test('★★★★★★对手那一问【必须由对手本人应答】(引擎按 request.controller 校验)', () => {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'sp')!
    g.apply(act)
    for (let i = 0; i < 8; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      break
    }
    const p1q = g.pending()
    expect(p1q.mode, '前提自证:现在停在一个选择上').toBe('choice')
    if (p1q.mode !== 'choice') return
    g.apply({ kind: 'CHOOSE', player: P1, key: p1q.request.key, answer: 'g1a' })
    const p2q = g.pending()
    expect(p2q.mode).toBe('choice')
    if (p2q.mode !== 'choice') return
    expect(p2q.player, '★这一问归 P2').toBe(P2)
                                 
    g.apply({ kind: 'CHOOSE', player: P1, key: p2q.request.key, answer: 'g2' })
    const still = g.pending()
    expect(still.mode, '★★★仍然停在同一问').toBe('choice')
    if (still.mode !== 'choice') return
    expect(still.request.key, '★没被推进').toBe(p2q.request.key)
    expect(g.state.objects['g2' as ObjId], '★★P2 的装备一点没动').toBeDefined()
  })
})
