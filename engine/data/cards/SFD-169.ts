                                                                
                                
                                  
  
                                    
                                                
                                                      
                               
  
                                               
                                        
                                                         
                                                    
                                    
  
                                                         
                                                      
                                          
                                                     
                                              

import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ChainItem } from '../../src/loop/chain'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { canDormantSelf } from './dormant-self-cost'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { applyEvents } from '../../src/loop/reduce'                                            
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'

export const SFD_169_CARD_EFFECT =
  '当一名友方单位被摧毁时，你可以选择让我变为休眠状态，' +
  '以此抽一张牌，然后将一张手牌放到主牌堆的顶部或底部。'

                                              
                                                    

   
                                 
  
                                                                     
                                                      
                                                     
                                                      
  
                                                              
                               
                                             
                                               
                                                           
                                                                
                                         
                                       
                                                      
                                                
                                                                    
   
function handOf169(state: GameState, player: PlayerId): readonly ObjId[] {
  return state.zones[`hand:${player}` as ZoneId]?.contents ?? []
}

   
                                       
                             
   
export function makeMemorialPutBackItem(selfOid: ObjId, controller: PlayerId): ChainItem {
  return {
    id: `SFD-169-putback:${selfOid}`,
    controller,
    kind: 'triggered',
    status: 'pending',
                                                                                                        
    nextChoice: (state, chosen) => {
      const hand = handOf169(state, controller)
      if (hand.length === 0) return null                  
      if (chosen['card'] === undefined) {
        return {
          itemId: `SFD-169-putback:${selfOid}`,
          controller,
          key: 'card',
          prompt: '追忆祭坛:将一张手牌放到主牌堆',
          candidates: hand.map((oid) => ({ id: oid as string, label: state.objects[oid]?.defId ?? (oid as string) })),
        }
      }
      if (chosen['where'] === undefined) {
        return {
          itemId: `SFD-169-putback:${selfOid}`,
          controller,
          key: 'where',
          prompt: '放到牌堆的哪一端?',
          candidates: [{ id: 'top', label: '顶部' }, { id: 'bottom', label: '底部' }],
        }
      }
      return null
    },
    resolve: (state, chosen): readonly GameEvent[] => {
      const card = chosen?.['card'] as ObjId | undefined
      if (!card || !handOf169(state, controller).includes(card)) return []                  
      const where = chosen?.['where'] === 'bottom' ? 'bottom' : 'top'
      return [{ kind: 'zoneChange', obj: card, to: `mainDeck:${controller}` as ZoneId, placement: where }]
    },
  }
}

export function makeMemorialAltarTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                
                                                                         
                                                                              
                                                                      
                                                                      
                                                                       
                                                
                                                                 
                                                   
                                                                                                                
  const effect = compileEffect({
    then: [
      { op: 'draw', count: 1 }, // 收益①
                                 
      { op: 'custom', emit: (): readonly GameEvent[] => [{ kind: 'enqueueItem', item: makeMemorialPutBackItem(selfOid, controller) }] },
    ],
  })
  return compileTrigger({
    id: 'SFD-169-draw',
    event: 'destroyed',
    by: 'any', // 卡文没写谁摧毁的 ⇒ 双方都算(㊵)
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'victimIs', portrait: { types: ['unit'], side: 'friendly' } }, // 「一名【友方单位】被摧毁」
      { kind: 'custom', test: (_ev, state) => canDormantSelf(state, selfOid) }, // 付得出「让我休眠」
    ],
                                                                     
                                                             
                                                                                                 
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_169: Card = {
  id: 'SFD-169',
  cardNo: 'SFD·169/221',
  name: '追忆祭坛',
  category: 'equipment',
  domains: ['yellow'],
  energy: 2,
  keywords: [],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '友方单位被摧毁时可休眠此牌抽一张并放回一张手牌(makeMemorialAltarTrigger)' },
  ],
}
