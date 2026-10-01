                                                                      
                                                              
                                                  
                                      
                                     
  
                                                       
                                                                          
                                                  
                                                                           
                                      
                                                    
                                                                      
                                              
                                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { fieldedUnits } from './activated-batch'                                                                            
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { applyEvents } from '../../src/loop/reduce'                                            
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { canDormantSelf } from './dormant-self-cost'
import { excessOf } from './excess-conquer'

export const UNL_187_CARD_EFFECT =
  '当你征服一处战场时，如果你给敌方单位分配了不低于3点的过量伤害，'
  + '则你可以选择让我变为休眠状态，以此让一名单位变为活跃状态。'

                                               
export const ENFORCER_EXCESS_MIN = 3
                                                    
                                                      
const PICK_VICTIM = 'enforcerVictim'

                                       
export function makeEnforcerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                             
                                               
                                         
                                                          
                                               
                                            
                                                           
                                                    
                                                           
                                                                              
                                 
                                                             
  return compileTrigger({
    id: `UNL-187-ready:${selfOid}`, rawId: true, sourceDefId: 'UNL-187',
    event: 'conquer',
    by: 'you',
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「当【你】征服」(传奇不在场,无 selfAt)
      { kind: 'custom', test: (_ev, state): boolean => excessOf(state as GameState, controller) >= ENFORCER_EXCESS_MIN },
                                                                        
                                                                       
      { kind: 'custom', test: (_ev, state): boolean => canDormantSelf(state as GameState, selfOid) },
    ],
    mayChoose: true, // ★1500【§383.3.a】那一问搬到**确认阶段**(依据见上:§383.2.a.1)
                                                                      
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
    nextChoice: (state: GameState, _ev, chosen) => {
                                                      
      if (chosen[PICK_VICTIM] !== undefined) return null
                                                     
                                                                 
                                                                          
      const cands = fieldedUnits(state)
      if (cands.length === 0) return null
      return {
        itemId: `trig:UNL-187-ready:${selfOid}`, controller, key: PICK_VICTIM, isTarget: true,
        prompt: '皮城执法官:选一名单位,让其变为活跃状态',
        candidates: cands.map((oid) => ({ id: oid, label: state.objects[oid as ObjId]?.defId ?? oid })),
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
                                                   
                                                             
      const v = chosen?.[PICK_VICTIM]
      if (v === undefined || state.objects[v as ObjId] === undefined) return []                           
      return [{ kind: 'statusChange', target: v as ObjId, key: 'dormant', value: false } as GameEvent]
    },
  }, selfOid, controller)
}
export const UNL_187: Card = {
  id: 'UNL-187', cardNo: 'UNL-187/219', name: '皮城执法官', category: 'legend',
  domains: ['red', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [
    { kind: 'passive', describe: '你征服+单次过量≥3⇒可选休眠让一名单位变活跃(makeEnforcerTrigger)' },
  ],
}
