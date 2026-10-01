                                            
                                                                              
                            
                                                                                   
                                                

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import type { Rechoice } from '../../src/loop/chain'
import { negate } from '../../src/keywords/negate'
import { seizeAndRechoose } from '../../src/keywords/seize'

export const VEN_152_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '选择一个法力费用不高于{{4}}的法术。你可以选择支付{{A}}。若如此做，则你获得此法术的控制权，你可以选择为其做出新的选择。否则将其无效化。'

                            
                                                                               
                                                                                                 
                                                                               
                                                    
                                                    
                                                  
                                                       


                                                                  
                                                                                     
                                 


export const VEN_152: Card = {
  id: 'VEN-152',
  cardNo: 'VEN·152',
  name: '灵魂折镜',
  category: 'spell', // 专属法术(梅尔)
  domains: ['blue', 'purple'],
  energy: 1,
  keywords: ['反应'],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'activated', cost: { energy: 1 }, effect: () => [] }], // 打出效果=castSoulMirror(反制/夺控类)
}
