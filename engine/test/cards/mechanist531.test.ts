import { describe, expect, test } from 'vitest'
import { asObjId, asPlayerId, asZoneId, type PlayerId } from '../../src/state/ids'
import { createInitialState, type GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardKeywords, cardKind, cardPassives } from '../../data/registry'
import { specLookup } from '../../data/decks'
import { recomputeContinuous } from '../../src/effects/continuousView'
import { effectiveMight } from '../../src/state/might'
import { setCardPassiveProvider } from '../../src/effects/cardPassives'
import { armamentsOn, isGeared, isArmament } from '../../src/keywords/equip'
import { armamentCountOn } from '../../data/cards/longtail-1'
import {
  SFD_068, SFD_068_KEYWORDS, COUNT_SCALED_DEFIDS,
} from '../../data/cards/count-scaled-passives'

                                                                               
                                      
  
                                                           
                                                                                   
                                                   
                                                                        
  
                        
                                                       
                                                   
                                       
const P1 = asPlayerId('P1')
const P2 = asPlayerId('P2')
const BF0 = 'battlefield:shared:0'

                                                
const ARM2 = 'SFD-022'      
const ARM3 = 'SFD-056'      
const ARM0 = 'SFD-009'                       

function card(oid: string, defId: string, ctrl: PlayerId, extra: Partial<GameObject> = {}): GameObject {
  const s = specLookup(defId) as unknown as {
    baseMight: number; baseKeywords: readonly string[]
    baseTypes?: readonly string[]; baseTags?: readonly string[]; basePowerBonus?: number
  }
  return {
    oid: asObjId(oid), defId, owner: ctrl, controller: ctrl, zone: asZoneId(BF0),
    baseMight: s.baseMight, baseKeywords: s.baseKeywords,
    ...(s.baseTypes ? { baseTypes: s.baseTypes } : {}),
    ...(s.baseTags ? { baseTags: s.baseTags } : {}),
    ...(s.basePowerBonus !== undefined ? { basePowerBonus: s.basePowerBonus } : {}),
    damage: 0, counters: {}, status: {}, ...extra,
  } as unknown as GameObject
}
                                                           
const stuckOn = (host: string): Partial<GameObject> =>
  ({ status: { attachedTo: asObjId(host) } } as unknown as Partial<GameObject>)

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

                                                          
function mightOf(s: GameState, oid: string): number {
  setCardPassiveProvider(cardPassives)
  return effectiveMight(recomputeContinuous(s).objects[asObjId(oid)]!).actual
}

describe('★ 前提:卡面与接线', () => {
  test('★5费 0pip 蓝、3 战力,印 [急速],进本族清单', () => {
    expect(CARD_COSTS['SFD-068']).toEqual({ mana: 5, pips: 0, colors: ['blue'] })
    expect([SFD_068.power, SFD_068.energy]).toEqual([3, 5])
    expect(cardKind('SFD-068')).toBe('unit')
    expect(cardKeywords('SFD-068'), '★② 印刷关键词三处同源').toEqual(['急速'])
    expect(SFD_068_KEYWORDS).toEqual(['急速'])
    expect(specLookup('SFD-068').baseKeywords).toEqual(['急速'])
    expect(COUNT_SCALED_DEFIDS).toContain('SFD-068')
  })

  test('★前提:样本武装真的带[武装]标签与印刷加成(⑱ 样本那一维先现场量)', () => {
    const s = scene([card('m', 'SFD-068', P1), card('g2', ARM2, P1, stuckOn('m'))])
    const g = s.objects[asObjId('g2')]!
    expect(isArmament(g), `${ARM2} 带[武装]标签`).toBe(true)
    expect(g.basePowerBonus, '§137.1 印刷加成 +2').toBe(2)
  })
})

