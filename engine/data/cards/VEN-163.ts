                                                                  
                                      
                                                                      
                                                      
                                                      
import type { Card } from '../../src/dsl/card'

export const VEN_163_CARD_EFFECT = '你在此处的单位的{{强化}}费用减少{{1}}或{{A}}。'
export const VEN_163: Card = {
  id: 'VEN-163', cardNo: 'VEN·163', name: '升格圣坛', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处友方单位的[强化]费用减{1}或{A}(ascendantAltarAbilityMods)' }],
}
