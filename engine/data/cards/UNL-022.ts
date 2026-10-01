                                                                         
                                                                 
                                             
                                        
                            
                                                         
                                            
  
           
                                               
                                                                      
                                                  
                                                                                   
                                
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const UNL_022_KEYWORDS: readonly string[] = ['法盾', '游走']
export const UNL_022_GAIN_MANA = 1

export const UNL_022_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n'
  + '{{游走}}（我可以向其他战场进行移动。）\n'
  + '当我移动时，{{获得}}{{1}}和{{A}}。（获得费用资源的技能无法成为其他法术的反应目标。）'

export function makeJhinMoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-022:moved:${selfOid}`, rawId: true, sourceDefId: 'UNL-022',
    event: 'unitMoved', by: 'any', // 谁让我动的都算(卡文没写「你」,㊼ UNL-115)
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】移动时」
                                                         
    effect: (): readonly GameEvent[] => [
      { kind: 'gainResource', player: controller, mana: UNL_022_GAIN_MANA, energy: { '*': 1 } } as GameEvent,
    ],
  }, selfOid, controller)
}

export const UNL_022: Card = {
  id: 'UNL-022', cardNo: 'UNL-022/219', name: '烬', category: 'unit',
  domains: ['red'], energy: 4, power: 4, keywords: [...UNL_022_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当我移动时获得1法力+1任意符能(makeJhinMoveTrigger)' }],
}
