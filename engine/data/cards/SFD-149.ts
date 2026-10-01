                                                            
                               
                                                   
                                       
                                                                                                          
                                        
  
                                                          
                                                  
                                                    
                                                         
                                                    
                       
import type { Card } from '../../src/dsl/card'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, type EffectCtx } from '../../src/dsl/effectSpec'
import { VEN_SP5_DRAW } from './VEN-SP5'

                                                                                       
export const SFD_149_CARD_EFFECT =
  '当你打出我时，弃置一张手牌，然后抽两张牌。\n你支付的可选额外费用，其费用减少{{1}}或{{A}}。'
                                                
export const SFD_149_DRAW = VEN_SP5_DRAW

export function makeEzreal149Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'moveTo', target: { ref: 'chosen', key: 'card' }, zone: (ctx: EffectCtx) => `discard:${ctx.controller}` },
      { op: 'draw', count: SFD_149_DRAW },
    ],
  })
  return compileTrigger({
    id: 'SFD-149-loot', event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    choose: {
      key: 'card', prompt: '伊泽瑞尔:弃置一张手牌',
      selector: { type: 'any', zone: 'hand', owner: 'you' },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_149: Card = {
  id: 'SFD-149', cardNo: 'SFD·149/221', name: '伊泽瑞尔', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时弃一抽二(makeEzreal149Trigger)+ 其他卡牌的可选额外费用减{1}或{A}(ezreal149CostMods)' }],
}
