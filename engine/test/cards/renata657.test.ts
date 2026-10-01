import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { activatedFor, cardCost, cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { SFD_088_SPECS } from '../../data/cards/SFD-088'

                                                                    
                                                 
                                                 
                          
  
           
                                                      
                                                                   
                                                                  
                                                              

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId: 'SFD-088', owner: who, controller: who, zone: asZoneId(zone),
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

const DRAW = SFD_088_SPECS[0]!
const SCORE = SFD_088_SPECS[1]!

describe('★ 前提:①登记/②两条 spec 形状', () => {
  test('★★★★★英雄单位 5费 0pip 蓝 4[S]、两号 keywords、ACTIVATED 正典两条折叠断言', () => {
    expect(CARD_COSTS['SFD-088']).toEqual({ mana: 5, pips: 0, colors: ['blue'] })
    expect(cardKind('SFD-088')).toBe('unit')
    expect(VARIANT_GROUPS['SFD-088']).toEqual(['SFD-088', 'SFD-088a'])
    expect(cardKeywords('SFD-088')).toEqual([])
    expect(cardKeywords('SFD-088a'), '★异画号同登').toEqual([])
    expect(cardCost('SFD-088')).toEqual({ mana: 5 })
    const specs = activatedFor('SFD-088')
    expect(specs.map((s) => s.key)).toEqual(['SFD-088:draw', 'SFD-088:score'])
    expect(specs[0]!.cost, '★②技① {1}+一枚蓝').toEqual({ mana: 1, pips: [['blue']] })
    expect(specs[0]!.tapSelf, '★②技① **不横置**').toBeUndefined()
    expect(specs[1]!.cost, '★②技② {4}+**四枚蓝逐枚数**(㊶)').toEqual({ mana: 4, pips: [['blue'], ['blue'], ['blue'], ['blue']] })
    expect(specs[1]!.tapSelf, '★②技② 要横置').toBe(true)
  })
})

describe('★★★★★★★ ③§721 available:只有在战场才可用', () => {
  test('★★★★★★战场 ⇒ 两条都可用;基地 ⇒ 都不可用;离场 ⇒ 不可用', () => {
    const atBF = scene([obj('rn', P1, BF0)])
    expect(DRAW.available!(atBF, P1, 'rn')).toBe(true)
    expect(SCORE.available!(atBF, P1, 'rn')).toBe(true)
    const atBase = scene([obj('rn', P1, `base:${P1}`)])
    expect(DRAW.available!(atBase, P1, 'rn'), '★「只有我位于战场时」⇒ 基地不行').toBe(false)
    expect(SCORE.available!(atBase, P1, 'rn')).toBe(false)
    expect(DRAW.available!(scene([]), P1, 'rn'), '★离场 ⇒ 不可用').toBe(false)
  })
})

describe('★★★★★★★ ④效果', () => {
  test('★★★★★★技① draw 1;技② gainPoint amount 1(额外分,㊼ VEN-067 同事件)', () => {
    const s = scene([obj('rn', P1, BF0)])
    expect(DRAW.makeResolve({ selfOid: asObjId('rn'), controller: P1 } as never)(s, {} as never, undefined as never))
      .toEqual([{ kind: 'draw', player: P1, count: 1 }])
    expect(SCORE.makeResolve({ selfOid: asObjId('rn'), controller: P1 } as never)(s, {} as never, undefined as never))
      .toEqual([{ kind: 'gainPoint', player: P1, amount: 1 }])
  })
})
