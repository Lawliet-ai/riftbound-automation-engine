                                                                  
                                              
                                                             
  
                                                    
                                                      
                                                      
                                                               
                                                           
                                            
                                                               
                                                                       
                                                                            
                                                                   
                                                                         
                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import { asZoneId, type ObjId, type PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { WAR_HAWK_TOKEN } from './reprint-batch'
import { opponentsOf } from './OGN-156'
import { spawnTokenHasteChoice, spawnTokenHasteResolve } from './spawn-token-haste'                            
import { hasteKeyOf } from './haste-key'                                                       

export const UNL_130_CARD_EFFECT =
  '{{法盾}}\n当你打出我时，选择一名对手。该玩家打出一名1{{S}}的“战鹰”，它拥有{{法盾}}。'

const UNL_130_PICK = 'foePlayer'
                                                               
export const UNL_130_HASTE_KEY = hasteKeyOf('UNL-130:hawk')

export function makePerchTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `UNL-130:play:${selfOid}`, rawId: true, sourceDefId: 'UNL-130',
    event: 'playUnit', by: 'you',
    when: [{ kind: 'subjectIsSelf' }],
    nextChoice: (state, _ev, chosen): ChoiceRequest | null => {
      const who = chosen[UNL_130_PICK]
                                                                                                       
      if (who !== undefined) return spawnTokenHasteChoice(state, who as PlayerId, WAR_HAWK_TOKEN, { itemId: `trig:UNL-130:${selfOid}`, key: UNL_130_HASTE_KEY, label: '战鹰' }, chosen)
      return {
        itemId: `trig:UNL-130:${selfOid}`,
        controller,
        key: UNL_130_PICK,
        prompt: '移动栖木:选择一名对手,该玩家打出一名战力 1 的战鹰(有{{法盾}})',
        isTarget: true, // ★1782 选择一名对手
        candidates: opponentsOf(state, controller).map((p) => ({ id: p, label: p })),
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const who = chosen?.[UNL_130_PICK]
      if (who === undefined) return []                
                                                             
                                                                
      const x = spawnTokenHasteResolve(state, who as PlayerId, WAR_HAWK_TOKEN, UNL_130_HASTE_KEY, chosen)
      return [...x.pre, {
        kind: 'spawnToken', spec: WAR_HAWK_TOKEN,
        zone: asZoneId(`base:${who}`), owner: who as PlayerId, ...(x.ready ? { ready: true } : {}),
      } as GameEvent]
    },
  }, selfOid, controller)
}

export const UNL_130: Card = {
  id: 'UNL-130', cardNo: 'UNL-130/219', name: '移动栖木', category: 'unit',
  domains: ['purple'], energy: 5, power: 6, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时选一名对手,该玩家打出一名带法盾的1[S]战鹰(makePerchTrigger)' }],
}
