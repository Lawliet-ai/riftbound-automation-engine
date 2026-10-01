                                                                 
                                
                                      
                                 
  
                                             
                                              
                                                             
                                               
                                                             
                                                          
                                                   
                                    
  
                                                                   
                                                                
                                                                             
import type { Card } from '../../src/dsl/card'

export const OGN_080_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n获得一个法术的控制权。你可以选择为其指定新的目标。'

export const OGN_080: Card = {
  id: 'OGN-080', cardNo: 'OGN·080/298', name: '倒转神通', category: 'spell',
  domains: ['green'], energy: 4, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'activated', cost: { energy: 4 }, effect: () => [] }], // 打出效果=registry 的 OGN-080 PlaySpec(夺控类)
}
