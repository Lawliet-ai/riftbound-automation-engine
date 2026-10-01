import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardKind, cardKeywords } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { VEN_189_SPEC, VEN_189_CARD_EFFECT, duelingFriendlies } from '../../data/cards/VEN-189'

                                                           
                                                   
                                
  
           
                                                         
                                                              
                            
                                                      
                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const unit = (oid: string, who: PlayerId, zone: string, dormant = false): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {},
  status: dormant ? { dormant: true } : {},
} as GameObject)
const legend = (emp: number): GameObject => ({
  oid: asObjId('thorn'), defId: 'VEN-189', owner: P1, controller: P1, zone: asZoneId(`legend:${P1}`),
  baseMight: 0, baseKeywords: [], baseTypes: ['legend'], damage: 0,
  counters: emp > 0 ? { empower: emp } : {}, status: {},
} as GameObject)

                                                              
function scene(opts: { emp?: number, duelAt?: string | null, active?: PlayerId } = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('mine', P1, BF0, true))
  put(unit('far', P1, BF1))
  put(unit('foe', P2, BF0))
  put(legend(opts.emp ?? 0))
  const duelAt = opts.duelAt === undefined ? BF0 : opts.duelAt
  return {
    ...base, activePlayer: opts.active ?? P1, phase: 'main', objects, zones,
    ...(duelAt === null ? {} : { spellDuelActive: true, duelBattlefield: asZoneId(duelAt) }),
  } as GameState
}

type Ev = { kind: string, obj?: string, to?: string, target?: string, key?: string, value?: boolean }
const resolveWith = (s: GameState, target: string): readonly Ev[] =>
  VEN_189_SPEC.makeResolve({ selfOid: 'thorn', controller: P1, target })(s) as readonly Ev[]

describe('★ 前提:传奇 / 双印次 / 两份 keywords / 接线', () => {
  test('★★★★★上游:两个号都是 legend、红+绿 0费;variantAliases 同组;卡文限定语在', () => {
    expect(cardKind('VEN-189')).toBe('legend')
    expect(cardKind('VEN-139')).toBe('legend')
    expect(CARD_COSTS['VEN-189']).toEqual({ mana: 0, pips: 0, colors: ['red', 'green'] })
    expect(VARIANT_GROUPS['VEN-189']).toEqual(['VEN-139', 'VEN-189'])
    expect(VEN_189_CARD_EFFECT).toContain('处于法术对决中的友方单位')
  })

  test('★★★★★★①两份 keywords 各管各的(★636 k4):印刷=[强化3A]、spec=[迅捷];接线 3 条', () => {
    expect(cardKeywords('VEN-189'), '★印刷表:纯资源费强化交工厂').toEqual(['强化3A'])
    expect(VEN_189_SPEC.keywords, '★spec:§806 时机权限').toEqual(['迅捷'])
    expect(VEN_189_SPEC.tapSelf).toBe(true)
    expect(VEN_189_SPEC.cost).toEqual({})
    const sig = (xs: readonly { key: string }[]): string[] => xs.map((x) => x.key)
    const specs = activatedFor('VEN-189')
    expect(sig(specs as never), '★手写一条 + 工厂强化一条').toEqual(['VEN-189:extract', 'empower:0'])
    expect(sig(activatedFor('VEN-139') as never), '★双印次折叠').toEqual(sig(specs as never))
  })
})

describe('★★★★★★★ 候选:②对决收口 + ③你的回合 + 敌我筛', () => {
  test('★★★★★★②只有【对决那处】的友方入候选:far(别处)/foe(敌方)都不入', () => {
    expect(duelingFriendlies(scene(), P1)).toEqual(['mine'])
  })

  test('★★★★★★②没开对决(duelBattlefield undefined)⇒ 空;③非你回合 ⇒ 空', () => {
    expect(duelingFriendlies(scene({ duelAt: null }), P1), '★没对决 ⇒ o.zone 永不等于 undefined').toEqual([])
    expect(duelingFriendlies(scene({ active: P2 }), P1), '★对手回合 ⇒ 枚举不列(免白横置)').toEqual([])
    expect(VEN_189_SPEC.legalTargets!(scene(), P1, 'thorn')).toEqual(['mine'])
  })
})

describe('★★★★★★★ 结算:④已强化=追加;⑤落点写死基地;㊺复验', () => {
  test('★★★★★★④未强化(emp=0):只移动(zoneChange+unitMoved 到我的基地),**不**解除休眠', () => {
    const evs = resolveWith(scene({ emp: 0 }), 'mine')
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'mine', to: `base:${P1}` })
  })

  test('★★★★★★④已强化(emp=1):移动 + 解除休眠(「且如果」= 追加,不是替换)', () => {
    const evs = resolveWith(scene({ emp: 1 }), 'mine')
    expect(evs.map((e) => e.kind), '★移动照做 + 外加活跃').toEqual(['zoneChange', 'unitMoved', 'statusChange'])
    expect(evs[2]).toMatchObject({ kind: 'statusChange', target: 'mine', key: 'dormant', value: false })
  })

  test('★★★★★㊺复验:结算时回合已换 ⇒ 零事件;目标已不在对决处 ⇒ 零事件', () => {
    expect(resolveWith(scene({ active: P2 }), 'mine'), '★反应窗口里回合换了').toEqual([])
    const s = scene()
    const moved = {
      ...s, objects: { ...s.objects, mine: { ...(s.objects['mine' as never] as GameObject), zone: asZoneId(BF1) } },
    } as GameState
    expect(resolveWith(moved, 'mine'), '★它已经不在对决那处了').toEqual([])
  })
})
