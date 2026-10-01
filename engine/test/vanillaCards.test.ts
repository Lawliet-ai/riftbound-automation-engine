                                          
                                                

import { describe, expect, test } from 'vitest'
import { asPlayerId } from '../src/state/ids'
import { compileCard, type Card, type Domain } from '../src/dsl/card'

const P1 = asPlayerId('P1')
const DOMAINS: Domain[] = ['red', 'blue', 'green', 'orange', 'purple', 'colorless']
const KEYWORDS = ['据守', '迅捷', '壁垒', '后排', '', '据守', '迅捷', '', '壁垒', '']          

                               
function vanillaUnits(): Card[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `neutral-u${i}`,
    cardNo: `NEU-${String(i).padStart(3, '0')}`,
    name: `素单位${i}`,
    category: 'unit' as const,
    domains: [DOMAINS[i % DOMAINS.length]!],
    energy: 1 + (i % 4),
    power: 1 + (i % 5),
    keywords: KEYWORDS[i] ? [KEYWORDS[i]!] : [],
    playModes: [{ kind: 'standard' as const }],
    abilities: [],
  }))
}

                                                     
const abilityCards: Card[] = [
  {
    id: 'neutral-grant', cardNo: 'NEU-010', name: '素·授迅捷', category: 'equipment', domains: ['red'],
    energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
    abilities: [{ kind: 'static', effect: { id: 'g', duration: 'permanent', fromPassive: true, predicate: () => true, modification: { kind: 'grantKeyword', keyword: '迅捷' } } }],
  },
  {
    id: 'neutral-bolt', cardNo: 'NEU-011', name: '素·点伤', category: 'spell', domains: ['blue'],
    energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
    abilities: [{ kind: 'activated', cost: { energy: 1 }, effect: () => [] }],
  },
]

const HIDDEN_LIKE = ['hidden', 'ambush', 'flow']                          

describe('≥10 素卡:编译 + 中性判据', () => {
  const cards = [...vanillaUnits(), ...abilityCards]

  test('共 ≥10 张', () => {
    expect(cards.length).toBeGreaterThanOrEqual(10)
  })

  for (const card of cards) {
    test(`素卡 ${card.name}(${card.cardNo}):可编译且中性`, () => {
      const c = compileCard(card)
                  
      expect(c).toBeDefined()
                                              
      for (const pm of card.playModes) expect(HIDDEN_LIKE).not.toContain(pm.kind)
                                                          
                                                               
      expect(c.shields.every((s) => s.intercepts !== 'gainPoint')).toBe(true)
    })
  }

  test('素·授迅捷:static 能力路由到效果层', () => {
    const c = compileCard(abilityCards[0]!)
    expect(c.staticEffects).toHaveLength(1)
    expect(c.staticEffects[0]!.modification.kind).toBe('grantKeyword')
    void P1
  })
})
