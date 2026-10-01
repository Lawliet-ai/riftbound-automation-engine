                                                                  
  
                                           
                                                                           
                                                              
                                                      
  
                             
                                                                      
                                                              
                                                             
                                            
                                                                            
                                                              
  
                                                
                                                    
                                                 

import type { Card, Domain } from '../../src/dsl/card'

                                                                    
                                                         
export const RUNE_CARD_COLORS: Readonly<Record<string, string>> = {
  'OGN-007': 'red', // 炽烈符文
  'OGN-042': 'green', // 翠意符文
  'OGN-089': 'blue', // 灵光符文
  'OGN-126': 'orange', // 摧破符文
  'OGN-166': 'purple', // 混沌符文
  'OGN-214': 'yellow', // 序理符文
}

   
                                
  
                                                        
                                             
                                  
   
export function normalizeRuneEntry(entry: string): string {
  const byCardNo = RUNE_CARD_COLORS[entry]
  if (byCardNo !== undefined) return `rune:${byCardNo}`
                                                    
                                                        
  if (entry.startsWith('rune:')) return entry
  if (Object.values(RUNE_CARD_COLORS).includes(entry)) return `rune:${entry}`
  return entry
}

                       
export function runeDeckOf(entries: readonly string[]): readonly string[] {
  return entries.map(normalizeRuneEntry)
}

const rune = (id: string, cardNo: string, name: string, color: Domain): Card => ({
  id, cardNo, name, category: 'rune',
  domains: [color], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '符文:提供该色符能(建局时归一成 rune:<色>)' }],
})
export const OGN_007: Card = rune('OGN-007', 'OGN·007/298', '炽烈符文', 'red')
export const OGN_042: Card = rune('OGN-042', 'OGN·042/298', '翠意符文', 'green')
export const OGN_089: Card = rune('OGN-089', 'OGN·089/298', '灵光符文', 'blue')
export const OGN_126: Card = rune('OGN-126', 'OGN·126/298', '摧破符文', 'orange')
export const OGN_166: Card = rune('OGN-166', 'OGN·166/298', '混沌符文', 'purple')
export const OGN_214: Card = rune('OGN-214', 'OGN·214/298', '序理符文', 'yellow')

                                                                       
                                                  
export const OGN_274_KEYWORDS: readonly string[] = ['瞬息']
export const OGN_274_CARD_EFFECT =
  '{{瞬息}}（在控制者的下个回合开始阶段，结算得分之前将我摧毁。）'

const minion = (id: string, cardNo: string, name: string): Card => ({
  id, cardNo, name, category: 'unit',
  domains: [], energy: 0, power: 1, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '1[S] 随从指示物(§187.1;实体走 token:随从)' }],
})
export const OGN_271: Card = minion('OGN-271', 'OGN·271/298', '随从（德玛西亚）')
export const OGN_272: Card = minion('OGN-272', 'OGN·272/298', '随从（诺克萨斯）')
export const OGN_273: Card = minion('OGN-273', 'OGN·273/298', '随从（祖安）')

export const OGN_274: Card = {
  id: 'OGN-274', cardNo: 'OGN·274/298', name: '精灵', category: 'unit',
  domains: [], energy: 0, power: 3, keywords: [...OGN_274_KEYWORDS], playModes: [],
  abilities: [{ kind: 'passive', describe: '3[S] 精灵指示物,自带[瞬息](§187.2;实体走 token:精灵)' }],
}

             
export const RUNE_CARD_DEFIDS: readonly string[] = Object.keys(RUNE_CARD_COLORS)
export const TOKEN_UNIT_DEFIDS: readonly string[] = ['OGN-271', 'OGN-272', 'OGN-273', 'OGN-274']
