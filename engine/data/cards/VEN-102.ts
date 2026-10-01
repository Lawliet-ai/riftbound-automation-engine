                                                                   
                                             
                                   
  
                                                     
                                                 
                                                             
  
                 
                                              
                                              
                                                  
                                        
                                                        
                                                     
                                                
                                                     
                                               
                
                                                  
                                              
                                             
                             
                                                              
                            
                                                 
                                                                       
                                                                             
                                                  
                                                                         
                                                                  
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { CARD_CATEGORIES } from '../cardCategories'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { isEquipment } from '../../src/state/cardTypes'

export const VEN_102_CARD_EFFECT = '当一名对手打出一件装备时，你可以选择放逐我，以此放逐该装备。'

   
                             
                                     
                                                 
                                                                           
                                                                                  
                                                           
                                                              
                                                        
                                                               
                                                          
                                                                     
                                                       
                                                         
   
export function playedEquipmentOf(state: GameState, ev: GameEvent): ObjId | null {
  if (ev.kind !== 'playUnit') return null
  const o = state.objects[ev.unit]
  if (o === undefined) return null
                                            
                                                  
                                                                              
                                                        
                                                                 
  return (isEquipment(o) || CARD_CATEGORIES[o.defId] === 'equipment') ? o.oid : null
}

                                       
export function makeRavenbloom102Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-102:${selfOid}`, rawId: true,
    sourceDefId: 'VEN-102',
    event: 'playUnit',
    by: 'opponent', // ①「一名【对手】打出」
    when: [{ kind: 'custom', test: (ev, state) => playedEquipmentOf(state, ev) !== null }], // ②
    mayChoose: true, // §383.3.a 卡文以「你可以选择」开头
                                                          
    basePerform: (state, _ev, deps): GameState | null => {
      if (state.objects[selfOid] === undefined) return null
                                                         
                                                                 
                                                                              
                                                                
                                                                             
      const evs1426: readonly GameEvent[] = [{ kind: 'banish', target: selfOid } as GameEvent]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, evs1426, deps.triggerSource, controller, deps)
        : applyEvents(state, evs1426, deps ?? {}).state
    },
    effect: (state, ev): readonly GameEvent[] => {
                                                        
      const gear = playedEquipmentOf(state, ev)
      if (gear === null) return []
      return [{ kind: 'banish', target: gear, by: selfOid } as GameEvent]
    },
  }, selfOid, controller)
}

export const VEN_102: Card = {
  id: 'VEN-102', cardNo: 'VEN·102', name: '拉文布鲁姆级长', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对手打出装备时可放逐我以放逐该装备(makeRavenbloom102Trigger)' }],
}
