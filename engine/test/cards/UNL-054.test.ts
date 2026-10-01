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
import { MULTI_SELECT_DONE } from '../../src/loop/multiSelect'
import { GROUP_SUBSET_PREFIX, subsetKeyPrefix } from '../../src/loop/groupTargets'
import { referencedMight } from '../../data/cards/might-common'
import {
  UNL_054_SPEC, UNL_054_PREFIX, UNL_054_DEST_KEY, UNL_054_LIMIT,
  tentacleCandidates, tentacleDestinations,
} from '../../data/cards/UNL-054'

                                      
                                                  
  
                 
                                       
                                              
                                                          
                                                      
                                           
                                                            
                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const P3 = asPlayerId('P3')
const IG_DEPS: InteractiveDeps = {
  getTriggers: activeTriggers, handPlaySpecs, cardKeywords, cardKind, cardCost,
  costModsFor, activatedFor, playSpecFor, entryDormantFor,
}

const mk = (
  oid: string, zone: string, controller: PlayerId, might: number,
): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: controller, controller,
  zone: asZoneId(zone), baseMight: might, baseKeywords: [], baseTypes: ['unit'] as never,
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
  put(mk('a3', bfs[0]!, P2, 3))
  put(mk('a2', bfs[0]!, P2, 2))
  put(mk('b4', bfs[0]!, P3, 4))
  put(mk('mine', bfs[0]!, P1, 1))
  put(mk('a9', bfs[1]!, P2, 9))
  put(mk('aNeg', bfs[1]!, P2, -3))
  put(mk('aHome', `base:${P2}`, P2, 1))
  put({ ...mk('sp', `hand:${P1}`, P1, 0), defId: 'UNL-054', baseTypes: ['spell'] as never })
  return {
    ...base, activePlayer: P1, phase: 'main', objects, zones,
    runePools: {
      ...base.runePools,
      [P1]: { mana: 9, runes: { green: 3, purple: 3, blue: 3, orange: 3, colorless: 3 } },
    },
  } as GameState
}

