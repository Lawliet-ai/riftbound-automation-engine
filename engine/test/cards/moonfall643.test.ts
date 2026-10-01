import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, zonesByKind, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind, playSpecFor } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import {
  UNL_198_SPEC, UNL_198_MOVE_KEY, UNL_198_SKIP, UNL_198_DELTA, moonfallBattlefields,
} from '../../data/cards/UNL-198'

                                                        
                             
                                        
                              
  
           
                                           
                                     
                                                         
                                                   
                                             

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const unit = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
})

                                                            
function scene(): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  const put = (o: GameObject): void => {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  for (const o of [unit('mine', P1, BF0), unit('e1', P2, BF0), unit('far', P2, BF1), unit('eBase', P2, `base:${P2}`)]) put(o)
  return { ...base, activePlayer: P1, phase: 'main', objects, zones } as GameState
}

type Ev = { kind: string, obj?: string, to?: string, effect?: { duration?: string, predicate?: unknown, modification?: { kind?: string, delta?: number } } }
const resolveWith = (s: GameState, target: string, answers: Record<string, string>): readonly Ev[] =>
  UNL_198_SPEC.makeResolve!({ movedCardOid: asObjId('sp'), controller: P1, target } as never)(s, answers) as unknown as readonly Ev[]

describe('★ 前提与候选', () => {
  test('★★★★★3费 1枚蓝紫双色pip、[迅捷] 两份、进表;①战场候选=只有 BF0(BF1 敌占不入)', () => {
    expect(CARD_COSTS['UNL-198']).toEqual({ mana: 3, pips: 1, colors: ['blue', 'purple'] })
    expect(UNL_198_SPEC.cost).toEqual({ mana: 3, pips: [['blue', 'purple']] })
    expect(cardKind('UNL-198')).toBe('spell')
    expect(cardKeywords('UNL-198')).toEqual(['迅捷'])
    expect(playSpecFor('UNL-198')!.keywords).toEqual(['迅捷'])
    expect(moonfallBattlefields(scene(), P1)).toEqual([BF0])
    expect(UNL_198_SPEC.legalTargets!(scene(), P1)).toEqual([BF0])
  })

  test('★★★★②「最多一名敌方」:候选含基地敌方(没有位置词)+ skip 档', () => {
    const q = UNL_198_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target: BF0 } as never)(scene(), {})!
    expect(q.key).toBe(UNL_198_MOVE_KEY)
    expect(q.candidates.map((c) => c.id)).toEqual(['e1', 'eBase', 'far', UNL_198_SKIP])
  })
})

describe('★★★★★★★ 结算:③④⑤', () => {
  test('★★★★★★③把 far(BF1)移进 BF0 ⇒ 移动两条 + far/e1 各吃 -2(**被移那名也吃**,FAQ)', () => {
    const evs = resolveWith(scene(), BF0, { [UNL_198_MOVE_KEY]: 'far' })
    expect(evs.map((e) => e.kind)).toEqual(['zoneChange', 'unitMoved', 'addEffect', 'addEffect'])
    expect(evs[0]).toMatchObject({ kind: 'zoneChange', obj: 'far', to: BF0 })
    const hit = evs.filter((e) => e.kind === 'addEffect')
    expect(hit.every((e) => e.effect!.modification!.delta === UNL_198_DELTA && e.effect!.duration === 'thisTurn')).toBe(true)
  })

  test('★★★★★③选了原本就在该处的 e1 ⇒ 移动零条(同位置兜底)、-2 名单**不重复**(还是 e1 一条)', () => {
    const evs = resolveWith(scene(), BF0, { [UNL_198_MOVE_KEY]: 'e1' })
    expect(evs.map((e) => e.kind), '★白移不发移动事件;e1 只吃一次 -2').toEqual(['addEffect'])
  })

  test('★★★★★⑤skip ⇒ 只 -2 该处现有敌方(e1);④该处友方 mine/别处 far/基地 eBase 都不吃', () => {
    const evs = resolveWith(scene(), BF0, { [UNL_198_MOVE_KEY]: UNL_198_SKIP })
    expect(evs).toHaveLength(1)
    expect(evs[0]!.kind).toBe('addEffect')
  })

  test('★★★★★㊺复验:结算时该处已没有我的单位 ⇒ 整条无视(§355.17)', () => {
    const s = scene()
    const gone = {
      ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k !== 'mine')),
    } as GameState
    expect(resolveWith(gone, BF0, { [UNL_198_MOVE_KEY]: 'far' })).toEqual([])
  })

  test('★★★★该处零敌方且 skip ⇒ 零事件;没敌方时问链不问(移动那问)', () => {
    const s = scene()
    const only = {
      ...s, objects: Object.fromEntries(Object.entries(s.objects).filter(([k]) => k === 'mine')),
    } as GameState
    expect(resolveWith(only, BF0, {})).toEqual([])
    expect(UNL_198_SPEC.makeNextChoice!({ movedCardOid: asObjId('sp'), controller: P1, target: BF0 } as never)(only, {})).toBeNull()
  })
})
