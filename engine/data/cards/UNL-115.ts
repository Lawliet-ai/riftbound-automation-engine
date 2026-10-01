                                                     
                                          
                                              
                            
                    
  
          
                                          
                                          
  
                                              
                                                                   
                               
                                                     
                                                  
                                                       
                                                
                               
                                                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                     
export const UNL_115_KEYWORDS: readonly string[] = ['急速', '游走']
                                
export const UNL_115_XP = 1

export const UNL_115_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{橙色}}，让我以活跃状态进场。）\n'
  + '{{游走}}（我可以向其他战场进行移动。）\n'
  + '当我移动时，获得1经验。'

export function makeNilahMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                    
  const effect = compileEffect({ then: [{ op: 'gainExperience', amount: UNL_115_XP }] })
  return compileTrigger({
    id: `UNL-115:moved:${selfOid}`, rawId: true, sourceDefId: 'UNL-115',
    event: 'unitMoved', by: 'any', // 谁让我动的都算(卡文没写"你")
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】移动时」
                                                              
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_115: Card = {
  id: 'UNL-115', cardNo: 'UNL-115/219', name: '尼菈', category: 'unit',
  domains: ['orange'], energy: 3, power: 4, keywords: [...UNL_115_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当我移动时获得1经验(makeNilahMoveTrigger)' }],
}
