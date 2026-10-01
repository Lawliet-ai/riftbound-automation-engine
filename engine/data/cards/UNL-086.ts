                                                                       
                                                               
                                             
                       
  
                         
                                                         
                           
                                                              
                                                                        
  
                                                               
                                                                     
                                                 
                         
                                                       
                                               
import type { Card } from '../../src/dsl/card'
import type { SpawnTokenEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'

export const UNL_086_CARD_EFFECT =
  '每回合限一次，如果我位于战场上，若你要打出一名指示物单位，则你可以选择改为打出该指示物单位和它的一名复制体。'

                                                                                  
export const TOKEN_DOUBLE_LEDGER_SUFFIX = 'tokenDouble'

   
                                                    
                                      
                                                              
   
export function tokenSpawnDoubler(state: GameState, ev: SpawnTokenEvent): ObjId | undefined {
  if (ev.spec.baseTypes?.includes('equipment') === true) return undefined               
  const z = Object.values(state.objects).find((o) =>
    o.defId === 'UNL-086'
    && state.zones[o.zone]?.kind === 'battlefield'                     
    && o.controller === ev.owner                            
    && state.abilityFiredThisTurn?.[`${o.oid}:${TOKEN_DOUBLE_LEDGER_SUFFIX}`] !== true)               
  return z?.oid
}

export const UNL_086: Card = {
  id: 'UNL-086', cardNo: 'UNL-086/219', name: '基兰', category: 'unit', // 英雄单位 → unit
  domains: ['blue'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每回合限一次(每实例):我方打出单位指示物时改为打出它和一枚复制体(landEvent 落地钩)' }],
}
