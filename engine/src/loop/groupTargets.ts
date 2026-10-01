                                                    
  
                                                                    
                                               
                                                   
                           
                                                    
                                                     
                    
                                                        
                                                     
                                                      
                                                     
                                                      
                                                      
                                                    
                                                    
  
                                                                         
                                                         
                                                        
                                                        
                                                                                       
  
                                                                 
                                                        
                                 
                                                                
                                    
                                        
                                                                         
                                                       
                                                     
                                                                           
                                                                 
                                                                     
                               
                                                                    
                                                      
  
                                                                                    
                                                           
                                    
                                                                         
                                                                                
                                                                   
                                                                   
                                                     
                                                          
                                                         
                                                                

import { multiSelectChoice, multiSelectPicked } from './multiSelect'
import { filterTargetable } from '../keywords/untargetable'                   
import type { GameState } from '../state/gameState'
import type { ObjId, PlayerId } from '../state/ids'
import type { ChoiceRequest } from './chain'
import { ILLEGAL_TARGET } from './spellTargetAtResolve'                                              

   
                                  
                         
                                                               
                                  
                                                                
                                        
                                                     
   
export type GroupOk = (state: GameState, subset: readonly string[]) => boolean

export interface GroupTargetSpec {
  readonly itemId: string
     
                                                                    
                                                              
                                                                             
                                                      
     
  readonly controller: PlayerId
                                                 
  readonly groupKey: string
     
                                                         
                                                        
                                                                     
     
  readonly initial: readonly string[]
                                                          
  readonly memberLegal: (state: GameState, oid: string) => boolean
  readonly groupOk: GroupOk
  readonly prompt: string
  readonly label: (state: GameState, oid: string) => string
  readonly doneLabel?: string
     
                                                                                    
                                                          
                                            
                                                                                
                                                                     
     
  readonly minPicks?: number
}

export const GROUP_SUBSET_PREFIX = '§355.11.b:'
export const subsetKeyPrefix = (groupKey: string): string => `${GROUP_SUBSET_PREFIX}${groupKey}`

   
                                                    
                                               
  
                                                                                          
                                                                                    
                          
                                                               
                                                                            
   
export function controllerAtResolve(
  state: GameState,
  cardOid: string | ObjId | undefined,
  fallback: PlayerId,
): PlayerId {
  if (cardOid === undefined) return fallback
  const item = state.chain.find((it) => it.cardOid !== undefined && String(it.cardOid) === String(cardOid))
  return (item?.controller ?? fallback) as PlayerId
}

   
                                             
                                                      
                                                              
   
export function groupJudgeSet(state: GameState, initial: readonly string[]): readonly string[] {
  return initial.filter((v) => v !== ILLEGAL_TARGET && state.objects[v as ObjId] !== undefined)
}

   
                                                                 
                               
   
export function groupPool(state: GameState, spec: GroupTargetSpec): readonly string[] {
  const live = groupJudgeSet(state, spec.initial).filter((o) => spec.memberLegal(state, o))
  return filterTargetable(state.objects, spec.controller as string, live)
}

   
                                           
                                               
                                                           
                                                         
   
export function groupBroken(state: GameState, spec: GroupTargetSpec): boolean {
  return !spec.groupOk(state, groupJudgeSet(state, spec.initial))
}

   
                                                          
                                                     
                                                       
                                                                           
                                                                  
   
export function groupSubsetChoice(spec: GroupTargetSpec):
  (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null {
  return (state, chosen) => {
    if (!groupBroken(state, spec)) return null                           
    const sub = subsetKeyPrefix(spec.groupKey)
    const pool = groupPool(state, spec)
    return multiSelectChoice({
      itemId: spec.itemId, controller: spec.controller, prefix: sub, prompt: spec.prompt,
      ...(spec.doneLabel !== undefined ? { doneLabel: spec.doneLabel } : {}),
      ...(spec.minPicks !== undefined ? { minPicks: spec.minPicks } : {}), // ★1808c 下限透传(缺省不传 = 老行为)
                                  
                                                                
                                                       
                                                                
                                           
      required: !spec.groupOk(state, multiSelectPicked(chosen, sub)),
                                  
      candidates: (st, picked) => pool
        .filter((o) => !picked.includes(o) && spec.groupOk(st, [...picked, o]))
        .map((o) => ({ id: o, label: spec.label(st, o) })),
      // ⚠️ 刻意**不标 isTarget**:这是从已锁定的目标组里【裁剪】,不是选新目标。
      //   标了会经会话层再写一次 targets、再发一条 targeted(§355.14.d 是一个目标一条),
      //   让「当一个单位成为目标时」那族多响。
      //   代价:拿不到 chainFepr.withTargetableCandidates 那道自动门(它首行 isTarget!==true 就放行)
      //   ⇒ §757 由 groupPool 里那次 filterTargetable 手动兑现,**是必需不是冗余**。
    })(state, chosen)
  }
}

   
                                        
                                 
                                                                     
  
                                                      
                                                                        
                                                     
                                     
   
export function groupSubsetApplied(
  state: GameState, chosen: Readonly<Record<string, string>> | undefined, spec: GroupTargetSpec,
): readonly string[] {
  const pool = groupPool(state, spec)
  if (!groupBroken(state, spec)) return pool                   
  const picked = multiSelectPicked(chosen, subsetKeyPrefix(spec.groupKey))
    .filter((o) => pool.includes(o))
                                                   
  return spec.groupOk(state, picked) ? picked : []
}
