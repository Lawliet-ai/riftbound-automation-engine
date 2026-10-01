import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type ObjId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  activeTriggers, activatedFor, cardCost, cardKeywords, cardKind, entryDormantFor,
  handPlaySpecs, playSpecFor, costModsFor,
} from '../../data/registry'
import { InteractiveGame, type InteractiveDeps } from '../../src/session/interactiveGame'
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { OGS_011_SPEC, OGS_011_PREFIX, OGS_011_MAX, blinkCandidates } from '../../data/cards/OGS-011'

                                       
                                      
  
                 
                                                  
                                         
                                                        
                                                              
                                                                          
                                                                          
                                                           

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

   
                                              
                                   
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const mk = (oid: string, zone: string, controller: string, types: readonly string[] = ['unit']): GameObject => ({
    oid: asObjId(oid), defId: `U-${oid}`, owner: asPlayerId(controller), controller: asPlayerId(controller),
    zone: asZoneId(zone), baseMight: 2, baseKeywords: [], baseTypes: types as never,
    damage: 0, counters: {}, status: {},
  })
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(mk('a', bfs[0]!, P1 as string))
  put(mk('b', bfs[0]!, P1 as string))
  put(mk('c', bfs[1]!, P1 as string))
  put(mk('foe', bfs[1]!, P2 as string))
  put(mk('home', `base:${P1}`, P1 as string))
                                                 
  put({ ...mk('charmed', bfs[0]!, P1 as string), owner: P2 })
  put({ ...mk('sp', `hand:${P1}`, P1 as string, ['spell']), defId: 'OGS-011', baseMight: 0 })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, green: 3, blue: 3, orange: 3, colorless: 3 } },
    },
  } as GameState
}

const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()
const ask = (s: GameState, chosen: Readonly<Record<string, string>>) =>
  OGS_011_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const resolveOf = (s: GameState, chosen: Readonly<Record<string, string>>): readonly GameEvent[] =>
  OGS_011_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const k = (i: number): string => `${OGS_011_PREFIX}${i}`

describe('★ 前提:法术,2费 0pip 紫,印刷 [反应](㊶⑪)', () => {
  test('★费用/类别/关键词两处都对得上', () => {
    expect(CARD_COSTS['OGS-011'], '★上游印刷费').toEqual({ mana: 2, pips: 0, colors: ['purple'] })
    expect(OGS_011_SPEC.cost, '★spec 侧:0 pip 只写 mana').toEqual({ mana: 2 })
    expect(cardKind('OGS-011')).toBe('spell')
    expect(playSpecFor('OGS-011'), '★已登记进 PLAY_SPECS').toBeDefined()
  })

  test('★★★[反应] 是【时机权限】⇒ spec 与印刷表两处都要有', () => {
    expect(playSpecFor('OGS-011')?.keywords, '★spec 侧').toEqual(['反应'])
    expect(cardKeywords('OGS-011'), '★印刷表侧(316/326 两条闸都盯着)').toEqual(['反应'])
  })
})

describe('★★★★★★ 候选:「友方」+「从战场上」两半各管一头', () => {
  test('★★★★★★恰好是战场上我控制的那三名', () => {
    expect(blinkCandidates(scene(), P1).slice().sort()).toEqual(['a', 'b', 'c', 'charmed'])
  })

  test('★★★★★★「从战场上」是【位置】判据:我基地里那名进不来', () => {
    const s = scene()
    expect(s.objects['home' as ObjId]!.controller, '前提自证:它确实是我控制的').toBe(P1)
    expect(blinkCandidates(s, P1), '★★基地里的不算(fieldedUnits 含基地,位置那半靠卡自己过滤)')
      .not.toContain('home')
  })

  test('★★★★★「友方」按控制者:敌方那名不在内;换对手来问只列得出他自己那名', () => {
    expect(blinkCandidates(scene(), P1)).not.toContain('foe')
    expect(blinkCandidates(scene(), P2), '㊵ 问对手自己的答案').toEqual(['foe'])
  })

  test('★★★★★★★收口自证:追问的候选与 `blinkCandidates` 【逐个相等】(手写一份就红)', () => {
    const s = scene()
    const ids = ask(s, {})!.candidates.map((c) => c.id).filter((id) => id !== MULTI_SELECT_DONE)
    expect(ids.slice().sort()).toEqual(blinkCandidates(s, P1).slice().sort())
  })
})

