                                                                          
                                         
                                     
                           
  
                                                    
                                                             
                                  
                                                
                                                                                
                                                                         
  
                                                     
                                                     
                                                 
  
                                                  
                                                             
                                             

import type { Card } from '../../src/dsl/card'

export const VEN_043_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n' +
  '{{强化7}}（支付{{7}}：强化我。仅在未强化时可用。）\n' +
  '{{已强化>}} 我获得{{S}}+7。'

export const VEN_043: Card = {
  id: 'VEN-043',
  cardNo: 'VEN·043',
  name: '钢爪',
  category: 'unit',
  domains: ['green'],
  energy: 1,
                                               
                                                                        
                                              
  keywords: ['法盾', '强化7'],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[法盾]§809 费用 tax(keywords/deflect)' },
    { kind: 'passive', describe: '[强化7]§827 主动技能(empowerActivationSpecs 通用生成)' },
    { kind: 'passive', describe: '[已强化>]{S}+7(empowered-passives 的 EMPOWERED_MIGHT)' },
  ],
}
