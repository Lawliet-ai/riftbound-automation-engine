                                                                   
                                                            
                             
                                          
                                                             
                                                    
  
                                           
                                                                   
                                   
                                                                      
                                                   
                                                                 
                                                        
                                                                  
                               
                                                           
                                               
  
                                 
                                                             
                                                               
  
                 
                                                                               
                                                                         
                                           
                                                        
                                                         
  
                                                          
                                                        
                                                                  
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { zonesByKind } from '../../src/state/gameState'
import { enemyUnitsAt } from './damage-split'                      

export const UNL_204_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n选择战场上的一名敌方单位。其拥有者将该单位放到其主牌堆的顶部或底部。'

                                     
export const UNL_204_WHERE_KEY = 'wardenWhere'

   
                       
                                                                    
   
export function wardenTargets(state: GameState, controller: PlayerId): string[] {
  return zonesByKind(state, 'battlefield')
    .flatMap((z) => enemyUnitsAt(state, z.id as string, controller))
    .sort()
}

   
                                                
                                       
   
export function wardenOwner(state: GameState, target: string | undefined): PlayerId | undefined {
  if (target === undefined) return undefined
  return state.objects[target as ObjId]?.owner
}

                                                  
export function wardenTargetLive(state: GameState, controller: PlayerId, target: string | undefined): boolean {
  return target !== undefined && wardenTargets(state, controller).includes(target)
}

export const UNL_204_SPEC: PlaySpec = {
  defId: 'UNL-204', cardNo: 'UNL-204/219', name: '持卫的裁决', kind: 'spell',
                                                                                       
                                                            
  cost: { mana: 2, pips: [['orange'], ['yellow']] },
  keywords: ['迅捷'], // §806 权限关键词:§308.1.a 法术对决也能打(时机门读的就是这一份)
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => wardenTargets(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }: { movedCardOid: string; controller: PlayerId; target?: string }) => (state: GameState, chosen: Readonly<Record<string, string>>): ChoiceRequest | null => {
    if (chosen[UNL_204_WHERE_KEY] !== undefined) return null            
                                                    
    if (!wardenTargetLive(state, controller, target)) return null
    const owner = wardenOwner(state, target)
    if (owner === undefined) return null
    return {
      itemId: `play:${movedCardOid}`,
      controller: owner, // ★★★ 作答者是【该单位的拥有者】,不是打出者
      key: UNL_204_WHERE_KEY,
      prompt: '持卫的裁决:把这名单位放到你主牌堆的顶部还是底部?',
      candidates: [{ id: 'top', label: '顶部' }, { id: 'bottom', label: '底部' }],
    }
  },
  makeResolve: ({ controller, target }: { controller: PlayerId; target?: string }) => (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
                                                      
    if (!wardenTargetLive(state, controller, target)) return []
    const owner = wardenOwner(state, target)
    if (owner === undefined) return []
                                                           
    const where = (chosen ?? {})[UNL_204_WHERE_KEY] === 'bottom' ? 'bottom' : 'top'
    return [{
      kind: 'zoneChange',
      obj: target as ObjId,
      to: `mainDeck:${owner}` as ZoneId, // ★★★「**其**主牌堆」= 拥有者的,不是我的
      placement: where,
    } ]
  },
}

export const UNL_204: Card = {
  id: 'UNL-204', cardNo: 'UNL-204/219', name: '持卫的裁决', category: 'spell',
  domains: ['orange', 'yellow'], energy: 2, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '战场上一名敌方单位,由其拥有者放回自己主牌堆顶或底(UNL_204_SPEC)' }],
}
