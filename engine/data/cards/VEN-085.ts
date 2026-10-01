                                                                     
                                                             
                                                       
  
                                                         
                                                                    
                                                                 
                                                                           
                                                       
                                               
                                             
  
                                  
                                                
                                                                           
                                             
                                                     
  
                                                   
                                                   
                                                                     
                                               
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { CARD_DOMAINS } from '../cardDomains'
import { opponentsOf } from './OGN-156'

export const VEN_085_CARD_EFFECT =
  '选择一名对手。让其展示手牌，你从中选择一张具有灵光（{{蓝色}}）特性的卡牌。让其将该卡牌回收。'

                     
export const VEN_085_PICK_KEY = 'wordsOfPowerPick'

                                        
export const GLIMMER_COLOR = 'blue'

                                               
export function hasGlimmer(defId: string): boolean {
  return (CARD_DOMAINS[defId] ?? []).includes(GLIMMER_COLOR)
}

                                     
export function glimmerInHand(state: GameState, who: string): ObjId[] {
  return (state.zones[`hand:${who}`]?.contents ?? [])
    .filter((oid) => hasGlimmer(state.objects[oid]?.defId ?? ''))
}

export const VEN_085_SPEC: PlaySpec = {
  defId: 'VEN-085', cardNo: 'VEN·085', name: '力量箴言', kind: 'spell',
  cost: { mana: 1 }, // 卡面核:1法力 **0pip**(CARD_COSTS 现查,不从卡文推)
  keywords: [],
  target: 'custom', // ★目标是**玩家**,不是物件(同 OGN-156)
  legalTargets: (state, controller): string[] => opponentsOf(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen) => {
    if (target === undefined || chosen[VEN_085_PICK_KEY] !== undefined) return null
    if (!opponentsOf(state, controller).includes(target)) return null               
    const cards = glimmerInHand(state, target)
    if (cards.length === 0) return null                     
    return {
      itemId: `play:${movedCardOid}`,
      controller, // ★★「你从中选择」的主语是【我】——下一句才把动作交回给对手
      key: VEN_085_PICK_KEY,
      prompt: '力量箴言:从对手手牌里挑一张灵光卡牌,让他回收',
      candidates: cards.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
    }
  },
  makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
    const pick = (chosen ?? {})[VEN_085_PICK_KEY]
    if (target === undefined || pick === undefined) return []
                                             
    if (!opponentsOf(state, controller).includes(target)) return []
    if (!glimmerInHand(state, target).includes(pick as ObjId)) return []
                                                       
    return [{ kind: 'recycle', player: target as PlayerId, objs: [pick as ObjId] } as GameEvent]
  },
}

export const VEN_085: Card = {
  id: 'VEN-085', cardNo: 'VEN·085', name: '力量箴言', category: 'spell',
  domains: ['orange'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名对手,我从他手牌挑一张灵光(蓝)卡,他回收(VEN_085_SPEC)' }],
}
