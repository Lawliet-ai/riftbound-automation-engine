import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { cardKeywords, cardKind } from '../../data/registry'
import { CARD_COSTS } from '../../data/cardCosts'
import { PUMP_SPELLS, countFriendliesAt, pumpCandidates } from '../../data/cards/pump-spells'

                                                              
                                             
                        
  
           
                                              
                                                
                                                           
                                                         

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

const obj = (oid: string, who: PlayerId, zone: string, types: readonly string[] = ['unit']): GameObject => ({
  oid: asObjId(oid), defId: `U-${oid}`, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: [...types], damage: 0, counters: {}, status: {},
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

const ROW = PUMP_SPELLS.find((r) => r.defId === 'OGN-046')!

describe('★ 前提:①表行/登记', () => {
  test('★★★★★1费 0pip 绿、[反应]、friendlyUnit 档、deltaOf 在;候选含基地友方、不含敌方', () => {
    expect(CARD_COSTS['OGN-046']).toEqual({ mana: 1, pips: 0, colors: ['green'] })
    expect(cardKind('OGN-046')).toBe('spell')
    expect(cardKeywords('OGN-046')).toEqual(['反应'])
    expect(ROW.targets).toBe('friendlyUnit')
    expect(ROW.deltaOf).toBeDefined()
    expect(ROW.cost).toEqual({ mana: 1 })
    const s = scene([obj('mine', P1, BF0), obj('atBase', P1, `base:${P1}`), obj('foe', P2, BF0)])
    expect(pumpCandidates(ROW, s, P1).sort(), '★「一名友方单位」无位置词含基地;敌方不在').toEqual(['atBase', 'mine'])
  })
})

describe('★★★★★★★ ②③「唯一控制」数口与 deltaOf 两档', () => {
  test('★★★★★★③独自在场 ⇒ 2;同处有同伴 ⇒ 1(数口含目标自己)', () => {
    const alone = scene([obj('a', P1, BF0), obj('foe', P2, BF0)])
    expect(countFriendliesAt(alone, P1, 'a'), '★敌方不算进「你控制的」').toBe(1)
    expect(ROW.deltaOf!(alone, P1, 'a'), '★唯一 ⇒ 1+1=2').toBe(2)
    const pair = scene([obj('a', P1, BF0), obj('b', P1, BF0)])
    expect(ROW.deltaOf!(pair, P1, 'a'), '★同处有同伴 ⇒ 只 +1').toBe(1)
  })

  test('★★★★★★②装备不算;**别处**的同伴不算(「该处」= 目标所在 zone)', () => {
    const s = scene([obj('a', P1, BF0), obj('gear', P1, BF0, ['equipment']), obj('far', P1, `base:${P1}`)])
    expect(countFriendliesAt(s, P1, 'a'), '★同处装备/别处单位都不算').toBe(1)
    expect(ROW.deltaOf!(s, P1, 'a')).toBe(2)
  })

  test('★★★★★③基地也按所在 zone 数(卡文没限战场):基地独守 ⇒ 2、基地有伴 ⇒ 1', () => {
    const aloneBase = scene([obj('a', P1, `base:${P1}`)])
    expect(ROW.deltaOf!(aloneBase, P1, 'a')).toBe(2)
    const pairBase = scene([obj('a', P1, `base:${P1}`), obj('b', P1, `base:${P1}`)])
    expect(ROW.deltaOf!(pairBase, P1, 'a')).toBe(1)
  })
})
