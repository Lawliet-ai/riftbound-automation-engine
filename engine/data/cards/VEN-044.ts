                                                                 
                                                     
                                                
                                                              
                                                       
                                                    
                               
                                                                 
                                                      
                                           
                                                                          
  
                          
                               
                                                            
                                                                         
                                                        
  
                            
                                                                      
                                                    
                                            
                                                                     
                                                                                      
                                                       
                                                                  
                                                                   
                                                              
                                                               
                                                             
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { selfOnBattlefield } from './backline-heroes'
import { SUBJECT_IS_NOT_TOKEN } from './notTokenGuard1154'

export const VEN_044_CARD_EFFECT =
  '当你打出每回合你的首张卡牌时，如果我位于战场上，则你在本回合内打出的下一张卡牌的费用减少{{2}}和{{A}}{{A}}。'

                                              
export const VEN_044_UPSTREAM_STALE_EFFECT =
  '当你打出每回合你的首张卡牌时，如果我位于战场上，则你下一张卡牌的费用减少{{2}}和{{A}}{{A}}。'

   
                                                
                                        
                                                
   
export function heronConditionMet(state: GameState, selfOid: ObjId, controller: PlayerId): boolean {
  if (!selfOnBattlefield(state, selfOid)) return false
  return (state.playedCardCountThisTurn?.[controller as string] ?? 0) === 1
}

   
                                        
                                                             
   
function makeHeronTrigger(event: 'playUnit' | 'playSpell', selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-044:${event}:${selfOid}`, rawId: true,
    sourceDefId: 'VEN-044',
    event,
    by: 'you', // 「当**你**打出…」——对手打牌不触发
    when: [
                                                                  
                                                     
                                                                                        
                                                      
      SUBJECT_IS_NOT_TOKEN,
      { kind: 'custom', test: (_ev, state) => heronConditionMet(state, selfOid, controller) },
    ],
    effect: (): readonly GameEvent[] => [
      { kind: 'grantNextCardDiscount', player: controller } as GameEvent,
    ],
  }, selfOid, controller)
}

export function makeHeron044Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeHeronTrigger('playUnit', selfOid, controller), makeHeronTrigger('playSpell', selfOid, controller)]
}

export const VEN_044: Card = {
  id: 'VEN-044', cardNo: 'VEN·044', name: '星界灵鹭', category: 'unit',
  domains: ['green'], energy: 7, power: 7, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出本回合首张牌且我在战场上 ⇒ 本回合下一张牌减{2}{A}{A}(makeHeron044Triggers)' }],
}
