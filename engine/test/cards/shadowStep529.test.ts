import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { recursionCostOptions } from '../../src/keywords/recursion'
import {
  VEN_105, VEN_105_SPEC, VEN_105_KEYWORDS, VEN_105_MAX_MIGHT,
  unitsUpToMightOnField, enemyUnitsOnField, ENEMY_MOVE_DEFIDS, UNL_038_SPEC,
} from '../../data/cards/enemy-move'
import { destroyVictims } from '../../data/cards/destroy-spells'

                                                    
                                    
  
                          
                                                     
                            
                                       
                                    
                                   
                                                 
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const mk = (oid: string, who: PlayerId, might: number, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'OGN-012', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: might, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as unknown as GameObject)

function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, phase: 'main', objects, zones } as unknown as GameState
}

const spec = VEN_105_SPEC as unknown as {
  legalTargets: (s: GameState, p: PlayerId) => string[]
  makeNextChoice: (c: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (s: GameState, chosen: Record<string, string>) =>
      { key: string; candidates: readonly { id: string }[] } | null
  makeResolve: (c: { target?: string }) =>
    (s: GameState, chosen?: Record<string, string>) => readonly GameEvent[]
}
const cands = (s: GameState) => spec.legalTargets(s, P1).slice().sort()
const ask = (s: GameState, target?: string, chosen: Record<string, string> = {}) =>
  spec.makeNextChoice({ movedCardOid: 'sp', controller: P1, target })(s, chosen)
const cast = (s: GameState, target: string | undefined, dest?: string) =>
  spec.makeResolve({ target })(s, dest === undefined ? {} : { shadowStepDest: dest })

describe('★ 前提:卡面与接线', () => {
  test('★2费 1紫pip,印 [流转4紫色],进 PLAY_SPECS 与本文件清单', () => {
    expect(CARD_COSTS['VEN-105']).toEqual({ mana: 2, pips: 1, colors: ['purple'] })
    expect(cardKind('VEN-105')).toBe('spell')
    expect(playSpecFor('VEN-105')).toBeDefined()
    expect(cardKeywords('VEN-105'), '★② 印刷关键词三处同源').toEqual(['流转4紫色'])
    expect(VEN_105_KEYWORDS).toEqual(['流转4紫色'])
    expect(VEN_105.energy).toBe(2)
    expect(ENEMY_MOVE_DEFIDS).toContain('VEN-105')
    expect(VEN_105_MAX_MIGHT, '★㊶ 钉住卡面数额').toBe(3)
  })

  test('🔴★★★★★[流转4紫色] 真被 §829 三个读口认下来', () => {
    const kw = cardKeywords('VEN-105')
                                                   
    expect(recursionCostOptions(kw).length > 0).toBe(true)
    expect(recursionCostOptions(kw), '★★★4 法力 + 1 枚紫 pip').toEqual([{ mana: 4, pips: [['purple']] }])
  })
})

describe('🔴🔴🔴★★★★★★候选口分野一:【没有阵营词】⇒ 敌我都算', () => {
  const board = () => scene([
    mk('mine', P1, 2, BF0), // 我的小个子
    mk('foe', P2, 2, BF0), // 对手的小个子
  ])

  test('🔴★★★★★★自己的单位也在候选里 —— 卡文没写"敌方"', () => {
    expect(cands(board()), '★★★两个都能移').toEqual(['foe', 'mine'])
  })

  test('🔴★★★★★★对照:移动族原来那个口【只列对手的】(这条是分野的证据)', () => {
    expect(enemyUnitsOnField(board(), P1), '★★★那个口把我自己的排掉了').toEqual(['foe'])
  })
})

describe('🔴🔴🔴★★★★★★候选口分野二:【当前】战力上限', () => {
  test('🔴★★★★★★边界:恰好 3 算、4 不算(⑤ 上限类配"恰好等于"与"超一点")', () => {
    const s = scene([mk('three', P1, 3, BF0), mk('four', P2, 4, BF0)])
    expect(cands(s)).toEqual(['three'])
  })

  test('🔴★★★★★★按【当前】战力算,不是印刷战力', () => {
    const s0 = scene([mk('buffed', P1, 2, BF0)])
    const buffed = {
      ...s0.objects[asObjId('buffed')]!, derived: { might: 5, keywords: [] },
    } as unknown as GameObject
    const s = { ...s0, objects: { ...s0.objects, buffed } } as GameState
    expect(cands(s), '★★★印的是 2、现在是 5 ⇒ 不是合法目标').toEqual([])
  })

  test('🔴★★★★★没给上限值 ⇒ 一个都不列(与摧毁族那档同款处置)', () => {
    expect(unitsUpToMightOnField(scene([mk('a', P1, 1, BF0)]), undefined)).toEqual([])
  })
})

describe('🔴🔴🔴★★★★★★域:场上 = 战场 + 基地(卡文【没有位置词】)', () => {
  const board = () => scene([
    mk('onBf', P1, 2, BF0),
    mk('atBase', P2, 2, `base:${P2}`),
  ])

  test('🔴★★★★★★基地里的也能移', () => {
    expect(cands(board()), '★★★⑳ 没位置词含基地').toEqual(['atBase', 'onBf'])
  })

  test('🔴★★★★★★这就是【不能复用摧毁族那档】的理由:那档不含基地(不同解)', () => {
    const s = board()
    expect(destroyVictims('oneUnitOnBattlefieldUpTo', s, 3),
      '★★★那档把基地里那个排掉了 ⇒ 两个口不同解,只能对齐战力口径').toEqual(['onBf'])
    expect(cands(s), '★★★这张两个都要').toEqual(['atBase', 'onBf'])
  })

  test('🔴★★★★★非单位不算(⑩① 异类样本)', () => {
    const s0 = scene([mk('gear', P1, 0, BF0)])
    const gear = { ...s0.objects[asObjId('gear')]!, baseTypes: ['equipment'] } as unknown as GameObject
    const s = { ...s0, objects: { ...s0.objects, gear } } as GameState
    expect(cands(s)).toEqual([])
  })
})

describe('🔴🔴★★★★★★移动那半:与升龙踢共用的积木', () => {
  const s = () => scene([mk('target', P2, 2, BF0)])

  test('🔴★★★★★★追问落点:不含原地(§355.4.a 终点须异于当前位置)', () => {
    const q = ask(s(), 'target')
    expect(q?.key).toBe('shadowStepDest')
    const ids = q!.candidates.map((c) => c.id)
    expect(ids, '★★★当前那处不在候选里').not.toContain(BF0)
    expect(ids, '★★★另一处战场 + 它所属者的基地').toEqual(expect.arrayContaining([BF1, `base:${P2}`]))
  })

  test('🔴★★★★★答过就不再问(⑰)', () => {
    expect(ask(s(), 'target', { shadowStepDest: BF1 })).toBeNull()
  })

  test('🔴★★★★★★真移动要【两条事件】—— 只发换区的话盯移动的触发全不响', () => {
    const evs = cast(s(), 'target', BF1)
    expect(evs.map((e) => e.kind), '★★★§446.1 必须补发移动信号').toEqual(['zoneChange', 'unitMoved'])
    expect(evs[1] as unknown as { from: string; to: string })
      .toMatchObject({ from: BF0, to: BF1 })
  })

  test('🔴🔴★★★★★★升龙踢【走的是同一条积木】—— 砍它两张卡一起红(㊼ 共用件为真的证据)', () => {
                                               
                                            
    const other = (UNL_038_SPEC as unknown as {
      makeResolve: (c: { target?: string }) =>
        (s: GameState, chosen?: Record<string, string>) => readonly GameEvent[]
    })
    const evs = other.makeResolve({ target: 'target' })(s(), { dragonDest: BF1 })
    expect(evs.map((e) => e.kind), '★★★它也得发两条(换区 + 移动信号)')
      .toEqual(['zoneChange', 'unitMoved'])
  })

  test('🔴★★★★★没选目标 / 没选落点 / 原地不动 ⇒ 一条都不发', () => {
    expect(cast(s(), undefined, BF1)).toEqual([])
    expect(cast(s(), 'target', undefined)).toEqual([])
    expect(cast(s(), 'target', BF0), '★★★原地不动不算移动').toEqual([])
  })
})
