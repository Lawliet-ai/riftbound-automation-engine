                                                         
                                                     
                                                                              

import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'

export const OGN_101_CARD_EFFECT =
  '在你的回合开始阶段，如果你在战场上控制着一张正面朝下的待命牌，则抽一张牌。'

                                            
export function controlsFaceDownStandby(state: GameState, player: PlayerId): boolean {
  return zonesByKind(state, 'standby').some((z) =>
    z.contents.some((oid) => {
      const o = state.objects[oid]
      return !!o && o.controller === player && o.status.faceDown === true
    }),
  )
}

export function makeMushroomBagTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 1 }] })
  return compileTrigger({
    id: 'OGN-101-draw',
    event: 'startPhase',
    by: 'you', // 「在【你的】回合开始阶段」
                                                
    additionalCondition: (state) => controlsFaceDownStandby(state, controller),
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 「在【你的】回合开始阶段」——事件自带 player
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_101: Card = {
  id: 'OGN-101',
  cardNo: 'OGN·101/298',
  name: '蘑菇袋',
  category: 'equipment',
  domains: ['blue'],
  energy: 2,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你的回合开始阶段,控有面朝下待命牌则抽1(triggered 经 makeMushroomBagTrigger)' }],
}
