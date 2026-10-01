                                                                
  
                                                        
                                      
                                                             
                                             
                                                          
                                                             
                                              
  
                                                                     
                                      
                                                    

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameObject } from '../../src/state/object'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { battleRoleOf } from '../../src/combat/battleRoles'
import { NO_ENEMY_TARGET } from '../../src/keywords/untargetable'
import { fieldedUnits, pumpEvent } from './activated-batch'

                                                            
export const VEN_038_CARD_EFFECT =
  '除非我处于战斗中，否则我无法被敌方法术和技能选作目标。\n当我移动到一处战场时，给予我在本回合内{{S}}+2。'

   
                                       
                                                   
   
export const akaliUntargetable = (o: GameObject, self: GameObject): boolean =>
  o.oid === self.oid && battleRoleOf(o) === null

   
                                                     
                                                   
                                                           
                                                        
                                                                                
                                           
                                                      
   
export function makeVen038MoveTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'custom', emit: (): readonly GameEvent[] => [pumpEvent(`VEN-038:${selfOid}`, selfOid as string, 2)] }],
  })
  return compileTrigger({
    id: 'VEN-038-move',
    event: 'unitMoved',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }, { kind: 'movedToBattlefield' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_038: Card = {
  id: 'VEN-038', cardNo: 'VEN·038', name: '阿卡丽', category: 'unit', // 英雄单位 → unit
  domains: ['green'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '不在战斗中时敌方不可选我(GROUP_PASSIVES);移动到战场时我+2' }],
}

                                                        
export const VEN_031_CARD_EFFECT =
  '给予一名友方单位在本回合内{{S}}+1。其在本回合内无法被敌方法术和技能选作目标。\n{{流转2}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

                                                                 
export function shroudEvent(id: string, target: string): GameEvent {
  return {
    kind: 'addEffect',
    effect: {
      id, duration: 'thisTurn', fromPassive: false,
      predicate: (o: { oid: string }) => o.oid === target,
      modification: { kind: 'addRestriction', restriction: NO_ENEMY_TARGET },
    },
  } as GameEvent
}

export const VEN_031_SPEC: PlaySpec = {
  defId: 'VEN-031', cardNo: 'VEN·031', name: '我流奥义！霞阵',
  kind: 'spell',
  cost: { mana: 1 },
  keywords: ['流转2'], // §829 [流转X]:可付替代费用从自己废牌堆打出
  target: 'enemyUnit', // 语义=场上单位(PlayTargetKind 暂无泛'unit');**范围由 legalTargets 限成友方**
                                               
  legalTargets: (state, controller) => fieldedUnits(state, { of: controller, friendly: true }) as string[],
  makeResolve:
    ({ target }) =>
    (_state, _chosen, self): readonly GameEvent[] => {
      const t = (self?.rechoice?.target ?? target) as string | undefined
      if (t === undefined) return []
                                            
      return [pumpEvent(`VEN-031:${t}`, t, 1), shroudEvent(`VEN-031-shroud:${t}`, t)]
    },
}
export const VEN_031: Card = {
  id: 'VEN-031', cardNo: 'VEN·031', name: '我流奥义！霞阵', category: 'spell',
  domains: ['green'], energy: 1, keywords: ['流转2'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '给一名友方单位本回合+1并敌方不可选(VEN_031_SPEC)' }],
}

                       
export const UNTARGETABLE_CARDS_DEFIDS: readonly string[] = ['VEN-031', 'VEN-038']

                                                                     
export const UNTARGETABLE_PASSIVE_DEFIDS: readonly string[] = ['SFD-105', 'UNL-059', 'VEN-038']
