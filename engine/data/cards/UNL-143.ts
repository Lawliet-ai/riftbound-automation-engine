                                                                      
                                              
                                                   
                                
  
                          
                                                                 
                                                    
                                                                     
                                                                                     
                                                                       
                                                                     
  
                                                         
                                                     
                                                            
                                     
                                                        
                                                                                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { isAlone } from '../../src/keywords/alone'

                     
export const UNL_143_KEYWORDS: readonly string[] = ['伏击']
                                 
export const UNL_143_BONUS = 2
                    
export const UNL_143_XP = 2
                                                
export const UNL_143_ABILITY = 'UNL-143:ambushPounce'

export const UNL_143_CARD_EFFECT =
  '伏击（你可以选择将我作为反应牌，打出到有己方单位的战场。）\n'
  + '当我进攻或防守时，如果此处有一名落单的敌方单位，则让我本回合内S+2并获得2经验。'

   
                              
                                                                
                                                        
   
export function hasLonelyFoeHere(state: GameState, self: { readonly zone: unknown; readonly controller: PlayerId }): boolean {
  return Object.values(state.objects).some((x) =>
    (x.zone as string) === (self.zone as string)
    && isUnit(x)
    && x.controller !== self.controller
    && isAlone(state, x))
}

export function makeKhazix143Triggers(selfOid: ObjId, controller: PlayerId): readonly Trigger[] {
  const effect = compileEffect({
    then: [
      { op: 'addMight', target: { ref: 'self' }, delta: UNL_143_BONUS, duration: 'thisTurn', id: `UNL-143:${selfOid}` },
      { op: 'gainExperience', amount: UNL_143_XP },
    ],
  })
  const make = (event: 'attack' | 'defend'): Trigger => compileTrigger({
    id: `UNL-143:${event}:${selfOid}`, rawId: true,
    sourceDefId: 'UNL-143',
    abilityKey: UNL_143_ABILITY, // ★两个时机同一条能力
    event,
                                                       
                                                      
                                        
                           
                                                        
    by: 'you',
    when: [
      { kind: 'subjectIsSelf' }, // 「当【我】进攻/防守时」——队友那份不算(★544)
                                                       
      { kind: 'custom', test: (_ev: GameEvent, state: GameState): boolean => {
        const me = state.objects[selfOid]
        return me !== undefined && hasLonelyFoeHere(state, me)
      } },
    ],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
  return [make('attack'), make('defend')]
}

const spec = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '卡兹克', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [...UNL_143_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻或防守时此处有落单敌方则本回合[S]+2并获2经验(makeKhazix143Triggers)' }],
})

export const UNL_143: Card = spec('UNL-143', 'UNL-143/219')
                                                             
export const UNL_143A: Card = spec('UNL-143a', 'UNL-143a/219')
