                                                                   
                                                               
                             
                                                   
                                                               
                                                      
                                                           
                                                       
                           
  
                                                                        
                                           
  
                                                 
                                                          
                                                              
                                                 
                                                      
                                                               
                                                                
                          
  
                                                       
                                                                           
                                                                                
                                                                   
  
                                               
                                                                                  
                                                                    
                                                  
  
                                                                  
                                                                  
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'

export const VEN_142_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n' +
  '在本回合内，让一名单位的战力翻倍，并给予其“{{A}}{{A}}：让我变为活跃状态。”'

                                                                         
export const VEN_142_GRANT_KEY = 'VEN-142:ready'

   
                                                                 
                                       
   
export const VEN_142_ABILITY_COST = { pips: [[], []] as readonly (readonly string[])[] }

   
                         
                                                          
                                                          
                                                                  
                                                
                                                             
                                                       
                                                             
   
export const VEN_142_GRANTED_SPEC: ActivatedSpec = {
  key: VEN_142_GRANT_KEY,
  label: '支付 2 点任意符能:让我变为活跃状态',
  cost: VEN_142_ABILITY_COST,
  makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [
    { kind: 'statusChange', target: selfOid as ObjId, key: 'dormant', value: false } as GameEvent,
  ],
}
