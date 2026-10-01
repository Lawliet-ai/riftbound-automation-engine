                      
  
                                                           
                                                   
                                 
  
                                                    
                                                
                                                       
                                                    
                                                                     
                                                              
                                                       
                 
                                                                     

import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { DeathSnapshot } from '../../src/keywords/lastRites'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'
import { GOLD_TOKEN } from './gear-triggers'
import { isExhausted } from '../../src/state/exhaust'               

export const SFD_203_CARD_EFFECT =
  '当你回收一枚符文时，你可以选择让我变为休眠状态，以此打出一个休眠的“金币”装备指示物。'

const isDormant = (state: GameState, oid: ObjId): boolean =>
  (state.objects[oid] !== undefined && isExhausted(state.objects[oid]!))                                      

                                     
export function makeSfd203RuneTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'SFD-203-rune',
    event: 'runeRecycled',
    by: 'any',
    when: [
      { kind: 'eventPlayerIs', side: 'you' }, // 「**你**回收」
                                     
      { kind: 'custom', test: (_ev, state): boolean => !isDormant(state, selfOid) },
    ],
                                                     
                                                           
                                                                           
                                                                       
                                                                
                                                                
                                                      
                                                             
                                                             
                                             
                                                     
    mayChoose: true, // §383.3.a 效果开头的「你可以选择」⇒ 确认阶段问
                                                           
                                                                                
                                                         
                            
                                                                           
                                                                     
                  
    basePerform: (state, _ev, deps): GameState | null => {
      if (isDormant(state, selfOid)) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'dormant', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(state, pay, deps.triggerSource, controller, deps)
        : applyEvents(state, pay, deps ?? {}).state
    },
                                                      
                                    
    effect: (): readonly GameEvent[] => [
      { kind: 'spawnToken', spec: GOLD_TOKEN as never, zone: `base:${controller}` as never, owner: controller, dormant: true },
    ],
  }, selfOid, controller)
}

                                
export function makeSfd203ReadyTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: 'SFD-203-ready',
    event: 'destroyed',
    by: 'any',
    nthType: true, // 「**任意数量**」:同一批死一片只响一次(§383.1.b)
    when: [
                                                  
      { kind: 'custom', test: (ev): boolean => {
        const v = (ev as { victim?: DeathSnapshot }).victim
        return v !== undefined && v.controller !== controller && v.types.includes('unit')
      } },
                          
      { kind: 'custom', test: (_ev, state): boolean => isDormant(state, selfOid) },
    ],
    effect: (): readonly GameEvent[] =>
      [{ kind: 'statusChange', target: selfOid, key: 'dormant', value: false }],
  }, selfOid, controller)
}

const warGoddess = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '战争女神', category: 'legend',
  domains: ['orange', 'purple'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [], // 两条触发都挂在 TRIGGER_FACTORIES 上
})
export const SFD_203: Card = warGoddess('SFD-203', 'SFD·203/221')

             
export const RUNE_RECYCLE_DEFIDS: readonly string[] = ['SFD-203']
