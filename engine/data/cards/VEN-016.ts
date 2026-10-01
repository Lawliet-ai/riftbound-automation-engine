                                                                          
                                                               
                                              
                                    
                                                                   
  
                                                      
                                                              
                                                                   
                                                              
                                                              
                                                              
                                                         
                                        
  
                                                          
                                                                 
                                                                    
                                                 
  
                              
                                                                       
                                                                        
                                               
                                                  
                                                  
                                                             
                                                                    
                                                                       
                                                     
                                                               
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { runeCountOf } from './VEN-006'                              

export const VEN_016_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{红色}}，让我以活跃状态进场。）\n'
  + '当我移动时，如果你控制的符文数量不超过四枚，则抽一张牌。'

                                                        
export const VEN_016_KEYWORDS: readonly string[] = ['急速']

                                 
export const VEN_016_RUNE_CAP = 4

   
                         
                                           
                                                  
   
export function dragonRunesOk(state: GameState, controller: PlayerId): boolean {
  return runeCountOf(state, controller) <= VEN_016_RUNE_CAP
}

                                     
export function makeUmbralDragonTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 1 }] })
  return compileTrigger({
    id: `VEN-016:move:${selfOid}`, rawId: true, sourceDefId: 'VEN-016',
    event: 'unitMoved',
    by: 'you',
    when: [
      { kind: 'subjectIsSelf' }, // 「当**我**移动时」——unitMoved 带 unit,主角就是我
                                                    
      { kind: 'custom', test: (_ev, state: GameState): boolean => dragonRunesOk(state, controller) },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_016: Card = {
  id: 'VEN-016', cardNo: 'VEN·016', name: '蚀影巨龙', category: 'unit',
  domains: ['red'], energy: 8, power: 8, keywords: [...VEN_016_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[急速];我移动时若我控制的符文不超过4枚则抽一张牌(makeUmbralDragonTrigger)' }],
}
