import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import type { GameObject } from '../../src/state/object'
import { createInitialState, type GameState } from '../../src/state/gameState'
import { cardCost, cardKind, cardPassives, entryReadyFor } from '../../data/registry'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { CARD_NAMES } from '../../data/cardNames'
import { makeEnterReadyTable } from '../../data/cards/enter-ready'

                              
                                                    
                                                     

setCardPassiveProvider(cardPassives)

const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

function obj(oid: string, defId: string, ctrl = P1, zone = BF0): GameObject {
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(zone),
    baseMight: specLookup(defId)?.baseMight ?? 3, baseKeywords: [], baseTypes: ['unit'],
    damage: 0, counters: {}, status: {},
  }
}
function scene(objs: GameObject[], scores: Record<string, number> = {}): GameState {
  const base = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}
  const zones = { ...base.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]
    if (z) zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...base, activePlayer: P1, phase: 'main', objects, zones,
    scores: { ...base.scores, ...scores } } as GameState
}
const might = (st: GameState, oid: string): number =>
  effectiveMight(recomputeContinuous(st).objects[oid]!).reference

describe('★★德莱文 OGN-028(把你的分数加到我的战力上)', () => {
  test('前提:费用/印刷战力照卡面;再版 VEN-172 不单独登记', () => {
    expect(cardCost('OGN-028')).toEqual({ mana: 5, pips: [['red']] })
    expect(specLookup('OGN-028').baseMight).toBe(3)                
  })

  test('★★分数【现算】:0 分 3[M],3 分 6[M],涨分立刻跟着涨(㉘)', () => {
    expect(might(scene([obj('draven', 'OGN-028')]), 'draven')).toBe(3)
    expect(might(scene([obj('draven', 'OGN-028')], { P1: 3 }), 'draven')).toBe(6)
    expect(might(scene([obj('draven', 'OGN-028')], { P1: 7 }), 'draven')).toBe(10)
  })

  test('★★「你的」= 我的【控制者】的分数,不是对手的', () => {
    const st = scene([obj('draven', 'OGN-028')], { P1: 0, P2: 5 })
    expect(might(st, 'draven')).toBe(3)               
  })

  test('★★夺控后跟着新控制者走', () => {
    const stolen = { ...obj('draven', 'OGN-028'), controller: P2 }
    const st = scene([stolen], { P1: 4, P2: 2 })
    expect(might(st, 'draven')).toBe(5)                               
  })
})

describe('★★暗影刺客 VEN-013(废牌堆有同名卡 → 活跃进场)', () => {
  test('前提:费用/战力,以及卡名表真的查得到', () => {
    expect(cardCost('VEN-013')).toEqual({ mana: 5 })           
    expect(specLookup('VEN-013').baseMight).toBe(5)
    expect(cardKind('VEN-013')).toBe('unit')
    expect(CARD_NAMES['VEN-013']).toBe('暗影刺客')
  })

  test('★★废牌堆里有同名卡 ⇒ 活跃进场;没有 ⇒ 不活跃', () => {
    const withCopy = scene([obj('d0', 'VEN-013', P1, `discard:${P1}`)])
    expect(entryReadyFor(withCopy, P1, 'VEN-013')).toBe(true)
    expect(entryReadyFor(scene([]), P1, 'VEN-013')).toBe(false)
  })

  test('★★「你的」废牌堆:躺在【对手】废牌堆里的同名卡不算', () => {
    const foeCopy = scene([obj('d0', 'VEN-013', P2, `discard:${P2}`)])
    expect(entryReadyFor(foeCopy, P1, 'VEN-013')).toBe(false)             
  })

  test('★★这张卡名表是【承重】的:全卡池里确实存在"同名但 defId 不同"的卡', () => {
                                                          
                                                   
    const byName = new Map<string, string[]>()
    for (const [defId, name] of Object.entries(CARD_NAMES)) {
      byName.set(name, [...(byName.get(name) ?? []), defId])
    }
    const shared = [...byName.entries()].filter(([, ids]) => ids.length > 1)
    expect(shared.length).toBeGreaterThan(0)
                                                      
                                           
    expect(CARD_NAMES['OGS-010']).toBe(CARD_NAMES['OGS-001'])
  })

  test('★★★判据真的按【卡名】比,不是按 defId(直接压机制)', () => {
                                                    
                                              
                                                     
    const fakeNames = (d: string): string => (d === 'OTHER-999' ? '暗影刺客' : (CARD_NAMES[d] ?? d))
    const table = makeEnterReadyTable(() => false, fakeNames)
    const cond = table['VEN-013']!
    expect(cond(scene([obj('d0', 'OTHER-999', P1, `discard:${P1}`)]), P1)).toBe(true)
                         
    expect(cond(scene([obj('d0', 'BLK', P1, `discard:${P1}`)]), P1)).toBe(false)
  })

  test('★★不同名的卡不算(对照组);场上的同名卡也不算(只看废牌堆)', () => {
    expect(entryReadyFor(scene([obj('d0', 'BLK', P1, `discard:${P1}`)]), P1, 'VEN-013')).toBe(false)
    expect(entryReadyFor(scene([obj('f0', 'VEN-013', P1, BF0)]), P1, 'VEN-013')).toBe(false)
  })
})
