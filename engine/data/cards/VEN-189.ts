                                                                     
                                                          
                                                 
                                            
                                                    
                                
                                                                           
  
                                                                     
                                                                    
                                                                        
                                                                      
                                                                            
                                                                   
                                                          
                                                             
                                                        
                                                              
                                                              
                                                    
                                                              
                                                                        
                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'
import { moveUnitEvents } from './enemy-move'
import { isEmpowered } from './VEN-194'

export const VEN_189_CARD_EFFECT =
  '{{强化3A}}\n'
  + '{{迅捷>}}{{横置}}：如果这是你的回合，则将一名处于法术对决中的友方单位移动到基地，'
  + '且如果我{{已强化}}，则让该单位变为活跃状态。'

   
                                                                    
                                                      
   
export function duelingFriendlies(state: GameState, controller: PlayerId): string[] {
  if (state.activePlayer !== controller) return []                   
  const at = state.duelBattlefield
  return (fieldedUnits(state, { of: controller, friendly: true }) as string[])
    .filter((oid) => (state.objects[oid as ObjId]?.zone as string | undefined) === at)
    .sort()
}

export const VEN_189_SPEC: ActivatedSpec = {
  key: 'VEN-189:extract',
  label: '{{迅捷}}{{横置}} 将一名法术对决中的友方单位移回基地(已强化则顺带解除休眠)',
  cost: {},
  tapSelf: true,
  keywords: ['迅捷'], // §806 时机权限(spec 那份;印刷表登的是[强化3A],两份各管各的)
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId) => duelingFriendlies(state, controller),
  makeResolve: ({ selfOid, controller, target }) => (state: GameState): readonly GameEvent[] => {
    if (target === undefined) return []
                                  
    if (!duelingFriendlies(state, controller).includes(target)) return []
    const out: GameEvent[] = [
                                  
      ...moveUnitEvents(state, target, `base:${controller}`),
    ]
                                             
    if (isEmpowered(state, selfOid)) {
      out.push({ kind: 'statusChange', target: target as ObjId, key: 'dormant', value: false } as GameEvent)
    }
    return out
  },
}

                                                           
export const VEN_189: Card = {
  id: 'VEN-189', cardNo: 'VEN·189', name: '离群之刺', category: 'legend',
  domains: ['red', 'green'], energy: 0,
  keywords: ['强化3A'], playModes: [], // 纯资源费 ⇒ 交 empowerActivationSpecs 工厂(零代码)
  abilities: [{ kind: 'passive', describe: '[迅捷]横置:你回合把一名对决中友方单位移回基地,已强化则顺带活跃(VEN_189_SPEC);[强化3A]走§827工厂' }],
}
