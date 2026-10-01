                                                   
  
                                                                
                                                          
                    
import { describe, expect, test } from 'vitest'
import { objectCardTags } from '../../data/cardTagQuery'

describe('★897 复制体印刷标签按最终源', () => {
  const mech = 'OGN-016'            
  const plain = 'OGN-175'          
  test('🔴 复制了机械的白板 ⇒ 标签含「机械」(修前读自己卡面=空)', () => {
    const copycat = { defId: plain, derived: { copiedDefId: mech } } as never
    expect(objectCardTags(copycat)).toContain('机械')
  })
  test('没复制 ⇒ 照读自己卡面(机械卡仍机械、白板仍空)', () => {
    expect(objectCardTags({ defId: mech } as never)).toContain('机械')
    expect(objectCardTags({ defId: plain } as never)).not.toContain('机械')
  })
})
