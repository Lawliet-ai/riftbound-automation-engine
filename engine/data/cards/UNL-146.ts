                                                                      
                                             
                                         
  
                                                       
                             
                                      
                                                                            
                                                              
                                   
                                               
                                                                                      
                                                                  
                                                      
                                       
                                              
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { Cost } from '../../src/state/runePool'

export const UNL_146_CARD_EFFECT = '如果我处于法术对决中，则你的法术获得{{回响}}{{2}}{{紫色}}。'

                                                       
export const SYNDRA_ECHO_COST: Cost = { mana: 2, pips: [['purple']] }

   
                                              
                                               
   
export function syndraEchoGrants(state: GameState, player: string): readonly Cost[] {
                                                                      
                                                                                  
                                                                                  
                                             
                                                                 
                                     
                                                       
  const at = state.duelBattlefield
  return Object.values(state.objects)
    .filter((o) => o.defId === 'UNL-146'
      && (o.controller as string) === player                        
      && (o.zone as string) === at)                                      
    .map(() => SYNDRA_ECHO_COST)
}

export const UNL_146: Card = {
  id: 'UNL-146', cardNo: 'UNL-146/219', name: '辛德拉', category: 'unit',
  domains: ['purple'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '我处于法术对决中 ⇒ 你的法术获得[回响]{2}{紫色}(syndraEchoGrants→setSpellEchoGrantProvider)' },
  ],
}
