import { describe, expect, test } from 'vitest'
import { compileCard, type Domain } from '../../../src/dsl/card'
import { BLANK_MIRROR_A, BLANK_MIRROR_B, blankDeck } from './blankMirror'

const VALID_DOMAINS: Domain[] = ['red', 'blue', 'green', 'orange', 'purple', 'colorless']

describe('M1.5.1 中性素单位镜像卡集(结构检查 + 中性负约束)', () => {
  const deck = blankDeck('A')

  test('两套镜像同构', () => {
    expect(BLANK_MIRROR_A.length).toBe(BLANK_MIRROR_B.length)
    expect(BLANK_MIRROR_A.length).toBeGreaterThanOrEqual(12)
  })

  test('结构检查:域∈合法枚举 / 费用数值合法 / 类别=unit', () => {
    for (const c of deck) {
      for (const d of c.domains) expect(VALID_DOMAINS).toContain(d)
      expect(c.energy).toBeGreaterThanOrEqual(0)
      expect(c.category).toBe('unit')
    }
  })

  test('中性负约束:无 Hidden/替代费/替代胜利/得分否定(纯 keyword,仅 standard 打出)', () => {
    for (const c of deck) {
                                              
      for (const pm of c.playModes) expect(pm.kind).toBe('standard')
                                 
      const comp = compileCard(c)
      expect(comp.shields).toHaveLength(0)
      expect(comp.triggers).toHaveLength(0)
      expect(comp.staticEffects).toHaveLength(0)
    }
  })
})
