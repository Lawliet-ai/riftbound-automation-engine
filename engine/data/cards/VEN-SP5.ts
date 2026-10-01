                                                            
        
                            
                                   
  
                                                                          
                                          
                                                 
                                                             
import type { Card } from '../../src/dsl/card'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, type EffectCtx } from '../../src/dsl/effectSpec'

export const VEN_SP5_CARD_EFFECT = '当你打出我时，弃置一张手牌，然后抽两张牌。'
                                                     
export const VEN_SP5_DRAW = 2

                                     
                                                    
                                                        
export function makeEzrealSP5Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
                                              
      { op: 'moveTo', target: { ref: 'chosen', key: 'card' }, zone: (ctx: EffectCtx) => `discard:${ctx.controller}` },
      { op: 'draw', count: VEN_SP5_DRAW },
    ],
  })
  return compileTrigger({
    id: 'VEN-SP5-loot', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card', prompt: '伊泽瑞尔:弃置一张手牌',
      selector: { type: 'any', zone: 'hand', owner: 'you' },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_SP5: Card = {
  id: 'VEN-SP5', cardNo: 'VEN·SP5', name: '伊泽瑞尔', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时弃一抽二(makeEzrealSP5Trigger)+ 可选额外费用减{1}或{A}(ezrealSP5CostMods)' }],
}
