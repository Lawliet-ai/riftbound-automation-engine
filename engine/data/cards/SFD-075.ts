                                                                
                                             
                                  
  
                                                   
                                               
                                                                 
                                                           
                                                                   
                                     
  
                 
                                           
                                                    
                      
                                                         
                                                    
                                                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { CARD_CATEGORIES } from '../cardCategories'
import { isEquipment } from '../../src/state/cardTypes'                                                        

export const SFD_075_CARD_EFFECT = '当你使用一件装备的主动技能时，让我本回合内{{S}}+1。'

                           
export const SFD_075_BONUS = 1

   
                        
                                      
                                                                                                        
                                                                                   
   
export function activatedGearOf(state: GameState, ev: GameEvent): ObjId | null {
  if (ev.kind !== 'activateAbility') return null
  const o = state.objects[ev.source]
  if (o === undefined) return null
  return (isEquipment(o) || CARD_CATEGORIES[o.defId] === 'equipment') ? o.oid : null                                            
}

                                   
export function makeProgressDayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: SFD_075_BONUS, duration: 'thisTurn', id: `SFD-075:${selfOid}` }],
  })
  return compileTrigger({
    id: `SFD-075:${selfOid}`, rawId: true,
    sourceDefId: 'SFD-075',
    event: 'activateAbility',
    by: 'you', // ①「**你**使用」
    when: [{ kind: 'custom', test: (ev, state) => activatedGearOf(state, ev) !== null }], // ②
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_075: Card = {
  id: 'SFD-075', cardNo: 'SFD·075/221', name: '进步荣光', category: 'unit',
  domains: ['blue'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你使用装备主动技能时我本回合+1(makeProgressDayTrigger)' }],
}
