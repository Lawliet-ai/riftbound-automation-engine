                                   
                                                   
                                               
  
       
                                                   
                                                                      
                                                              
                         
                                                                   
                                                    

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileEffect } from '../../src/dsl/effectSpec'
import { makeFromStandbyTriggers } from './from-standby-triggers'                 

export const OGN_167_CARD_EFFECT =
  '每当你将一张牌从正面朝下的{{待命}}状态中打出时，让我本回合内{{S}}+2。'

                                 
export const OGN_167_BONUS = 2

   
                                                                
  
                                                  
                                                                             
                                          
   
export function makeEmberMonkTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return makeFromStandbyTriggers({
    defId: 'OGN-167',
    effect: (state, self, ctrl, chosen, event) => compileEffect({
      then: [{ op: 'addMight', target: { ref: 'self' }, delta: OGN_167_BONUS, duration: 'thisTurn', id: `OGN-167:${self}:${event}` }],
    })({ state, selfOid: self, controller: ctrl, ev: undefined as never, chosen }),
  }, selfOid, controller)
}

export const OGN_167: Card = {
  id: 'OGN-167', cardNo: 'OGN·167/298', name: '余火修士', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '你从待命打出一张牌(单位或法术)时我本回合 S+2(makeEmberMonkTriggers 两条)' },
  ],
}
