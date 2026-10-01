                                                                 
                                            
                                                                     
                                                                   
                             
import type { Card } from '../../src/dsl/card'

export const VEN_164_CARD_EFFECT = '每个将此处同为友方的一名或多名单位选为目标的法术，其费用减少{{A}}。'
export const VEN_164: Card = {
  id: 'VEN-164', cardNo: 'VEN·164', name: '沙蚀墓穴', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '以此处友方单位为目标的法术减{A}(sandTombCostMods)' }],
}
