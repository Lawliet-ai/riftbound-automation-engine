                                                                     
                                             
                                                
                                             
                          
  
                                                                  
                                                                     
  
                                                    
                                                                  
                                                    
                                                                  
                                                  
  
                                          
                                                                                 
                                                    
                                                
                                                 
                                                                     
  
                                                      
                                                                
                                                               
                                                     
                                                             
                                              
                                                             
                                                   
                                                     
                               
                                                                                  
                                                                            
                                                      
                             
                                                                    
                                              
                                                          
                                           
                                                                      
                                                  
                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import { scoredHere } from './scored-here'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { GAINED_TAG_KEY } from '../cardTagQuery'
import { ANIMAL_TAGS, hasAllAnimalTags } from './animal-tags'

export const UNL_177_CARD_EFFECT =
  '打出我时，从“鸟类”、“猫科”、“犬形”或“魄罗”属性标签中选择一个。我获得该属性标签。\n' +
  '当我征服或据守一处战场时，如果你的单位合计具有以下所有属性标签，则你获得1分 — “鸟类”、“猫科”、“犬形”和“魄罗”。'

                             
export const UNL_177_ASK = 'ivern177Tag'
                             
export const UNL_177_POINTS = 1

   
                      
                                                        
                              
                                                    
   
export function ivern177Choices(): readonly string[] {
  return [...ANIMAL_TAGS].sort()
}

                                                                  
                                                 
                                                                      
                                                                   
                                                            

                                        
export function makeIvern177DeclareTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `UNL-177:gain:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'UNL-177',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「打出【我】时」
    nextChoice: (_state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[UNL_177_ASK] !== undefined) return null
      return {
        itemId: `trig:${id}`, controller, key: UNL_177_ASK,
        prompt: '艾翁:选择一个属性标签,我获得它',
                                                            
        candidates: ivern177Choices().map((t) => ({ id: t, label: t })),
      }
    },
    effect: (_state: GameState, _ev, chosen): readonly GameEvent[] => {
      const tag = chosen?.[UNL_177_ASK]
                                             
      if (tag === undefined || !ivern177Choices().includes(tag)) return []
      return [{ kind: 'declare', target: selfOid, key: GAINED_TAG_KEY, value: tag } as GameEvent]
    },
  }, selfOid, controller)
}

                                                                  

function makeIvern177ScoreTriggerFor(
  event: 'conquer' | 'hold', selfOid: ObjId, controller: PlayerId,
): Trigger {
  return compileTrigger({
    id: `UNL-177:${event}:${selfOid}`, rawId: true, sourceDefId: 'UNL-177',
    event, by: 'you',
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => scoredHere(state, selfOid, ev) }],
                                                                      
                                                       
                                                  
    effect: (state: GameState): readonly GameEvent[] => {
                                                  
      if (!hasAllAnimalTags(state, controller)) return []                        
      return [{ kind: 'gainPoint', player: controller, amount: UNL_177_POINTS } as GameEvent]
    },
  }, selfOid, controller)
}

                                           
export function makeIvern177Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [
    makeIvern177ScoreTriggerFor('conquer', selfOid, controller),
    makeIvern177ScoreTriggerFor('hold', selfOid, controller),
  ]
}

                              
export function makeIvern177AllTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeIvern177DeclareTrigger(selfOid, controller), ...makeIvern177Triggers(selfOid, controller)]
}

export const UNL_177: Card = {
  id: 'UNL-177', cardNo: 'UNL-177/219', name: '艾翁', category: 'unit',
  domains: ['yellow'], energy: 6, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时选一个动物标签并获得它;征服/据守时若我方单位集齐四种标签则得1分' }],
}
