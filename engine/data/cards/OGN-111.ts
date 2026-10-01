                                                                
                                             
                                      
  
                                                                 
                                                        
                                                            
                                                                
                                                               
                                                                      
  
                                                        
                                                    
                                                   
                                                                   
                          
import type { Card } from '../../src/dsl/card'

export const OGN_111_CARD_EFFECT = '我拥有场上其他友方传奇、单位、装备卡牌的所有{{横置}}技能。'

                                              
export const OGN_111: Card = {
                                                                
  id: 'OGN-111', cardNo: 'OGN·111/298', name: '黑默丁格', category: 'unit',
  domains: ['blue'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我拥有场上其他友方传奇/单位/装备的所有[横置]技能(borrowedTapAbilities)' }],
}

                                              
export const ARC_003: Card = {
  ...OGN_111,
  id: 'ARC-003', cardNo: 'ARC-003/006',
}
