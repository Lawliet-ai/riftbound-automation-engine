                                                             
                                                                 
                                                   
                                              
                                                             
                                                  
                                                        

import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                            
import type { Card } from '../../src/dsl/card'

                                                        
export const UNL_088_CARD_EFFECT =
  '在你的开始阶段开始时，如果你有且仅有四张手牌，且你在各处战场上有且仅有四名单位，则立即赢得对局。\n' +
  '弃置一张手牌，{{横置}}：打出一名1{{S}}的“战鹰”，它拥有{{法盾}}。（对手必须支付{{A}}才能将其选作法术或技能的目标。）'

   
                                              
  
                                                                       
                                                   
                                    
                                                  
                                               
                                                                      
                                                                           
  
                                                                             
                                                             
                                                      
                                    
   
export function battlefieldUnitCount(state: GameState, player: PlayerId): number {
  return zonesByKind(state, 'battlefield')
    .flatMap((bf) => bf.contents)
    .map((oid) => state.objects[oid])
    .filter((o) => o !== undefined && o.controller === player && isUnit(o)).length
}

export function handSize(state: GameState, player: PlayerId): number {
  return (state.zones[`hand:${player}`]?.contents ?? []).length
}

                            
export function palaceWinPredicate(state: GameState, player: PlayerId): boolean {
  return handSize(state, player) === 4 && battlefieldUnitCount(state, player) === 4
}

   
                                                                    
                                                                                                                                 
   
export function palaceStartCheck(state: GameState, controller: PlayerId): GameState {
  if (state.winner) return state
  return palaceWinPredicate(state, controller) ? { ...state, winner: controller } : state
}

export const UNL_088: Card = {
  id: 'UNL-088',
  cardNo: 'UNL-088/219',
  name: '倾颓宫殿',
  category: 'equipment',
  domains: ['blue'],
  energy: 4, // 卡面核 2026-07-21(原骨架误记3):4法力+0符能
  keywords: [],
  playModes: [{ kind: 'standard' }],
                                                          
                                                       
  abilities: [
    { kind: 'activated', cost: { tap: true }, effect: () => [] }, // 战鹰召出(占位,M2)
  ],
}
