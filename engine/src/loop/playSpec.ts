                                                        
                                        

import type { GameState } from '../state/gameState'
import type { PlayerId } from '../state/ids'
import type { GameEvent } from './events'
import type { ChainItem, ChainItemKind, ChoiceRequest } from './chain'
import type { Cost } from '../state/runePool'
import type { CostMod } from '../game/costPipeline'
import { filterTargetable } from '../keywords/untargetable'

                                          
export interface PlayCtx {
  readonly movedCardOid: string
  readonly target?: string
  readonly controller: PlayerId
     
                                     
                                                    
                                                                  
                        
                                             
                                                           
     
  readonly bonus?: boolean
     
                                                         
                                                      
                                                                      
                        
                                           
     
  readonly bonusChoice?: string
     
                                                                          
                                                                              
                                                          
     
  readonly bonusChoiceDefId?: string
     
                                                                                   
    
                                             
                                                          
                                                   
                                                                                      
                                               
                                      
                                               
                                              
     
     
                                                                                  
                                                                     
                                     
                                                                                  
     
  readonly echoTimes?: number
     
                                                                       
                                                                                                    
     
  readonly echoIndex?: number
  readonly fromZoneKind?: string
     
                                                                      
                                                                    
                                                                       
                                                                      
     
  readonly standbyBattlefield?: string
}

   
                                                                   
                                                                    
  
                                               
                                                                    
                                                                    
                                                     
                                                                  
                                              
                                                                          
   
export type PlayTargetKind = 'chainSpell' | 'enemyUnit' | 'custom' | 'none'

   
                                                                                    
                                                                                              
                                                                                 
                                                                            
   
export const spellNeedsTarget = (spec: PlaySpec): boolean => spec.target !== 'none' && spec.targetlessChoice !== true

   
                                                          
                                                                        
              
  
                                                                       
                                                            
                                                           
                                                      
                                                              
                                               
                                                                 
                                                                
                                                                     
                                                       
                                 
   
export function spellLegalTargets(
  spec: { legalTargets?: (state: GameState, controller: PlayerId, selfOid: string, bonus: boolean) => readonly string[] },
  state: GameState,
  chooser: PlayerId,
  selfOid = '',
  bonus = false,
): string[] {
                                                          
                                                            
                                                                         
                                                                     
                                                                     
                                                                                  
                                                          
  const raw = filterTargetable(state.objects, chooser as string, spec.legalTargets?.(state, chooser, selfOid, bonus) ?? [])
  return state.chain.some((it) => it.id === selfOid) ? raw.filter((t) => t !== selfOid) : raw
}

export interface PlaySpec {
  readonly defId: string
     
                            
                                                                          
                                                                        
                                                                                                      
                            
                                                         
                                     
     
  readonly cardNo: string
  readonly name: string
  readonly kind: ChainItemKind
  readonly cost: Cost
  readonly keywords: readonly string[]                                
     
                                                              
    
                                                                   
                                                                                            
                                                                      
                                 
                                                                  
                            
                                                        
                                                     
                                                        
     
  readonly targetlessChoice?: boolean
  readonly target: PlayTargetKind
                                                    
     
                                         
                                                  
                                                                   
                                                              
     
  readonly echoDiscard?: number
  readonly echo?: Cost
     
                                                           
                                                              
     
  readonly echoes?: readonly Cost[]
     
                                                     
                                                           
                                            
                                                       
     
  readonly echoModeDistinct?: boolean
     
                               
                                          
                               
    
                                                 
                                                
                                                 
                                         
                                                      
                                               
     
  readonly altCost?: {
    readonly label: string
    readonly cost: Cost
    readonly options?: (state: GameState, controller: PlayerId) => readonly { readonly id: string; readonly label: string }[]
    readonly pay: (state: GameState, controller: PlayerId, choice?: string) => GameState | null
       
                                                                         
                                                                
                                                               
                                          
                                                 
                                                               
                                                      
       
    readonly payEvents?: (state: GameState, controller: PlayerId, choice?: string) => readonly GameEvent[]
  }
                                                            
     
                                                
                                                        
                                             
                                               
                                                     
     
                                                                                     
                                         
  legalTargets(state: GameState, controller: PlayerId, selfOid?: string, bonus?: boolean): readonly string[]
                                                                   
