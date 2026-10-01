                    
  
                                                
                                             
                                 
                                              
                                                        
  
                                                            
                                                         
                                                       
                                           
  
                             
                                                
                                          
                                         
                                                     
                                                      
                                                                           
                                                      
                                                                                
                                                                                                  
                                                                                                  
                                                                                               

import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { resolveSelector } from '../../src/dsl/selector'
import type { Selector } from '../../src/dsl/selector'
import { isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'

                                                                                                                                         
export const OGN_235_CARD_EFFECT =
  '{{预知}}（当你打出我时，查看主牌堆顶部的一张牌，你可以选择将其回收。）\n' +
  '每当你将任意数量的卡牌回收到自己的主牌堆时，给予一名友方单位增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。符文不被视为卡牌。）'

                                                                  
                                                                               
                                                                
                          
                                                       
                                                          
                                                          
                                       
                         


                                                                            
const OGN_235_SELECTOR: Selector = { type: 'unit', controller: 'you', isTarget: true, filter: (o, state) => onField(state, o) }

export function makeOgn235RecycleTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'OGN-235-karma',
    event: 'recycled',
    by: 'any',
                                              
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
                                                    
                                                                          
    choose: {
      key: 'unit', prompt: '卡尔玛:给予一名友方单位增益',
      selector: OGN_235_SELECTOR,
    },
    effect: (state: GameState, _ev: GameEvent, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const t = chosen?.['unit']
                                                
                                                                            
                                              
      if (t === undefined || !resolveSelector(state, OGN_235_SELECTOR, controller).includes(t as ObjId)) return []
      return [{ kind: 'grantBuff', target: t as ObjId }]
    },
  }, selfOid, controller)
}

export const OGN_235: Card = {
  id: 'OGN-235', cardNo: 'OGN·235/298', name: '卡尔玛', category: 'unit',
  domains: ['yellow'], energy: 6, power: 6, keywords: ['预知'], playModes: [{ kind: 'standard' }],
  abilities: [], // 触发挂在 TRIGGER_FACTORIES 的 makeOgn235RecycleTrigger 上
}
