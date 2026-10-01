                                                               
                                             
                                      
  
                                  
                                                                  
                                                                 
  
                                                       
                                                                           
                                                                 
                                                     
                                                          
                                                           
                                                          
  
                 
                             
                                                                  
                                                  
                                                                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { CARD_COSTS } from '../cardCosts'

export const SFD_100_CARD_EFFECT = '当你打出一张符能费用不低于{{A}}{{A}}的卡牌时，抽一张牌。'

                                 
export const SFD_100_MIN_PIPS = 2

                                                     
export function pipCostAtLeast(defId: string | undefined, min: number): boolean {
  if (defId === undefined) return false
  return (CARD_COSTS[defId]?.pips ?? 0) >= min
}

   
                                          
                                                                
   
export function playedDefIdOf(state: GameState, ev: GameEvent): string | undefined {
  if (ev.kind === 'playUnit') return state.objects[ev.unit]?.defId
  if (ev.kind === 'playSpell') return ev.defId
  return undefined
}

function makeOne(selfOid: ObjId, controller: PlayerId, event: 'playUnit' | 'playSpell'): Trigger {
  return compileTrigger({
    id: `SFD-100:${event}:${selfOid}`, rawId: true,
    sourceDefId: 'SFD-100',
    abilityKey: `SFD-100:${selfOid}`, // 同一条能力的两个时机 ⇒ 得分互映别当两条(§471 互映去重)
    event,
    by: 'you', // ①「**你**打出」
    when: [{ kind: 'custom', test: (ev, state) => pipCostAtLeast(playedDefIdOf(state, ev), SFD_100_MIN_PIPS) }],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
  }, selfOid, controller)
}

                                                            
export function makeYordleExplorer100Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  return [makeOne(selfOid, controller, 'playUnit'), makeOne(selfOid, controller, 'playSpell')]
}

export const SFD_100: Card = {
  id: 'SFD-100', cardNo: 'SFD·100/221', name: '约德尔探险家', category: 'unit',
  domains: ['orange'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你打出符能费≥[A][A]的卡牌时抽一张(makeYordleExplorer100Triggers)' }],
}
