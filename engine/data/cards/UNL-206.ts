                                                                        
                                                                        
                                
                                                             
                                       
  
                                      
                                                                                    
                                                                                
                                                
  
                                                 
                                                                              
                                                                 
                                                                 
                                                                  
                                                                           
                                                       
  
                                       
                                                              
                                                         
                                                                             
                                                  
                                                                     
                                                                                         
  
                                   
                                                             
                                                   
                                                   
                                                         
                                                      
                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ObjId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { isUnit } from '../../src/state/cardTypes'
import { payFromState } from '../../src/game/economy'
import { clearDamageDormantRecall } from '../../src/state/recall'
import { inBattle } from '../../src/combat/battleRoles'                                

export const UNL_206_CARD_EFFECT =
  '如果此处的一名单位在战斗中被摧毁，其控制者可以选择支付{{A}}{{A}}{{A}}，'
  + '以此改为移除其所受伤害、将其变为休眠状态、并将其召回。'

   
                                                                             
                                                            
   
export const UNL_206_COST: Cost = { pips: [[], [], []] }

   
                                                                 
                                                                       
                                
   
export function bloodAltarZones(state: GameState): string[] {
  return Object.entries(state.battlefieldCards ?? {})
    .filter(([, bc]) => bc.defId === 'UNL-206')
    .map(([zid]) => zid)
    .sort()
}

                                                        
                                                        
                                                                         
                                                 
                                                                 
                                                                                            
                                                            
                   

   
                                                        
                                      
   
export function bloodAltarSave(state: GameState, oid: ObjId): GameState | null {
  const dying = state.objects[oid]
  if (dying === undefined || !isUnit(dying)) return null
                                        
  if (!inBattle(dying)) return null
                                               
  if (!bloodAltarZones(state).includes(dying.zone as string)) return null
                                                         
  const paid = payFromState(state, dying.controller, UNL_206_COST)
  if (!paid.ok) return null                                   
  return clearDamageDormantRecall(paid.state, oid)
}

export const UNL_206: Card = {
                                                          
  id: 'UNL-206', cardNo: 'UNL-206/219', name: '鲜血祭坛', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '此处的单位在战斗中被摧毁时,其控制者可付{A}{A}{A}改为清伤+休眠+召回(bloodAltarSave)' }],
}
