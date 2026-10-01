                                        
  
                             
                                                                                  
                                                                       
                                      
                                      
                                         
                                       
                                                   
  
                      
                                                        
                                                                           
                           
                                                                  
                                                                               
                                                
                                                            
                                                     
                                             
import type { GameState } from '../state/gameState'
import type { GameObject } from '../state/object'
import type { StaticEffect } from './continuousView'
import { keywordSources } from './valuedKeyword'
import { cardPassiveEffects } from './cardPassives'
import { safePredicate } from './safePredicate'

   
                                                                        
                                                                           
                                          
   
export function stateWithPassives(state: GameState): GameState {
  const passives = cardPassiveEffects(state)
  if (passives.length === 0) return state
  return { ...state, continuousEffects: [...state.continuousEffects, ...passives] }
}

   
                                
                                                      
                                            
   
export function liveKeywordSourcesFor(
  state: GameState,
     
                                                             
                                                                        
                                                       
                                                          
                                            
                                       
                                                                   
                                        
     
  printedOf?: (defId: string) => readonly string[],
): (o: GameObject) => readonly string[] {
  const withPassives = stateWithPassives(state)
  return (o: GameObject) => {
    const live = keywordSources(withPassives, o, safePredicate)
    if (live.length > 0 || printedOf === undefined) return live
    if ((o.baseKeywords ?? []).length > 0) return live
    return printedOf(o.defId)
  }
}
