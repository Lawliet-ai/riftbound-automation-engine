                                                                   
                                                   
                                          
                                  
  
                                                 
                                                                  
                                                       
                                                                        
                                               
                                                       
                                                                
                                                                
                                          
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
                                                                              
                                   
import { fieldedUnits } from './activated-batch'

export const UNL_013_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '选择一名单位。本回合该单位受到的所有伤害翻倍。'

export const UNL_013_KEYWORDS: readonly string[] = ['待命', '反应']

export const UNL_013_SPEC: PlaySpec = {
  defId: 'UNL-013', cardNo: 'UNL-013/219', name: '莲花陷阱',
  kind: 'spell',
  cost: { mana: 2 },
  keywords: [...UNL_013_KEYWORDS],
  target: 'custom',
                                   
  legalTargets: (state: GameState): string[] => [...fieldedUnits(state)] as string[],
  makeResolve:
    ({ target }: { target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
      if (target === undefined || state.objects[target as ObjId] === undefined) return []                
      return [{ kind: 'markTurnShield', target: target as ObjId, mark: { doubleDamage: true } }]
    },
}

export const UNL_013: Card = {
  id: 'UNL-013', cardNo: 'UNL-013/219', name: '莲花陷阱', category: 'spell',
  domains: ['red'], energy: 2, keywords: [...UNL_013_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名单位,本回合它受到的所有伤害翻倍(UNL_013_SPEC)' }],
}
