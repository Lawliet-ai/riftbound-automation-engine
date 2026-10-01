import { describe, expect, test } from 'vitest'
import { PLAY_SPECS, cardKeywords } from '../../data/registry'

                                                         
  
                                     
                                                                
                                                                     
                    
                                                                
                
                                                        
                                                          

describe('★★★★★★★ ★744 spec.keywords ×CARD_KEYWORDS 对账(反应位)', () => {
  test('★★★★★★全 PLAY_SPECS:『反应』位与 cardKeywords 一致(闸即扫描器,红名单=出入清单)', () => {
    const bad: string[] = []
    for (const [defId, spec] of Object.entries(PLAY_SPECS)) {
      const specHas = (spec.keywords ?? []).includes('反应')
      const cardHas = cardKeywords(defId).includes('反应')
      if (specHas !== cardHas) bad.push(`${defId}: spec=${specHas} card=${cardHas}`)
    }
    expect(bad, '★两表『反应』位不一致的卡(卡文为准逐个修)').toEqual([])
  })
})
