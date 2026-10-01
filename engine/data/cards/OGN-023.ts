                                                                
                                                                                  
                                                         
                                                       
  
                                                     
                                                              
                                                          
                                                                        
                                                                    
                                            
                                                     
                                                                
  
                                                         
                                                     
                                                     
                                                  
                                    
                                                      
                                     
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { isUnit } from '../../src/state/cardTypes'
import { payFromState } from '../../src/game/economy'
import { clearDamageDormantRecall } from '../../src/state/recall'
import { clearTurnShieldInState, turnShieldsOf } from '../../src/effects/turnShields'
import { onField } from './activated-batch2'

export const OGN_023_CARD_EFFECT =
  '弃置一张手牌，{{横置}}：选择一名友方单位。本回合内，当它下次被摧毁时，你可以选择支付{{红色}}，' +
  '以此改为移除其所受伤害、让其进入休眠状态、并将其召回。（把该单位送回基地，此行动不算作移动。）'

                                                        
export const OGN_023_RECALL_COST: Cost = { pips: [['red']] }

                                     
export function ownFieldedUnits(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && onField(state, o))
    .map((o) => o.oid as string)
    .sort()
}

   
                                                         
                                            
  
                                                               
                                                        
   
export function recallInsteadOfDestroy(state: GameState, hostOid: ObjId): GameState | null {
  const mark = turnShieldsOf(state, hostOid).recallOnNextDestroy
  const host = state.objects[hostOid]
  if (mark === undefined || host === undefined) return null
                                       
                                                                     
                                                          
                                                            
                                                    
  const paid = mark.free ? { ok: true as const, state } : payFromState(state, mark.payer, OGN_023_RECALL_COST)
  if (!paid.ok) return null
                           
  let s = clearTurnShieldInState(paid.state, hostOid, 'recallOnNextDestroy')
                                                                       
  return clearDamageDormantRecall(s, hostOid)
}

export const OGN_023_SPEC: ActivatedSpec = {
  key: 'OGN-023:ward',
  label: '弃置一张手牌并{{横置}}:选一名友方单位,本回合它下次被摧毁时可付炽烈符能改为休眠召回',
  cost: {}, // 冒号前的两截都不是资源费(§204.1.b)
  discard: 1,
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, controller): string[] => ownFieldedUnits(state, controller),
  makeResolve: ({ target, controller }) => (state: GameState): readonly GameEvent[] => {
    if (target === undefined || state.objects[target as ObjId] === undefined) return []           
    return [{
      kind: 'markTurnShield', target: target as ObjId, mark: { recallOnNextDestroy: { payer: controller } },
    }]
  },
}

export const OGN_023: Card = {
  id: 'OGN-023', cardNo: 'OGN·023/298', name: '来路不明的武器', category: 'equipment',
  domains: ['red'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[弃牌+横置]选友方单位:本回合它下次被摧毁可付{红}改为休眠召回(OGN_023_SPEC)' }],
}
