                          
  
                                                         
                                    
                                                            
                                                     
                                             

import type { Card } from '../../src/dsl/card'
import { victimIsSelf } from '../../src/keywords/lastRites'
import type { Trigger } from '../../src/dsl/trigger'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { fieldedUnits } from './activated-batch'                          
import { effectiveMight } from '../../src/state/might'
import { destroyVictims } from './destroy-spells'                           

                                                                
               
                                                                    
                                         
                                              
export const UNL_180_CARD_EFFECT = '摧毁所有单位。'

   
                  
  
                                                                           
                                                           
                                                                        
                                         
                                                
                                                       
   
function allFieldedUnits(state: GameState): ObjId[] {
  return fieldedUnits(state)
}

export const UNL_180_SPEC: PlaySpec = {
  defId: 'UNL-180', cardNo: 'UNL-180/219', name: '破败之咒',
  kind: 'spell',
  cost: { mana: 9, pips: [['yellow'], ['yellow'], ['yellow']] }, // 卡面核:9法力+3黄pip
  keywords: [],
  target: 'none', // 「所有」不选取目标
  legalTargets: (): string[] => [],
  makeResolve: () => (state: GameState): readonly GameEvent[] =>
    allFieldedUnits(state).map((oid) => ({ kind: 'destroy', target: oid })),
}
export const UNL_180: Card = {
  id: 'UNL-180', cardNo: 'UNL-180/219', name: '破败之咒', category: 'spell',
  domains: ['yellow'], energy: 9, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '摧毁所有单位(UNL_180_SPEC)' }],
}

                                                               
                                                             
                                                             
                                   
                                                        

                                                        
  
                                                              
                                                    
export const SFD_048_CARD_EFFECT = '每当我移动时，抽一张牌。'
export function makeSkyhornTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 1 }] })
  return compileTrigger({
    id: `SFD-048:moved:${selfOid}`, rawId: true, sourceDefId: 'SFD-048',
    event: 'unitMoved', by: 'any', // 谁让我动的都算(卡文没写"你")
    when: [{ kind: 'subjectIsSelf' }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_048: Card = {
  id: 'SFD-048', cardNo: 'SFD·048/221', name: '天角牧者', category: 'unit',
  domains: ['green'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每当我移动时抽一张牌(makeSkyhornTrigger)' }],
}

                                                              
                                      
                                
                                          
export const SFD_137_CARD_EFFECT = '当我从一处战场向其他位置移动时，让我本回合内{{S}}+2。'
export function makeSeahuntTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 2, duration: 'thisTurn', id: `SFD-137:${selfOid}` }],
  })
  return compileTrigger({
    id: `SFD-137:moved:${selfOid}`, rawId: true, sourceDefId: 'SFD-137',
    event: 'unitMoved', by: 'any',
    when: [
      { kind: 'subjectIsSelf' },
                                           
      {
        kind: 'custom',
        test: (ev, state) =>
          ev.kind === 'unitMoved' && state.zones[ev.from]?.kind === 'battlefield',
      },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const SFD_137: Card = {
  id: 'SFD-137', cardNo: 'SFD·137/221', name: '猎海小队', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '从战场向别处移动时我本回合+2(makeSeahuntTrigger)' }],
}

                                                    
  
                                           
                                    
const anotherFriendlyDied = (selfOid: ObjId) => ({
  kind: 'custom' as const,
  test: (ev: GameEvent) => {
    if (ev.kind !== 'destroyed') return false
                                                               
    return !victimIsSelf(ev.victim, selfOid)                    
  },
})

                                                              
                                   
export const UNL_068_CARD_EFFECT = '当另一名友方单位被摧毁时，让我本回合内{{S}}+2。'
export function makeSpectralCentaurTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'addMight', target: { ref: 'self' }, delta: 2, duration: 'thisTurn', id: `UNL-068:${selfOid}` }],
  })
  return compileTrigger({
    id: `UNL-068:died:${selfOid}`, rawId: true, sourceDefId: 'UNL-068',
    event: 'destroyed', by: 'any', // 「被摧毁」不问是谁下的手
    when: [{ kind: 'victimIs', portrait: { types: ['unit'], side: 'friendly' } }, anotherFriendlyDied(selfOid)],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_068: Card = {
  id: 'UNL-068', cardNo: 'UNL-068/219', name: '幽魂半人马', category: 'unit',
  domains: ['blue'], energy: 6, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '另一名友方单位被摧毁时我本回合+2(makeSpectralCentaurTrigger)' }],
}

                                                              
                           
                                        
                                                    
export const UNL_129_CARD_EFFECT = '当另一名友方单位被摧毁时，获得1经验。'
export function makeFerociousJawfishTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'gainExperience', amount: 1 }] })
  return compileTrigger({
    id: `UNL-129:died:${selfOid}`, rawId: true, sourceDefId: 'UNL-129',
    event: 'destroyed', by: 'any',
    when: [{ kind: 'victimIs', portrait: { types: ['unit'], side: 'friendly' } }, anotherFriendlyDied(selfOid)],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}
export const UNL_129: Card = {
  id: 'UNL-129', cardNo: 'UNL-129/219', name: '凶残颚鱼', category: 'unit',
  domains: ['purple'], energy: 5, power: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '另一名友方单位被摧毁时获得1经验(makeFerociousJawfishTrigger)' }],
}

                                                              
                                
                                                                 
                                                          
                                           
                             
export const SFD_159_CARD_EFFECT = '如果你在此处有其他单位，则我获得{{S}}+1。'
export const SFD_159: Card = {
  id: 'SFD-159', cardNo: 'SFD·159/221', name: '可靠攻城犬', category: 'unit',
  domains: ['yellow'], energy: 2, power: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '此处有其他友方单位则我+1(COUNTERS 里的 SFD-159)' }],
}

                     
export const LONGTAIL3_DEFIDS: readonly string[] =
  ['UNL-180', 'SFD-048', 'SFD-137', 'UNL-068', 'UNL-129', 'SFD-159']
