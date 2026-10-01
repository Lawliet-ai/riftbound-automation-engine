                      
  
                                      
  
                              
                                                          
                                         
                                                   
                                                     
                                              
                                                            
                                                            
                                                                    

import type { Card } from '../../src/dsl/card'

export const OGN_276_CARD_EFFECT = '使赢得游戏所需的分数+1。'

                          
const WIN_TARGET_BONUS: Readonly<Record<string, number>> = {
  'OGN-276': 1,
}

                                                          
export function winTargetBonusFor(bfDefId: string): number {
  return WIN_TARGET_BONUS[bfDefId] ?? 0
}

export const OGN_276: Card = {
  id: 'OGN-276', cardNo: 'OGN·276/298', name: '攀圣长阶', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '赢得游戏所需的分数+1(winTargetBonusFor)' }],
}

             
export const LONGTAIL17_DEFIDS: readonly string[] = ['OGN-276']
export const WIN_TARGET_BONUS_DEFIDS: readonly string[] = Object.keys(WIN_TARGET_BONUS)
