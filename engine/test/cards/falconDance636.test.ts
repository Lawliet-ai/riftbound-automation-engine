import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { parseCostSuffix } from '../../src/keywords/costSuffix'
import { recursionCostOptions } from '../../src/keywords/recursion'
import {
  VEN_140_SPEC, VEN_140_HIT_KEY, VEN_140_MOVE_KEY, VEN_140_DEST_KEY, VEN_140_SKIP,
  VEN_140_DAMAGE, falconVictims,
} from '../../data/cards/VEN-140'

                                                                
                                                  
  
           
                                                              
                            
                                                
                                                               
                                                                         
                                   

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

function scene(objs: readonly GameObject[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}
const bf = (s: GameState, i: number): string => zonesByKind(s, 'battlefield').map((z) => z.id as string)[i]!
const BF0 = 'battlefield:shared:0'

                                                              
const full = (): GameState => scene([
  unit('foeBf', P2, BF0), unit('foeBase', P2, `base:${P2}`),
  unit('mine', P1, BF0), unit('home', P1, `base:${P1}`),
])

type Ev = { kind: string, target?: string, amount?: number, source?: string, sourcePlayer?: string, obj?: string, to?: string }
const resolveWith = (s: GameState, answers: Record<string, string>): readonly Ev[] =>
  VEN_140_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, answers) as readonly Ev[]
const nextQ = (s: GameState, chosen: Record<string, string>) =>
  VEN_140_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1 } as never)(s, chosen)

describe('★ 前提:上游费用 / [流转3A] / 进表', () => {
  test('★★★★★⑤1费 1枚红绿双色pip(★592 分野)、[流转3A] 进印刷表并可解析、进 PLAY_SPECS', () => {
    expect(CARD_COSTS['VEN-140']).toEqual({ mana: 1, pips: 1, colors: ['red', 'green'] })
    expect(VEN_140_SPEC.cost).toEqual({ mana: 1, pips: [['red', 'green']] })
    expect(cardKind('VEN-140')).toBe('spell')
    expect(cardKeywords('VEN-140')).toEqual(['流转3A'])
    expect(VEN_140_SPEC.keywords, '★spec 上那份是时机权限口径,与印刷表两处都要钉(刀4救活)').toEqual(['流转3A'])
    expect(parseCostSuffix('3A'), '★3 法力 + 1 枚任意 pip(㊶ 数个数)').toEqual({ mana: 3, pips: [[]] })
    expect(recursionCostOptions(['流转3A']), '★§829 通用实现认得这条').toEqual([{ mana: 3, pips: [[]] }])
    expect(playSpecFor('VEN-140')).toBe(VEN_140_SPEC)
  })
})

describe('★★★★★★★ 候选与问链:skip 档 + 三问', () => {
  test('★★★★★★②「战场上…敌方」:基地敌方与友方都不入候选', () => {
    expect(falconVictims(full(), P1)).toEqual(['foeBf'])
  })

  test('★★★★★★①问1带 skip 档;答了就问移动(必选,无 skip);再问落点', () => {
    const s = full()
    const q1 = nextQ(s, {})!
    expect(q1.key).toBe(VEN_140_HIT_KEY)
    expect(q1.candidates.map((c) => c.id), '★「最多」⇒ 多一个 skip 档').toEqual(['foeBf', VEN_140_SKIP])
    const q2 = nextQ(s, { [VEN_140_HIT_KEY]: VEN_140_SKIP })!
    expect(q2.key).toBe(VEN_140_MOVE_KEY)
    expect(q2.candidates.map((c) => c.id), '★③移动必选:候选=友方(含基地),没有 skip')
      .toEqual(['home', 'mine'])
    const q3 = nextQ(s, { [VEN_140_HIT_KEY]: VEN_140_SKIP, [VEN_140_MOVE_KEY]: 'mine' })!
    expect(q3.key).toBe(VEN_140_DEST_KEY)
    expect(q3.candidates.map((c) => c.id), '★落点=我的基地+其余战场(去掉当前位置)')
      .toContain(`base:${P1}`)
  })

  test('★★★★没有敌方 ⇒ 跳过问1直接问移动;没有友方 ⇒ ★1815 必选空候选(不再 null)', () => {
    const noFoe = scene([unit('mine', P1, BF0)])
    expect(nextQ(noFoe, {})!.key, '★没有可打的 ⇒ 不问伤害').toBe(VEN_140_MOVE_KEY)
    const noMine = scene([unit('foeBf', P2, BF0)])
                                                                     
                                                         
    const q = nextQ(noMine, { [VEN_140_HIT_KEY]: VEN_140_SKIP })!
    expect(q.key, '★没有友方 ⇒ 必选空候选(不再 null)').toBe(VEN_140_MOVE_KEY)
    expect(q.candidates, '★空候选(§355.8 问不出)').toEqual([])
  })
})

describe('★★★★★★★ 结算:伤害(可 skip)+ 移动(两句并列)', () => {
  test('★★★★★★真结算:打 foeBf 2点(source/sourcePlayer 都带)+ 把 mine 移到 bf1', () => {
    const s = full()
    const evs = resolveWith(s, {
      [VEN_140_HIT_KEY]: 'foeBf', [VEN_140_MOVE_KEY]: 'mine', [VEN_140_DEST_KEY]: bf(s, 1),
    })
    expect(evs).toHaveLength(3)                                   
    expect(evs[0]).toMatchObject({ kind: 'damage', target: 'foeBf', amount: VEN_140_DAMAGE, source: 'sp', sourcePlayer: P1 })
    expect(evs[1]).toMatchObject({ kind: 'zoneChange', obj: 'mine', to: bf(s, 1) })
    expect(evs[2]).toMatchObject({ kind: 'unitMoved', unit: 'mine' })
  })

  test('★★★★★★⑥skip 伤害 ⇒ 只移动(两句并列,前半落空不影响后半)', () => {
    const s = full()
    const evs = resolveWith(s, {
      [VEN_140_HIT_KEY]: VEN_140_SKIP, [VEN_140_MOVE_KEY]: 'mine', [VEN_140_DEST_KEY]: bf(s, 1),
    })
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
  })

  test('★★★★★㊺复验:伤害目标已退回基地(不再是「战场上的」)⇒ 那半无视,移动照做', () => {
    const s = full()
    const foe = s.objects['foeBf' as never] as GameObject
    const retreated = {
      ...s, objects: { ...s.objects, foeBf: { ...foe, zone: asZoneId(`base:${P2}`) } },
    } as GameState
    const evs = resolveWith(retreated, {
      [VEN_140_HIT_KEY]: 'foeBf', [VEN_140_MOVE_KEY]: 'mine', [VEN_140_DEST_KEY]: bf(s, 1),
    })
    expect(evs.map((e) => e.kind), '★伤害那半 ㊺ 掉了,移动照走').toEqual(['zoneChange', 'unitMoved'])
  })

  test('★★★★落点没答/非法 ⇒ 移动零条(moveUnitEvents 兜底);伤害那半不受影响', () => {
    const s = full()
    const evs = resolveWith(s, { [VEN_140_HIT_KEY]: 'foeBf', [VEN_140_MOVE_KEY]: 'mine' })
    expect(evs.map((e) => e.kind)).toEqual(['damage'])
  })
})
