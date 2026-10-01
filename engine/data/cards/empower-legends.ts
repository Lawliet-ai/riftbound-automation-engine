                                                 
  
                                                 
                                
  
                           
                                                
                                                       
  
        
                                          
                                                     
                                         
                              
  
                                                  
                                                         
                        

import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { fieldedUnits } from './activated-batch'                          
import type { Trigger } from '../../src/dsl/trigger'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                          
export function makeEmpowerOnOtherTrigger(selfOid: ObjId, controller: PlayerId, defId: string): Trigger {
                       
                                                                 
                                    
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (): readonly GameEvent[] => [{ kind: 'empower', target: selfOid }] }],
  })
  return compileTrigger({
    id: `${defId}:empowerOnOther:${selfOid}`,
    rawId: true, // id 已自带 selfOid
    sourceDefId: defId,
    event: 'empower',
    when: [
                              
      { kind: 'custom', test: (ev) => ev.kind === 'empower' && ev.target !== selfOid },
                                          
      { kind: 'eventTargetIs', portrait: { side: 'friendly' } },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                                          
                                                             
                                    

   
                        
                     
                                        
              
   
export const MIRROR_LEGEND_SPEC = {
  key: 'VEN-151:minus2',
  label: '解除我的强化并{{横置}}:战场上一名单位本回合战力-2',
  cost: {}, // 冒号前只有非资源费用,没有资源费——别想当然补
  tapSelf: true, // [横置]
  unempowerSelf: true, // §442 解除我的强化(第85轮起走引擎的一等费用,不再借 extraCost)
  target: 'custom' as const,
  legalTargets: (state: GameState): string[] =>
    Object.values(state.objects)
      .filter((o) => state.zones[o.zone]?.kind === 'battlefield' && isUnit(o))                                                          
      .map((o) => o.oid as string)
      .sort(),
  makeResolve: ({ target }: { selfOid: string; controller: PlayerId; target?: string }) =>
    (): readonly GameEvent[] =>
      target === undefined ? [] : [{
        kind: 'addEffect',
        effect: {
          id: `VEN-151:minus2:${target}`,
          duration: 'thisTurn',
          fromPassive: false,
          predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
          modification: { kind: 'addMight', delta: -2 },
        },
      }],
}

                                 
export const EMPOWER_ON_OTHER_DEFIDS: readonly string[] = ['VEN-151', 'VEN-195', 'VEN-153', 'VEN-196']

   
                                  
                                                
                                            
                                             
  
                                                         
                                              
                                                       
                                                          
                                    
   
export const IRONBLOOD_LEGEND_SPEC: ActivatedSpec = {
  key: 'VEN-153:ready',
  label: '解除我的强化,支付 1 点任意符能并{{横置}}:让一名单位变为活跃状态',
  cost: { mana: 0, pips: [[]] }, // {A}=一枚任意特性符能
  tapSelf: true,
  unempowerSelf: true,
  target: 'custom',
  legalTargets: (state: GameState): string[] =>
    fieldedUnits(state), // ★1515:折到共用件(㊼ 「一名单位」零限定;判据逐字等价,含 §187.6 映像那一档)
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'statusChange', target: target as ObjId, key: 'dormant', value: false }],
}
