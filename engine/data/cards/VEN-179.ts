                                                                    
                                             
          
                                    
  
                                          
                                                                   
                                                                                    
                                              
  
                                                  
                                                         
                                            
                                                     
                                             
  
                                                   
                                              
                                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import { resolveImplDefId } from '../variantAlias'                                  
import type { PlayerId } from '../../src/state/ids'
import { zonesByKind } from '../../src/state/gameState'
import { isUnit } from '../../src/state/cardTypes'

export const VEN_179_CARD_EFFECT = '{{伏击}}\n我可以{{伏击}}到有敌方单位的战场，即使你在该处没有单位。'

   
                                               
                                                                                
                                      
   
export function battlefieldsWithEnemyUnit(state: GameState, player: PlayerId): readonly string[] {
  return zonesByKind(state, 'battlefield')
    .filter((bf) => bf.contents.some((oid) => {
      const o = state.objects[oid]
      return !!o && isUnit(o) && o.controller !== player
    }))
    .map((bf) => bf.id)
}

                                       
const EXTRA_AMBUSH_ZONES: Readonly<Record<string, (state: GameState, player: PlayerId) => readonly string[]>> = {
  'VEN-179': battlefieldsWithEnemyUnit,
                                                   
                                     
                                                          
                                                                                   
                                             
                                                      
                                                           
                                                                 
                                                           
                                                            
                                                         
                                                                     
  'UNL-120': battlefieldsWithEnemyUnit,
}

                                                                   
export function extraAmbushZonesFor(state: GameState, player: PlayerId, defId: string): readonly string[] {
                                                           
                                                  
                                              
                                                        
                                               
  return EXTRA_AMBUSH_ZONES[resolveImplDefId(defId, (x) => x in EXTRA_AMBUSH_ZONES)]?.(state, player) ?? []
}

                        
export const EXTRA_AMBUSH_ZONE_DEFIDS: readonly string[] = Object.keys(EXTRA_AMBUSH_ZONES)

                                                 
export const UNL_120: Card = {
  id: 'UNL-120', cardNo: 'UNL-120/219', name: '雷恩加尔', category: 'unit',
  domains: ['orange'], energy: 5, power: 6, keywords: ['伏击'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '印刷[伏击];可伏击到有敌方单位的战场(extraAmbushZonesFor)' }],
}

export const VEN_179: Card = {
  id: 'VEN-179', cardNo: 'VEN·179', name: '雷恩加尔', category: 'unit',
  domains: ['orange'], energy: 5, power: 6, keywords: ['伏击'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '印刷[伏击];可伏击到有敌方单位的战场(extraAmbushZonesFor)' }],
}
