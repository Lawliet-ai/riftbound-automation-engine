                                                                    
                                                                        
                                                             
  
                                             
                                                 
                                                    
                                                   
                                           
                                                                    
                             
                                                                                                                   
                                                                                                
                                                                                                                      
                                                                                
                                                                           
                                       
                                                   
                                        
                                                          
                                                                                                  
                                                                                           
                                                                                                                
  
                                                          
                                                       
                                                    
                                                               
  
                                                 
                                                  
  
                                                                            
                                                  
                                              
                                          
                                                        
                                                      
                                     
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayExtraCost } from '../../src/session/interactiveGame'

export const VEN_157_CARD_EFFECT =
  '任何玩家都可以选择支付{{A}}{{A}}，作为打出“龙”属性单位的额外费用。若如此做，则将其打出到此战场。'

                            
export const DRAGON_TAG = '龙'
                                                         
export const VEN_157_PIP_COUNT = 2

   
                                                                
                                                  
                                     
   
export function dragonPerchZones(state: GameState): string[] {
  return Object.entries(state.battlefieldCards ?? {})
    .filter(([, bc]) => bc.defId === 'VEN-157')
    .map(([zid]) => zid)
    .sort()
}

   
                  
                                                                   
                                            
                                                          
                                                          
   
export const VEN_157_EXTRA_COST: PlayExtraCost = {
  label: '为「龙栖峰」支付 2 点任意符能,将其打出到龙栖峰',
                                                                        
  cost: { pips: Array.from({ length: VEN_157_PIP_COUNT }, () => [] as readonly string[]) },
  available: (state: GameState): boolean => dragonPerchZones(state).length > 0,
                                                    
                                               
  destinations: (state: GameState): readonly string[] => dragonPerchZones(state),
}

   
                          
                                                       
                                              
                                              
                                                                
                                                                                  
   
export function dragonPerchBonus(
  defId: string,
  hasTag: (d: string, tag: string) => boolean,
): PlayExtraCost | undefined {
  return hasTag(defId, DRAGON_TAG) ? VEN_157_EXTRA_COST : undefined
}

export const VEN_157: Card = {
                                                      
  id: 'VEN-157', cardNo: 'VEN·157', name: '龙栖峰', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '任何玩家都可付{A}{A}把龙属性单位打出到此处(dragonPerchBonus)' }],
}
