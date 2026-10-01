                                                                     
                                        
                                      
                              
  
                                      
                                                           
                                                        
                        
                                                                                         
                                                                                      
                                            
                                                                   
                                                                
                                                                
  
                 
                                                
                                                            
                                                      
                                                                          
                                                    
                                                             
                                                                 
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'

export const OGN_145_CARD_EFFECT = '无效化本回合内所有法术或技能的伤害。'

                                
export const OGN_145_SHIELD_ID = 'OGN-145:negateSpellDamage'

   
                                     
                                              
   
export function spellDamageNegated(state: GameState): boolean {
  return state.spellDamageNegatedThisTurn === true
}

   
                                          
                                            
   
export function negateSpellDamageShields(state: GameState): readonly ReplacementShield[] {
  if (!spellDamageNegated(state)) return []
  return [{
    id: OGN_145_SHIELD_ID,
    source: null,
    controller: null,
    intercepts: 'damage',
                                                      
    predicate: (ev: GameEvent) => ev.kind === 'damage' && ev.combat !== true,
                                       
    rewrite: (ev: GameEvent) => (ev.kind === 'damage' ? { ...ev, amount: 0 } : ev),
  }]
}

export const OGN_145_SPEC: PlaySpec = {
  defId: 'OGN-145', cardNo: 'OGN·145/298', name: '坚毅不倒', kind: 'spell',
  cost: { mana: 1, pips: [['orange']] },
  keywords: ['反应'], // §813 时机权限(印刷表侧另有一份登记)
  target: 'none', // 一个目标都不选
  legalTargets: (): string[] => [],
  makeResolve: () => (): readonly GameEvent[] => [{ kind: 'negateSpellDamage' } as GameEvent],
}

export const OGN_145: Card = {
  id: 'OGN-145', cardNo: 'OGN·145/298', name: '坚毅不倒', category: 'spell',
  domains: ['orange'], energy: 1, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '本回合所有法术/技能伤害归零(OGN_145_SPEC)' }],
}
