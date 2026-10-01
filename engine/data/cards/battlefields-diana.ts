                                                       
                                          
                                                      
                                                         
                                                                        

import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Cost } from '../../src/state/runePool'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { couldPayWithReactionGains, payFromState } from '../../src/game/economy'
import { isUnitDefId } from '../cardKinds'

export const OGN_280_CARD_EFFECT = '当你据守此处时，抽一张牌。'
export const OGN_288_CARD_EFFECT = '当你据守此处时，你可以选择召出一枚休眠的符文。'
export const UNL_214_CARD_EFFECT = '当此处的一名单位返回到一名玩家的手牌时，该玩家可以选择支付{{1}}，以此召出一枚休眠的符文。'

   
                                                                   
                                                                         
                                                                       
                                        
   
                                                                   
const NO_SOURCE = null

                    
export function makeWillowTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'draw', count: 1 }], // 抽的是 controller(draw 只认它)
  })
  return compileTrigger({
    id: `OGN-280:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'OGN-280',
    event: 'hold', by: 'you',
                                                                     
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

                           
export function makeStarSpireTrigger(bfZoneId: string, controller: PlayerId): Trigger {
                                                       
                                                       
                                                    
                                          
                                                               
                                                              
                                                                     
  const effect = compileEffect({
                                                   
    then: [{ op: 'summonRune', count: 1, dormant: true }],
  })
  return compileTrigger({
    id: `OGN-288:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'OGN-288',
    event: 'hold', by: 'you',
    mayChoose: true, // ★1492【§383.3.a】开头那一问搬到**确认阶段**
                                                               
                                                       
                                                              
                                                
                                                      
    when: [{ kind: 'eventAtBattlefield', zone: bfZoneId }, { kind: 'eventPlayerIs', side: 'you' }],
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

                                            
export const UNL_214_COST: Cost = { mana: 1 }

                                     
export function makeGhostBayTrigger(bfZoneId: string, controller: PlayerId): Trigger {
                                                      
                                                        
                                                             
                                                           
                                                         
                                   
                                                                  
                                                              
                                                   
  const effect = compileEffect({
    then: [{ op: 'summonRune', count: 1, dormant: true }],
  })
  return compileTrigger({
    id: `UNL-214:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-214',
    event: 'zoneChange', by: 'any',
                                                         
                                                                           
    when: [{ kind: 'custom', test: (ev) => ev.kind === 'zoneChange' && ev.from === bfZoneId
      && String(ev.to) === `hand:${controller}` && isUnitDefId(ev.defId) },
    {
                                                               
                                                            
                                                                       
                                                          
                                                                                       
                                                                      
                                                                                     
      kind: 'custom' as const,
      test: (_ev: GameEvent, state: GameState): boolean =>
        couldPayWithReactionGains(state, controller, UNL_214_COST),
    }],
    mayChoose: true, // ★1492【§383.3.a】开头那一问搬到**确认阶段**
                                                             
                                                               
                                                                     
                                                                        
                                                                   
    basePerform: (state): GameState | null => {
      const paid = payFromState(state, controller, UNL_214_COST)
      return paid.ok ? paid.state : null
    },
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

export const DIANA_BF_TRIGGER_FACTORIES: Readonly<Record<string, (bfZoneId: string, player: PlayerId) => readonly Trigger[]>> = {
  'OGN-280': (bf, p) => [makeWillowTrigger(bf, p)],
  'OGN-288': (bf, p) => [makeStarSpireTrigger(bf, p)],
  'UNL-214': (bf, p) => [makeGhostBayTrigger(bf, p)],
}

export const DIANA_BF_NAMES: Readonly<Record<string, string>> = {
  'OGN-280': '帝柳之林', 'OGN-288': '星尖峰', 'UNL-214': '鬼影湾',
}
