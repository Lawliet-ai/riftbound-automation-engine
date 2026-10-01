                                              
                                                                         
                                                                                                                                
                                                  

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { selfOnBattlefield } from './backline-heroes'                             
import { SUBJECT_IS_UNIT } from './notTokenGuard1154'

export const UNL_150_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n' +
  '当对手打出一名单位时，如果我位于战场上，则{{眩晕}}该单位。该对手在本回合内无法移动该单位。（使其在本回合内无法造成战斗伤害。）'

                                                                    
                                                    

                                 
export function makeVegasStunTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [
      { op: 'stun', target: { ref: 'eventSubject' } }, // §423 眩晕该单位(§423.1.a.1 已眩晕不再眩)
                                                                
                                                         
                                                                 
      { op: 'custom',
        emit: ({ ev, state }): readonly GameEvent[] => {
          const t = (ev as { unit?: ObjId }).unit
          const who = (ev as { player?: PlayerId }).player
          if (t === undefined || who === undefined || state.objects[t] === undefined) return []
          return [{
            kind: 'addEffect',
            effect: {
              id: `UNL-150-nomove:${t}`, duration: 'thisTurn', fromPassive: false,
              predicate: (x: { oid: ObjId }) => x.oid === t,
              modification: { kind: 'addRestriction', restriction: `moveBy:${who as string}` },
            },
          } ]
        } },
    ],
  })
  return compileTrigger({
    id: 'UNL-150-stun',
    event: 'playUnit',
    by: 'opponent', // 「当【对手】打出一名单位时」
                                                                 
                                                          
    when: [SUBJECT_IS_UNIT],
    additionalCondition: (state) => selfOnBattlefield(state, selfOid), // §383.2.a.1 如我在战场(㊼ 共用件)
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_150: Card = {
  id: 'UNL-150',
  cardNo: 'UNL-150/219',
  name: '薇古丝',
  category: 'unit', // 英雄单位
  domains: ['purple'],
  energy: 4,
  power: 4,
  keywords: ['法盾'], // §809 自带法盾(值1)
  playModes: [{ kind: 'standard' }],
  abilities: [
    {
      kind: 'triggered',
      trigger: makeVegasStunTrigger('SELF' as ObjId, 'SELF' as PlayerId), // 模板;运行时用 makeVegasStunTrigger 绑定
    },
  ],
}
