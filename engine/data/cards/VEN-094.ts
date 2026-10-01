                                                                     
                                                   
                                
  
                           
                                                                
                                                       
                                                                
                                                                 
                                               
                                                                     
                                   
  
                                                                    
                                                                     
                                         
                                                 
                                                                
                                        
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { payFromState } from '../../src/game/economy'

                                                      
export const VEN_094_PAY: Cost = { mana: 1 }
                               
export const VEN_094_BONUS = 2
export const VEN_094_CARD_EFFECT =
  '当你弃置我时，你可以选择支付{{1}}，以此给予一名友方单位在本回合内{{S}}+2。'

   
                                                               
  
                                               
                                                          
                                                           
                                                                  
                                                   
                                         
   
export function discardedSelf094(ev: GameEvent, state: GameState, selfOid: ObjId): boolean {
  const e = ev as { from?: ZoneId; to?: ZoneId; defId?: string }
  if (e.defId !== 'VEN-094') return false
  if (state.zones[e.from as ZoneId]?.kind !== 'hand') return false
  const dest = state.zones[e.to as ZoneId]
  if (dest?.kind !== 'discard') return false
  const landed = (ev as { landedOid?: string }).landedOid                  
  if (landed !== undefined) return landed === (selfOid as string)
  return dest.contents[dest.contents.length - 1] === selfOid
}

export function makeMaskMother094Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `VEN-094:${selfOid}`, rawId: true,
    sourceDefId: 'VEN-094',
    event: 'zoneChange',
    by: 'any', // ⚠️「当【你】弃置我时」那道归属判据由下面的 filter 兜(弃的是我这张牌本身)
    when: [{ kind: 'custom', test: (ev, state) => discardedSelf094(ev, state, selfOid) }],
    mayChoose: true, // §383.3.a 卡文以「你可以选择」开头
                                                             
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, VEN_094_PAY)
      return paid.ok ? paid.state : null
    },
    choose: {
      key: 'ally',
      prompt: '面具之母:给予一名友方单位本回合内战力+2',
                                                           
                                                                
                                                           
                                                  
      selector: { type: 'unit', controller: 'you', fielded: true, isTarget: true },
    },
                                                               
                                                                                       
    effect: (state, _ev, chosen): readonly GameEvent[] => compileEffect({
      then: [{
        op: 'addMight', target: { ref: 'chosen', key: 'ally' },
        delta: VEN_094_BONUS, duration: 'thisTurn', id: `VEN-094:${selfOid}`,
      }],
    })({ state, selfOid, controller, ev: undefined as never, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const VEN_094: Card = {
  id: 'VEN-094', cardNo: 'VEN·094', name: '面具之母', category: 'unit',
  domains: ['purple'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '被弃置时可付{1}给一名友方单位本回合[S]+2(makeMaskMother094Trigger)' }],
}
