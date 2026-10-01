                      
  
                                              
                                          
  
                                              
                                         
  
                                                   
                                                  
                                           
                                                               
                                        
                                                          
                                  
                                          
                                                   

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import type { Op } from '../../src/dsl/effectSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { playerTurnIndex } from '../../src/scoring/score'

export const OGN_284_CARD_EFFECT = '每名玩家在各自的第一个回合开始阶段，额外召出一枚符文。'
export const OGN_290_CARD_EFFECT = '每名玩家在各自的第一个回合开始阶段，获得1分。'

                                            
function onOwnFirstTurnStart(controller: PlayerId) {
  return (ev: GameEvent, state: GameState): boolean =>
    (ev as { player?: PlayerId }).player === controller               
    && playerTurnIndex(state, controller) === 1                    
}

function makeFirstTurnBfTrigger(
  defId: string, bf: string, controller: PlayerId, then: readonly Op[],
): Trigger {
  const effect = compileEffect({ then })
  return {
    id: `${defId}:startPhase:${bf}:${controller}`,
    sourceOid: null, // §170 战场卡不是场上物件、没有 oid(铁律66)
    sourceDefId: defId,
    controller,
    event: 'startPhase',
    by: 'any', // 判据全在 filter 里,不靠 actor
    filter: onOwnFirstTurnStart(controller),
    effect: (state: GameState, ev: GameEvent) => effect({ state, selfOid: null, controller, ev, chosen: {} }),
  }
}

                         
export function makeObeliskTrigger(bf: string, controller: PlayerId): Trigger {
  return makeFirstTurnBfTrigger('OGN-284', bf, controller, [{ op: 'summonRune', count: 1 }])
}
                                    
export function makeGloryArenaTrigger(bf: string, controller: PlayerId): Trigger {
  return makeFirstTurnBfTrigger('OGN-290', bf, controller, [{ op: 'gainPoint', amount: 1 }])
}

export const OGN_284: Card = {
  id: 'OGN-284', cardNo: 'OGN·284/298', name: '力量方尖碑', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '每名玩家各自第一个回合开始阶段额外召出一枚符文(makeObeliskTrigger)' }],
}
export const OGN_290: Card = {
  id: 'OGN-290', cardNo: 'OGN·290/298', name: '荣耀竞技场', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '每名玩家各自第一个回合开始阶段获得1分(makeGloryArenaTrigger)' }],
}

                     
export const LONGTAIL11_DEFIDS: readonly string[] = ['OGN-284', 'OGN-290']
