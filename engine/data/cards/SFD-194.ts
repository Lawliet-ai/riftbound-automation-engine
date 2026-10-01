                                                                     
                                        
                                      
                                        
  
                                           
                                                                          
                                               
  
                                             
                                                      
                                                            
                                                      
                                                                   
                                                                   
                                                      
                        
                                                           
                                   
                                     
                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { fieldedUnits } from './activated-batch'

export const SFD_194_CARD_EFFECT =
  '选择一名单位，在本回合内，抵挡该单位下一次受到的伤害。抽一张牌。'

                                
export const SFD_194_KEYWORDS: readonly string[] = ['反应']
                        
export const SFD_194_DRAW = 1

export const SFD_194_SPEC: PlaySpec = {
  defId: 'SFD-194', cardNo: 'SFD·194/221', name: '反击风暴', kind: 'spell',
                                                    
  cost: { mana: 2, pips: [['green', 'orange']] },
  keywords: [...SFD_194_KEYWORDS],
  target: 'custom',
  legalTargets: (state: GameState): string[] => [...fieldedUnits(state)] as string[],
  makeResolve:
    ({ target, controller }) =>
    (state: GameState): readonly GameEvent[] => {
                                                      
      const evs: GameEvent[] = []
      if (target !== undefined && state.objects[target as ObjId] !== undefined) {
        evs.push({ kind: 'markTurnShield', target: target as ObjId, mark: { voidNextDamage: true } } as GameEvent)
      }
      evs.push({ kind: 'draw', player: controller, count: SFD_194_DRAW } as GameEvent)
      return evs
    },
}

export const SFD_194: Card = {
  id: 'SFD-194', cardNo: 'SFD·194/221', name: '反击风暴', category: 'spell',
  domains: ['green', 'orange'], energy: 2, keywords: [...SFD_194_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名单位,本回合抵挡其下一次受到的伤害;抽一张牌(SFD_194_SPEC)' }],
}