describe('★★★★★★★ 多选:0 / 1 / 2 三档都走得通', () => {
  test('★★★★★★第一问就带「够了」出口 ⇒ 一个都不选是合法的', () => {
    const req = ask(scene(), {})
    expect(req, '★必须问').not.toBeNull()
    expect(req!.key, '★键是 前缀+已选个数').toBe(k(0))
    expect(req!.candidates.map((c) => c.id), '★★末尾永远是退出口').toContain(MULTI_SELECT_DONE)
                         
    expect(ask(scene(), { [k(0)]: MULTI_SELECT_DONE }), '★收口').toBeNull()
    expect(resolveOf(scene(), { [k(0)]: MULTI_SELECT_DONE }), '★零个:一条事件都没有').toEqual([])
  })

  test('★★★★★★★选满【两个】之后不再问第三次(「最多两名」那条 guard)', () => {
    const s = scene()
    expect(OGS_011_MAX, '㊶ 上限从常量取').toBe(2)
    expect(ask(s, { [k(0)]: 'a' }), '★选了一个 ⇒ 还要问').not.toBeNull()
    expect(ask(s, { [k(0)]: 'a', [k(1)]: 'b' }), '★★选满两个 ⇒ 收口,不许问第三次').toBeNull()
  })

  test('★★★★★选过的不会再出现在候选里(别让玩家把同一个撤两次)', () => {
    const ids = ask(scene(), { [k(0)]: 'a' })!.candidates.map((c) => c.id)
    expect(ids).not.toContain('a')
    expect(ids).toContain('b')
  })
})

describe('★★★★★★★ 结算:每个各发【两条】,落点是其控制者的基地', () => {
  test('★★★★★★★选一个:zoneChange + unitMoved,落点 base:P1', () => {
    const s = scene()
    const from = s.objects['a' as ObjId]!.zone as string
    const evs = resolveOf(s, { [k(0)]: 'a' })
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['zoneChange', 'unitMoved'])
    expect(evs[0], '★zoneChange 用 obj + to,没有 from').toEqual({
      kind: 'zoneChange', obj: 'a', to: `base:${P1}`,
    })
    expect(evs[1], '★★§446.1 补发移动信号 —— 这是【移动】不是召回').toEqual({
      kind: 'unitMoved', unit: 'a', player: P1, from, to: `base:${P1}`,
    })
  })

  test('★★★★★★选两个:四条事件,按所选次序', () => {
    const evs = resolveOf(scene(), { [k(0)]: 'a', [k(1)]: 'c' })
    expect(evs.map((e) => (e as { kind: string }).kind))
      .toEqual(['zoneChange', 'unitMoved', 'zoneChange', 'unitMoved'])
    expect((evs[0] as { obj: string }).obj, '★先 a').toBe('a')
    expect((evs[2] as { obj: string }).obj, '★后 c').toBe('c')
  })

  test('★★★★结算前那名已经不在了 ⇒ 跳过它,另一名照走(不整条作废)', () => {
    const s = scene()
    const gone = { ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([id]) => id !== 'a')) } as GameState
    const evs = resolveOf(gone, { [k(0)]: 'a', [k(1)]: 'c' })
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['zoneChange', 'unitMoved'])
    expect((evs[0] as { obj: string }).obj).toBe('c')
  })
})

describe('★★★★★★★ 真流程:从手牌打得出来,单位真的回到基地', () => {
  function play(picks: readonly string[]): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'sp')
    expect(act, '前提自证:闪现打得出来').toBeDefined()
    g.apply(act!)
    let i = 0
    for (let step = 0; step < 20; step++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const want = picks[i++] ?? MULTI_SELECT_DONE
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: want })
        continue
      }
      break
    }
    return g
  }
  const baseContents = (g: InteractiveGame): readonly string[] => g.state.zones[`base:${P1}`]!.contents

  test('★★★★★★★撤两名:两个都站回基地,战场上不再挂着', () => {
    const s0 = scene()
    const fromA = s0.objects['a' as ObjId]!.zone as string
    const g = play(['a', 'c'])
    for (const oid of ['a', 'c']) {
      expect(g.state.objects[oid as ObjId]!.zone as string, `★${oid} 回到基地`).toBe(`base:${P1}`)
      expect(baseContents(g), `★基地 contents 收到 ${oid}`).toContain(oid)
    }
    expect(g.state.zones[fromA]!.contents, '★旧战场不能还挂着').not.toContain('a')
    expect(bfIds(g.state), '前提自证:两处战场还在').toHaveLength(2)
  })

  test('★★★★★★一个都不撤:场面【一动不动】(「最多」含零个)', () => {
    const before = scene()
    const g = play([])
    for (const oid of ['a', 'b', 'c', 'foe', 'home']) {
      expect(g.state.objects[oid as ObjId]!.zone, `★${oid} 没动`)
        .toBe(before.objects[oid as ObjId]!.zone)
    }
  })

  test('★★★★★★敌方单位【选不到】:它压根一步都没动', () => {
                                                     
                                                 
    const before = scene().objects['foe' as ObjId]!.zone
    const g = play(['foe'])
    expect(g.state.objects['foe' as ObjId]!.zone, '★敌方单位一步都不该动').toBe(before)
    expect(baseContents(g), '★更不该出现在我的基地').not.toContain('foe')
  })

  test('★★★★★★★落点取【控制者】的基地:对手拥有、被我控制的那名撤到【我】这边', () => {
                                                                     
    const g = play(['charmed'])
    const o = g.state.objects['charmed' as ObjId]!
    expect(o.owner, '前提自证:拥有者确实是对手').toBe(P2)
    expect(o.zone as string, '★★落点是【我】的基地,不是拥有者的').toBe(`base:${P1}`)
    expect(g.state.zones[`base:${P2}`]!.contents, '★对手基地里不该有它').not.toContain('charmed')
  })
})
