import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ChainItem } from '../../src/loop/chain'
import { targetsOf } from '../../src/loop/chainTargets'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  makeUNL106Spec, repelNegatable, repelUnits, UNL_106_ITEM_KEY, UNL_106_CARD_EFFECT,
} from '../../data/cards/UNL-106'

                                                                  
                                               
                    
  
           
                                                                      
                                                       
                                                             
                                                  
                         
                                              
                                                      

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})
const gearObj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `G-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 0, baseKeywords: [], baseTypes: ['equipment'], damage: 0, counters: {}, status: {},
} as GameObject)

const item = (id: string, ctrl: PlayerId, kind: ChainItem['kind'], targets: readonly string[]): ChainItem => ({
  id, controller: ctrl, kind, targets, status: 'pending', resolve: () => [],
} as unknown as ChainItem)

                                                                       
function scene(chain: readonly ChainItem[]): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of [unit('mine', P1, BF0), unit('ally', P1, BF0), unit('home', P1, `base:${P1}`),
    unit('foe', P2, BF0), gearObj('gMine', P1, BF0)]) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones, chain: [...chain] } as GameState
}

const SPEC = makeUNL106Spec(targetsOf)
const negatable = (s: GameState, u: string): string[] => repelNegatable(s, P1, u, targetsOf)

describe('★ 前提:上游费用 / 两份 keywords / 进表 / 卡文勘误版', () => {
  test('★★★★★1费1橙pip、[反应] 两份都在、进 PLAY_SPECS;卡文是勘误后的「不以其他友方单位」版', () => {
    expect(CARD_COSTS['UNL-106']).toEqual({ mana: 1, pips: 1, colors: ['orange'] })
    expect(cardKind('UNL-106')).toBe('spell')
    expect(cardKeywords('UNL-106')).toEqual(['反应'])
    expect(playSpecFor('UNL-106')!.keywords).toEqual(['反应'])
    expect(playSpecFor('UNL-106')!.cost).toEqual({ mana: 1, pips: [['orange']] })
    expect(UNL_106_CARD_EFFECT, '★勘误版判据(旧版「只以该单位为目标」已废)').toContain('且不以其他友方单位为目标')
  })
})

describe('★★★★★★★ ①判据四半 + ②Q1/Q2 现算', () => {
  test('★★★★★★Q1:敌方法术只以 mine 为目标 ⇒ 可无效化;友方的同款 ⇒ 不可(敌我)', () => {
    const s = scene([item('i1', P2, 'spell', ['mine']), item('i2', P1, 'spell', ['mine'])])
    expect(negatable(s, 'mine')).toEqual(['i1'])
  })

  test('★★★★★★「或技能」:ability/triggered 也收(不止 spell);unit 类链项不收', () => {
    const s = scene([
      item('a', P2, 'ability', ['mine']), item('t', P2, 'triggered', ['mine']),
      item('u', P2, 'unit', ['mine']),
    ])
    expect(negatable(s, 'mine')).toEqual(['a', 't'])
  })

  test('★★★★★★①「不以其他友方单位为目标」:多我方单位 ⇒ 不可;友方装备/敌方单位在目标里**不碍事**', () => {
    const s = scene([
      item('two', P2, 'spell', ['mine', 'ally']), // ⇒ 不可(Q2 勘误前提)
      item('withGear', P2, 'spell', ['mine', 'gMine']), // 友方**装备** ⇒ 逐字不排
      item('withFoe', P2, 'spell', ['mine', 'foe']), // **敌方**单位 ⇒ 逐字不排
    ])
    expect(negatable(s, 'mine')).toEqual(['withGear', 'withFoe'])
  })

  test('★★★★★★②Q2 现算:targets 从 2 名友方变 1 名后 ⇒ 同一项目从不可变可(resolve 同口)', () => {
    const before = scene([item('x', P2, 'spell', ['mine', 'ally'])])
    expect(negatable(before, 'mine')).toEqual([])
    const after = scene([item('x', P2, 'spell', ['mine'])])                  
    expect(negatable(after, 'mine')).toEqual(['x'])
  })

  test('★★★★③「战场上的」友方单位:home(基地)不入;④组合要齐:无可无效化项目的单位不入', () => {
    const s = scene([item('i1', P2, 'spell', ['mine'])])
    expect(repelUnits(s, P1), '★基地里的 home 不在').toEqual(['ally', 'mine'])
    expect(SPEC.legalTargets!(s, P1), '★ally 没有指着它的项目 ⇒ 不入(§355.1)').toEqual(['mine'])
  })
})

describe('★★★★★★★ 问链与结算', () => {
  test('★★★★问「无效化哪一个」;⑤resolve 发一条 negate(无 returnToHand)', () => {
    const s = scene([item('i1', P2, 'spell', ['mine']), item('i2', P2, 'ability', ['mine'])])
    const q = SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(s, {})!
    expect(q.key).toBe(UNL_106_ITEM_KEY)
    expect(q.candidates.map((c) => c.id)).toEqual(['i1', 'i2'])
    const evs = SPEC.makeResolve({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(s, { [UNL_106_ITEM_KEY]: 'i1' }) as unknown as readonly Record<string, unknown>[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'negate', target: 'i1' })
    expect(evs[0]!['returnToHand'], '★§425 缺省进废牌堆').toBeUndefined()
  })

  test('★★★★★㊺Q2 反向:结算时那项目**新增**了第二名友方目标 ⇒ 零事件;已离链 ⇒ 零事件', () => {
    const grew = scene([item('i1', P2, 'spell', ['mine', 'ally'])])
    expect(SPEC.makeResolve({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(grew, { [UNL_106_ITEM_KEY]: 'i1' })).toEqual([])
    const gone = scene([])
    expect(SPEC.makeResolve({ movedCardOid: asObjId('sp'), controller: P1, target: 'mine' } as never)(gone, { [UNL_106_ITEM_KEY]: 'i1' })).toEqual([])
  })
})
