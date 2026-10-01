                                             
                                                         
                                                                  
                                                                
                                                          
                                                                          
                                                                          

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { ChainItem, Rechoice } from '../loop/chain'
import { decodeTargetOids, mainTargetOids } from '../loop/chainTargets'                                                                                                   

   
                                     
                                             
                                                   
                                               
                                   
                                                                  
                                                                         
   
export function isRetargeting(item: ChainItem | undefined, rechoice: Rechoice): boolean {
  if (item === undefined || rechoice.target === undefined) return false
  return rechoice.target !== (item.rechoice?.target ?? undefined)
}

                                           
export function seizeControl(state: GameState, chainItemId: string, newController: PlayerId): GameState {
  return {
    ...state,
    chain: state.chain.map((i) => (i.id === chainItemId ? { ...i, controller: newController } : i)),
  }
}

   
                                                           
                                                    
                             
   
export function rechooseChainItem(
  state: GameState,
  chainItemId: string,
  rechoice: Rechoice,
): { state: GameState; retargeted: boolean } {
  const item = state.chain.find((i) => i.id === chainItemId)
  if (!item) return { state, retargeted: false }
  const retargeted = isRetargeting(item, rechoice)                                       
  const merged: Rechoice = { ...item.rechoice, ...rechoice }
  return {
    state: {
      ...state,
      chain: state.chain.map((i) => {
        if (i.id !== chainItemId) return i
                                                                                
                                                                            
                                                                             
                                                                                           
                                                  
                                                                  
                                                                   
                                                                       
                                                                        
                                                                                  
                                                            
                                                              
                                                                   
                                                          
        const oldMain = mainTargetOids(i)
        const rest = (i.targets ?? []).filter((o) => !oldMain.includes(o))
        const rebuilt = retargeted && i.retarget ? { resolve: i.retarget(rechoice.target as string), chosenTarget: rechoice.target as string, targets: [...rest, ...decodeTargetOids(rechoice.target as string)] } : {}
        return { ...i, rechoice: merged, ...rebuilt }
      }),
    },
    retargeted,
  }
}

                                   
export function seizeAndRechoose(
  state: GameState,
  chainItemId: string,
  newController: PlayerId,
  rechoice: Rechoice,
): { state: GameState; retargeted: boolean } {
  return rechooseChainItem(seizeControl(state, chainItemId, newController), chainItemId, rechoice)
}
