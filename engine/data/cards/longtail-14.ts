                      
  
                                           
                                                                  
                                                    
  
                                                    
                                                
  
                                                                           
                                                
  
                                          
                                                        
                                                  
                                                          
  
                              
                                                  
                           
                                                             
                           
                                                       

import type { Card } from '../../src/dsl/card'
import { victimIsSelf } from '../../src/keywords/lastRites'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { compileEffect } from '../../src/dsl/effectSpec'
import { CARD_COSTS } from '../cardCosts'

                                                                     
export const OGN_182_CARD_EFFECT = '当此牌被打出、弃置或摧毁时，抽一张牌。'
const OGN_182_ABILITY = 'OGN-182:scrapheap'
const drawOne = (controller: PlayerId): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 }]

   
                                            
                              
   
export function makeScrapheapTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const base = { sourceOid: selfOid, sourceDefId: 'OGN-182', controller, abilityKey: OGN_182_ABILITY }
  return [
                                           
    {
      ...base, id: `OGN-182:play:${selfOid}`, event: 'playUnit', by: 'any',
      filter: (ev: GameEvent): boolean => (ev as { unit?: ObjId }).unit === selfOid,
      effect: (): readonly GameEvent[] => drawOne(controller),
    },
                                              
                                        
      
                                  
                                                                
                                                        
                                                
                                                            
                                                     
                                            
    {
      ...base, id: `OGN-182:discard:${selfOid}`, event: 'zoneChange', by: 'any',
      filter: (ev: GameEvent, state: GameState): boolean => {
        const e = ev as { from?: ZoneId; to?: ZoneId; defId?: string }
        if (e.defId !== 'OGN-182') return false
        if (state.zones[e.from as ZoneId]?.kind !== 'hand') return false
        const dest = state.zones[e.to as ZoneId]
        if (dest?.kind !== 'discard') return false
        const landed = (ev as { landedOid?: string }).landedOid                                       
        if (landed !== undefined) return landed === (selfOid as string)
        return dest.contents[dest.contents.length - 1] === selfOid                       
      },
      effect: (): readonly GameEvent[] => drawOne(controller),
    },
                              
    {
                                                                  
                                                     
                                                                        
      ...base, id: `OGN-182:destroyed:${selfOid}`, event: 'destroyed', by: 'any',
      filter: (ev: GameEvent): boolean =>
        victimIsSelf((ev as { victim?: { oid?: ObjId; postDeathOid?: ObjId } }).victim, selfOid),
      effect: (): readonly GameEvent[] => drawOne(controller),
    },
  ]
}
export const OGN_182: Card = {
  id: 'OGN-182', cardNo: 'OGN·182/298', name: '废料堆', category: 'equipment',
  domains: ['purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '被打出/弃置/摧毁时抽一张(makeScrapheapTriggers)' }],
}

                                                                  
export const OGS_006_CARD_EFFECT = '每当你打出费用不低于{{5}}的法术时，让我本回合内{{S}}+3。'
export const OGS_021_CARD_EFFECT = '每当你打出一张费用不低于{{5}}的法术时，抽一张牌。'
const BIG_SPELL_MANA = 5

   
                                        
                                                     
                                                           
                                            
                                     
   
function bigSpellByMe(controller: PlayerId) {
  return (ev: GameEvent, state: GameState): boolean => {
    const e = ev as { player?: PlayerId; cardOid?: ObjId; chainCardOid?: ObjId; defId?: string }
    if (e.player !== controller) return false
                                                                      
                                                                             
    if (e.defId !== undefined) return (CARD_COSTS[e.defId]?.mana ?? 0) >= BIG_SPELL_MANA
    if (e.cardOid === undefined) return false
                                                                                              
                                                                                                  
    const defId = (e.chainCardOid !== undefined ? state.objects[e.chainCardOid]?.defId : undefined) ?? state.objects[e.cardOid]?.defId
    return defId !== undefined && (CARD_COSTS[defId]?.mana ?? 0) >= BIG_SPELL_MANA
  }
}

                         
export function makeLuxTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 3, duration: 'thisTurn', id: `OGS-006-lux:${selfOid}` }],
  })
  return {
    id: `OGS-006:playSpell:${selfOid}`, sourceOid: selfOid, sourceDefId: 'OGS-006', controller,
                                                                         
                                                          
    event: 'spellResolved', by: 'any',
    filter: bigSpellByMe(controller),
    effect: (state: GameState, ev: GameEvent) => effect({ state, selfOid, controller, ev, chosen: {} }),
  }
}

                                    
export function makeLuxLegendTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return {
    id: `OGS-021:playSpell:${selfOid}`, sourceOid: selfOid, sourceDefId: 'OGS-021', controller,
                                                                         
                                                          
    event: 'spellResolved', by: 'any',
    filter: bigSpellByMe(controller),
    effect: (): readonly GameEvent[] => drawOne(controller),
  }
}

export const OGS_006: Card = {
  id: 'OGS-006', cardNo: 'OGS·006/024', name: '拉克丝', category: 'unit',
  domains: ['blue'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出费用≥5的法术时我本回合[M]+3(makeLuxTrigger)' }],
}
export const OGS_021: Card = {
  id: 'OGS-021', cardNo: 'OGS·021/024', name: '光辉女郎', category: 'legend',
  domains: ['blue', 'yellow'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '你打出费用≥5的法术时抽一张(makeLuxLegendTrigger)' }],
}

                     
export const LONGTAIL14_DEFIDS: readonly string[] = ['OGN-182', 'OGS-006', 'OGS-021']
