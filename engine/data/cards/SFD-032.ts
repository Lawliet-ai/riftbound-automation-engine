                                                                               
                          
  
                   
                                                                  
                                                                    
  
                               
                                                     
                                                      
                                            
                                                    
                                                      
                                      
                                                                 
                                                               
                                       

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { destroyableEquipment } from './OGN-056'

export const SFD_032_CARD_EFFECT = '当你打出我时，你可以选择摧毁一件装备。'

export function makeSwordRoninTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                               
    guard: (ctx) => {
      const gear = ctx.chosen['gear'] as ObjId | undefined
      return !!gear && destroyableEquipment(ctx.state).includes(gear)
    },
    then: [{ op: 'destroy', target: { ref: 'chosen', key: 'gear' } }],
  })
  return compileTrigger({
    id: 'SFD-032-shatter',
    event: 'playUnit',
    by: 'you',
    mayChoose: true, // §383.3.a「你可以选择」;⚠️ 这张【没有费用】,摧毁就是效果本身
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】」
    nextChoice: (state, _ev, chosen) => {
      if (chosen['gear'] !== undefined) return null
      const cands = destroyableEquipment(state).map((oid) => ({
        id: oid as string, label: `摧毁 ${state.objects[oid]?.defId ?? oid}`,
      }))
      if (cands.length === 0) return null                   
      return {
        itemId: `trig:SFD-032-shatter:${selfOid}`, controller, key: 'gear',
        prompt: '斩剑浪客:摧毁一件装备', candidates: cands,
        isTarget: true, // ★1782 你可以选择摧毁一件装备
      }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_032: Card = {
  id: 'SFD-032',
  cardNo: 'SFD·032/221',
  name: '斩剑浪客',
  category: 'unit',
  domains: ['green'],
  energy: 3,
  power: 2,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '当你打出我时,可摧毁一件装备(makeSwordRoninTrigger)' },
  ],
}
