                                                                    
                                        
                                                     
                                              
  
                                                       
                                                            
                                                                
                                       
                                                      
                                                      
                                                
                                                       
  
                          
                                                                  
                                               
                                                                   
                                                                           
                                                                     
                                                                               
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { SPRITE_TOKEN } from './batch-play-triggers'

export const UNL_078_CARD_EFFECT =
  '{{瞬息}}（在其控制者的开始阶段开始时，结算得分之前将其摧毁。）\n' +
  '当你打出此牌时，打出一名活跃状态的3{{S}}“精灵”到你的基地，它拥有{{瞬息}}。\n' +
  '{{绝念>}} 重复此装备的打出效果。（当此牌被摧毁后，发动此效果。）'

export const UNL_078_KEYWORDS: readonly string[] = ['瞬息', '绝念']

   
                                             
                                              
   
export function unl078Sprite(controller: PlayerId): readonly GameEvent[] {
  return [{
    kind: 'spawnToken', spec: SPRITE_TOKEN as never,
    zone: `base:${controller}` as ZoneId, owner: controller,
    ready: true, // 卡文写了「活跃状态的」才豁免 §359.2.c 的休眠进场
  } as GameEvent]
}

                                                   
export function makeSpriteLanternPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (ctx): readonly GameEvent[] => unl078Sprite(ctx.controller) }],
  })
  return compileTrigger({
    id: 'UNL-078:play',
    event: 'playUnit',
    by: 'any',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_078: Card = {
  id: 'UNL-078', cardNo: 'UNL-078/219', name: '精灵提灯', category: 'equipment',
  domains: ['blue'], energy: 2, keywords: [...UNL_078_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '瞬息;打出时出一枚活跃的3[M]精灵;绝念—重复打出效果(UNL_078)' }],
}
