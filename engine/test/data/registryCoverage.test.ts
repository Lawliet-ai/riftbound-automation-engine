import { describe, expect, test } from 'vitest'
import { PLAY_SPECS, TRIGGER_FACTORIES, activatedDefIds, cardCost, cardKind } from '../../data/registry'
import { GROUP_PASSIVE_DEFIDS } from '../../data/cards/group-passives'
import { EXTRA_BF_DEFIDS, EXTRA_BF_TRIGGER_FACTORIES } from '../../data/cards/battlefields-extra'
import { specLookup } from '../../data/decks'
import { CARD_COSTS } from '../../data/cardCosts'

                   
  
                                                  
                                                 
                                              
                                            
                              
  
                                          
                                   

                                                          
const NOT_SPEC_BACKED = /^(token:|OGN-2[78]\d|UNL-2\d\d|SFD-2\d\d|VEN-1[67]\d|DEMO-)/

describe('★注册完整性:登记了触发的卡必须有真规格', () => {
  test('前提:触发工厂表非空', () => {
    expect(Object.keys(TRIGGER_FACTORIES).length).toBeGreaterThan(30)
  })

  test('★每个登记了触发的单位/装备卡都查得到规格(不是回落的空壳)', () => {
    const hollow: string[] = []
    for (const defId of Object.keys(TRIGGER_FACTORIES)) {
      if (NOT_SPEC_BACKED.test(defId)) continue
      const row = CARD_COSTS[defId]
      if (!row) continue                             
      const spec = specLookup(defId)
                                                   
      const isUnitLike = row.mana > 0
      if (isUnitLike && spec.baseMight === 0 && (spec.baseKeywords?.length ?? 0) === 0
          && spec.baseTypes === undefined) {
        hollow.push(defId)
      }
    }
    expect(hollow).toEqual([])
  })

  test('★每个登记了触发的卡都有费用登记(不是回落的 0 费)', () => {
    const free: string[] = []
    for (const defId of Object.keys(TRIGGER_FACTORIES)) {
      if (NOT_SPEC_BACKED.test(defId)) continue
                                                                 
                                                                                
                                                             
      if (cardKind(defId) === 'spell') continue
      const row = CARD_COSTS[defId]
      if (!row || row.mana === 0) continue                      
      if ((cardCost(defId).mana ?? 0) === 0) free.push(defId)
    }
    expect(free).toEqual([])
  })
})

                                               
                                           
                                                          
                                                        
                                                      
describe('★注册完整性:登记了主动技能的卡也必须有费用登记', () => {
  test('前提:主动技能表非空,且确实有卡只在这张表里(否则本闸与上面那条重合)', () => {
    const ids = activatedDefIds()
    expect(ids.length).toBeGreaterThan(20)
    expect(ids.some((d) => !(d in TRIGGER_FACTORIES))).toBe(true)
  })

  test('★每个登记了主动技能的卡都有费用登记(不是回落的 0 费)', () => {
    const free: string[] = []
    for (const defId of activatedDefIds()) {
      if (NOT_SPEC_BACKED.test(defId)) continue
      const row = CARD_COSTS[defId]
      if (!row || row.mana === 0) continue                      
      if ((cardCost(defId).mana ?? 0) === 0) free.push(`${defId}(应${row.mana})`)
    }
    expect(free).toEqual([])
  })

  test('★pip 也要收齐(§204:少收一枚 pip 同样是"比真卡便宜")', () => {
    const short: string[] = []
    for (const defId of activatedDefIds()) {
      if (NOT_SPEC_BACKED.test(defId)) continue
      const row = CARD_COSTS[defId]
      if (!row || row.mana === 0) continue
      if ((cardCost(defId).pips?.length ?? 0) !== row.pips) short.push(`${defId}(应${row.pips}枚)`)
    }
    expect(short).toEqual([])
  })
})

                                                                         
                               
  
                                                 
                                                                 
                                                                    
                                                    
                                               
                          
  
                        
                                                                              
                                                                           
                                     
                                                              

