                                        
                                                                        
                                                              
                                                              

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { negate } from '../../src/keywords/negate'
import { insight, type RecycleChoice } from '../../src/keywords/insight'

export const UNL_131_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '无效化一个法术。让其返回所属的手牌，而不是将其放入废牌堆。\n' +
  '进行{{洞察}}。（查看你主牌堆顶部的一张牌。你可以选择将其回收。）'

                                                                   
                                                               
                                                                 
                                                                 
                                                  
                                                     
                                               
                                              
                                                          


export const UNL_131: Card = {
  id: 'UNL-131',
  cardNo: 'UNL-131/219',
  name: '遗弃',
  category: 'spell',
  domains: ['purple'],
  energy: 2,
  keywords: ['反应'], // 可在任意时机打出
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'activated', cost: { energy: 2 }, effect: () => [] }], // 打出效果=castDiscard(反制类,直接改链态)
}
