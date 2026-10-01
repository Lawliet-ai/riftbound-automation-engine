                   
  
                       
                                          
                                            
                          
                                               
                                          
                                                             
  
                                                        
                                                             
                                      
                                                                                    
                                                       
                                              
                                                                  
                                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                                                              
                            
                                               
export const OGN_026_CARD_EFFECT = '当你打出我时，对手本回合内不能打出卡牌。'
export function makeThunderCallerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        ctx.state.players
          .filter((p) => p !== ctx.controller)               
          .map((p) => ({ kind: 'banPlayCards', player: p })),
    }],
  })
  return compileTrigger({
    id: 'OGN-026:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_026: Card = {
  id: 'OGN-026', cardNo: 'OGN·026/298', name: '颂雷者 布林希尔', category: 'unit',
  domains: ['red'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时对手本回合不能打出卡牌(makeThunderCallerTrigger)' }],
}

                      
export const BAN_PLAY_DEFIDS: readonly string[] = ['OGN-026', 'OGN-031']

                                                              
                                       
  
                               
                                                                 
                                                                     
                                                                     
                                                             
                                                   
                                                
                 
export const OGN_031_CARD_EFFECT = '当你打出我时，你在本回合内打出的下一个法术费用减少{{5}}。'
export function makeRageDrakeTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'custom',
      emit: (ctx): readonly GameEvent[] =>
        [{ kind: 'grantNextSpellDiscount', player: ctx.controller, mana: 5 }],
    }],
  })
  return compileTrigger({
    id: 'OGN-031:play', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const OGN_031: Card = {
  id: 'OGN-031', cardNo: 'OGN·031/298', name: '狂暴龙怪', category: 'unit',
  domains: ['red'], energy: 6, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时本回合下一个法术减费5(makeRageDrakeTrigger)' }],
}
