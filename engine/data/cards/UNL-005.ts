                                                               
                                                     
                           
                                            
  
                                               
                                                               
                                                                      
                                          
                                                                  
                                       
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'

export const UNL_005_CARD_EFFECT =
  '{{游走}}（我可以向其他战场进行移动。）\n'
  + '当你打出一个法术时，如果消耗了不低于{{4}}法力，则让我变为活跃状态。'

                                  
export const RAVNA_MANA_MIN = 4

export function makeRavnaTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'UNL-005-awaken',
                                                                        
                                                                    
                                                              
    event: 'spellResolved',
    by: 'you', // 「当**你**打出一个法术时」
    when: [{
      kind: 'custom',
                                                        
      test: (ev: GameEvent): boolean => ((ev as { manaPaid?: number }).manaPaid ?? -1) >= RAVNA_MANA_MIN,
    }],
    effect: (state: GameState): readonly GameEvent[] => {
      const me = state.objects[selfOid]
      if (!me) return []            
      const k = state.zones[me.zone]?.kind
      if (k !== 'battlefield' && k !== 'base') return []
      return [{ kind: 'statusChange', target: selfOid, key: 'dormant', value: false } as GameEvent]
    },
  }, selfOid, controller)
}

export const UNL_005: Card = {
  id: 'UNL-005', cardNo: 'UNL-005/219', name: '传承者雷芙纳', category: 'unit',
  domains: ['red'], energy: 7, power: 7, keywords: ['游走'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出实付≥4法力的法术时我变为活跃(makeRavnaTrigger,manaPaid 通道)' }],
}
