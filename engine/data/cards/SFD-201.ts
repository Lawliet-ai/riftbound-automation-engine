                                                                   
                                                          
                                                     
                                              
                 
                                                         
  
                                                  
                                                          
                                                         
                                      
                                                     
                                                   
                                                                        
                                                                                  
                                                              
                                   
                                                              
                                                       
                                          
                                                                
                                               
                                                                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { GameState } from '../../src/state/gameState'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { canDormantSelf } from './dormant-self-cost'
import { GOLD_TOKEN } from './gear-triggers'
import type { GameEvent } from '../../src/loop/events'
import { applyEvents } from '../../src/loop/reduce'                                            
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'

export const SFD_201_CARD_EFFECT =
  '当你或一名友方玩家据守一处战场时，你可以选择让我变为休眠状态，以此打出一个休眠的"金币"装备指示物。\n'
  + '如果你的得分距离胜利得分不超过3分，则你的"金币"装备指示物的{{获得}}效果额外产生{{1}}。'

                                             
export const ALCHEMY_BARON_DEFIDS: readonly string[] = ['SFD-201', 'SFD-249']
                                     
export const BARON_SCORE_GAP = 3

   
                                           
                                                   
   
export function alchemyBaronGoldBonus(state: GameState, goldController: PlayerId): boolean {
  if (state.winTarget - (state.scores[goldController as string] ?? 0) > BARON_SCORE_GAP) return false
  return Object.values(state.objects).some((o) =>
    ALCHEMY_BARON_DEFIDS.includes(o.defId)
    && o.controller === goldController
    && state.zones[o.zone]?.kind === 'legend')
}

                                                   
export function makeAlchemyBaronTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                                
  const effect = compileEffect({
    then: [{
      op: 'spawnToken', spec: GOLD_TOKEN,
      zone: (ctx) => `base:${ctx.controller}`, dormant: true, // 「打出一个【休眠的】金币装备指示物」
    }],
  })
  return compileTrigger({
    id: 'SFD-201-gold',
    event: 'hold',
    by: 'you', // 「你或一名友方玩家」:引擎无队伍概念,1v1 友方玩家=∅ ⇒ 等价(多人队伍系统缺口同 SFD-086)
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
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

export const SFD_201: Card = {
  id: 'SFD-201', cardNo: 'SFD·201/221', name: '炼金男爵', category: 'legend',
  domains: ['blue', 'yellow'], energy: 0, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '据守时可休眠自己换一个休眠金币(makeAlchemyBaronTrigger);分差≤3 时你的金币{获得}额外+{1}(alchemyBaronGoldBonus→金币 resolve)' },
  ],
}
