                     
  
                                                        
  
                                           
                                              
                                                   
                                             
                                           
                                          
                                         
                                     
  
                                                          
                                                                       
                                               
                                                                 
                                                                      

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileEffect } from '../../src/dsl/effectSpec'
import { sameRoleCombatants } from '../../src/combat/battleRoles'
import { isUnit } from '../../src/state/cardTypes'

export const OGN_060_CARD_EFFECT = '每当一名友方单位独自进攻或防守时，让其本回合内{{S}}+1。'

                                                         
function combatantOf(state: GameState, ev: GameEvent): ObjId | null {
  const unit = (ev as { unit?: ObjId }).unit
  if (unit === undefined) return null
  return state.objects[unit] ? unit : null
}

function makeVisorTrigger(selfOid: ObjId, controller: PlayerId, event: 'attack' | 'defend'): Trigger {
  const effect = compileEffect({
    then: [{
      op: 'addMight',
      target: { ref: 'chosen', key: 'visorUnit' },
      delta: 1,
      duration: 'thisTurn', // 「本回合内」
      id: `OGN-060-visor:${selfOid}`,
    }],
  })
                                                              
                                                                         
                                                                            
  return {
    id: `OGN-060:${event}:${selfOid}`,
    sourceOid: selfOid,
    sourceDefId: 'OGN-060',
    controller,
    abilityKey: `OGN-060:${selfOid}`, // ⑧ 一卡两时机共用一个能力标识
    event,
    by: 'any', // 「一名友方单位」按控制者判,不靠 actor
    filter: (ev: GameEvent, state: GameState): boolean => {
      const oid = combatantOf(state, ev)
      if (oid === null) return false                        
      const u = state.objects[oid]!
      if (!isUnit(u) || u.controller !== controller) return false          
      return sameRoleCombatants(state, u).length === 1                   
    },
    effect: (state: GameState, ev: GameEvent) => {
      const oid = combatantOf(state, ev)
      if (oid === null) return []
      return effect({ state, selfOid, controller, ev, chosen: { visorUnit: oid as string } })
    },
  }
}

                                
export function makeVisorTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeVisorTrigger(selfOid, controller, 'attack'), makeVisorTrigger(selfOid, controller, 'defend')]
}

export const OGN_060: Card = {
  id: 'OGN-060', cardNo: 'OGN·060/298', name: '远见面具', category: 'equipment',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '友方单位独自进攻或防守时该单位本回合[M]+1(makeVisorTriggers)' }],
}

                                                              
export const LONGTAIL10_DEFIDS: readonly string[] = ['OGN-060']
