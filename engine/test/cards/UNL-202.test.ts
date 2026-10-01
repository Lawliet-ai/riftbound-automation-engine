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
import { moveDestinations, enemyUnitsOnField } from '../../data/cards/enemy-move'
import {
  UNL_202_SPEC, UNL_202_FRIEND_DEST, UNL_202_FOE_PICK, UNL_202_FOE_DEST,
} from '../../data/cards/UNL-202'

                                          
                                                           
  
                 
                                                   
                                             
                                                
                                                         
                                                  
                                                            

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
  const mk = (oid: string, zone: string, controller: string, types: readonly string[] = ['unit']): GameObject => ({
    oid: asObjId(oid), defId: `U-${oid}`, owner: asPlayerId(controller), controller: asPlayerId(controller),
    zone: asZoneId(zone), baseMight: 2, baseKeywords: [], baseTypes: types as never,
    damage: 0, counters: {}, status: {},
  })
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  if (bfs[0] !== undefined) {
    put(mk('mine', bfs[0], P1 as string))
    put(mk('foeA', bfs[0], P2 as string))
  }
  put(mk('home', `base:${P1}`, P1 as string))
  put(mk('foeHome', `base:${P2}`, P2 as string))
  put({ ...mk('sp', `hand:${P1}`, P1 as string, ['spell']), defId: 'UNL-202', baseMight: 0 })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { orange: 3, purple: 3, green: 3, blue: 3, colorless: 3 } },
    },
  } as GameState
}

const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()
const ask = (s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>) =>
  UNL_202_SPEC.makeNextChoice!({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)
const resolveOf = (
  s: GameState, target: string | undefined, chosen: Readonly<Record<string, string>>,
): readonly GameEvent[] =>
  UNL_202_SPEC.makeResolve({
    movedCardOid: 'sp', controller: P1, ...(target !== undefined ? { target } : {}),
  })(s, chosen)

describe('★ 前提:法术,2费 + 1枚橙/紫 pip(㊶⑪)', () => {
  test('★费用/类别/不印关键词', () => {
    expect(CARD_COSTS['UNL-202'], '★上游印刷费').toEqual({ mana: 2, pips: 1, colors: ['orange', 'purple'] })
    expect(UNL_202_SPEC.cost, '★双色单 pip 写成一组两色').toEqual({ mana: 2, pips: [['orange', 'purple']] })
    expect(cardKind('UNL-202'), '★「专属」是构筑限制不是类别').toBe('spell')
    expect(UNL_202_SPEC.keywords, '★卡面没有关键词横幅').toEqual([])
    expect(cardKeywords('UNL-202'), '★印刷表侧同样为空').toEqual([])
    expect(playSpecFor('UNL-202'), '★已登记进 PLAY_SPECS').toBeDefined()
  })
})

describe('★★★★★★ 目标:友方/敌方都按控制者,且【没有位置词】⇒ 基地也算', () => {
  test('★★★★★★打出目标(友方)= 我控制的两名,基地里那名也在内', () => {
    expect(UNL_202_SPEC.legalTargets(scene(), P1).slice().sort()).toEqual(['home', 'mine'])
  })

  test('★★★★★敌方那一问的候选 = 对手控制的两名,同样含基地', () => {
    const s = scene()
    const req = ask(s, 'mine', { [UNL_202_FRIEND_DEST]: bfIds(s)[1]! })
    expect(req!.key, '★这一问是"敌方选谁"').toBe(UNL_202_FOE_PICK)
    expect(req!.candidates.map((c) => c.id).sort()).toEqual(['foeA', 'foeHome'])
  })

  test('★★★视角对称:换对手来打,友方候选是他自己那两名(㊵)', () => {
    expect(UNL_202_SPEC.legalTargets(scene(), P2).slice().sort()).toEqual(['foeA', 'foeHome'])
  })
})

describe('★★★★★★★ 四问链:一步都不能串', () => {
  test('★★★★★★★第一问是【友方落点】,第二问才是【敌方选谁】', () => {
    const s = scene()
    const q1 = ask(s, 'mine', {})
    expect(q1!.key, '★①友方去哪').toBe(UNL_202_FRIEND_DEST)
    const q2 = ask(s, 'mine', { [UNL_202_FRIEND_DEST]: `base:${P1}` })
    expect(q2!.key, '★②敌方选谁').toBe(UNL_202_FOE_PICK)
    const q3 = ask(s, 'mine', { [UNL_202_FRIEND_DEST]: `base:${P1}`, [UNL_202_FOE_PICK]: 'foeA' })
    expect(q3!.key, '★③敌方去哪').toBe(UNL_202_FOE_DEST)
    const done = ask(s, 'mine', {
      [UNL_202_FRIEND_DEST]: `base:${P1}`, [UNL_202_FOE_PICK]: 'foeA', [UNL_202_FOE_DEST]: `base:${P2}`,
    })
    expect(done, '★★四问答完 ⇒ 收口,不许再问').toBeNull()
  })

  test('★★★★★★★收口自证:两处落点候选都与通用件 `moveDestinations` 【逐个相等】', () => {
    const s = scene(3)
    const q1 = ask(s, 'mine', {})
    expect(q1!.candidates.map((c) => c.id).sort(), '★友方那半')
      .toEqual(moveDestinations(s, 'mine').slice().sort())
    const q3 = ask(s, 'mine', { [UNL_202_FRIEND_DEST]: `base:${P1}`, [UNL_202_FOE_PICK]: 'foeA' })
    expect(q3!.candidates.map((c) => c.id).sort(), '★★敌方那半用【敌方那个】算落点,不是拿友方的凑数')
      .toEqual(moveDestinations(s, 'foeA').slice().sort())
  })

  test('★★★★★敌方候选与通用件 `enemyUnitsOnField` 一致(收口自证)', () => {
    const s = scene()
    const req = ask(s, 'mine', { [UNL_202_FRIEND_DEST]: `base:${P1}` })
    expect(req!.candidates.map((c) => c.id).sort()).toEqual(enemyUnitsOnField(s, P1).slice().sort())
  })
})

describe('★★★★★★★ 两半互不牵连(卡文是两句)', () => {
  test('★★★★★★场上【没有敌方单位】⇒ 不问敌方,友方那半照做', () => {
    const s0 = scene()
    const noFoe = {
      ...s0,
      objects: Object.fromEntries(Object.entries(s0.objects).filter(([id]) => id !== 'foeA' && id !== 'foeHome')),
    } as GameState
    expect(enemyUnitsOnField(noFoe, P1), '前提自证:确实一个敌方单位都没有').toEqual([])
                                                                       
                                                                
    const q = ask(noFoe, 'mine', { [UNL_202_FRIEND_DEST]: `base:${P1}` })!
    expect(q.key, '★没有敌方 ⇒ 必选空候选(不再 null)').toBe(UNL_202_FOE_PICK)
    expect(q.candidates, '★空候选(§355.8 问不出)').toEqual([])
    const evs = resolveOf(noFoe, 'mine', { [UNL_202_FRIEND_DEST]: `base:${P1}` })
    expect(evs.map((e) => (e as { kind: string }).kind), '★★友方那半照发两条').toEqual(['zoneChange', 'unitMoved'])
  })

  test('★★★★★★友方那半移不动,敌方那半【照做】', () => {
    const s = scene()
                             
    const evs = resolveOf(s, 'mine', {
      [UNL_202_FRIEND_DEST]: 'battlefield:nope',
      [UNL_202_FOE_PICK]: 'foeA', [UNL_202_FOE_DEST]: `base:${P2}`,
    })
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['zoneChange', 'unitMoved'])
    expect((evs[0] as { obj: string }).obj, '★发出来的是【敌方】那一条').toBe('foeA')
  })

  test('★★★两边都没答落点 ⇒ 一条都不发', () => {
    expect(resolveOf(scene(), 'mine', {})).toEqual([])
    expect(resolveOf(scene(), undefined, {})).toEqual([])
  })
})

