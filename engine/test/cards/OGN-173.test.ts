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
import { OGN_173_SPEC, OGN_173_DEST_KEY } from '../../data/cards/OGN-173'
import { moveDestinations } from '../../data/cards/enemy-move'

                                           
                                                     
  
                 
                                                                                 
                                                     
                                                        
                                                               
                                                     
                            
                                                   
                            
                                                         
                                                                            

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

   
                                                     
                             
   
function scene(battlefields = 2): GameState {
  const base = createInitialState([P1, P2], battlefields)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  const mk = (
    oid: string, zone: string, controller: string,
    extra: Partial<GameObject> = {},
  ): GameObject => ({
    oid: asObjId(oid), defId: `U-${oid}`, owner: asPlayerId(controller), controller: asPlayerId(controller),
    zone: asZoneId(zone), baseMight: 2, baseKeywords: [], baseTypes: ['unit'] as never,
    damage: 0, counters: {}, status: {}, ...extra,
  })
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  put(mk('home', `base:${P1}`, P1 as string))
  if (bfs[0] !== undefined) put(mk('front', bfs[0], P1 as string, { status: { dormant: true } }))
  put(mk('foe', `base:${P2}`, P2 as string))
  put({
    ...mk('sp', `hand:${P1}`, P1 as string),
    defId: 'OGN-173', baseMight: 0, baseTypes: ['spell'] as never,
  })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { purple: 3, green: 3, blue: 3, orange: 3, colorless: 3 } },
    },
  } as GameState
}

