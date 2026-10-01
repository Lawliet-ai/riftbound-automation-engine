                                                                      
                                                             
                                              
                                                 
                                                      
                            
  
               
                                                                  
                                                                 
                                                                  
                                                              
                                                                     
                                                          
                                                              
                                                           
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { runeCountOf } from './VEN-006'

export const VEN_019_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{红色}}，让我以活跃状态进场。）\n'
  + '当我进攻时，如果你控制的符文数量不超过四枚，则对此处的所有敌方单位各造成2点伤害。'

export const VEN_019_DAMAGE = 2
export const VEN_019_RUNE_CAP = 4

export function makeRenekton019Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-019:attack:${selfOid}`, rawId: true, sourceDefId: 'VEN-019',
    event: 'attack', by: 'you',
    when: [
      { kind: 'subjectIsSelf' }, // 「当【我】进攻时」
                                                              
      { kind: 'custom', test: (_ev: GameEvent, state): boolean => runeCountOf(state, controller) <= VEN_019_RUNE_CAP },
    ],
    activeZone: ['battlefield'], // §383.2.c 进攻触发只在场上有意义
                                                   
    effect: (state): readonly GameEvent[] => {
      const me = state.objects[selfOid]
      if (!me) return []
      return Object.values(state.objects)
        .filter((o) => (o.zone as string) === (me.zone as string)
          && isUnit(o)                                                           
          && o.controller !== controller)            
        .map((o) => ({ kind: 'damage', target: o.oid, amount: VEN_019_DAMAGE, source: selfOid, sourcePlayer: controller } as GameEvent))
    },
  }, selfOid, controller)
}

export const VEN_019: Card = {
  id: 'VEN-019', cardNo: 'VEN·019', name: '雷克顿', category: 'unit',
  domains: ['red'], energy: 6, power: 6, keywords: ['急速'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '急速;当我进攻时若你符文≤4,对此处所有敌方各2点(makeRenekton019Trigger)' }],
}
