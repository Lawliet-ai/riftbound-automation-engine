                                                      
  
                                             
                                                 
                                           
                                                  
                                                      
                                                
  
                                                            
                                                                          
                                                
                                                                 
                                       
                                                  
                          
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'

                                        
export const FROM_STANDBY_EVENTS: readonly ['playUnit', 'playSpell'] = ['playUnit', 'playSpell']

export interface FromStandbySpec {
                                         
  readonly defId: string
                                                    
  readonly effect: (
    state: GameState, selfOid: ObjId, controller: PlayerId,
    chosen: Readonly<Record<string, string>>, event: 'playUnit' | 'playSpell',
  ) => readonly GameEvent[]
                                  
  readonly nextChoice?: (
    state: GameState, selfOid: ObjId, controller: PlayerId, chosen: Readonly<Record<string, string>>,
  ) => ChoiceRequest | null
}

   
                            
                                                        
   
export function makeFromStandbyTriggers(
  spec: FromStandbySpec, selfOid: ObjId, controller: PlayerId,
): readonly Trigger[] {
  return FROM_STANDBY_EVENTS.map((event) => compileTrigger({
    id: `${spec.defId}-${event}:${selfOid}`, rawId: true,
    sourceDefId: spec.defId,
    event,
    by: 'you', // 「每当【你】将一张牌…打出时」
    when: [{
      kind: 'custom',
                                                     
      test: (ev) => (ev as { fromStandby?: boolean }).fromStandby === true,
    }],
    ...(spec.nextChoice === undefined ? {} : {
      nextChoice: (state: GameState, _ev: GameEvent, chosen: Readonly<Record<string, string>>) =>
        spec.nextChoice!(state, selfOid, controller, chosen),
    }),
    effect: (state: GameState, _ev: GameEvent, chosen?: Readonly<Record<string, string>>) =>
      spec.effect(state, selfOid, controller, chosen ?? {}, event),
  }, selfOid, controller))
}
