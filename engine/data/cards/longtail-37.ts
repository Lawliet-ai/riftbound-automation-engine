                          
  
                                                                           
                                             
                                                                  
                                                
  
                                                    
                                                            
                                                  
                                                     
                                                    
                                                          
                                                                  
                                                                 
                                               

import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { resolveSelector } from '../../src/dsl/selector'
import type { Selector } from '../../src/dsl/selector'
import { pumpEvent } from './activated-batch'
import { onField } from './activated-batch2'
import { SUBJECT_IS_NOT_TOKEN } from './notTokenGuard1154'

const wake = (selfOid: ObjId): GameEvent =>
  ({ kind: 'statusChange', target: selfOid, key: 'dormant', value: false })

export const ARC_005_CARD_EFFECT = '每当你弃置任意数量的手牌时，让我变为活跃状态，且本回合内{{S}}+1。'
export const OGN_027_CARD_EFFECT = '每当你在回合中打出第二张牌时，让我本回合内{{S}}+2，并让我变为活跃状态。'

                               
export const OGN_027_NTH = 2

export function makeArc005Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'ARC-005-discard',
    event: 'zoneChange', by: 'any',
    nthType: true, // 「任意数量」:同一批弃多张只响一次
    when: [{ kind: 'custom', test: (ev, state): boolean => {
      const e = ev as { from?: ZoneId; to?: ZoneId }
                                             
      if (state.zones[e.from as ZoneId]?.kind !== 'hand') return false
                                                      
                                                   
                                                             
      return (e.to as string) === `discard:${controller}`
    } }],
    effect: (): readonly GameEvent[] => [wake(selfOid), pumpEvent('ARC-005', selfOid as string, 1)],
  }, selfOid, controller)
}

   
                                                                
                                                                 
                                                                        
  
                                                  
                                                                    
                                                                                 
                                                                                       
                                                                            
                                                                          
                                    
                                                                 
                                                                           
                                                            
                                                             
                                                                           
   
export function makeOgn027Trigger(selfOid: ObjId, controller: PlayerId, event: 'playUnit' | 'playSpell' = 'playUnit'): Trigger {
  return compileTrigger({
    id: `OGN-027-second:${event}`, rawId: true, sourceDefId: 'OGN-027',
    event, by: 'any',
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「**你**打出」
                                                                 
                                                                        
                                                                  
                                                                                     
                                                             
                                                           
      SUBJECT_IS_NOT_TOKEN,
                                              
                                                                                     
      { kind: 'custom', test: (_ev, state): boolean =>
        (state.playedCardCountThisTurn?.[controller as string] ?? 0) === OGN_027_NTH },
    ],
    effect: (): readonly GameEvent[] => [pumpEvent('OGN-027', selfOid as string, 2), wake(selfOid)],
  }, selfOid, controller)
}

export const ARC_005: Card = {
  id: 'ARC-005', cardNo: 'ARC-005/006', name: '金克丝', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }], abilities: [],
}
export const OGN_027: Card = {
  id: 'OGN-027', cardNo: 'OGN·027/298', name: '德莱厄斯', category: 'unit',
  domains: ['red'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }], abilities: [],
}
export const LONGTAIL_37_DEFIDS: readonly string[] = ['ARC-005', 'OGN-027', 'UNL-074']

                                                                    
                                        
  
                                                              
                                                                             
                                     
                                                       
                                                                
                             
export const UNL_074_NTH_DRAW = 2
export const UNL_074_CARD_EFFECT = '当你在每回合内抽第二张牌时，让一名友方单位本回合内{{S}}+2。'

                                                                            
const UNL_074_SELECTOR: Selector = { type: 'unit', controller: 'you', isTarget: true, filter: (o, st) => onField(st, o) }

export function makeUnl074Trigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'UNL-074-secondDraw',
    event: 'draw', by: 'any',
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「**你**抽」
                                                                                   
                                                                                  
                                                                                    
      { kind: 'custom', test: (ev, state): boolean => {
        const n = state.drawnThisTurn?.[controller] ?? 0
        const c = Math.max(1, (ev as { count?: number }).count ?? 1)
        return n - c < UNL_074_NTH_DRAW && n >= UNL_074_NTH_DRAW
      } },
    ],
    choose: {
      key: 'unit', prompt: '冰封宝石:让一名友方单位本回合内战力+2',
      selector: UNL_074_SELECTOR,
    },
    effect: (state: GameState, _ev: GameEvent, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
      const t = chosen?.['unit']
                                                              
                                                                                   
      if (t === undefined || !resolveSelector(state, UNL_074_SELECTOR, controller).includes(t as ObjId)) return []
      return [pumpEvent('UNL-074', t, 2)]
    },
  }, selfOid, controller)
}

export const UNL_074: Card = {
  id: 'UNL-074', cardNo: 'UNL-074/219', name: '冰封宝石', category: 'equipment',
  domains: ['blue'], energy: 2, power: 0, keywords: [], playModes: [{ kind: 'standard' }], abilities: [],
}
