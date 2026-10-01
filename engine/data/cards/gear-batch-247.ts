                                                             
  
                                                                           
                                                                       
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameObject } from '../../src/state/object'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { buffCount } from '../../src/keywords/buff'
import { targetedOwnUnit } from './targeted-own-unit'                    
import { onField } from './activated-batch2'
import { canDormantSelf } from './dormant-self-cost'
import { payFromState } from '../../src/game/economy'                                                   
import { applyEvents } from '../../src/loop/reduce'
import { landAndEnqueueTriggers } from '../../src/loop/orchestrate'

                                                             
                                     
                                       
  
                                                         
                                                                         
                                                                          
                                                                     
                                                                   
                                                 
                                                                        
                                            
                                                                 
export const OGN_228_CARD_EFFECT =
  '每当一名拥有增益的友方单位被摧毁时，给予另一名友方单位增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）'

                                        
function buffedFriendlyDied(ev: GameEvent, controller: PlayerId): boolean {
  if (ev.kind !== 'destroyed') return false
  const v = ev.victim as unknown as {
    controller: PlayerId; types?: readonly string[]; counters: Readonly<Record<string, number>>
  }
  if (v.controller !== controller) return false        
  if (!(v.types ?? []).includes('unit')) return false                      
  return buffCount({ counters: v.counters } as GameObject) > 0           
}

export function makeVanguardHelmTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                  
                                                               
  const effect = compileEffect({
    then: [{ op: 'grantBuff', target: { ref: 'chosen', key: 'unit' } }],
  })
  return compileTrigger({
    id: 'OGN-228:buffedDied',
    event: 'destroyed',
    by: 'any', // 「每当…被摧毁」没写谁干的
    when: [{ kind: 'custom', test: (ev: GameEvent) => buffedFriendlyDied(ev, controller) }],
    choose: {
      key: 'unit', prompt: '先锋之盔:给予另一名友方单位增益',
      selector: {
        type: 'unit', controller: 'you',
        isTarget: true, // ★1769 §355.7/§355.10:场上选一名友方单位给增益 ⇒ 是目标选取
        filter: (o: GameObject, st: GameState) => onField(st, o), // 没写位置词 ⇒ 场上(战场+基地)
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_228: Card = {
  id: 'OGN-228', cardNo: 'OGN·228/298', name: '先锋之盔', category: 'equipment',
  domains: ['yellow'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '带增益的友方单位死时给另一名友方单位增益(makeVanguardHelmTrigger)' }],
}

                                                             
                                                     
  
                                                              
                                           
                                                                           
                                                 
                                                          
                                 
                                                                          
                                                                                 
                                                                                               
                                                                         
                                                       
export const SFD_144_CARD_EFFECT =
  '当你将一名友方单位选为目标时，你可以选择支付{{1}}并让此牌变为休眠状态，以此抽一张牌。'

                                                                      
export const SFD_144_COST = { mana: 1 } as const

                                                  
                                         

export function makeSoulWheelTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
                                                                                                                                           
  const effect = compileEffect({
    then: [{ op: 'draw', count: 1 }],
  })
  return compileTrigger({
    id: 'SFD-144:draw',
    event: 'targeted',
    by: 'any', // 谁"发起"的动作不作数,看 ev.chooser
    mayChoose: true, // §383.3.a「你可以选择」
    when: [
      { kind: 'custom', test: (ev: GameEvent, state: GameState) => targetedOwnUnit(ev, state, controller) },
      { kind: 'custom', test: (_ev, state: GameState) => canDormantSelf(state, selfOid) }, // 入链门槛
    ],
                                                           
                                                                                                               
                                    
    basePerform: (state, _ev, deps): GameState | null => {
      if (!canDormantSelf(state, selfOid)) return null
      const paid = payFromState(state, controller, SFD_144_COST)
      if (!paid.ok) return null
      const pay: readonly GameEvent[] = [
        { kind: 'statusChange', target: selfOid, key: 'tapped', value: true } as GameEvent,
      ]
      return deps?.triggerSource
        ? landAndEnqueueTriggers(paid.state, pay, deps.triggerSource, controller, deps)
        : applyEvents(paid.state, pay, deps ?? {}).state
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const SFD_144: Card = {
  id: 'SFD-144', cardNo: 'SFD·144/221', name: '灵魂之轮', category: 'equipment',
  domains: ['purple'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '你选友方单位为目标时可付{1}+横置自己换抽一张(makeSoulWheelTrigger)' }],
}

                     
export const GEAR_BATCH_247_DEFIDS: readonly string[] = ['OGN-228', 'SFD-144']
