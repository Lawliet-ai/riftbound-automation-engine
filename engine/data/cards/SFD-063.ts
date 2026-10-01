                                                                 
                                      
                           
  
                  
                                                            
                                                 
                                                                              
                                                                 
                                                                 
  
                                               
                                           
                                   
                                     
                                           
                                                 

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { canDormantSelf } from './dormant-self-cost'
import { GOLD_TOKEN } from './gear-triggers'
import type { GameState } from '../../src/state/gameState'
import { applyEvents } from '../../src/loop/reduce'                                            
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'

export const SFD_063_CARD_EFFECT =
  '当你在对手的回合内打出一张法术牌时，你可以选择让我变为休眠状态，' +
  '以此打出一个休眠的“金币”装备指示物。'

   
                        
                                                              
                         
   
export function onOpponentTurn(state: { activePlayer: PlayerId }, controller: PlayerId): boolean {
  return state.activePlayer !== controller
}

export function makeAlchemyBarrelTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                     
                                           
                                                                                                                
  const effect = compileEffect({
    then: [{
      op: 'spawnToken', spec: GOLD_TOKEN,
      zone: (ctx) => `base:${ctx.controller}`, dormant: true, // 「打出一个【休眠的】金币装备指示物」
    }],
  })
  return compileTrigger({
    id: 'SFD-063-gold',
                                                           
                                                                          
                                                                        
                                                 
    event: 'spellResolved',
    by: 'you', // 「当【你】…打出一张法术牌时」
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'onOpponentTurn' }, // 「在【对手的】回合内」
      { kind: 'custom', test: (_ev, state) => canDormantSelf(state, selfOid) }, // 入链门槛:付得出这项费用
    ],
                                                
                                                                                         
                                                                     
                                                             
                                                                                                 
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_063: Card = {
  id: 'SFD-063',
  cardNo: 'SFD·063/221',
  name: '炼金科技桶',
  category: 'equipment',
  domains: ['blue'],
  energy: 1,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '对手回合内你打出法术时可休眠此牌换一个休眠金币(makeAlchemyBarrelTrigger)' },
  ],
}
