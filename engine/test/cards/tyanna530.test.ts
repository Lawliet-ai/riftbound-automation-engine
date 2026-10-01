import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind } from '../../data/registry'
import { specLookup } from '../../data/decks'
import {
  SFD_060, SFD_060_KEYWORDS, SFD_060_CARD_EFFECT, UNIT_SCORE_BLOCK_DEFIDS, scoreBlockedAt,
} from '../../data/cards/longtail-12'

                                                       
                                   
                                                          
                                                  
  
                        
                                                     
                                                 
                                        
const P1 = asPlayerId('P1')           
const P2 = asPlayerId('P2')      
const BF0 = 'battlefield:shared:0'
const BF1 = 'battlefield:shared:1'

const mk = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 4, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
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

describe('★ 前提:卡面与接线', () => {
  test('★7费 2绿pip、4 战力,印 [法盾]', () => {
    expect(CARD_COSTS['SFD-060']).toEqual({ mana: 7, pips: 2, colors: ['green'] })
    expect([SFD_060.power, SFD_060.energy]).toEqual([4, 7])
    expect(cardKind('SFD-060')).toBe('unit')
    expect(cardKeywords('SFD-060'), '★② 印刷关键词三处同源').toEqual(['法盾'])
    expect(SFD_060_KEYWORDS).toEqual(['法盾'])
    expect(specLookup('SFD-060').baseKeywords).toEqual(['法盾'])
    expect(UNIT_SCORE_BLOCK_DEFIDS, '★进了【单位级】那条来源的清单').toEqual(['SFD-060'])
  })

  test('★卡文存的是 errata 版(③ errata 非空以它为准)', () => {
    expect(SFD_060_CARD_EFFECT, '★★★勘误那版写的是「获得分数」').toContain('对手无法获得分数')
  })
})

describe('🔴🔴🔴★★★★★★挡的是【对手】,不是所有人', () => {
  const board = () => scene([mk('tyanna', 'SFD-060', P1, BF0)])

  test('🔴★★★★★★对手在【任何一处】都不给分', () => {
    expect(scoreBlockedAt(board(), P2, BF0), '★★★她所在那处').toBe(true)
    expect(scoreBlockedAt(board(), P2, BF1), '★★★★★★别处也一样 —— 这是玩家级不是战场级').toBe(true)
  })

  test('🔴★★★★★★她的控制者【照常得分】(卡文写的是"对手")', () => {
    expect(scoreBlockedAt(board(), P1, BF0)).toBe(false)
    expect(scoreBlockedAt(board(), P1, BF1)).toBe(false)
  })

  test('🔴★★★★★★换她归对手控制 ⇒ 挡的人跟着换(判据认【控制者】不认拥有者)', () => {
    const s0 = board()
    const flipped = { ...s0.objects[asObjId('tyanna')]!, controller: P2 } as GameObject
    const s = { ...s0, objects: { ...s0.objects, tyanna: flipped } } as GameState
    expect(scoreBlockedAt(s, P1, BF0), '★★★现在轮到我被挡').toBe(true)
    expect(scoreBlockedAt(s, P2, BF0), '★★★她的新主人照常得分').toBe(false)
  })
})

describe('🔴🔴🔴★★★★★★「位于【战场上】」—— 基地不算(⑳)', () => {
  test('🔴★★★★★★她在基地里 ⇒ 这条【不生效】', () => {
    const s = scene([mk('tyanna', 'SFD-060', P1, `base:${P1}`)])
    expect(scoreBlockedAt(s, P2, BF0), '★★★退回基地就失效').toBe(false)
  })

  test('🔴★★★★★★她在战场上 vs 在基地:同一个人问,答案相反(分辨证据)', () => {
    const onBf = scene([mk('tyanna', 'SFD-060', P1, BF0)])
    const atBase = scene([mk('tyanna', 'SFD-060', P1, `base:${P1}`)])
    expect([scoreBlockedAt(onBf, P2, BF1), scoreBlockedAt(atBase, P2, BF1)]).toEqual([true, false])
  })

  test('🔴★★★★★她根本不在场 ⇒ 谁都不挡', () => {
    expect(scoreBlockedAt(scene([]), P2, BF0)).toBe(false)
    expect(scoreBlockedAt(scene([mk('other', 'OGN-012', P1, BF0)]), P2, BF0),
      '★★★别的单位不背这条').toBe(false)
  })

  test('🔴★★★★★★场上两个她(一个在场一个在基地)⇒ 只要有一个在战场上就挡', () => {
    const s = scene([
      mk('inBase', 'SFD-060', P1, `base:${P1}`),
      mk('onBf', 'SFD-060', P1, BF1),
    ])
    expect(scoreBlockedAt(s, P2, BF0)).toBe(true)
  })
})

describe('🔴🔴★★★★★★两条来源【互不干扰】(汇总口是一串"或")', () => {
  test('🔴★★★★★★战场卡那条来源【一字未变】—— 没有她时照旧只按那处的战场卡判', () => {
                                            
    const s = scene([mk('plain', 'OGN-012', P1, BF0)])
    expect(scoreBlockedAt(s, P1, BF0)).toBe(false)
    expect(scoreBlockedAt(s, P2, BF0)).toBe(false)
  })

  test('🔴★★★★★★她在场时,连【没有战场卡的那一处】也挡 —— 这正是新来源的分辨点', () => {
    const s = scene([mk('tyanna', 'SFD-060', P1, BF0)])
                                                         
    expect(s.battlefieldCards?.[BF1], '★前提:那一处确实没有战场卡').toBeUndefined()
    expect(scoreBlockedAt(s, P2, BF1)).toBe(true)
  })
})
