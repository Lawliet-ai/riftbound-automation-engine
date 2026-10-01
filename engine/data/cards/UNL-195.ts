                                                                   
                                                                      
                            
                                            
                                                   
                                                         
  
                 
                                                           
                                               
                                                          
  
                                                                  
                                                                       
                                                             
                                                
                                                            
                                                                           
                                                             
                                                             
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { canDormantSelf } from './dormant-self-cost'

export const UNL_195_CARD_EFFECT =
  '当你征服或据守一处战场时，你可以选择让我变为休眠状态，以此将该战场替换为一个“草丛”战场指示物。'
  + '（位于草丛的“鸟类”、“猫科”、“犬形”、“魄罗”和“艾翁”属性单位获得{{S}}+1。得分后可将其换回原战场。）'

                                                                     
export const GRASS_BF_DEFID = 'token:草丛'

                                                                    
export function makeIvernSwapTrigger(selfOid: ObjId, controller: PlayerId, event: 'conquer' | 'hold'): Trigger {
  return compileTrigger({
    id: `UNL-195-${event}:${selfOid}`, rawId: true, sourceDefId: 'UNL-195',
    event,
    by: 'you', // 「当【你】征服或据守」
    when: [{ kind: 'eventPlayerIs', side: 'you' }, { // conquer/hold 事件自带 player(㊼ OGN-291 双保险)
                                                              
                                                                  
                                                                                
                                                                     
                                                                               
                                                                    
                                                                          
                                                                   
                                                                     
                                                                
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean => canDormantSelf(state, selfOid),
    }],
    mayChoose: true, // ★1448【缺陷 194】§383.3.a 卡文开头就是「你可以选择」⇒ 这一问在【确认阶段】
                                                          
                                                                       
                                                                   
                                                                                
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
                                                           
                                                    
                                                           
                                                      
                                                                    
                                                     
                                                           
                                                       
                                                 
                                          
    effect: (state: GameState, ev, chosen): readonly GameEvent[] => {
                                                     
                                     
      const bf = (ev as { readonly battlefield?: string }).battlefield
      if (bf === undefined) return []
      const cur = state.battlefieldCards?.[bf]
      if (!cur) return []                         
                                                              
      return [
        { kind: 'replaceBattlefieldCard', zoneId: bf as ZoneId, defId: GRASS_BF_DEFID, owner: cur.owner } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const UNL_195: Card = {
  id: 'UNL-195', cardNo: 'UNL-195/219', name: '翠神', category: 'legend',
  domains: ['green', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '征服/据守时可选休眠换草丛(makeIvernSwapTrigger×2);草丛五标签+1(BF_PASSIVES);得分后可换回(EXTRA_BF_TRIGGER_FACTORIES)' },
  ],
}
