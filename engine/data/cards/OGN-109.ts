                                                                 
                                                             
                            
                             
  
                   
                                                                            
                                                                   
                                  
                                                                       
  
                                                           
                                                                              
                                                           
                                                                  
                                                                      
  
                                                   
                                                             
                                                            
                                                                   
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { ownDiscard } from '../../src/keywords/insight'
import { boundedPickOptions, decodePick } from './multi-pick'

                     
export const MUNDO_RECYCLE_COUNT = 3

export const OGN_109_CARD_EFFECT =
  '提升我的战力，数值等同于你废牌堆的卡牌数量。\n在你的回合开始阶段，从废牌堆中回收三张牌。'

                                          
export function mundoRecycleCount(state: GameState, controller: PlayerId): number {
  return Math.min(MUNDO_RECYCLE_COUNT, ownDiscard(state, controller).length)
}

export function makeMundoStartTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-109:start:${selfOid}`
  return compileTrigger({
    id, rawId: true,
    sourceDefId: 'OGN-109',
    event: 'startPhase',
    by: 'you', // 「在【你的】回合开始阶段」
    when: [{ kind: 'eventPlayerIs', side: 'you' }], // 事件自带 player(与蘑菇袋同一道门)
                                                                  
    nextChoice: (state, _ev, chosen) => {
      if (chosen['pick'] !== undefined) return null
      const k = mundoRecycleCount(state, controller)
      if (k === 0) return null                                
      const opts = boundedPickOptions(
        ownDiscard(state, controller).map(String),
        k,
        (ids) => ids.map((o) => state.objects[o as ObjId]?.defId ?? o).join('、'),
      )
      if (opts.length === 0) return null
      return {
        itemId: `trig:${id}`, controller,
        key: 'pick', prompt: `蒙多医生:从你的废牌堆回收${k}张牌`,
        isTarget: true, // ★1782 从废牌堆中回收三张牌
                                                 
        candidates: opts,
      }
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const k = mundoRecycleCount(state, controller)
      if (k === 0) return []
      const picks = decodePick(chosen?.['pick'] as string | undefined, k)
      if (picks === null) return []
                                                  
      const mine = ownDiscard(state, controller).map(String)
      if (!picks.every((pk) => mine.includes(pk))) return []
                                                                                
                                                                              
                                                                    
                                                                  
                                                                       
                                   
      return [
        { kind: 'recycle', player: controller, objs: picks as ObjId[] } as GameEvent,
      ]
    },
  }, selfOid, controller)
}

export const OGN_109: Card = {
                                                                
  id: 'OGN-109', cardNo: 'OGN·109/298', name: '蒙多医生', category: 'unit',
  domains: ['blue'], energy: 8, power: 6, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '战力 + 你废牌堆张数(COUNTERS)' },
    { kind: 'passive', describe: '你的回合开始阶段从废牌堆回收三张(makeMundoStartTrigger)' },
  ],
}
