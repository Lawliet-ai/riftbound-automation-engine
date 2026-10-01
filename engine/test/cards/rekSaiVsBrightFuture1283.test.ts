import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import {
  unitDestinations, banishPlayCost, freeManaCost, printedCost, SFD_170_SHAPE,
} from '../../data/cards/play-from-deck'
import { OGN_115_SHAPE } from '../../data/cards/OGN-115'

                                                        
  
                                                                         
                                                          
  
                                                    
                                                                 
                                                        
                                                                              
                                                          
                                                     
                                                              
  
                       
                                                                          
                                                      
                                                                  
                                                                       

const P1 = asPlayerId('P1'); const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'
const BASE = `base:${P1}`
const obj = (oid: string, defId: string, who: PlayerId, zone: string): GameObject => ({
  oid: asObjId(oid), defId, owner: who, controller: who, zone: asZoneId(zone),
  baseMight: 3, baseKeywords: [], baseTypes: ['unit'], damage: 0, counters: {}, status: {},
} as GameObject)
function scene(objs: readonly GameObject[]): GameState {
  const b = createInitialState([P1, P2], 2)
  const objects: Record<string, GameObject> = {}; const zones = { ...b.zones }
  for (const o of objs) {
    objects[o.oid] = o
    const z = zones[o.zone]; if (!z) throw new Error(`★造景区不存在:${o.zone}`)
    zones[o.zone] = { ...z, contents: [...z.contents, o.oid] }
  }
  return { ...b, activePlayer: P1, priority: null, phase: 'main', objects, zones } as GameState
}
                                                
const CARD = 'OGN-011'

describe('★1283 雷克塞 SFD-170 × 光明未来 OGN-115:同一个共用件,措辞不同走不同档', () => {
  test('★前提:两张 shape 的两个开关恰好互补(这就是单变量的来源)', () => {
    expect(SFD_170_SHAPE.hereFromSelf, "★雷克塞「可以选择将其打出到此处」⇒ 额外授权此处").toBe(true)
    expect(OGN_115_SHAPE.hereFromSelf, '★光明未来卡文没提落点 ⇒ 不授权').toBeUndefined()
    expect(SFD_170_SHAPE.freeMana, '★雷克塞 errata 没写「无视费用」⇒ 付全款').toBeUndefined()
    expect(OGN_115_SHAPE.freeMana, '★光明未来「无视其法力费用」⇒ 半免档').toBe(true)
  })

  test('★★★① 落点【单变量】:BF0 不是我控的战场 ⇒ 候选里出现 BF0 只可能是 hereFromSelf 授权的', () => {
                                                   
                                                                 
    const s = scene([obj('foe', 'OGN-011', P2, BF0)])
    expect([...unitDestinations(s, P1, undefined, CARD)],
      '★前提:不授权时候选只有基地(BF0 是对手控的)').toEqual([BASE])
    expect([...unitDestinations(s, P1, BF0, CARD)],
      '★★★授权「此处」⇒ BF0 【加进】候选(是多一个选项,不是钉死 —— 基地仍在里面)').toEqual([BASE, BF0])
  })

  test('★★★② 与艾娃的一字之差:雷克塞多一个候选、基地【仍在】;艾娃那句是钉死(★1282 已 E2E)', () => {
    const s = scene([obj('foe', 'OGN-011', P2, BF0)])
                                                                                             
                                                                       
                                                                   
    const withHere = [...unitDestinations(s, P1, BF0, CARD)].map(String)
    expect(withHere.includes(BASE),
      '★★★「可以选择将其打出到此处」⇒ 基地必须仍是可选项;若把基地挤掉就成了艾娃那种「钉死」,那是另一档措辞').toBe(true)
    expect(withHere.length, '★恰好两个:缺省的基地 + 授权来的此处').toBe(2)
  })

  test('★★★③ 钱的两档:全款 vs 半免(法力归 0、pip 原样)', () => {
    const printed = printedCost(CARD)
    expect(printed.mana, `★前提:${CARD} 的印刷法力费 > 0,否则「归零」测不出差别`).toBeGreaterThan(0)
    expect(banishPlayCost(CARD, 0), '★★雷克塞:付全款 = 印刷价一分不少').toEqual(printed)
    const half = freeManaCost(CARD)
    expect(half.mana, '★★★光明未来:法力归 0').toBe(0)
    expect(half.pips, '★★★但 pip【原样】—— 卡文括号里那句「仍需支付所有符能费用」就是这一格;半免 ≠ 全免').toEqual(printed.pips)
  })
})
