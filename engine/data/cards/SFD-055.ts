                                                                 
                                                       
                                
                           
                                             
  
                                                   
                                                         
                                                                        
                                  
                                                               
                                                                          
                                                                                     
                                                                 
import type { Card } from '../../src/dsl/card'

export const SFD_055_CARD_EFFECT =
  '{{坚守5}}（如果我是防守方，则{{S}}+5。）\n'
  + '{{壁垒}}（我在战斗中首先承担伤害。）\n'
  + '在本回合内，你每通过据守获得1分，我的费用就减少{{2}}和{{绿色}}。'

export const SFD_055: Card = {
  id: 'SFD-055', cardNo: 'SFD·055/221', name: '超大型约德尔人', category: 'unit',
  domains: ['green'], energy: 10, power: 5, keywords: ['坚守5', '壁垒'],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合每据守一次(不论得分,QA L212),打出费用减{2}+1绿pip(giantYordleCostMods)' }],
}
