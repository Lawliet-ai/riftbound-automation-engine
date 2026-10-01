                                                                                
                                              
                                                                        

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'

export const OGN_197_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '当你打出我时，让我本回合内{{S}}+3。'

                                                        
export function makeScoutTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 3, duration: 'thisTurn', id: 'OGN-197-buff' }],
  })
  return compileTrigger({
    id: 'OGN-197-buff',
    event: 'playUnit',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】时」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_197: Card = {
  id: 'OGN-197',
  cardNo: 'OGN·197/298',
  name: '提莫·斥候',
  category: 'unit',
  domains: ['purple'],
  energy: 2,
  power: 1,
  keywords: ['待命'],
  playModes: [{ kind: 'standard' }, { kind: 'hidden' }],
  abilities: [{ kind: 'passive', describe: '当你打出我时,让我本回合内[M]+3(triggered 经 makeScoutTrigger 注册)' }],
}
