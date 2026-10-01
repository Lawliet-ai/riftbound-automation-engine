                                                               
  
                                                            
                                                     
                                                      
                                                    
                                   
  
                                                                      
                                     
                                                               
                                                                 
                                                                   
                                                                            
                                                         
                                                
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { banishedBy } from '../../src/actions/banish'

   
                                                          
                          
                                           
                                      
   
export type ReplayLanding = (ev: GameEvent, o: GameObject, state: GameState) => ZoneId | undefined

   
                                          
                                    
   
export function makeBanishReplayTrigger(
  defId: string,
  selfOid: ObjId,
  controller: PlayerId,
  landing?: ReplayLanding,
): Trigger {
  return compileTrigger({
    id: `${defId}:play:${selfOid}`, rawId: true, sourceDefId: defId,
    event: 'banished', by: 'any', // 认的是"我放逐的",不是"我引发的这批"(铁律153)
    when: [{
      kind: 'custom',
      test: (ev: GameEvent, state: GameState) => {
        const card = (ev as unknown as { card?: ObjId }).card
        return card !== undefined && banishedBy(state, selfOid).includes(card)
      },
    }],
    effect: (state: GameState, ev: GameEvent): readonly GameEvent[] => {
      const card = (ev as unknown as { card?: ObjId }).card
      const o = card === undefined ? undefined : state.objects[card]
      if (!o) return []
      const to = landing?.(ev, o, state)
                                                                      
      return [{
        kind: 'playFree', obj: card as ObjId, player: o.owner,
        ...(to !== undefined ? { to } : {}),
      } as GameEvent]
    },
  }, selfOid, controller)
}

                                                                
export const SAME_PLACE: ReplayLanding = (ev, _o, state) => {
  const from = (ev as unknown as { from?: ZoneId }).from
                              
  return from !== undefined && state.zones[from] !== undefined ? from : undefined
}

   
                                             
                                               
                                           
   
export const OWNER_BASE: ReplayLanding = () => undefined
