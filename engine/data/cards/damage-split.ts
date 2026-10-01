                                                             
                               
                                                                    
                                                               
                                                
                                         
  
                                         
                                                                        
                                                                           
                                                                            
                                                                     
                                                   
                                                              
                                                          
                                                             
                                                           
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { multiSelectChoice, multiSelectPicked } from '../../src/loop/multiSelect'
import { filterTargetable } from '../../src/keywords/untargetable'                              

   
                                                                        
                                    
                                                            
                                                            
   
export function enemyUnitsAt(
  state: GameState, battlefield: string | undefined, controller: PlayerId,
): readonly string[] {
  if (battlefield === undefined) return []
  return (state.zones[battlefield as never]?.contents ?? [])
    .filter((oid) => {
      const o = state.objects[oid]
      return o !== undefined && isUnit(o) && o.controller !== controller
    })
    .map((oid) => oid as string)
}

   
                               
                                         
   
                                         
export const SPLIT_DROP_PREFIX = 'split:drop'

export function splitTally(picks: readonly string[]): readonly (readonly [string, number])[] {
  const tally = new Map<string, number>()
  for (const oid of picks) tally.set(oid, (tally.get(oid) ?? 0) + 1)
  return [...tally.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

   
                                                              
  
                                                                    
                                                         
                                                                 
                                                              
                                                                       
                                                                        
  
                                                                   
                                                                                
                                
   
export function targetableSplitPool(
  state: GameState, controller: PlayerId, raw: readonly string[],
): string[] {
  return filterTargetable(state.objects, controller as string, raw)
}

   
                                            
                                          
                                                                               
                                                                          
                                 
                                                                     
                                                     
                                                     
                                                                      
                                            
   
export function splitDamageChoice(opts: {
  readonly itemId: string
  readonly controller: PlayerId
  readonly prefix: string
  readonly prompt: string
  readonly budget: number
  readonly candidates: (state: GameState) => readonly string[]
     
                                                   
                                                       
                                                 
                                        
     
  readonly mustFeed?: readonly string[]
     
                                                                        
                                                               
    
                                                        
                                                                 
                         
                                                           
                                                                                
                                    
                                                                 
                                                  
     
  readonly isTarget?: boolean
}): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null {
  return (state, chosen) => {
                                                          
                                                              
    if (opts.budget <= 0) return null
    if (multiSelectPicked(chosen, opts.prefix).length >= opts.budget) return null
    return multiSelectChoice({
      itemId: opts.itemId,
      controller: opts.controller,
      prefix: opts.prefix,
      prompt: opts.prompt,
      allowRepeat: true, // ★「**可**在多名之间分摊」⇒ 全砸一个人也合法
      required: true, // ★「造成**共计** N 点」不是「最多」⇒ 有候选就得分完
      isTarget: opts.isTarget, // ★1807 原样透传(缺省 undefined ⇒ 不带字段,老行为不变)
                                                                              
                                                                   
                                                                               
                                                                                   
                                                                           
      dedupeTargetSignal: true,
      candidates: (st, picked) => {
                                                                    
                                                                                                     
                                                                         
                                   
                                                                                   
                                                             
                                                                           
                                             
                                                                   
                                                     
        const all = targetableSplitPool(st, opts.controller, opts.candidates(st))
                                                                  
                                                                     
                                                                                  
                                                          
        const unfed = (opts.mustFeed ?? []).filter((o) => !picked.includes(o) && all.includes(o))
        const remaining = opts.budget - picked.length
        const pool = remaining <= unfed.length ? unfed : all
        return pool
          .map((oid) => ({ id: oid, label: `${st.objects[oid as ObjId]?.defId ?? oid}` }))
      },
    })(state, chosen)
  }
}

   
                                                    
  
                                 
                                                             
                                                                   
                                                           
                                                    
                                  
                                              
                              
                                                                    
   
export function splitDropChoice(opts: {
  readonly itemId: string
  readonly controller: PlayerId
  readonly frozen: readonly string[]
  readonly budget: number
  readonly prefix?: string
}): (state: GameState, chosen: Readonly<Record<string, string>>) => ChoiceRequest | null {
  const prefix = opts.prefix ?? SPLIT_DROP_PREFIX
  const need = opts.frozen.length - opts.budget
  return (state, chosen) => {
    if (need <= 0) return null
    return multiSelectChoice({
      itemId: opts.itemId,
      controller: opts.controller,
      prefix,
      prompt: `§355.14.h 伤害只剩${opts.budget}点、目标有${opts.frozen.length}个:选${need}个让它不再作为目标`,
      max: need, // ★h.1 的上限
      required: true, // ★f 的下限 —— 少掉一个就会有目标吃 0 点
      candidates: (_st, picked) => opts.frozen
        .filter((oid) => !picked.includes(oid))
        .map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
    })(state, chosen)
  }
}

   
                                    
                                             
                                            
                                  
   
export function splitDamageEvents(opts: {
  readonly picks: readonly string[]
  readonly budget: number
  readonly sourcePlayer: PlayerId
  readonly source: string
                                              
  readonly rider?: (target: string) => readonly GameEvent[]
}): readonly GameEvent[] {
                                                              
                                           
  if (opts.budget <= 0) return []
  const out: GameEvent[] = []
  for (const [oid, amount] of splitTally(opts.picks.slice(0, opts.budget))) {
    out.push({
      kind: 'damage', target: oid as ObjId, amount,
      sourcePlayer: opts.sourcePlayer, source: opts.source as ObjId,
      fromSplitPool: true, // ★895 §715.3:池已预加,逐笔豁免(boostableDamage 认这个标)
    } as GameEvent)
    if (opts.rider) out.push(...opts.rider(oid))
  }
  return out
}
