                                                                      
                                                                                 
                                                     
                               
                                     
                     
  
                                                                         
                                                             
                                     
  
                     
                                                                   
                               
                                                                    
                                                                   
                                                               
                                                                                       
                                                          
  
                                                      
                                                                           
                                                    
                                          
                                                            
                                                        
                                           
                                                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ObjId } from '../../src/state/ids'

export const OGN_078_CARD_EFFECT =
  '{{坚守}}（如果我是防守方，则{{S}}+1。）\n'
  + '{{横置}}：给予我增益。（我获得一个{{S}}+1增益。）\n'
  + '我可以拥有不限数量的增益。'

                                                        
export const OGN_078_KEYWORDS: readonly string[] = ['坚守']

   
                          
                                                            
                                                          
   
export const OGN_078_BUFF_LIMIT = 9999

                                                
export const OGN_078_TAP_KEY = 'OGN-078:buff'

   
                  
                                                                      
                                                     
                                                                  
                                                                    
                                                              
   
export const OGN_078_SPEC: ActivatedSpec = {
  key: OGN_078_TAP_KEY,
  label: '{{横置}}:给予我增益',
  cost: {},
  tapSelf: true,
  makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [
    { kind: 'grantBuff', target: selfOid as ObjId } as GameEvent,
  ],
}

const leeSin = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '李青', category: 'unit',
  domains: ['green'], energy: 5, power: 5, keywords: [...OGN_078_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[坚守];[横置]给予我增益(OGN_078_SPEC);我可拥有不限数量的增益(GROUP_PASSIVES)' }],
})
                                                     
export const OGN_078: Card = leeSin('OGN-078', 'OGN·078/298')