const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()
const resolveOf = (
  s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] =>
  OGN_173_SPEC.makeResolve({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const ask = (s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>) =>
  OGN_173_SPEC.makeNextChoice!({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)

describe('★ 前提:法术,2费+1紫pip,印刷 [迅捷](㊶⑪ pip 与域只能查 cardCosts.ts)', () => {
  test('★费用/类别/关键词两处都对得上', () => {
    expect(CARD_COSTS['OGN-173'], '★上游印刷费').toEqual({ mana: 2, pips: 1, colors: ['purple'] })
    expect(OGN_173_SPEC.cost, '★spec 侧').toEqual({ mana: 2, pips: [['purple']] })
    expect(cardKind('OGN-173')).toBe('spell')
    expect(playSpecFor('OGN-173'), '★已登记进 PLAY_SPECS').toBeDefined()
  })

  test('★★★[迅捷] 是【时机权限】⇒ spec 与印刷表【两处都要有】(322/323 的第四条消费路)', () => {
    expect(playSpecFor('OGN-173')?.keywords, '★spec 侧(决定什么时机打得出)').toEqual(['迅捷'])
    expect(cardKeywords('OGN-173'), '★印刷表侧(316 那条对账闸盯着)').toEqual(['迅捷'])
  })
})

describe('★★★★★★ 目标:「一名友方单位」——控制者是我,战场与基地都算', () => {
  test('★★★★★★恰好是我控制的那两名(基地里的 + 战场上的),对手那名不在内', () => {
    expect(OGN_173_SPEC.legalTargets(scene(), P1).slice().sort()).toEqual(['front', 'home'])
  })

  test('★★★★视角对称:换对手来问,只列得出他自己那名(㊵)', () => {
    expect(OGN_173_SPEC.legalTargets(scene(), P2).slice().sort()).toEqual(['foe'])
  })

  test('★★★手牌里那张法术自己不是候选(它不在场上)', () => {
    expect(OGN_173_SPEC.legalTargets(scene(), P1)).not.toContain('sp')
  })
})

describe('★★★★★★★ 落点:§446.1「场上任意【另一】位置」,不是 §144.4 标准移动那套', () => {
  test('★★★★★★★收口自证:候选与通用件 `moveDestinations` 【逐个相等】(谁手写一份就红)', () => {
    const s = scene(3)
    for (const oid of ['home', 'front']) {
      const req = ask(s, oid, {})
      expect(req, `★${oid} 必须问一次落点`).not.toBeNull()
      expect(req!.candidates.map((c) => c.id).sort(), `★${oid} 的候选`)
        .toEqual(moveDestinations(s, oid).slice().sort())
    }
  })

  test('★★★★★★基地里那名:候选 = 三处战场(自己那个基地被"另一位置"排掉)', () => {
    const s = scene(3)
    expect(ask(s, 'home', {})!.candidates.map((c) => c.id).sort()).toEqual(bfIds(s))
  })

  test('★★★★★★★★战场上那名【没有游走】,照样能去另一处战场 —— 标准移动禁止,本卡允许', () => {
    const s = scene(3)
    const u = s.objects['front' as ObjId]!
    expect(u.baseKeywords, '前提自证:它确实没有[游走]').toEqual([])
    const cands = ask(s, 'front', {})!.candidates.map((c) => c.id)
    const others = bfIds(s).filter((z) => z !== (u.zone as string))
    expect(others.length, '前提自证:确实还有别的战场').toBeGreaterThan(0)
    for (const z of others) expect(cands, `★另一处战场 ${z} 必须在候选里`).toContain(z)
    expect(cands, '★回自己基地也在候选里').toContain(`base:${P1}`)
    expect(cands, '★★当前位置被排掉(§446.1「另一位置」)').not.toContain(u.zone as string)
  })

  test('★★★★★答过一次就不再问(「其」回指刚移动的那个,不追问第二个目标)', () => {
    const s = scene()
    expect(ask(s, 'home', { [OGN_173_DEST_KEY]: bfIds(s)[0]! })).toBeNull()
  })

  test('★★★★没目标 / 目标不在场 / 一个别的位置都没有 ⇒ 不问', () => {
    expect(ask(scene(), undefined, {})).toBeNull()
    expect(ask(scene(), 'ghost', {})).toBeNull()
                                       
    const s0 = scene(0)
    expect(bfIds(s0), '前提自证:零处战场').toEqual([])
    expect(ask(s0, 'home', {})).toBeNull()
  })
})

describe('★★★★★★★ 结算:先移动【然后】变为活跃', () => {
  test('★★★★★★★次序即卡文次序:zoneChange → unitMoved → statusChange', () => {
    const s = scene()
    const to = bfIds(s)[0]!
    const evs = resolveOf(s, 'home', { [OGN_173_DEST_KEY]: to })
    expect(evs.map((e) => (e as { kind: string }).kind))
      .toEqual(['zoneChange', 'unitMoved', 'statusChange'])
    expect(evs[0], '★zoneChange 用 obj + to,没有 from').toEqual({ kind: 'zoneChange', obj: 'home', to })
    expect(evs[1], '★§446.1 补发移动信号').toEqual({
      kind: 'unitMoved', unit: 'home', player: P1, from: `base:${P1}`, to,
    })
    expect(evs[2], '★★「变为活跃」是单位的 dormant,不是 tapped(铁律188)').toEqual({
      kind: 'statusChange', target: 'home', key: 'dormant', value: false,
    })
  })

  test('★★★★★★移动做不成,「变为活跃」【照做】(卡文是两句)', () => {
    const only = [{ kind: 'statusChange', target: 'home', key: 'dormant', value: false }]
    expect(resolveOf(scene(0), 'home', {}), '★零战场:一个落点都没有').toEqual(only)
    expect(resolveOf(scene(), 'home', {}), '★没答落点').toEqual(only)
    expect(resolveOf(scene(), 'home', { [OGN_173_DEST_KEY]: 'battlefield:nope' }), '★落点是不存在的区').toEqual(only)
    expect(resolveOf(scene(), 'home', { [OGN_173_DEST_KEY]: `base:${P1}` }), '★答案就是它现在待的地方')
      .toEqual(only)
  })

  test('★★★没目标 / 目标已消失 ⇒ 一条都不发(连"变为活跃"也没有)', () => {
    expect(resolveOf(scene(), undefined, {})).toEqual([])
    expect(resolveOf(scene(), 'ghost', {})).toEqual([])
  })
})

describe('★★★★★★★ 真流程:休眠的单位被挪走并解除休眠', () => {
  function play(target: string, pick: (cands: readonly { id: string }[]) => string): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'sp' && (a as { target?: string }).target === target)
    expect(act, `前提自证:target=${target} 这条打出动作列得出来`).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: pick(p.request.candidates) })
        continue
      }
      break
    }
    return g
  }

  test('★★★★★★★战场上那名休眠单位:换到另一处战场,并且【醒了】', () => {
    const s0 = scene()
    const from = s0.objects['front' as ObjId]!.zone as string
    const other = bfIds(s0).find((z) => z !== from)!
    const g = play('front', (c) => c.find((x) => x.id === other)!.id)
    const o = g.state.objects['front' as ObjId]!
    expect(o.zone as string, '★真的挪过去了').toBe(other)
    expect(o.status['dormant'], '★★「变为活跃」= dormant 落成 false').toBe(false)
    expect(g.state.zones[other]!.contents, '★新区的 contents 收到了它').toContain('front')
    expect(g.state.zones[from]!.contents, '★旧区不能还挂着').not.toContain('front')
  })

  test('★★★★★★动作枚举:恰好【两条】,对应我那两名单位', () => {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const targets = g.legalActions(P1)
      .filter((a) => (a as { cardOid?: string }).cardOid === 'sp')
      .map((a) => (a as { target?: string }).target).sort()
    expect(targets).toEqual(['front', 'home'])
  })

  test('★★★★★对照组:基地里那名本来就是活跃的,打完仍活跃且站到了战场上', () => {
    const s0 = scene()
    expect(s0.objects['home' as ObjId]!.status['dormant'], '前提自证:它本来没休眠').toBeUndefined()
    const g = play('home', (c) => c[0]!.id)
    const o = g.state.objects['home' as ObjId]!
    expect(bfIds(g.state)).toContain(o.zone as string)
    expect(o.status['dormant'], '★1083 缺陷 63:本来就活跃 ⇒ 「变为活跃」不算发生,键保持缺省(活跃 = 没有 dormant:true)').not.toBe(true)
  })
})