  makeResolve(ctx: PlayCtx): (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => readonly GameEvent[]
                                               
  makeNextChoice?(ctx: PlayCtx): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
     
                                                                   
                                                                 
                                    
                                                                  
                                                               
                                                    
                                 
                                                  
     
  readonly choiceTiming?: 'confirm'
     
                                                                   
                                                 
    
                                                                       
                                                   
                                                      
                                          
                                                            
                                                              
                                             
    
                                                           
                                                 
                                                                
                                                                                
                                                             
                                                          
     
  readonly firstAskOptional?: true
                                           
  makeConfirmChoice?(ctx: PlayCtx): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
                                                              
  makeConfirmSignals?(ctx: PlayCtx): (state: GameState, chosen: Readonly<Record<string, string>>) => readonly GameEvent[]
}

                                                 
export type PlaySpecProvider = (state: GameState, player: PlayerId) => readonly PlaySpec[]

   
                                                                 
                                                                 
   
export interface ActivatedSpec {
  readonly key: string
  readonly label: string
     
                                                                    
                                                                   
                                                   
     
  readonly keywords?: readonly string[]
                                      
  readonly cost: Cost
                                          
  readonly tapSelf?: boolean
     
                                              
                                                      
                                                          
                                                         
                                                               
                                        
     
  readonly unempowerSelf?: boolean
                                                                
  readonly destroySelf?: boolean
     
                                                       
                                                        
                                                     
                                                        
                                         
                                             
                                               
     
  readonly recycleSelf?: boolean
                                                        
  readonly discard?: number
     
                                                       
                          
                                               
                                               
                                                 
     
  readonly discardFilter?: (defId: string) => boolean
     
                                                        
                                                  
                                                                
                      
                                                 
                                  
     
  readonly extraCost?: {
    readonly label: string
                                                      
                                                     
    readonly options?: (state: GameState, controller: PlayerId, selfOid: string, target?: string) => readonly { readonly id: string; readonly label: string }[]
    readonly pay: (state: GameState, controller: PlayerId, selfOid: string, choice?: string) => GameState | null
       
                                             
                                                       
                                                                  
                                             
       
    readonly payEvents?: (state: GameState, controller: PlayerId, selfOid: string, choice?: string) => readonly GameEvent[]
       
                                                                    
                                                                      
                                                                                                   
       
    readonly asEvents?: (state: GameState, controller: PlayerId, selfOid: string, choice?: string) => readonly GameEvent[] | null
  }
     
                                       
                                                             
                                                    
                                                       
                                              
                                            
                                               
     
  readonly oncePerTurn?: true
     
                                                          
                                            
                            
     
  readonly fastResolve?: boolean
  readonly target?: PlayTargetKind | 'custom'
                                                  
  readonly legalTargets?: (state: GameState, controller: PlayerId, selfOid: string) => string[]
     
                                                  
                                               
    
                                
                                               
                                                 
                                                       
                                                
                                      
                                                 
     
     
                                            
                                                 
                                               
                                       
                                                                   
     
  readonly costMods?: (
    state: GameState, controller: PlayerId, selfOid: string, target?: string,
  ) => readonly CostMod[]

     
                                                       
                             
                                                       
                                                      
                                                   
     
  readonly available?: (state: GameState, controller: PlayerId, selfOid: string) => boolean
     
                                                      
                                          
                                          
                                                                    
     
  readonly makeResolve: (ctx: { readonly selfOid: string; readonly controller: PlayerId; readonly target?: string; readonly extraChoice?: string }) => (state: GameState, chosen?: Readonly<Record<string, string>>, self?: ChainItem) => readonly GameEvent[]
  readonly makeNextChoice?: (ctx: { readonly selfOid: string; readonly controller: PlayerId; readonly target?: string; readonly extraChoice?: string }) => (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
     
                                                                        
                                                                                           
     
  readonly choiceTiming?: 'confirm'
     
                                                                                  
                                                               
                  
    
                                                         
                                                   
                                                                 
                                                       
    
                                                                        
                                                                              
                                                                          
                                                                                             
     
  readonly firstAskOptional?: true
                                           
  readonly makeConfirmChoice?: (ctx: { readonly selfOid: string; readonly controller: PlayerId; readonly target?: string; readonly extraChoice?: string }) => (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null
                                                              
  readonly makeConfirmSignals?: (ctx: { readonly selfOid: string; readonly controller: PlayerId; readonly target?: string; readonly extraChoice?: string }) => (state: GameState, chosen: Readonly<Record<string, string>>) => readonly GameEvent[]
}