describe('★★★★★★★ 结算:四条事件,【友方在前】', () => {
  test('★★★★★★★次序即卡文次序:友方 zoneChange+unitMoved,然后敌方两条', () => {
    const s = scene()
    const to1 = `base:${P1}`
    const to2 = bfIds(s)[1]!
    const evs = resolveOf(s, 'mine', {
      [UNL_202_FRIEND_DEST]: to1, [UNL_202_FOE_PICK]: 'foeA', [UNL_202_FOE_DEST]: to2,
    })
    expect(evs.map((e) => (e as { kind: string }).kind))
      .toEqual(['zoneChange', 'unitMoved', 'zoneChange', 'unitMoved'])
    expect(evs[0], '★①友方 zoneChange(obj + to,没有 from)').toEqual({ kind: 'zoneChange', obj: 'mine', to: to1 })
    expect(evs[1], '★②§446.1 补发的移动信号').toEqual({
      kind: 'unitMoved', unit: 'mine', player: P1, from: s.objects['mine' as ObjId]!.zone, to: to1,
    })
    expect(evs[2], '★③敌方 zoneChange').toEqual({ kind: 'zoneChange', obj: 'foeA', to: to2 })
    expect(evs[3], '★④敌方的 player 是【它的控制者】,不是打出者').toEqual({
      kind: 'unitMoved', unit: 'foeA', player: P2, from: s.objects['foeA' as ObjId]!.zone, to: to2,
    })
  })
})

describe('★★★★★★★ 真流程:两名单位真的各挪了一次', () => {
  function play(target: string, answers: Readonly<Record<string, string>>): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) =>
      (a as { cardOid?: string }).cardOid === 'sp' && (a as { target?: string }).target === target)
    expect(act, `前提自证:target=${target} 打得出来`).toBeDefined()
    g.apply(act!)
    for (let i = 0; i < 20; i++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const want = answers[p.request.key] ?? p.request.candidates[0]!.id
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: want })
        continue
      }
      break
    }
    return g
  }

  test('★★★★★★★友方进基地、敌方被挪到另一处战场', () => {
    const s0 = scene()
    const other = bfIds(s0)[1]!
    const g = play('mine', {
      [UNL_202_FRIEND_DEST]: `base:${P1}`,
      [UNL_202_FOE_PICK]: 'foeA',
      [UNL_202_FOE_DEST]: other,
    })
    expect(g.state.objects['mine' as ObjId]!.zone as string, '★友方回基地').toBe(`base:${P1}`)
    expect(g.state.objects['foeA' as ObjId]!.zone as string, '★★敌方被挪到另一处战场').toBe(other)
    expect(g.state.zones[`base:${P1}`]!.contents, '★区域 contents 也更新了').toContain('mine')
    expect(g.state.zones[other]!.contents).toContain('foeA')
    expect(g.state.objects['foeA' as ObjId]!.controller, '★★移动【不改控制者】').toBe(P2)
  })

  test('★★★★★动作枚举:恰好【两条】,对应我那两名单位', () => {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const targets = g.legalActions(P1)
      .filter((a) => (a as { cardOid?: string }).cardOid === 'sp')
      .map((a) => (a as { target?: string }).target).sort()
    expect(targets).toEqual(['home', 'mine'])
  })
})
