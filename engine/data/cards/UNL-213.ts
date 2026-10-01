                                                                 
                                                        
  
                                                  
                                                           
                                                                
                                               
                                                                              
  
                                                             
                                                       
                                                    
  
                                                          
                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ActivatedSpec } from '../../src/loop/playSpec'

export const UNL_213_CARD_EFFECT = '此处的单位获得“{{横置}}：获得1经验。”'

                                                                         
export const UNL_213_GRANT_KEY = 'UNL-213:xp'

   
                  
                                                                  
                                                          
                                               
                                            
   
export const UNL_213_GRANTED_SPEC: ActivatedSpec = {
  key: UNL_213_GRANT_KEY,
  label: '{{横置}}:获得1经验',
  cost: {},
  tapSelf: true,
  makeResolve: ({ controller }) => (): readonly GameEvent[] => [
    { kind: 'gainResource', player: controller, experience: 1 } as GameEvent,
  ],
}

export const UNL_213: Card = {
                                                              
  id: 'UNL-213', cardNo: 'UNL-213/219', name: '蜕变花园', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处的单位获得「{横置}:获得1经验」(BF_PASSIVES + grantActivated)' }],
}
