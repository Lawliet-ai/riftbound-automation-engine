                                                                
                                              
  
                                                     
                                                       
                                          
                                                                       
  
                                            
                                                   
                                                            
  
                                   
                                          
                                     
                                                             
                                             
  
                                                       
                                               
                                            
                                                         

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { canDormantSelf } from './dormant-self-cost'

export const OGN_072_CARD_EFFECT =
  '每当你摧毁一名被眩晕的敌方单位时，你可以选择让此牌变为休眠状态，以此抽一张牌。'

export function makeSunAltarTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                           
                                                            
  const effect = compileEffect({
    cost: {
      nonResource: { dormantSelf: true }, // 装备的"休眠"=横置
      canPayNonResource: (state, self) => canDormantSelf(state, self),
    },
    then: [{ op: 'draw', count: 1 }],
  })
  return compileTrigger({
    id: 'OGN-072-draw',
    event: 'destroyed',
    by: 'you', // 「每当【你】摧毁…」;§428.5.c 归因由 destroyed 事件自带
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'victimIs', portrait: { types: ['unit'], side: 'enemy', stunned: true } },
      { kind: 'custom', test: (_ev, state) => canDormantSelf(state, selfOid) }, // 入链门槛:付得出这项费用
    ],
                                                     
                                                             
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_072: Card = {
  id: 'OGN-072',
  cardNo: 'OGN·072/298',
  name: '烈阳圣坛',
  category: 'equipment',
  domains: ['green'],
  energy: 3,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '摧毁被眩晕的敌方单位时可休眠此牌抽一张(makeSunAltarTrigger)' },
  ],
}