const bfIds = (s: GameState): string[] => zonesByKind(s, 'battlefield').map((z) => z.id as string).sort()
                                                   
                                                                                      
                                                                            
                                                                                   
const ask = (s: GameState, chosen: Readonly<Record<string, string>>) =>
  UNL_054_SPEC.makeConfirmChoice!({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const resolveOf = (s: GameState, chosen: Readonly<Record<string, string>>): readonly GameEvent[] =>
  UNL_054_SPEC.makeResolve({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const k = (i: number): string => `${UNL_054_PREFIX}${i}`
const idsOf = (req: { candidates: readonly { id: string }[] } | null): string[] =>
  (req?.candidates ?? []).map((c) => c.id).filter((id) => id !== MULTI_SELECT_DONE).sort()
                                                                  
const SUB = subsetKeyPrefix('tentacle')
const nextOf = (s: GameState, chosen: Readonly<Record<string, string>>) =>
  UNL_054_SPEC.makeNextChoice!({ movedCardOid: 'sp', controller: P1 })(s, chosen)
const withSubset = (base: Readonly<Record<string, string>>, sub: readonly string[]): Record<string, string> => {
  const o: Record<string, string> = { ...base }
  sub.forEach((v, i) => { o[`${SUB}${i}`] = v })
  o[`${SUB}${sub.length}`] = MULTI_SELECT_DONE
  return o
}
const movedOids = (evs: readonly GameEvent[]): string[] =>
  evs.map((e) => (e as { obj?: string }).obj ?? '').filter(Boolean)

describe('★ 前提:法术 4费 + 1绿pip,不印关键词(㊶⑪)', () => {
  test('★费用/类别/上限常量', () => {
    expect(CARD_COSTS['UNL-054'], '★上游印刷费').toEqual({ mana: 4, pips: 1, colors: ['green'] })
    expect(UNL_054_SPEC.cost).toEqual({ mana: 4, pips: [['green']] })
    expect(cardKind('UNL-054')).toBe('spell')
    expect(cardKeywords('UNL-054')).toEqual([])
    expect(playSpecFor('UNL-054')).toBeDefined()
    expect(UNL_054_LIMIT, '㊶ 上限从常量取').toBe(8)
  })

  test('㊳ 场景先自证:这是【三人局】,且第三方那名确实由 P3 控制', () => {
    const s = scene()
    expect(s.players.length, '★三人局才砍得动"控制者必须相同"').toBe(3)
    expect(s.objects['b4' as ObjId]!.controller).toBe(P3)
  })
})

describe('★★★★★★ 三道筛', () => {
  test('★★★★★★没选之前:两位对手的单位【都】能当第一个', () => {
    const s = scene()
                                            
    expect(tentacleCandidates(s, P1, [])).toEqual(['a2', 'a3', 'aHome', 'aNeg', 'b4'].sort())
  })

  test('★★★★★【阵营】筛:我控制的那名进不来;换 P2 来打就轮到我的进来(㊵)', () => {
    const s = scene()
    expect(tentacleCandidates(s, P1, []), '★我方出局').not.toContain('mine')
    expect(tentacleCandidates(s, P2, []), '㊵ 问 P2 自己的答案').toEqual(['b4', 'mine'].sort())
  })

  test('★★★★★★★【控制者必须相同】:选了 P2 的之后,P3 那名当场消失', () => {
    const s = scene()
    expect(tentacleCandidates(s, P1, []), '★没锁死之前 P3 那名在候选里').toContain('b4')
    const afterA3 = tentacleCandidates(s, P1, ['a3'])
    expect(afterA3, '★★锁死成 P2 ⇒ P3 那名出局').not.toContain('b4')
    expect(afterA3, '★同为 P2 的还在').toContain('a2')
                                 
    const afterB4 = tentacleCandidates(s, P1, ['b4'])
    expect(afterB4, '★★锁死成 P3 ⇒ 一个 P2 的都不剩').toEqual([])
  })

  test('★★★★★★【战力】筛 + §143.2.b:9 力那名一开始就装不下;负战力按【引用值 0】计', () => {
    const s = scene()
    expect(referencedMight(s, 'a9'), '前提自证:它是 9 力').toBe(9)
    expect(tentacleCandidates(s, P1, []), '★9 > 8 ⇒ 从头就不在候选里').not.toContain('a9')
    expect(s.objects['aNeg' as ObjId]!.baseMight, '前提自证:实际战力是负的').toBe(-3)
    expect(referencedMight(s, 'aNeg'), '★★被法术引用时下钳 0').toBe(0)
                                        
    expect(tentacleCandidates(s, P1, ['aNeg']), '★选了它额度一点没多 ⇒ a9 仍装不下').not.toContain('a9')
  })

  test('★★★★★★额度用满:战力 >0 的全没了,【0 力的仍可选】(「不超过」的正确读法)', () => {
    const s = scene()
                                       
    expect(tentacleCandidates(s, P1, ['a3', 'a2', 'aHome'])).toEqual(['aNeg'])
                          
    expect(tentacleCandidates(s, P1, ['a3', 'a2', 'aHome', 'aNeg'])).toEqual([])
  })
})

describe('★★★★★★★ 问链:先问"移动谁",再问【共同】落点', () => {
  test('★★★★★★★第一问是多选,答"够了"之后才问落点', () => {
    const s = scene()
    const q1 = ask(s, {})
    expect(q1!.key, '★①多选第 0 格').toBe(k(0))
    expect(idsOf(q1)).toEqual(['a2', 'a3', 'aHome', 'aNeg', 'b4'].sort())
    const q2 = ask(s, { [k(0)]: 'a3', [k(1)]: MULTI_SELECT_DONE })
    expect(q2!.key, '★②选完之后问共同落点').toBe(UNL_054_DEST_KEY)
    const done = ask(s, { [k(0)]: 'a3', [k(1)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: bfIds(s)[1]! })
    expect(done, '★★都答完 ⇒ 收口').toBeNull()
  })

  test('★★★★★★落点 = 所有战场 + 【共同控制者】的基地', () => {
    const s = scene()
    const q = ask(s, { [k(0)]: 'a3', [k(1)]: MULTI_SELECT_DONE })
    expect(q!.candidates.map((c) => c.id).sort(), '★P2 的基地 + 两处战场')
      .toEqual([`base:${P2}`, ...bfIds(s)].sort())
                                           
    expect(q!.candidates.map((c) => c.id).sort())
      .toEqual(tentacleDestinations(s, ['a3']).slice().sort())
                                               
    expect(tentacleDestinations(s, ['b4']), '㊵ 问那一组自己的答案')
      .toEqual([`base:${P3}`, ...zonesByKind(s, 'battlefield').map((z) => z.id as string)])
  })

  test('★★★★★一个都不选 ⇒ 【不问落点】、一条事件都不发', () => {
    const s = scene()
    expect(ask(s, { [k(0)]: MULTI_SELECT_DONE }), '★不问落点').toBeNull()
    expect(resolveOf(s, { [k(0)]: MULTI_SELECT_DONE }), '★零个').toEqual([])
    expect(resolveOf(s, { [k(0)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: bfIds(s)[0]! }), '★硬塞落点也不动')
      .toEqual([])
  })
})

describe('★★★★★★★ 结算:全都挪到同一位置', () => {
  test('★★★★★★★两名各发两条,落点相同', () => {
    const s = scene()
    const to = bfIds(s)[1]!
    const evs = resolveOf(s, { [k(0)]: 'a3', [k(1)]: 'a2', [k(2)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: to })
    expect(evs.map((e) => (e as { kind: string }).kind))
      .toEqual(['zoneChange', 'unitMoved', 'zoneChange', 'unitMoved'])
    expect(evs[0]).toEqual({ kind: 'zoneChange', obj: 'a3', to })
    expect(evs[1], '★`player` 是那名单位的控制者').toEqual({
      kind: 'unitMoved', unit: 'a3', player: P2, from: s.objects['a3' as ObjId]!.zone, to,
    })
    expect(evs[2]).toEqual({ kind: 'zoneChange', obj: 'a2', to })
  })

  test('★★★★★★【已在落点】的那一个自然不动,其余照走(§446.1)', () => {
    const s = scene()
    const here = s.objects['a3' as ObjId]!.zone as string                    
    const evs = resolveOf(s, {
      [k(0)]: 'a3', [k(1)]: 'aHome', [k(2)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: here,
    })
                                       
    expect(evs.map((e) => (e as { kind: string }).kind)).toEqual(['zoneChange', 'unitMoved'])
    expect((evs[0] as { obj: string }).obj, '★发出来的是从别处来的那一个').toBe('aHome')
  })

  test('★★★★★★★结算侧【子集重选】:追问后战力涨了 ⇒ 组破,控制者选子集;改答另一组 ⇒ 施加面不同', () => {
    const s0 = scene()
    const to = bfIds(s0)[1]!
                                                                    
                                                      
                                            
                                                   
                                            
    const pumped = {
      ...s0,
      objects: { ...s0.objects, a2: { ...s0.objects['a2' as ObjId]!, baseMight: 7 } },
    } as GameState
    const base = { [k(0)]: 'a3', [k(1)]: 'a2', [k(2)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: to }
                                       
    const q = nextOf(pumped, base)
    expect(q, '★组破 ⇒ 必须问子集(旧口径:引擎自动裁掉)').not.toBeNull()
    expect(q!.key, '★子集第一格键(形态现算,不手写字面量)').toBe(`${SUB}0`)
    expect(idsOf(q), '★候选 = 初始组两名(3≤8、7≤8 各自是合法单元素子集)').toEqual(['a2', 'a3'])
    expect(q!.candidates.map((c) => c.id), '★§355.13:空集是合法答案 ⇒「够了」出口恒在').toContain(MULTI_SELECT_DONE)
                            
    expect(movedOids(resolveOf(pumped, withSubset(base, ['a3']))), '★只移玩家答的 a3').toEqual(['a3'])
                                                        
    expect(movedOids(resolveOf(pumped, withSubset(base, ['a2']))), '★★改答 {a2} ⇒ 只移 a2').toEqual(['a2'])
  })

  test('★★★★★结算前换了控制者 ⇒ 组破,控制者选子集;换了控制者的那一名已出候选池', () => {
    const s0 = scene()
    const to = bfIds(s0)[1]!
                                                        
                                                       
    const flipped = {
      ...s0,
      objects: { ...s0.objects, a2: { ...s0.objects['a2' as ObjId]!, controller: P1 } },
    } as GameState
    const base = { [k(0)]: 'a3', [k(1)]: 'a2', [k(2)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: to }
    const q = nextOf(flipped, base)
    expect(q, '★控制者维破组 ⇒ 必须问子集').not.toBeNull()
                                                  
    expect(idsOf(q), '★换控制者的那一名已不在候选池').toEqual(['a3'])
    expect(movedOids(resolveOf(flipped, withSubset(base, ['a3']))), '★玩家答 {a3} ⇒ 只移 a3').toEqual(['a3'])
  })

  test('★★★组破但 chosen 里【没有任何子集键】⇒ 一个事件都不发(直调 makeResolve 的安全兜底)', () => {
    const s0 = scene()
    const to = bfIds(s0)[1]!
    const pumped = {
      ...s0,
      objects: { ...s0.objects, a2: { ...s0.objects['a2' as ObjId]!, baseMight: 7 } },
    } as GameState
                                                        
                                                        
                                              
    const noSubset = { [k(0)]: 'a3', [k(1)]: 'a2', [k(2)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: to }
    expect(
      Object.keys(noSubset).some((key) => key.startsWith(GROUP_SUBSET_PREFIX)),
      '前提自证:确实一个子集键都没有',
    ).toBe(false)
    expect(resolveOf(pumped, noSubset), '★没答子集 ⇒ 零事件').toEqual([])
  })

  test('★★★「答空集」= 子集首格写 __done__ 哨兵 ⇒ 零事件(§355.13 空集合法;与「没答」同结果)', () => {
    const s0 = scene()
    const to = bfIds(s0)[1]!
    const pumped = {
      ...s0,
      objects: { ...s0.objects, a2: { ...s0.objects['a2' as ObjId]!, baseMight: 7 } },
    } as GameState
    const base = { [k(0)]: 'a3', [k(1)]: 'a2', [k(2)]: MULTI_SELECT_DONE, [UNL_054_DEST_KEY]: to }
                                                                  
    const emptyAns = { ...base, [`${SUB}0`]: MULTI_SELECT_DONE }
    expect(resolveOf(pumped, emptyAns), '★答空集 ⇒ 零事件').toEqual([])
    // 与「没答」(首格【无】键)的关系:原始 chosen 里【能】区分 —— 有键(值=哨兵) vs 无键;
    // 但共用读口 `groupSubsetApplied` 走 `multiSelectPicked`,两种都塌成 `[]`。本卡上两者同结果
    // (空集施加面为空 = 不施加),无可观察差异;详见 ds1804b report §4(报 PM)。
  })
})

describe('★★★★★★★ 真流程:一群敌方单位真的被聚到一处', () => {
  function play(picks: readonly string[], dest: string): InteractiveGame {
    const g = new InteractiveGame(scene(), IG_DEPS)
    const act = g.legalActions(P1).find((a) => (a as { cardOid?: string }).cardOid === 'sp')
    expect(act, '前提自证:顽皮触手打得出来').toBeDefined()
    g.apply(act!)
    let i = 0
    for (let step = 0; step < 24; step++) {
      const p = g.pending()
      if (p.mode === 'window') { g.apply({ kind: 'PASS', player: p.player }); continue }
      if (p.mode === 'choice') {
        const isDest = p.request.key === UNL_054_DEST_KEY
        const want = isDest
          ? (p.request.candidates.find((c) => c.id === dest)?.id ?? p.request.candidates[0]!.id)
          : (picks[i++] ?? MULTI_SELECT_DONE)
        g.apply({ kind: 'CHOOSE', player: p.player, key: p.request.key, answer: want })
        continue
      }
      break
    }
    return g
  }

  test('★★★★★★★两名 P2 单位都挪到了第二处战场,控制者不变', () => {
    const s0 = scene()
    const to = bfIds(s0)[1]!
    const g = play(['a3', 'a2'], to)
    for (const oid of ['a3', 'a2']) {
      expect(g.state.objects[oid as ObjId]!.zone as string, `★${oid} 到位`).toBe(to)
      expect(g.state.zones[to]!.contents, `★区域 contents 收到 ${oid}`).toContain(oid)
      expect(g.state.objects[oid as ObjId]!.controller, '★移动不改控制者').toBe(P2)
    }
    expect(g.state.zones[s0.objects['a3' as ObjId]!.zone]!.contents, '★旧战场清掉了')
      .not.toContain('a3')
  })

  test('★★★★★一个都不选:场面一动不动', () => {
    const before = scene()
    const g = play([], bfIds(before)[1]!)
    for (const oid of ['a3', 'a2', 'b4', 'mine', 'a9', 'aNeg', 'aHome']) {
      expect(g.state.objects[oid as ObjId]!.zone, `★${oid} 没动`)
        .toBe(before.objects[oid as ObjId]!.zone)
    }
  })
})
