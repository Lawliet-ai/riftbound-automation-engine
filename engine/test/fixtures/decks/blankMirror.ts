                                            
                                                                 

import type { Card } from '../../../src/dsl/card'

const KEYWORDS = ['据守', '迅捷', '壁垒', '后排', '', '据守', '迅捷', '', '壁垒', '后排', '', '据守']

                                           
export function blankDeck(prefix: string): Card[] {
  return KEYWORDS.map((kw, i) => ({
    id: `${prefix}-u${i}`,
    cardNo: `BLK-${prefix}-${String(i).padStart(2, '0')}`,
    name: `白板单位${prefix}${i}`,
    category: 'unit' as const,
    domains: ['colorless' as const],
    energy: 1 + (i % 3),
    power: 1 + (i % 4),
    keywords: kw ? [kw] : [],
    playModes: [{ kind: 'standard' as const }],
    abilities: [],
  }))
}

                         
export const BLANK_MIRROR_A = blankDeck('A')
export const BLANK_MIRROR_B = blankDeck('B')
