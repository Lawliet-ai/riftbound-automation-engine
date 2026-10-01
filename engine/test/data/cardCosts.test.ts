import { describe, expect, test } from 'vitest'
import { CARD_COSTS } from '../../data/cardCosts'
import { cardCost, costRegisteredDefIds } from '../../data/registry'

                       
  
                                     
                                                            
                                 
  
                                                  
                                                               
                                                     
                                       

                     
function expected(defId: string): { mana: number; pips: number } | null {
  const row = CARD_COSTS[defId]
  return row ? { mana: row.mana, pips: row.pips } : null
}
                 
function actual(defId: string): { mana: number; pips: number } {
  const c = cardCost(defId)
  return { mana: c.mana ?? 0, pips: c.pips?.length ?? 0 }
}

describe('★费用登记必须与官方卡数据一致', () => {
  test('前提:对账表非空,且登记过费用的卡不止一两张', () => {
    expect(Object.keys(CARD_COSTS).length).toBeGreaterThan(1000)
    expect(costRegisteredDefIds().length).toBeGreaterThan(30)
  })

  test('★每一张登记过费用的卡,mana 与 pip 数都对得上卡数据', () => {
    const bad: string[] = []
    for (const defId of costRegisteredDefIds()) {
      const want = expected(defId)
      if (!want) continue                                 
      const got = actual(defId)
      if (got.mana !== want.mana || got.pips !== want.pips) {
        bad.push(`${defId}: 登记 ${got.mana}法力+${got.pips}pip,卡数据 ${want.mana}法力+${want.pips}pip`)
      }
    }
    expect(bad).toEqual([])
  })

  test('★第112轮修掉的那 5 张,pip 一枚都不许再丢', () => {
    for (const defId of ['VEN-070', 'VEN-018', 'VEN-045', 'VEN-046', 'VEN-009']) {
      expect(actual(defId).pips).toBe(1)
    }
  })
})
