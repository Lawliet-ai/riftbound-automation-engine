                                     
                                                      
                                                 
      
                                                         
                          
                                                                
                                                                                
                                                
                                 
import type { Card } from '../../src/dsl/card'
import { scoredHere } from './scored-here'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const UNL_050_CARD_EFFECT = '当我据守一处战场时，在你的下一个主阶段开始时，你可以选择将一名敌方单位移动到此战场。'

export function makeYashira050Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-050:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-050',
    event: 'hold', by: 'you',
    when: [{ kind: 'custom', test: (ev, state) => scoredHere(state, selfOid, ev, ['hold']) }],
    effect: (_state, ev): readonly GameEvent[] => [{
      kind: 'delayedTrigger',
      add: {
        kind: 'moveEnemyAtNextMain',
        id: `UNL-050:${selfOid}`, // 同一只对同一目标只留一条(重复据守 = 顶替,§389 一条待办)
        controller, sourceDefId: 'UNL-050',
        battlefield: (ev as { battlefield: string }).battlefield,
      },
    } as GameEvent],
  }, selfOid, controller)
}

export const UNL_050: Card = {
  id: 'UNL-050', cardNo: 'UNL-050/219', name: '娅希拉', category: 'unit',
  domains: ['green'], energy: 7, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '据守→下个主阶段开始时可选将一名敌方单位移到此战场(makeYashira050Trigger+moveEnemyAtNextMain 延时档)' }],
}
