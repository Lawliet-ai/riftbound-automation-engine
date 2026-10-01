                                     
  
                                                            
                              
                                 
                                                  
                                                      
  
                                                                           
                                                 
  
                                                   
                              
import { describe, expect, test } from 'vitest'
import { GROUP_PASSIVE_DEFIDS } from '../../data/cards/group-passives'
import { VARIANT_GROUPS } from '../../data/variantAliases'
import { CARD_NAMES } from '../../data/cardNames'

describe('★785 群体被动:再版卡号不许漏登', () => {
  test('每张登记了群体被动的卡,其全部再版卡号也都登记了', () => {
    const registered = new Set(GROUP_PASSIVE_DEFIDS)
    expect(registered.size, '㊳ 前提:确实读到了登记表').toBeGreaterThan(20)

    const missing: string[] = []
    for (const id of GROUP_PASSIVE_DEFIDS) {
      for (const alias of (VARIANT_GROUPS as Readonly<Record<string, readonly string[]>>)[id] ?? []) {
                                    
        if (alias.includes('*')) continue
        if (CARD_NAMES[alias] === undefined) continue
        if (!registered.has(alias)) missing.push(`${alias}(与 ${id} 同卡:${CARD_NAMES[alias] ?? '?'})`)
      }
    }
    expect(missing, `这些再版卡号读不到群体被动 —— 卡面与本体一字不差,场上却不给加成:
  ${missing.join('\n  ')}
修法:在 group-passives.ts 的 GROUP_PASSIVES_WITH_VARIANTS 里补一行指向同一条 spec。`).toEqual([])
  })
})
