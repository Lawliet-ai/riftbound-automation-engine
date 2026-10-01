                                                                  
                                       
                                                          
  
                                               
                                                              
                                                   
                                                 
                                                       
                                                       
                                                    
                                                                
                                                              
                                                                  
                                                   
                                        
                                                        
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { fieldedUnits } from './activated-batch'

export const VEN_126_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '选择一名单位。抵挡该单位在本回合内将受到的7点伤害。（对手可以分配额外战斗伤害来摧毁该单位。）'

export const VEN_126_KEYWORDS: readonly string[] = ['反应']

                                       
export const VEN_126_ABSORB = 7

export const VEN_126_SPEC: PlaySpec = {
  defId: 'VEN-126', cardNo: 'VEN·126', name: '忍法！气合盾',
  kind: 'spell',
  cost: { mana: 2, pips: [['yellow']] },
  keywords: [...VEN_126_KEYWORDS],
  target: 'custom',
  legalTargets: (state: GameState): string[] => [...fieldedUnits(state)] as string[],
  makeResolve:
    ({ target }: { target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined || state.objects[target as ObjId] === undefined) return []                
      return [{ kind: 'markTurnShield', target: target as ObjId, mark: { absorb: VEN_126_ABSORB } }]
    },
}

export const VEN_126: Card = {
  id: 'VEN-126', cardNo: 'VEN·126', name: '忍法！气合盾', category: 'spell',
  domains: ['yellow'], energy: 2, keywords: [...VEN_126_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名单位,本回合抵挡其将受到的 7 点伤害(VEN_126_SPEC)' }],
}
