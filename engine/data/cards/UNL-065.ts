                                                                     
                                                  
                                
  
                                           
                                                                     
                                                                    
                                                    
                                                             
  
                                                                              
                                                      
                                                      
                                                                 
                                                           
                                       
                                                                     
                                                                    
                                                    
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { payFromState } from '../../src/game/economy'

                                                  
export const UNL_065_PAY: Cost = { mana: 1 }
                                              
export const UNL_065_DELTA = -1
export const UNL_065_CARD_EFFECT =
  '当我进攻时，你可以选择支付{{1}}，以此让此处的一名单位在本回合内{{S}}-1。'

export function makeIceVeilArcher065Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-065:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-065',
    event: 'attack',
    by: 'you',
                                             
    when: [{ kind: 'subjectIsSelf' }],
    mayChoose: true, // §383.3.a
                                                    
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, UNL_065_PAY)
      return paid.ok ? paid.state : null
    },
    choose: {
      key: 'victim',
      prompt: '冰谷弓箭手:让此处的一名单位本回合内战力-1',
                                                    
                                                    
      selector: { type: 'unit', atSelfZone: true, isTarget: true },
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => compileEffect({
      then: [{
        op: 'addMight', target: { ref: 'chosen', key: 'victim' },
        delta: UNL_065_DELTA, duration: 'thisTurn', id: `UNL-065:${selfOid}`,
      }],
    })({ state, selfOid, controller, ev: undefined as never, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_065: Card = {
  id: 'UNL-065', cardNo: 'UNL-065/219', name: '冰谷弓箭手', category: 'unit',
  domains: ['blue'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时可付{1}让此处一名单位本回合[S]-1(makeIceVeilArcher065Trigger)' }],
}
