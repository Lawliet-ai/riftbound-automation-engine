                                                                    
                                 
  
                                                
                                                                                 
  
                                   
                                           
                                                               
                                               
                                                                 
                                                               
                                                    
                                            
  
                                 
                                             
                                                      
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { onField } from './activated-batch2'

                                                   
export const OGN_236_CARD_EFFECT = '你的所有{{绝念}}效果额外触发一次。'

                                
export function karthusCount(state: GameState, controller: PlayerId): number {
  return Object.values(state.objects)
    .filter((o) => o.defId === 'OGN-236' && o.controller === controller && onField(state, o))
    .length
}

   
                                      
                                                    
   
export function lastRitesRepeats(state: GameState, controller: PlayerId): number {
  return 1 + karthusCount(state, controller)
}

export const OGN_236: Card = {
  id: 'OGN-236', cardNo: 'OGN·236/298', name: '卡尔萨斯 - 永恒颂葬', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '常驻:你的每个[绝念]效果额外触发一次(lastRitesRepeats)' }],
}
