                                                                   
                                        
                          
                                    
                                                       
                                                     
  
                               
                                                      
                                                                           
                                                                           
                                  
  
                                                
                                                    
  
                  
                                              
                                  
                                                                 
                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'
import { askMoveDestination, enemyUnitsOnField, moveUnitEvents } from './enemy-move'

export const UNL_202_CARD_EFFECT =
  '移动一名友方单位，然后移动一名敌方单位。（如果它们都移动到一处不受你控制的战场，则你视为进攻方。）'

                            
export const UNL_202_FRIEND_DEST = 'voidFriendDest'
export const UNL_202_FOE_PICK = 'voidFoePick'
export const UNL_202_FOE_DEST = 'voidFoeDest'

export const UNL_202_SPEC: PlaySpec = {
  defId: 'UNL-202', cardNo: 'UNL-202/219', name: '虚空来袭', kind: 'spell',
  cost: { mana: 2, pips: [['orange', 'purple']] }, // 2费 + 1枚(橙或紫可付)
  keywords: [],
  target: 'custom', // §355 打出时锁定【友方】那一个
  legalTargets: (state, controller): string[] =>
    fieldedUnits(state, { of: controller, friendly: true }) as string[],
                                                                       
                                                                    
                                                                    
                                                                           
                                                          
  choiceTiming: 'confirm',
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen): ChoiceRequest | null => {
    const itemId = `play:${movedCardOid}`
                                                                 
    const friendDest = askMoveDestination({
      state, chosen, key: UNL_202_FRIEND_DEST, itemId, controller, target,
      prompt: '虚空来袭:把这名友方单位移动到哪里?',
      mandatory: true,
    })
    if (friendDest) return friendDest
                                                   
                                                                       
                                                                       
    if (chosen[UNL_202_FOE_PICK] === undefined) {
      const foes = enemyUnitsOnField(state, controller)
      return {
        itemId, controller, key: UNL_202_FOE_PICK,
        prompt: '虚空来袭:然后移动哪一名敌方单位?',
        candidates: foes.map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
                                                                  
                                                                      
                                                    
        isTarget: true,
      }
    }
                                                               
    return askMoveDestination({
      state, chosen, key: UNL_202_FOE_DEST, itemId, controller,
      target: chosen[UNL_202_FOE_PICK],
      prompt: '虚空来袭:把这名敌方单位移动到哪里?',
      mandatory: true,
    })
  },
  makeResolve: ({ target }) => (state, chosen): readonly GameEvent[] => {
    const c = chosen ?? {}
    return [
                    
      ...moveUnitEvents(state, target, c[UNL_202_FRIEND_DEST]),
                                             
      ...moveUnitEvents(state, c[UNL_202_FOE_PICK], c[UNL_202_FOE_DEST]),
    ]
  },
}

export const UNL_202: Card = {
  id: 'UNL-202', cardNo: 'UNL-202/219', name: '虚空来袭', category: 'spell',
                                                                          
  domains: ['orange', 'purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移动一名友方单位,然后移动一名敌方单位(UNL_202_SPEC)' }],
}
