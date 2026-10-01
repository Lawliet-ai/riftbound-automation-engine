                                                                    
                                         
                                                      
                                                       
  
                                               
                                                                   
                                                                      
                                                           
                                                           
                                                           
                                      
                                                           
                                                   
  
                           
                                                         
                                                              
                                          
                                                    
                                                 
                                                                             
                                                            
                                                         
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { fieldedUnits } from './activated-batch'
import { referencedMight } from './might-common'
import { disempower, isEmpowered } from '../../src/keywords/empower'
import { recomputeContinuous } from '../../src/effects/continuousView'

export const VEN_127_CARD_EFFECT =
  '选择一名单位。如果该单位{{已强化}}，则解除其强化。然后如果其战力不高于3{{S}}，则将其摧毁。\n'
  + ' {{流转4黄色黄色}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

                                                    
export const VEN_127_KEYWORDS: readonly string[] = ['流转4黄色黄色']
                                  
export const VEN_127_MIGHT_MAX = 3

   
                                                 
                                                                             
   
export function bloodTargets(state: GameState): readonly string[] {
  return fieldedUnits(state) as unknown as string[]
}

   
                     
                             
                                               
                                       
   
export function bloodEvents(state: GameState, target: string): readonly GameEvent[] {
  if (!bloodTargets(state).includes(target)) return []                     
  const o = state.objects[target as ObjId]
  if (o === undefined) return []
  const out: GameEvent[] = []
  let after = state
  if (isEmpowered(o)) {
    out.push({ kind: 'disempower', target: target as ObjId } as GameEvent)
                                                      
    after = recomputeContinuous(disempower(state, target as ObjId))
  }
  if (referencedMight(after, target) <= VEN_127_MIGHT_MAX) {
    out.push({ kind: 'destroy', target: target as ObjId } as GameEvent)
  }
  return out
}

export const VEN_127_SPEC: PlaySpec = {
  defId: 'VEN-127', cardNo: 'VEN·127', name: '血戮', kind: 'spell',
  cost: { mana: 2, pips: [['yellow']] }, // 卡面 2 法力 + 一枚黄 pip(㊶)
  keywords: [...VEN_127_KEYWORDS],
  target: 'enemyUnit', // 语义=场上单位;**范围由 legalTargets 说了算**(这张不分敌我)
  legalTargets: (state: GameState): string[] => [...bloodTargets(state)],
  makeResolve:
    ({ target }: { target?: string }) =>
    (state: GameState, _chosen?: Readonly<Record<string, string>>,
     self?: { readonly rechoice?: { readonly target?: string } }): readonly GameEvent[] => {
      const t = (self?.rechoice?.target ?? target) as string | undefined
      return t === undefined ? [] : bloodEvents(state, t)
    },
}

export const VEN_127: Card = {
  id: 'VEN-127', cardNo: 'VEN·127', name: '血戮', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: [...VEN_127_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名单位:已强化则解除,然后战力≤3 则摧毁(VEN_127_SPEC)' }],
}
