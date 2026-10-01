                                                 
  
                                                          
                                               
                                     
                                         
                                            
                                                                                    
                                             
                                                  
                                 
  
                                      
                                           
                                                            
                                                    
                                                    
  
                                                     
                                  
import type { GameState } from './gameState'
import type { GameObject } from './object'
import type { ObjId, PlayerId, ZoneId } from './ids'
import { isUnit } from './cardTypes'
import { isPositionKind } from './zones'

   
                                 
                                       
                                                   
                                                     
                                                            
   
   
                                                   
                                                     
                                                         
                               
                                                                   
                                                                 
                                                    
                                                    
                                                        
                                                          
                                                    
                             
                                                              
                                                               
                                                                
                                           
   
export const NO_ENEMY_MOVE = 'enemyMove'

export function moveRestricted(state: GameState, u: GameObject, dest: string, mover?: PlayerId): boolean {
  const limits = u.derived?.restrictions ?? []
  if (limits.includes('move')) return true                        
                                                     
                                        
                                                                      
                                          
  if (mover !== undefined && limits.includes(`moveBy:${mover as string}`)) return true
                                                         
  if (limits.includes(NO_ENEMY_MOVE) && mover !== undefined
    && mover !== (u.derived?.controller ?? u.controller)) return true
                                    
  return limits.includes('moveToBase') && state.zones[dest as ZoneId]?.kind === 'base'
}

   
                                                            
                                              
  
                                                               
                                                                
                                                              
                                                        
  
                        
                                                                
                                           
                                                                         
                                                    
                                   
                                                        
                                                        
                                                                      
                                                             
                                                         
                                                         
   
export function restrictedMoveEvent(
  state: GameState, oid: ObjId | undefined, to: string | undefined,
  mover?: PlayerId, // ★864 这次移动的发起方(效果路=链项目控制者;未知=undefined,fail-open)
): boolean {
  if (oid === undefined || to === undefined) return false
  const o = state.objects[oid]
  if (o === undefined || !isUnit(o)) return false          
  const fromKind = state.zones[o.zone]?.kind
  const toKind = state.zones[to as ZoneId]?.kind
                                  
  if (fromKind === undefined || toKind === undefined) return false
  if (!isPositionKind(fromKind) || !isPositionKind(toKind)) return false
  return moveRestricted(state, o, to, mover)                   
}
