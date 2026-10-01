                                                                   
                                        
                                   
                                     
                                                                       
                                                    
                                                                            
                                                          
                                                                              
  
                                             
                                                                
                                        
                                   
                                                                  
                                                                   
                                                           
                                                         
                                                               
                                              
  
                                                              
                                                                  
                                             
                                                
                                                                           
                                                         
                                                                            
                                                     
                                     
import type { Card } from '../../src/dsl/card'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { isStunned } from '../../src/keywords/stun'
import { selfBattlefield } from '../../src/state/selfHere'              
import { opponentsOf } from './OGN-156'

export const OGN_079_CARD_EFFECT =
  '如果对手的得分距离胜利得分不超过3分，则我以活跃状态进场。\n此处被眩晕的敌方单位{{S}}-8,不得低于1{{S}}。'

                                                      
export const OGN_079_SCORE_GAP = 3
                   
export const OGN_079_MIGHT_DELTA = -8
                                      
export const OGN_079_MIGHT_FLOOR = 1

   
                                         
                                                   
   
export function leonaEnterReady(state: GameState, player: PlayerId): boolean {
  return opponentsOf(state, player)
    .some((p) => state.winTarget - (state.scores[p] ?? 0) <= OGN_079_SCORE_GAP)
}

   
                                     
                                                                  
                                                 
                                        
                                                    
                                                  
                                                 
                                                            
                 
   
export function leonaStunnedScope(o: GameObject, self: GameObject, state: GameState): boolean {
  const here = selfBattlefield(state, self.oid)                      
  if (here === undefined) return false                                 
  if ((o.zone as string) !== here) return false
  return isUnit(o) && o.controller !== self.controller && isStunned(o)
}

const leona = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '蕾欧娜', category: 'unit',
  domains: ['green'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对手逼近胜利时我活跃进场;此处被眩晕的敌方[S]-8不低于1(leonaEnterReady + GROUP_PASSIVES)' }],
})
                                                                    
export const OGN_079: Card = leona('OGN-079', 'OGN·079/298')
