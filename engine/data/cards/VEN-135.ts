                                                                         
                                                                  
            
                                              
                                   
  
                
                                                                                 
                                    
                                                                       
                                                  
                                                                        
                                                                                       
                                                                 
                                                                                    
                                                                                                       
                                                                                       
                                                                               
                                                                        
                                                  
                                                                         
                                                      
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'
import { payFromState } from '../../src/game/economy'                                           
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const VEN_135_CARD_EFFECT =
  '{{待命}}\n当你打出我时，或当我进攻时，你可以选择支付{{2}}，以此{{眩晕}}一名单位。\n'
  + '如果此处有一名被眩晕的敌方单位，则我获得{{S}}+2。'

                              
export const VEN_135_PAY = 2
                                                       
export const VEN_135_COST = { mana: VEN_135_PAY } as const

                                                    
function kennenStun(event: 'playUnit' | 'attack', id: string, selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                            
  const effect = compileEffect({
    then: [{ op: 'stun', target: { ref: 'chosen', key: 'target' } }],
  })
  return compileTrigger({
    id, rawId: false, sourceDefId: 'VEN-135',
    event, by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」/「【我】进攻」
    mayChoose: true, // §383.3.a「你可以选择」在效果开头 ⇒ 整条技能可选
                                                                                             
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, VEN_135_COST)
      return paid.ok ? paid.state : null
    },
    choose: {
      key: 'target', prompt: '凯南:支付 2 法力,眩晕一名单位',
                                        
      selector: { type: 'unit', fielded: true, isTarget: true },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                   
export function makeKennenPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return kennenStun('playUnit', 'VEN-135:onPlay', selfOid, controller)
}
                                             
export function makeKennenAttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return kennenStun('attack', 'VEN-135:onAttack', selfOid, controller)
}
