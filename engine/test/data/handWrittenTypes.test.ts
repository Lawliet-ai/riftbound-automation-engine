import { describe, expect, test } from 'vitest'
import { specLookup } from '../../data/decks'
import { cardKind } from '../../data/registry'
import { CARD_CATEGORIES } from '../../data/cardCategories'

                         
                                                        
                                                   
                                        
                                      

describe('★手写卡必须带 §178 类型,不能靠 typesOf 回落成单位', () => {
  const EQUIPS = ['OGN-101', 'UNL-088', 'OGN-181'] as const

  test('先钉住前提:这三张在卡库里确实是装备', () => {
    for (const id of EQUIPS) expect(CARD_CATEGORIES[id]).toBe('equipment')
  })

  test('★specLookup 给出的 baseTypes 是 equipment(而不是 undefined)', () => {
    for (const id of EQUIPS) {
      expect(specLookup(id).baseTypes, `${id} 的类型`).toEqual(['equipment'])
    }
  })

  test('对照:单位卡拿到的是 unit', () => {
    expect(specLookup('VEN-043').baseTypes).toEqual(['unit'])
  })

  test('cardKind 与 specLookup 对同一张卡的判断一致(两条路不能各说各话)', () => {
    for (const id of [...EQUIPS, 'VEN-043', 'VEN-047']) {
      const kind = cardKind(id)
      const types = specLookup(id).baseTypes ?? []
      expect(types.includes(kind as never), `${id}: cardKind=${kind} types=${types.join(',')}`).toBe(true)
    }
  })
})
