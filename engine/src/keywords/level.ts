                               
  
                                      
                     
                                                      
                                 
                                     
                                     
                                                            
                                     
                                
             
                                                                 
                                                             
                                                   
                                                        
                            
                                                      
                                               
  
                                                             
                                                     
                               
                                

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameObject } from '../state/object'

export const LEVEL = '等级'

                          
export function experienceOf(state: GameState, player: PlayerId): number {
  return state.experience[player] ?? 0
}

                            
export function gainExperience(state: GameState, player: PlayerId, amount: number): GameState {
  if (amount === 0) return state
  return { ...state, experience: { ...state.experience, [player]: experienceOf(state, player) + amount } }
}

   
                                             
                                                   
   
export function spendExperience(state: GameState, player: PlayerId, amount: number): GameState {
  if (amount === 0) return state
  const next = Math.max(0, experienceOf(state, player) - amount)
  return { ...state, experience: { ...state.experience, [player]: next } }
}

   
                                  
                                    
                                                      
                             
   
                          
                                                        
                                                       
                                                                                  
                                                                               
                                                           
                                                                    
                                                        
                                                            
                                
                                                         
                                                       
                                                          
                                                           
                                                                
                                                               
                                                      
                                                    
                                                                             
                                                                       
                                                                             
                                                                                    
                                                               
                                                             
                                                   
                                                                          
                                             
                                                                         
                                                                               
                                                                          
                                          
                                          
                                                            
                                                               
                                        
                                                                       
export function parseLevel(kw: string): number | null {
  const m = /^等级(\d+)$/.exec(kw)
  return m ? Number(m[1]) : null
}

                               
export function hasLevel(keywords: readonly string[] | undefined): boolean {
  return (keywords ?? []).some((k) => parseLevel(k) !== null)
}

   
                                        
                                             
                                                         
  
                                              
   
export function activeLevels(
  state: GameState,
  o: GameObject | undefined,
  keywords: readonly string[] | undefined,
): readonly number[] {
  if (!o) return []
  const exp = experienceOf(state, o.controller)
  const out: number[] = []
  for (const k of keywords ?? []) {
    const n = parseLevel(k)
    if (n !== null && exp >= n) out.push(n)                  
  }
  return out
}

                               
export function isLevelActive(state: GameState, o: GameObject | undefined, n: number): boolean {
  if (!o) return false
  return experienceOf(state, o.controller) >= n
}
