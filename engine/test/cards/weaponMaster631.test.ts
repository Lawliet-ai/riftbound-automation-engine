import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import {
  SFD_193_SPECS, SFD_193_CARD_EFFECT, WM_UNIT_KEY, wmArmaments, wmUnits,
} from '../../data/cards/SFD-193'

                                                                
                                               
                                         
  
               
                                                                
                                                    
                                                             
                                
                                                                 
                                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})
                                                                   
const arm = (oid: string, who: PlayerId, zone: string, onto?: string): GameObject => ({
  oid: asObjId(oid), defId: `G-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], baseTags: ['武装'],
  damage: 0, counters: {}, status: onto === undefined ? {} : { attachedTo: asObjId(onto) },
})

   
             
                                                 
                            
                                                           
   
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const bfs = zonesByKind(base, 'battlefield').map((z) => z.id as string)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  put(unit('u1', P1, `base:${P1}`))
  put(unit('u2', P1, bfs[0]!))
  put(unit('foe', P2, bfs[1]!))
  put(arm('gFree', P1, `base:${P1}`))
  put(arm('gOn', P1, `base:${P1}`, 'u1'))
  put(arm('gFoe', P2, `base:${P2}`))
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

const SPEC_EQUIP = SFD_193_SPECS[0]!                      
const SPEC_REATTACH = SFD_193_SPECS[1]!                

const resolveWith = (
  spec: typeof SPEC_EQUIP, s: GameState, target: string, answers: Record<string, string>,
): readonly GameEvent0[] =>
  spec.makeResolve({ selfOid: 'wm', controller: P1, target })(s, answers) as readonly GameEvent0[]
type GameEvent0 = { kind: string, obj?: string, to?: string, player?: string }

describe('★ 前提:传奇 / 上游费用 / 双印次折叠 / 卡文', () => {
  test('★★★★★上游:两个号都是 legend、0 费 0 pip、绿+橙;variantAliases 同组', () => {
    expect(cardKind('SFD-193')).toBe('legend')
    expect(cardKind('SFD-245')).toBe('legend')
    expect(CARD_COSTS['SFD-193']).toEqual({ mana: 0, pips: 0, colors: ['green', 'orange'] })
    expect(CARD_COSTS['SFD-245']).toEqual({ mana: 0, pips: 0, colors: ['green', 'orange'] })
    expect(VARIANT_GROUPS['SFD-193'], '★609 先例:同组两个号').toEqual(['SFD-193', 'SFD-245'])
  })

  test('★★★★★★接线:activatedFor 两个号都拿到同两条技能(SFD-245 折叠过来)', () => {
    expect(activatedFor('SFD-193')).toEqual(SFD_193_SPECS)
    expect(activatedFor('SFD-245'), '★双印次自证:另一个号也要查得到').toEqual(SFD_193_SPECS)
    expect(SFD_193_SPECS, '★就两条').toHaveLength(2)
  })

  test('★★★★★★①费用差:第一条 mana1+横置,第二条只横置(§204.1.b 冒号前即费用)', () => {
    expect(SPEC_EQUIP.cost).toEqual({ mana: 1 })
    expect(SPEC_EQUIP.tapSelf).toBe(true)
    expect(SPEC_REATTACH.cost, '★第二条冒号前没有资源符号').toEqual({})
    expect(SPEC_REATTACH.tapSelf).toBe(true)
  })

  test('★★★★卡文限定语在(两句、未贴附/已贴附各一)', () => {
    expect(SFD_193_CARD_EFFECT).toContain('未贴附的武装')
    expect(SFD_193_CARD_EFFECT).toContain('已贴附的武装')
  })
})

describe('★★★★★★★ 候选:两档武装 + 单位(都限「你控制的」)', () => {
  test('★★★★★★②选件差:未贴附档只见 gFree,已贴附档只见 gOn;敌方 gFoe 都不见', () => {
    const s = scene()
    expect(wmArmaments(s, P1, false), '★未贴附档').toEqual(['gFree'])
    expect(wmArmaments(s, P1, true), '★已贴附档').toEqual(['gOn'])
  })

  test('★★★★★★④单位候选=我控制的 u1+u2(含基地;没有位置词),敌方 foe 不在', () => {
    expect(wmUnits(scene(), P1)).toEqual(['u1', 'u2'])
  })

  test('★★★★★★legalTargets 走对应档;⑥没有可贴的单位 ⇒ 空(§355.1 目标组合要齐)', () => {
    const s = scene()
    expect(SPEC_EQUIP.legalTargets!(s, P1, 'wm')).toEqual(['gFree'])
    expect(SPEC_REATTACH.legalTargets!(s, P1, 'wm')).toEqual(['gOn'])
                          
    const noUnits = {
      ...s,
      objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'u1' && k !== 'u2')),
    } as GameState
    expect(SPEC_EQUIP.legalTargets!(noUnits, P1, 'wm'), '★白横置换空结算是坑').toEqual([])
  })

  test('★★★★问链:问一次单位;答过就不再问;候选**不排除**已贴着它的那名(Q1 前半)', () => {
    const s = scene()
    const next = SPEC_REATTACH.makeNextChoice!({ selfOid: 'wm', controller: P1, target: 'gOn' })
    const q = next(s, {})!
    expect(q.key).toBe(WM_UNIT_KEY)
    expect(q.candidates.map((c) => c.id), '★u1(它已经贴着的)也在候选里').toEqual(['u1', 'u2'])
    expect(next(s, { [WM_UNIT_KEY]: 'u2' }), '★答过 ⇒ 不再问').toBeNull()
  })
})

describe('★★★★★★★ 结算:发一条 attach(带 player);Q1/Q2;㊺ 复验', () => {
  test('★★★★★★真结算:未贴附档 gFree→u2,一条 attach、player 必带(★619/621)', () => {
    const evs = resolveWith(SPEC_EQUIP, scene(), 'gFree', { [WM_UNIT_KEY]: 'u2' })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'attach', obj: 'gFree', to: 'u2', player: P1 })
  })

  test('★★★★★★已贴附档换宿主:gOn(在 u1)→u2,照发 attach', () => {
    const evs = resolveWith(SPEC_REATTACH, scene(), 'gOn', { [WM_UNIT_KEY]: 'u2' })
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'attach', obj: 'gOn', to: 'u2', player: P1 })
  })

  test('★★★★★★★③QA L272 Q2:原地重贴(gOn→它已贴着的 u1)⇒ **零事件**(不触发无情攻势)', () => {
                           
    const s = scene()
    expect((s.objects['gOn' as never] as GameObject).status.attachedTo).toBe('u1')
    expect(resolveWith(SPEC_REATTACH, s, 'gOn', { [WM_UNIT_KEY]: 'u1' }),
      '★Q1 的「无任何效果」+ Q2 的「不触发」都落在这:一条事件都不发').toEqual([])
  })

  test('★★★★★㊺复验:结算时武装已换档(gFree 被别的效果贴上了)⇒ 无视', () => {
    const s = scene()
    const g = s.objects['gFree' as never] as GameObject
    const moved = {
      ...s,
      objects: { ...s.objects, gFree: { ...g, status: { ...g.status, attachedTo: asObjId('u1') } } },
    } as GameState
    expect(resolveWith(SPEC_EQUIP, moved, 'gFree', { [WM_UNIT_KEY]: 'u2' }),
      '★选定时未贴附、结算时已贴附 ⇒ 目标不再合法(§355.17)').toEqual([])
  })

  test('★★★★★㊺复验:结算时单位已离场 ⇒ 无视;没答单位 ⇒ 无视', () => {
    const s = scene()
    const gone = {
      ...s,
      objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'u2')),
    } as GameState
    expect(resolveWith(SPEC_EQUIP, gone, 'gFree', { [WM_UNIT_KEY]: 'u2' })).toEqual([])
    expect(resolveWith(SPEC_EQUIP, s, 'gFree', {})).toEqual([])
  })
})