describe('★注册完整性:法术(PLAY_SPECS)的费用要与卡面一致', () => {
                                                             
                                                          
                                                                               
                                                          
                                               
  test('前提:表非空;法术的费用以 spec.cost 为准(cardCost 那条路只是可能存在的第二份)', () => {
    expect(Object.keys(PLAY_SPECS).length).toBeGreaterThan(20)
    const spells = Object.keys(PLAY_SPECS).filter((d) => (CARD_COSTS[d]?.mana ?? 0) > 0)
    expect(spells.length).toBeGreaterThan(20)
                                         
    for (const d of spells) expect(PLAY_SPECS[d]!.cost.mana ?? 0, d).toBeGreaterThan(0)
                                                         
                                         
    expect(spells.some((d) => (cardCost(d).mana ?? 0) === 0)).toBe(true)
  })

  test('★★两份费用不许漂移:同时登记在 UNIT_COST 里的那些,必须与 spec.cost 一致', () => {
                                                     
    const drift: string[] = []
    let dual = 0
    for (const defId of Object.keys(PLAY_SPECS)) {
      if (!CARD_COSTS[defId]) continue
      const cc = cardCost(defId)
      if ((cc.mana ?? 0) === 0 && (cc.pips?.length ?? 0) === 0) continue               
      dual++
      const sp = PLAY_SPECS[defId]!.cost
      if ((cc.mana ?? 0) !== (sp.mana ?? 0) || (cc.pips?.length ?? 0) !== (sp.pips?.length ?? 0)) {
        drift.push(`${defId} cardCost={${cc.mana ?? 0},${cc.pips?.length ?? 0}} spec={${sp.mana ?? 0},${sp.pips?.length ?? 0}}`)
      }
    }
    expect(dual, '一张双份登记的都没有 ⇒ 本条形同虚设(㊲ 先证明场景成立)').toBeGreaterThan(5)
    expect(drift).toEqual([])
  })

  test('★每张法术的 spec.cost(法力与 pip 枚数)都与卡面相符', () => {
    const bad: string[] = []
    for (const defId of Object.keys(PLAY_SPECS)) {
      const row = CARD_COSTS[defId]
      if (!row) continue                                            
      const spec = PLAY_SPECS[defId]!
      const mana = spec.cost.mana ?? 0
      const pips = spec.cost.pips?.length ?? 0
      if (mana !== row.mana || pips !== row.pips) {
        bad.push(`${defId} spec={${mana},${pips}pip} 卡面={${row.mana},${row.pips}pip}`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('★注册完整性:群体静态被动(GROUP_PASSIVES)的卡也要有费用与规格', () => {
  test('前提:表非空', () => {
    expect(GROUP_PASSIVE_DEFIDS.length).toBeGreaterThan(10)
  })

  test('★没有一张是回落的 0 费 / 少收 pip', () => {
    const bad: string[] = []
    for (const defId of GROUP_PASSIVE_DEFIDS) {
      const row = CARD_COSTS[defId]
      if (!row || row.mana === 0) continue                 
      if ((cardCost(defId).mana ?? 0) === 0) bad.push(`${defId} 免费(应${row.mana})`)
      else if ((cardCost(defId).pips?.length ?? 0) !== row.pips) bad.push(`${defId} pip 应${row.pips}枚`)
    }
    expect(bad).toEqual([])
  })

  test('★规格不是空壳(⚠️ 传奇不走 specLookup,必须排除 —— 否则四张传奇永久假红)', () => {
    const hollow: string[] = []
    for (const defId of GROUP_PASSIVE_DEFIDS) {
      if (cardKind(defId) === 'legend' || cardKind(defId) === 'battlefield') continue
      if (!CARD_COSTS[defId]) continue
      if (specLookup(defId).baseTypes === undefined) hollow.push(`${defId}[${cardKind(defId)}]`)
    }
    expect(hollow).toEqual([])
  })
})

describe('★注册完整性:战场卡触发(EXTRA_BF_*)两张表不许分叉', () => {
                                                           
  test('★对账清单 = 工厂表的键(第187轮起按定义相等,不再手抄)', () => {
    expect(EXTRA_BF_DEFIDS.slice().sort()).toEqual(Object.keys(EXTRA_BF_TRIGGER_FACTORIES).sort())
    expect(EXTRA_BF_DEFIDS.length).toBeGreaterThan(10)
  })

  test('★每个卡号在卡库里真实存在,且确实是 0 费的战场卡', () => {
    const bad: string[] = []
    for (const defId of Object.keys(EXTRA_BF_TRIGGER_FACTORIES)) {
                                                         
      if (defId.startsWith('token:')) continue
      const row = CARD_COSTS[defId]
      if (!row) { bad.push(`${defId} 卡库查无此号`); continue }
      if (row.mana !== 0) bad.push(`${defId} 卡面 ${row.mana} 费,不像战场卡`)
    }
    expect(bad).toEqual([])
  })
})
