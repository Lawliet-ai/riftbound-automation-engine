                                                                       
                                        
                                          
  
                                       
                                                                  
                                                                          
                                                 
                                                          
                                                
                                            
                                              
                                        
                                                       
                                                                       
  
                                                    
                                                                         
                                            
                                       
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'

export const OGN_156_CARD_EFFECT =
  '指定一名对手，让其展示手牌，并从中选择一张非单位卡牌，让对手将其回收。'

                     
export const OGN_156_PICK_KEY = 'sabotagePick'

   
                                           
  
                                                                    
                                                     
                  
                                                                   
                                                            
                                                        
                                                  
                                                     
                                                                    
  
                                                                     
                                                                                                        
                                        
                                                           
                                                                                   
                                                         
                                              
                                                             
   
export function opponentsOf(state: GameState, me: PlayerId): string[] {
  return state.players.filter((p) => p !== me) as string[]
}

   
                                   
                                                                     
   
export function nonUnitsInHand(state: GameState, who: string): ObjId[] {
  return (state.zones[`hand:${who}`]?.contents ?? [])
    .filter((oid) => !isUnit(state.objects[oid]))
}

export const OGN_156_SPEC: PlaySpec = {
  defId: 'OGN-156', cardNo: 'OGN·156/298', name: '暗中破坏', kind: 'spell',
  cost: { mana: 1, pips: [['orange']] },
  keywords: [],
  target: 'custom', // ★目标是**玩家**,不是物件
  legalTargets: (state, controller): string[] => opponentsOf(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen) => {
    if (target === undefined || chosen[OGN_156_PICK_KEY] !== undefined) return null
    if (!opponentsOf(state, controller).includes(target)) return null               
    const cards = nonUnitsInHand(state, target)
    if (cards.length === 0) return null                      
    return {
      itemId: `play:${movedCardOid}`,
      controller, // ★★「选择」的主语是【我】——下一句才把动作交回给对手
      key: OGN_156_PICK_KEY,
      prompt: '暗中破坏:从对手手牌里挑一张非单位卡牌,让他回收',
      candidates: cards.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
    }
  },
  makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
    const pick = (chosen ?? {})[OGN_156_PICK_KEY]
    if (target === undefined || pick === undefined) return []
                                             
    if (!opponentsOf(state, controller).includes(target)) return []
    if (!nonUnitsInHand(state, target).includes(pick as ObjId)) return []
                                                      
    return [{ kind: 'recycle', player: target as PlayerId, objs: [pick as ObjId] } as GameEvent]
  },
}

export const OGN_156: Card = {
  id: 'OGN-156', cardNo: 'OGN·156/298', name: '暗中破坏', category: 'spell',
  domains: ['orange'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '看对手手牌,挑一张非单位卡让他回收(OGN_156_SPEC)' }],
}
