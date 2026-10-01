                                                                    
                                        
                             
                            
  
                                   
                                                                      
                                                               
                                     
                                                   
  
                   
                                                   
                                                                  
                                                                   
                                                       
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { retrievableFromDiscard } from './SFD-035'

export const OGN_170_CARD_EFFECT = '让你废牌堆里的一名单位返回手牌。'

   
                                                                 
                                                 
   
export function reviveCandidates(state: GameState, controller: PlayerId): string[] {
  return (retrievableFromDiscard(state, controller, 'unit') as readonly string[]).slice().sort()
}

export const OGN_170_SPEC: PlaySpec = {
  defId: 'OGN-170', cardNo: 'OGN·170/298', name: '亡者复生', kind: 'spell',
  cost: { mana: 2 }, // ⚠️ 0 pip ⇒ 只写 mana(①)
  keywords: ['迅捷'], // §806 时机权限(印刷表侧另有一份登记)
  target: 'custom',
  legalTargets: (state, controller) => reviveCandidates(state, controller),
  makeResolve: ({ target, controller }) => (state): readonly GameEvent[] => {
    if (target === undefined) return []
                                                      
    if (!reviveCandidates(state, controller).includes(target)) return []
                              
    return [{ kind: 'zoneChange', obj: target as ObjId, to: `hand:${controller}` as ZoneId } as GameEvent]
  },
}

export const OGN_170: Card = {
  id: 'OGN-170', cardNo: 'OGN·170/298', name: '亡者复生', category: 'spell',
  domains: ['purple'], energy: 2, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '把自己废牌堆里的一名单位捞回手牌(OGN_170_SPEC)' }],
}
