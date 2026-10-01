                                                                     
                                                                  
                                                       
                                                          
                                                 
                           
  
                                                     
                                                            
                         
                                                                
                                                                      
                                                      
                                                             
                                                                
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { POWERFUL_MIN_MIGHT } from './conditional-self-passives'
import { canDormantSelf } from './dormant-self-cost'

export const SFD_205_CARD_EFFECT =
  '当你的一名单位变为{{强力}}时，你可以选择让我变为休眠状态，以此召出一枚休眠的符文。'
  + '（战力达到5或以上时，即为强力单位。）'


                                         
export function makeGrandDuelistTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-205-summon:${selfOid}`, rawId: true, sourceDefId: 'SFD-205',
    event: 'mightCrossed',
    when: [{
      kind: 'custom',
                                                           
      test: (ev, _state, _self, ctrl): boolean => {
        const e = ev as { readonly controller?: PlayerId; readonly from?: number; readonly to?: number }
        return e.controller === ctrl && e.from !== undefined && e.to !== undefined
          && e.from < POWERFUL_MIN_MIGHT && e.to >= POWERFUL_MIN_MIGHT
      },
    }],
    mayChoose: true, // ★1444【缺陷 194】§383.3.a 卡文开头就是「你可以选择」⇒ 这一问在【确认阶段】
                                                            
                                                                   
                                                                             
                                                                            
                                                                    
                         
                                                                           
                                                           
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
                                                       
                                                     
    effect: (): readonly GameEvent[] => [
      { kind: 'summonRune', player: controller, count: 1, dormant: true } as GameEvent,
    ],
  }, selfOid, controller)
}

export const SFD_205: Card = {
  id: 'SFD-205', cardNo: 'SFD·205/221', name: '无双剑姬', category: 'legend',
  domains: ['orange', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '你的单位变为强力时可选休眠召一枚休眠符文(makeGrandDuelistTrigger×mightCrossed)' },
  ],
}
