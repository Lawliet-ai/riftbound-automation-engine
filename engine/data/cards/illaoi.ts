                                       
                                                                    
  
                                                 
  
                                   
                                
                                     
                                     
                                            
                                                                 
                                              
                                                 
                                      
  
                                                     
                                       

import { hereOf } from './here-of'                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasteChoice, type EffectCtx, type EffectSpec } from '../../src/dsl/effectSpec'                 
import type { GameState } from '../../src/state/gameState'         
import { hasteKeyOf } from './haste-key'                            

   
                             
                                                    
                                                    
                                                  
                                                                 
                                                                     
                                                                   
   
export const TENTACLE_TOKEN = {
  defId: 'token:触手',
  baseMight: 1,
  baseTypes: ['unit'],
  baseTags: ['比尔吉沃特'],
} as const

                                                                 

export const VEN_182_CARD_EFFECT =
  '当你打出我时，或当我得分时，打出一名具有“比尔吉沃特”属性的1S“触手”。\n你每控制一个指示物单位，我便获得S+1。'

                                                     
                                                                 
export const VEN_109_HASTE_KEY = hasteKeyOf('VEN-109:tentacle')
export function makeIllaoiTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
                                                                                              
  const effSpec: EffectSpec = {
    then: [{ op: 'spawnToken', spec: TENTACLE_TOKEN, zone: hereOf, haste: { key: VEN_109_HASTE_KEY, label: '触手' } }],
  }
  const effect = compileEffect(effSpec)
  const run: Trigger['effect'] = (state, ev, chosen) =>
    effect({ state, selfOid, controller, ev, chosen: chosen ?? {} })
  const ask = (state: GameState, chosen: Readonly<Record<string, string>>) => effectHasteChoice(effSpec, state, controller, chosen)                          
  const abilityKey = `VEN-109:tentacle:${selfOid}`
  return [
    compileTrigger({
      id: `${abilityKey}:play`, rawId: true, sourceDefId: 'VEN-109',
      event: 'playUnit', by: 'you', abilityKey,
      when: [{ kind: 'subjectIsSelf' }],
      postChoice: ask, // ★1399
      effect: run,
    }, selfOid, controller),
                    
    compileTrigger({
      id: `${abilityKey}:conquer`, rawId: true, sourceDefId: 'VEN-109',
      event: 'conquer', by: 'you', abilityKey,
      when: [{ kind: 'selfAtEventBattlefield' }],
      postChoice: ask, // ★1399
      effect: run,
    }, selfOid, controller),
                    
    compileTrigger({
      id: `${abilityKey}:hold`, rawId: true, sourceDefId: 'VEN-109',
      event: 'hold', by: 'you', abilityKey,
      when: [{ kind: 'selfAtEventBattlefield' }],
      postChoice: ask, // ★1399
      effect: run,
    }, selfOid, controller),
  ]
}

const illaoi = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '俄洛伊', category: 'unit',
  domains: ['purple'], energy: 6, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出/征服/据守时打出一名带比尔吉沃特标签的1[M]触手;每控制一名指示物单位[M]+1(makeIllaoiTriggers + countScaledMightPassives)' }],
})
export const VEN_109: Card = illaoi('VEN-109', 'VEN·109')
export const VEN_182: Card = illaoi('VEN-182', 'VEN·182')                       

             
export const ILLAOI_DEFIDS: readonly string[] = ['VEN-109', 'VEN-182']
