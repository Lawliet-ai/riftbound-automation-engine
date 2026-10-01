                                                                      
                                            
                           
  
            
                                              
                                                       
                                                                                    
                                                                   
                                                                      
  
                                                     
                                                                
                                                     
                                
                                                               
                                                                    
                                                                                 
                                                                                                    
                                                                   
                         
                                                           
                                                    
                                      
                                           

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const VEN_009_CARD_EFFECT =
  '当我进攻时，你可以选择支付{{红色}}，以此给予我在本回合内{{强攻2}}。' +
  '（如果我是进攻方，则{{S}}+2。）'

                                                                                                     
export const RED_PIP = { mana: 0, pips: [['red']] } as const

   
                               
  
                                                              
                                                  
                                                   
                                                                               
                                                                     
                                                                 
                                                                    
                                                                   
                                           
                                                                       
                                                
                                                                               
                                                                
   
export function couldPayReaperCost(state: GameState, controller: PlayerId): boolean {
  return couldPayWithReactionGains(state, controller, RED_PIP)
}

export function makeReaperAttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                         
                                              
                                                                                        
  const effect = compileEffect({
    then: [
                          
                                                            
                                             
                                                      
      { op: 'grantKeyword', target: { ref: 'self' }, keyword: '强攻2', duration: 'thisTurn', id: 'VEN-009-assault' },
    ],
  })
  return compileTrigger({
    id: 'VEN-009-assault',
    event: 'attack',
    by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'subjectIsSelf' }, // 「当【我】进攻时」——不是队友进攻
      { kind: 'custom', test: (_ev, state) => couldPayReaperCost(state, controller) }, // §444.2.c 问侧门(按「凑得出」问)
    ],
                                                                                        
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, RED_PIP)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_009: Card = {
  id: 'VEN-009',
  cardNo: 'VEN·009',
  name: '巴凯收割者',
  category: 'unit',
  domains: ['red'],
  energy: 3,
  power: 4,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '进攻时可付{红色}换本回合[强攻2](makeReaperAttackTrigger)' },
  ],
}
