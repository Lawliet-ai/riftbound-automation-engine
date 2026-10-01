import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { GameEvent } from '../../src/loop/events'
import { checkTrigger } from '../../src/dsl/trigger'
import { activeTriggers, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { makeJhinMoveTrigger, UNL_022_GAIN_MANA } from '../../data/cards/UNL-022'

                                                                
                                        
                                              
  
           
                                                                 
                                                  
                                
                                                                   
                                     

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'UNL-022', owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)

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

const trig = makeJhinMoveTrigger(asObjId('jh'), P1)
const moved = (unit: string, by: PlayerId = P1): GameEvent =>
  ({ kind: 'unitMoved', unit: asObjId(unit), player: by, from: asZoneId(BF0), to: asZoneId(BF1) } as unknown as GameEvent)

describe('★ 前提:①登记', () => {
  test('★★★★★4费 1红pip、[法盾][游走] 两号都登、UNIT_COST 带 pip、TRIGGERS 接线、两号一组', () => {
    expect(CARD_COSTS['UNL-022']).toEqual({ mana: 4, pips: 1, colors: ['red'] })
    expect(cardKind('UNL-022')).toBe('unit')
    expect(VARIANT_GROUPS['UNL-022']).toEqual(['UNL-022', 'UNL-022a'])
    expect(cardKeywords('UNL-022'), '★引擎统一管两词都要登').toEqual(['法盾', '游走'])
    expect(cardKeywords('UNL-022a'), '★异画号同登').toEqual(['法盾', '游走'])
    expect(cardCost('UNL-022'), '★带 1 红 pip(㊶ 别当没有)').toEqual({ mana: 4, pips: [['red']] })
    const ids = activeTriggers(scene([obj('jh', P1, BF0)])).map((t) => t.id)
    expect(ids.some((i) => i.startsWith('UNL-022:moved')), '★TRIGGERS 表接线').toBe(true)
  })
})

describe('★★★★★★★ ②触发+③效果', () => {
  test('★★★★★★②我移动响(对手移我 by P2 也响);别的单位移动不响', () => {
    const s = scene([obj('jh', P1, BF1), obj('ally', P1, BF1)])
    expect(checkTrigger(trig, moved('jh'), s, P1)).toBe(true)
    expect(checkTrigger(trig, moved('jh', P2), s, P2), '★卡文没写「你」⇒ 谁移的都算').toBe(true)
    expect(checkTrigger(trig, moved('ally'), s, P1), '★队友移动 ⇒ 不响').toBe(false)
  })

  test('★★★★★★③一条 gainResource{mana:1, energy:{*:1}}(§429 入符文池;{A}=任意特性)', () => {
    const s = scene([obj('jh', P1, BF1)])
    const evs = trig.effect(s, moved('jh'), {}) as unknown as readonly { kind: string, player?: string, mana?: number, energy?: Record<string, number>, experience?: number }[]
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ kind: 'gainResource', player: P1, mana: UNL_022_GAIN_MANA })
    expect(UNL_022_GAIN_MANA, '★「{1}」').toBe(1)
    expect(evs[0]!.energy, '★「{A}」= 一点任意特性符能(*档)').toEqual({ '*': 1 })
    expect(evs[0]!.experience, '★是符文池资源不是经验').toBeUndefined()
  })
})
