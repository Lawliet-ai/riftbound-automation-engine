                                                                
                                            
                     
  
              
                                                      
                                                    
                                                             
                                                    
                                                  
  
                                             
                                                                   
                                             
                                    
                                      
                         
                                                              
                                                                           
                                                                                           
                                                                          
                                                                              

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { canDormantSelf } from './dormant-self-cost'                                   
import { couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import type { GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'                                                           
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                                                                                                   
export const ORANGE_PIP = { mana: 0, pips: [['orange']] } as const

export const OGN_152_CARD_EFFECT =
  '每当你给予一名友方单位增益时，你可以选择支付{{橙色}}让此牌变为休眠状态，' +
  '以此让该单位变为活跃状态。'

export function makeMistTombTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                               
                                 
                              
                                                  
                                    
                                                                                                                                          
  const effect = compileEffect({
    then: [
                                               
                                              
      { op: 'setStatus', target: { ref: 'eventSubject' }, key: 'dormant', value: false },
    ],
  })
  return compileTrigger({
    id: 'OGN-152-ready',
    event: 'grantBuff',
    by: 'you', // 「每当【你】给予…」——对手给自己单位上增益不算
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'eventTargetIs', portrait: { types: ['unit'], side: 'friendly' } }, // 「一名友方单位」
      { kind: 'custom', test: (_ev, state) => canDormantSelf(state, selfOid) },
                                                                    
                                                      
                                                         
                                                                       
                                                              
                                         
                                                                          
                                    
                                                                                       
                                                  
      { kind: 'custom', test: (_ev, state) => couldPayWithReactionGains(state, controller, ORANGE_PIP) },
    ],
                                                           
                                                                                       
                                                                                    
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const paid = payFromState(state, controller, ORANGE_PIP)
      if (!paid.ok) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(paid.state, pay, deps.triggerSource, controller, deps)
        : applyEvents(paid.state, pay, deps ?? {}).state
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_152: Card = {
  id: 'OGN-152',
  cardNo: 'OGN·152/298',
  name: '雾临剑冢',
  category: 'equipment',
  domains: ['orange'],
  energy: 3,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '给友方单位上增益时可付{橙色}+休眠此牌,让该单位变为活跃(makeMistTombTrigger)' },
  ],
}
