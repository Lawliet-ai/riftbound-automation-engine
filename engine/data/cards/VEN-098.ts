                                                                  
                                               
                                                               
                                                                  
                                                     
import type { Card } from '../../src/dsl/card'

export const VEN_098_CARD_EFFECT = '你从你的废牌堆中打出的{{流转}}法术费用减少{{2}}，不得低于{{1}}。'
export const VEN_098: Card = {
  id: 'VEN-098', cardNo: 'VEN·098', name: '观星者', category: 'unit',
  domains: ['purple'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '废牌堆打出的[流转]法术减费2下限1(stargazerCostMods)' }],
}