describe('🔴🔴🔴★★★★★★「双倍」= 在原本那一份之上【再加一份】', () => {
  test('🔴★★★★★★一件 +2 武装:3 + 2(原份) + 2(双倍份) = 7', () => {
    const s = scene([card('m', 'SFD-068', P1), card('g2', ARM2, P1, stuckOn('m'))])
    expect(mightOf(s, 'm')).toBe(7)
  })

  test('🔴★★★★★★对照:同一件武装贴在【别的单位】身上只 +2(多出来的那份确实来自本张)', () => {
                                                     
    const plain = {
      ...card('p', 'SFD-068', P1), defId: 'BLK', baseKeywords: [] as readonly string[],
    } as unknown as GameObject
    const s = scene([plain, card('g2', ARM2, P1, stuckOn('p'))])
    expect(mightOf(s, 'p'), '★★★3 + 2,没有第二份').toBe(5)
  })

  test('🔴🔴★★★★★★它是【加成翻倍】不是【战力翻倍】—— 两个相邻概念各钉一条(防混)', () => {
    const s = scene([card('m', 'SFD-068', P1), card('g2', ARM2, P1, stuckOn('m'))])
    expect(mightOf(s, 'm'), '★★★加成翻倍 = 3+2+2').toBe(7)
    expect(mightOf(s, 'm'), '★★★★★★若误做成整体翻倍会是 (3+2)×2 = 10').not.toBe(10)
  })

  test('🔴★★★★★两件武装 +2/+3:两份各自翻倍 ⇒ 3 + 5 + 5 = 13', () => {
    const s = scene([
      card('m', 'SFD-068', P1),
      card('g2', ARM2, P1, stuckOn('m')),
      card('g3', ARM3, P1, stuckOn('m')),
    ])
    expect(mightOf(s, 'm')).toBe(13)
  })

  test('🔴★★★★★没贴任何武装 ⇒ 就是印刷战力', () => {
    expect(mightOf(scene([card('m', 'SFD-068', P1)]), 'm')).toBe(3)
  })
})

describe('🔴🔴🔴★★★★★★门一:「每件【武装】」—— 普通装备的加成【不】翻倍', () => {
  test('🔴★★★★★★带加成但【没有武装标签】的贴附卡:原份照给、双倍份不给(答案从 7 变 5)', () => {
                                                                  
                                                            
    const fake = {
      ...card('g2', ARM2, P1, stuckOn('m')), baseTags: [] as readonly string[],
    } as unknown as GameObject
    const s = scene([card('m', 'SFD-068', P1), fake])
    expect(isArmament(s.objects[asObjId('g2')]!), '★前提:这件【不是】武装').toBe(false)
    expect(s.objects[asObjId('g2')]!.basePowerBonus, '★前提:但它确实带 +2 加成').toBe(2)
    expect(mightOf(s, 'm'), '★★★3 + 2(原份),没有第二份').toBe(5)
  })
})

describe('🔴🔴🔴★★★★★★门二:「贴附在【我】身上」', () => {
  test('🔴★★★★★★武装贴在【对手单位】身上 ⇒ 我一分不加', () => {
    const foe = { ...card('f', 'SFD-068', P2), defId: 'BLK' } as unknown as GameObject
    const s = scene([card('m', 'SFD-068', P1), foe, card('g3', ARM3, P2, stuckOn('f'))])
    expect(mightOf(s, 'm'), '★★★别人身上的不算').toBe(3)
  })

  test('🔴★★★★★★武装在场但【没贴附】⇒ 不算(§137.3.a 未贴附即不生效)', () => {
    const s = scene([card('m', 'SFD-068', P1), card('g3', ARM3, P1)])
    expect(mightOf(s, 'm')).toBe(3)
  })
})

describe('🔴🔴★★★★★门三:「【基础】战力加成」= 印刷值;+0 武装照样是武装', () => {
  test('🔴★★★★★+0 武装:配装状态成立,但两份都是 0 ⇒ 战力不变(§137.2)', () => {
    const s = scene([card('m', 'SFD-068', P1), card('g0', ARM0, P1, stuckOn('m'))])
    expect(isGeared(s, asObjId('m')), '★§818.3 配装与加成大小无关').toBe(true)
    expect(mightOf(s, 'm')).toBe(3)
  })
})

describe('🔴🔴★★★★★★共用件:武装集合口只有一份(㊼)', () => {
  test('🔴★★★★★★我数的那一堆,与 §818.3 配装判定【读的是同一个口】', () => {
    const s = scene([
      card('m', 'SFD-068', P1),
      card('g2', ARM2, P1, stuckOn('m')),
      card('g3', ARM3, P1, stuckOn('m')),
    ])
                                                            
    expect(armamentsOn(s, asObjId('m')).map((o) => o.oid as string).sort()).toEqual(['g2', 'g3'])
    expect(isGeared(s, asObjId('m'))).toBe(true)
  })

  test('🔴★★★★★★㉜ longtail-1 那个【同名函数已改名】,且与本口不是同一个东西', () => {
                                                                 
                                                              
                                                
    const s = scene([card('m', 'SFD-068', P1), card('g2', ARM2, P1, stuckOn('m'))])
    expect(armamentCountOn(s, asObjId('m')), '★按 defId 查卡表那条路:件数').toBe(1)
    expect(armamentsOn(s, asObjId('m')).length, '★按物件 baseTags 那条路:物件数组').toBe(1)
  })
})
