                                                                       
                                                                              
                                              
                                   
                                                                   
                                                                     
                                                        
  
                                
                                                                      
                                                         
                                                             
                                                          
                                                             
                                               
  
                           
                                                                
                                       
                                                            
                                                         
                                               
                                                                            
                        
import type { Card } from '../../src/dsl/card'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'
import { hasBuff } from '../../src/keywords/buff'
import { selfBattlefield } from '../../src/state/selfHere'                    

export const OGN_151_CARD_EFFECT =
  '{{急速}}(你可以选择额外支付{{1}}和{{橙色}},让我以活跃状态进场。）\n我所在战场上其他拥有增益的友方单位获得{{S}}+2。'

                                                        
export const OGN_151_KEYWORDS: readonly string[] = ['急速']

                                          
export const OGN_151_BONUS = 2

   
                                                
                                                                   
   
export function leeSinScope(o: GameObject, self: GameObject, state: GameState): boolean {
  const here = selfBattlefield(state, self.oid)           
  if (here === undefined) return false
  if ((o.zone as string) !== here) return false
  if (o.oid === self.oid) return false                   
  return isUnit(o) && o.controller === self.controller && hasBuff(o)
}

const leeSin = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '李青', category: 'unit',
  domains: ['orange'], energy: 6, power: 6, keywords: [...OGN_151_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[急速];我所在战场上其他拥有增益的友方单位[S]+2(GROUP_PASSIVES)' }],
})
                                                  
export const OGN_151: Card = leeSin('OGN-151', 'OGN·151/298')
