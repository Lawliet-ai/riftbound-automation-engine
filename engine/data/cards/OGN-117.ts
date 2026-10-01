                                                               
                                                                    
                                            
                                                 
  
       
                                                            
                                                           
                                               
                                                                     
                                                              
                                                                           
                                       
                                                                 
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect, effectHasteChoice, type EffectSpec } from '../../src/dsl/effectSpec'                 
import { hasteKeyOf } from './haste-key'                            
import { MINION } from './reprint-batch'
import { SUBJECT_IS_NOT_TOKEN } from './notTokenGuard1154'

export const OGN_117_CARD_EFFECT = '每当你在对手的回合内打出一张卡牌时，额外打出一名1{{S}}的“随从”到你的基地。'

   
                        
                                                                      
                                                                       
   
export function inOpponentTurn(state: GameState, controller: PlayerId): boolean {
  return state.activePlayer !== controller
}

                                                         
                                                  
export const OGN_117_HASTE_KEY = hasteKeyOf('OGN-117:minion')
export function makeViktorPioneerTriggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
                                                                                             
  const effSpec: EffectSpec = {
    then: [{ op: 'spawnToken', spec: MINION, zone: (ctx) => `base:${ctx.controller}`, haste: { key: OGN_117_HASTE_KEY, label: '随从' } }],
  }
  const effect = compileEffect(effSpec)
  const mk = (ev: 'playUnit' | 'playSpell'): Trigger => compileTrigger({
    id: `OGN-117:${ev}:${selfOid}`, rawId: true, sourceDefId: 'OGN-117',
    event: ev,
    by: 'any', // ⚠️ `by` 拦不住"谁打的"这一层(第227轮实测:对手打牌照样触发),
    when: [
                                                                 
      { kind: 'eventPlayerIs', side: 'you' },
                                                                                                           
                                                                                 
                                                                           
      { kind: 'onOpponentTurn' },
                                                     
                                                          
      SUBJECT_IS_NOT_TOKEN,
    ],
    postChoice: (state, chosen) => effectHasteChoice(effSpec, state, controller, chosen), // ★1399 落点写死基地不问 ⇒ 只问急速
    effect: (state, e, chosen) => effect({ state, selfOid, controller, ev: e, chosen: chosen ?? {} }),
  }, selfOid, controller)
  return [mk('playUnit'), mk('playSpell')]
}

export const OGN_117: Card = {
  id: 'OGN-117', cardNo: 'OGN·117/298', name: '维克托', category: 'unit',
  domains: ['blue'], energy: 4, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对手回合内你每打出一张牌就在基地打出1[M]随从(makeViktorPioneerTriggers)' }],
}
