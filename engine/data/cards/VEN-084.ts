                                                                    
                                                                 
                                                                     
                                             
                                                
                                                     
  
         
                                                                          
                                                  
                                                                          
                                                             
                   
                                                       
                                                          
                                                   
                                               
                                                
                                                   
                                     
                                                                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ReplacementShield } from '../../src/effects/replacementRegistry'
import { isEmpowered } from '../../src/keywords/empower'
import { variantSiblings } from '../variantAlias'
import { inBattle } from '../../src/combat/battleRoles'                                            

export const VEN_084_CARD_EFFECT =
  '{{强化3橙色}}（支付{{3}}和{{橙色}}：强化我。仅在未强化时可用。）\n'
  + '{{已强化>}} 我获得{{S}}+3，且除非我处于战斗中，否则我无法受到伤害。'

                            
export const VEN_084_DEFIDS: readonly string[] = variantSiblings('VEN-084')

                            
export function isWolfAmbessa(defId: string): boolean {
  return VEN_084_DEFIDS.includes(defId)
}

   
                                               
                                      
                                    
   
export function wolfAmbessaShields(state: GameState): readonly ReplacementShield[] {
  const out: ReplacementShield[] = []
  for (const o of Object.values(state.objects)) {
    if (!isWolfAmbessa(o.defId)) continue
    if (!isEmpowered(o)) continue                                
    if (inBattle(o)) continue                              
    out.push({
      id: `VEN-084:immune:${o.oid}`,
      source: o.oid,
      controller: o.controller,
      intercepts: 'damage',
      predicate: (ev: GameEvent) => ev.kind === 'damage' && (ev.target as string) === (o.oid as string),
      rewrite: (ev: GameEvent) => (ev.kind === 'damage' ? { ...ev, amount: 0 } : ev),
    })
  }
  return out
}

                                                                               
export const VEN_084: Card = {
  id: 'VEN-084', cardNo: 'VEN·084', name: '安蓓萨', category: 'unit', // 英雄单位 → unit
  domains: ['orange'], energy: 4, power: 4, keywords: ['强化3橙色'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[强化3橙色]走§827工厂;已强化 S+3(EMPOWERED_MIGHT)+ 非战斗中免伤(wolfAmbessaShields)' }],
}
