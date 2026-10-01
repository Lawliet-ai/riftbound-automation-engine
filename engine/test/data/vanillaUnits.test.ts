import { describe, expect, test } from 'vitest'
import { makeForgeTriggers } from '../../src/keywords/forge'
import { createInitialState } from '../../src/state/gameState'
import { asObjId, asPlayerId, asZoneId } from '../../src/state/ids'
import { VANILLA_UNITS } from '../../data/vanillaUnits'
import { specLookup } from '../../data/decks'
import { cardCost, cardDomains, cardKeywords, cardKind } from '../../data/registry'

                      
                                                              

                                                      
const IMPL = new Set(['强攻', '坚守', '壁垒', '法盾', '游走', '狩猎', '后排', '唯我', '预知', '急速', '百炼',
                                                                
                                                                             
                                                                 
  '伏击', '待命',
                                                                       
  '反应'])
const stem = (k: string): string => k.replace(/\d+$/, '')

describe('批量单位表的收录标准', () => {
  test('表非空且规模合理', () => {
                                        
    expect(Object.keys(VANILLA_UNITS).length).toBe(37)
  })

  test('★只收【已实现】关键词:任何一张卡带了未实现的关键词都是失误', () => {
    const bad: string[] = []
    for (const [no, u] of Object.entries(VANILLA_UNITS)) {
      for (const k of u.keywords) if (!IMPL.has(stem(k))) bad.push(`${no}:${k}`)
    }
    expect(bad).toEqual([])
  })

  test('战力与费用都是非负整数(白板卡也有战力)', () => {
    for (const [no, u] of Object.entries(VANILLA_UNITS)) {
      expect(Number.isInteger(u.might), `${no} 战力非整数`).toBe(true)
      expect(u.might, `${no} 战力为负`).toBeGreaterThanOrEqual(0)
      expect(u.mana, `${no} 法力费为负`).toBeGreaterThanOrEqual(0)
      expect(u.pips, `${no} pip 数为负`).toBeGreaterThanOrEqual(0)
    }
  })

  test('有 pip 的卡必须有可付特性(否则 pip 无从支付)', () => {
    for (const [no, u] of Object.entries(VANILLA_UNITS)) {
      if (u.pips > 0) expect(u.domains.length, `${no} 有 pip 却无特性`).toBeGreaterThan(0)
    }
  })
})

describe('registry / specLookup 三通道接线', () => {
  test('specLookup 给出战力+关键词+单位类型', () => {
    const s = specLookup('OGN-054')                   
    expect(s.baseMight).toBe(3)
    expect(s.baseKeywords).toEqual(['坚守', '壁垒'])
    expect(s.baseTypes).toEqual(['unit'])                     
  })

  test('cardCost 按费用推导裁定给出 mana + pips', () => {
    const c = cardCost('OGN-054')
    expect(c.mana).toBe(3)
    const u = VANILLA_UNITS['OGN-054']!
    expect((c.pips ?? []).length).toBe(u.pips)
    if (u.pips > 0) expect(c.pips![0]).toEqual(u.domains)
  })

  test('cardKeywords 走同一张表;cardKind 仍是 unit(不是 equipment)', () => {
    expect(cardKeywords('OGN-052')).toEqual(['坚守'])
    expect(cardKind('OGN-052')).toBe('unit')
  })

  test('白板卡:无关键词但有战力,费用照给', () => {
    const s = specLookup('OGN-142')                
    expect(s.baseKeywords).toEqual([])
    expect(s.baseMight).toBe(10)
    expect(cardCost('OGN-142').mana).toBe(9)
  })

  test('手写卡优先于批量表(同号不会被批量覆盖)', () => {
                                   
    expect(VANILLA_UNITS['OGN-121']).toBeUndefined()
    expect(specLookup('OGN-121').baseKeywords).toContain('待命')
  })
})

describe('第58轮扩表:急速/百炼进白名单后新收的卡,必须【真能生效】', () => {
  test('表扩到 37 张(361:伏击/待命;★426:反应 ⇒ 慎 OGN-241)', () => {
    expect(Object.keys(VANILLA_UNITS).length).toBe(37)
  })

  test('★带急速的白板卡:关键词与特性两条查询链都通(打出流程靠它们给"付急速"变体)', () => {
    expect(cardKeywords('OGN-001')).toContain('急速')        
    expect(cardDomains('OGN-001')).toEqual(['red'])                          
  })

  test('★带百炼的白板卡:触发工厂真能按它产出触发', () => {
    expect(cardKeywords('SFD-008')).toContain('百炼')        
    const P = asPlayerId('P1')
    const base = createInitialState([P, asPlayerId('P2')], 2)
    const o = {
      oid: asObjId('u'), defId: 'SFD-008', owner: P, controller: P, zone: asZoneId('battlefield:shared:0'),
      baseMight: 3, baseKeywords: [], baseTypes: ['unit'] as const, damage: 0, counters: {}, status: {},
    }
    const s = { ...base, objects: { u: o } }
    const trigs = makeForgeTriggers(s as never, {
                                            
      sourcesOf: (o: { defId: string }) => cardKeywords(o.defId),
      hasTag: () => false, equipCostOf: () => undefined, canPay: () => true,
    })
    expect(trigs).toHaveLength(1)                
  })

  test('★一卡多关键词也照收(雷恩加尔:急速+强攻2+法盾+游走,四条全已实现)', () => {
    expect(VANILLA_UNITS['UNL-024']!.keywords).toEqual(['急速', '强攻2', '法盾', '游走'])
  })
})
