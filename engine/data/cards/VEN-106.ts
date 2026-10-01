                                                                   
                                         
                           
                                                   
  
                                  
                                                        
                                                          
                                                       
  
                      
                                                     
                                                                           
                                                           
                                                                     
                                                                 
                                                                         
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { battlefieldUnits } from './diana-reactions'
import { referencedMight } from './might-common'
import { returnToOwnerHand } from './enter-triggers-batch'

export const VEN_106_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '选择战场上的一名单位。如果其战力不高于3{{S}}，则将其放逐。否则让其返回其所属的手牌。'

                                
export const VEN_106_KEYWORDS: readonly string[] = ['迅捷']
                                  
export const VEN_106_MIGHT_MAX = 3

   
                                              
                                                           
   
export function whirlTargets(state: GameState): readonly string[] {
  return battlefieldUnits(state)
}

   
                      
                         
                               
                                                                    
                                        
   
export function whirlEvents(state: GameState, target: string): readonly GameEvent[] {
  if (!whirlTargets(state).includes(target)) return []                     
  return referencedMight(state, target) <= VEN_106_MIGHT_MAX
    ? [{ kind: 'banish', target: target as ObjId } as GameEvent]
    : returnToOwnerHand(state, target)
}

export const VEN_106_SPEC: PlaySpec = {
  defId: 'VEN-106', cardNo: 'VEN·106', name: '风灵瞬转', kind: 'spell',
  cost: { mana: 3, pips: [['purple']] }, // 卡面 3 法力 + 一枚紫 pip(㊶)
  keywords: [...VEN_106_KEYWORDS],
  target: 'enemyUnit', // 语义=场上单位(`PlayTargetKind` 暂无泛'unit');**范围由 legalTargets 说了算**
  legalTargets: (state: GameState): string[] => [...whirlTargets(state)],
  makeResolve:
    ({ target }: { target?: string }) =>
    (state: GameState, _chosen?: Readonly<Record<string, string>>,
     self?: { readonly rechoice?: { readonly target?: string } }): readonly GameEvent[] => {
      const t = (self?.rechoice?.target ?? target) as string | undefined
      return t === undefined ? [] : whirlEvents(state, t)
    },
}

export const VEN_106: Card = {
  id: 'VEN-106', cardNo: 'VEN·106', name: '风灵瞬转', category: 'spell',
  domains: ['purple'], energy: 3, keywords: [...VEN_106_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '战场上一名单位:战力≤3 放逐,否则返回其所属手牌(VEN_106_SPEC)' }],
}
