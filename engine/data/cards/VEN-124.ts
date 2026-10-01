                                                                     
                                                           
                                            
                            
                                                                   
  
                                           
                                                                  
                                                                  
                                                             
                                                              
                                                         
                                          
  
                                                                
                                                           
                                                                                       
                                                                                  
                                                                 
                                                      
                                                                                   
  
                                                      
                                                 
                                             
                                    
                                                                            
                                                      
                                               
                                                                            
                                                                            
                                                            
                                                                           
  
                                                         
                                                   
                                                
                                        
  
                                                         
                                                                      
                                                                  
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { fieldedUnits } from './activated-batch'                     
import { makeEmpowerSelfSpec } from './empower-nonresource'

export const VEN_124_CARD_EFFECT =
  '{{强化}} — 摧毁一名友方单位（支付此费用：强化我。仅在未强化时可用。）\n{{已强化>}} 我获得{{S}}+2。'

                                                                   
export const VEN_124_EMPOWERED_BONUS = 2

   
                     
                                                  
                                                          
   
export function greybackFodder(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true }).map((o) => o as string)
}

                         
export const VEN_124_EMPOWER_SPEC: ActivatedSpec = makeEmpowerSelfSpec({
  key: 'VEN-124:empower',
  label: '强化 — 摧毁一名友方单位:强化我',
  extraCost: {
    label: '摧毁一名友方单位',
    options: (state: GameState, controller: PlayerId) =>
      greybackFodder(state, controller)
        .map((o) => ({ id: o, label: state.objects[o as ObjId]?.defId ?? o })),
                                             
                                               
    pay: (state: GameState, controller: PlayerId, _selfOid: string, choice?: string): GameState | null => {
      if (choice === undefined) return null
      if (!greybackFodder(state, controller).includes(choice)) return null
                                                                  
                                 
      return state
    },
    payEvents: (_s: GameState, _c: PlayerId, _selfOid: string, choice?: string): readonly GameEvent[] =>
      (choice === undefined ? [] : [{ kind: 'destroy', target: choice as ObjId } as GameEvent]),
  },
})

export const VEN_124: Card = {
  id: 'VEN-124', cardNo: 'VEN·124', name: '脱逃的灰背', category: 'unit',
  domains: ['yellow'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '强化—摧毁一名友方单位;已强化时[S]+2(VEN_124_EMPOWER_SPEC + EMPOWERED_MIGHT)' }],
}
