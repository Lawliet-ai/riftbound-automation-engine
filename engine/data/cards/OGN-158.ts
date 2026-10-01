                                                                 
                                                          
                                 
                           
                                          
  
            
                                                            
                                               
                                       
  
           
                                                        
                                                          
                                                    
                                                
                           

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const OGN_158_CARD_EFFECT =
  '{{坚守3}}（如果我是防守方，则{{S}}+3。）\n' +
  '{{壁垒}}（我在战斗中首先承担伤害。）\n' +
  '每当对手移动单位到我不在的其他战场时，你抽一张牌。（基地不算作战场。）'

                                  
export function makeVolibearTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'draw', count: 1 }],
  })
  return compileTrigger({
    id: `OGN-158-move-draw:${selfOid}`, rawId: true,
    sourceDefId: 'OGN-158',
    event: 'unitMoved',
    by: 'opponent', // 「【对手】移动单位」
    when: [{
      kind: 'custom',
      test: (ev, state) => {
        if (ev.kind !== 'unitMoved') return false
                                        
        const z = state.zones[ev.to]
        if (!z || z.kind !== 'battlefield') return false
        return state.objects[selfOid]?.zone !== ev.to
      },
    }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_158: Card = {
  id: 'OGN-158', cardNo: 'OGN·158/298', name: '沃利贝尔', category: 'unit',
  domains: ['orange'], energy: 12, power: 10, keywords: ['坚守3', '壁垒'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[坚守3]§814 防守方时 S+3(通用求值)' },
    { kind: 'passive', describe: '[壁垒]§465.2.c.6 战斗中首先承担伤害' },
    { kind: 'passive', describe: '对手移动单位到我不在的其他战场时你抽一张牌(makeVolibearTrigger)' },
  ],
}

export const OGN_158A: Card = { ...OGN_158, id: 'OGN-158a', cardNo: 'OGN·158a/298' }
