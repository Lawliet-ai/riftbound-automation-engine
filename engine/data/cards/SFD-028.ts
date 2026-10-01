                                                                   
                                                                              
                               
                                          
                                                                   
                                                                  
                                                                  
  
                                                    
                                                                                    
                                                           
                                                                             
                                                                 
                                                                
                                                                    
  
                                          
                                                 
                                                                                
                                       
                                                                   
                                           
  
                                                                             
                                                                      
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { valuedKeywordTotal } from '../../src/effects/valuedKeyword'

export const SFD_028_CARD_EFFECT =
  '{{强攻}}（如果我是进攻方，则{{S}}+1。）\n当我进攻时，对此处的一名敌方单位造成等同于我{{强攻}}数值的伤害。'

                                                  
export const SFD_028_KEYWORDS: readonly string[] = ['强攻']

                           
export const SFD_028_ASK = 'lucian028Foe'

   
                       
                                                           
                                                                            
                                                              
   
export function lucianBoldValue(state: GameState, me: GameObject): number {
  return valuedKeywordTotal(state, me, '强攻', () => true)
}

                                         
export function makeLucianAttackTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `SFD-028:attack:${selfOid}`, rawId: true, sourceDefId: 'SFD-028',
                                                                 
    event: 'attack',
    by: 'you',
    when: [{ kind: 'subjectIsSelf' }], // 「当【我】进攻时」——只写 by:'you' 队友进攻也会响(★第112轮实锤)
    choose: {
      key: SFD_028_ASK, prompt: '卢锡安:对此处的一名敌方单位造成等同于我{{强攻}}数值的伤害',
                                                                  
      selector: { type: 'unit', zone: 'battlefield', atSelfZone: true, owner: 'opponent', isTarget: true },
    },
    effect: (state, _ev, chosen): readonly GameEvent[] => {
      const t = chosen?.[SFD_028_ASK]
      if (t === undefined || !state.objects[t as ObjId]) return []                       
      const me = state.objects[selfOid]
      if (!me) return []                            
      const amount = lucianBoldValue(state, me)                        
                                                                  
                                                          
                                                         
        return [{ kind: 'damage', target: t as ObjId, amount, source: selfOid, sourcePlayer: controller } as GameEvent]
    },
  }, selfOid, controller)
}

const lucian = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '卢锡安', category: 'unit',
  domains: ['red'], energy: 3, power: 2, keywords: [...SFD_028_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '进攻时对此处一名敌方造成等同于我[强攻]数值的伤害(makeLucianAttackTrigger)' }],
})
                                                  
export const SFD_028: Card = lucian('SFD-028', 'SFD·028/221')
