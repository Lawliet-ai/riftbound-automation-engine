                                                                   
                                        
                                 
                                      
                                                              
                                                                         
                                                                
                                           
                                                     
                                                                  
  
                                                                  
                                            
                                                                    
                                                                         
                                                                    
                                                
                                                            
                                                        
                                                                   
                                                                      
  
                                             
                                                                             
                                                                                   
                                                  
                                              
  
                                   
                                                                                
                                                               
                                                                  
                                                   
                                                                      
                                                                  
  
                                            
                                                              
                                                             
                                         
                                                               
                                                           
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

export const UNL_058_CARD_EFFECT =
  '当你打出一名指示物单位时，让我本回合内{{S}}+1。\n你的指示物单位获得{{壁垒}}。（其在战斗中首先承担伤害。）'

                                              
export const UNL_058_BONUS = 1

   
                         
                                                     
                                                  
                                          
   
export function isTokenUnitPlay(ev: GameEvent, controller: PlayerId): boolean {
  if (ev.kind !== 'spawnToken') return false
  if (ev.owner !== controller) return false
  const types = ev.spec.baseTypes
  return types === undefined || types.includes('unit')                         
}

                                          
export function makeLilliaTokenTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'addMight', target: { ref: 'self' }, delta: UNL_058_BONUS,
      duration: 'thisTurn', // 「**本回合内**」——不是永久(⑳ 被动加成一律走效果层)
      id: `UNL-058:${selfOid}`,
    }],
  })
  return compileTrigger({
    id: `UNL-058:tokenPlay:${selfOid}`, rawId: true, sourceDefId: 'UNL-058',
    event: 'spawnToken',
                                                         
    when: [{ kind: 'custom', test: (ev: GameEvent) => isTokenUnitPlay(ev, controller) }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

const lillia = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '莉莉娅', category: 'unit',
  domains: ['green'], energy: 5, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出指示物单位时我本回合[S]+1;你的指示物单位获得壁垒(makeLilliaTokenTrigger + GROUP_PASSIVES)' }],
})
                                                                
export const UNL_058: Card = lillia('UNL-058', 'UNL-058/219')
