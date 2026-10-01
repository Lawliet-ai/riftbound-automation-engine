                                                                    
                                            
  
                 
                                                                 
                   
                                                                
                                                                         
                                                          
                                                                     
                                                               
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'

                                                      
                                            
export const UNL_030_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n支付{{2}}和{{红色}}：让我本回合内战力翻倍。'

                                      
export const UNL_030_SPEC: ActivatedSpec = {
  key: 'UNL-030:double',
  label: '支付 2 法力和 1 点炽烈符能:让我本回合内战力翻倍',
  cost: { mana: 2, pips: [['red']] },
  makeResolve: ({ selfOid }) => (): readonly GameEvent[] => [{
    kind: 'addEffect',
    effect: {
      id: `UNL-030:dbl:${selfOid}`, duration: 'thisTurn', fromPassive: false,
      predicate: (x: { oid: ObjId }) => x.oid === (selfOid as ObjId),
      modification: { kind: 'doubleMight' },
    },
  } as GameEvent],
}

export const UNL_030: Card = {
                                                                          
                                                                   
  id: 'UNL-030', cardNo: 'UNL-030/219', name: '蔚', category: 'unit',
                                                                     
                                                                            
  domains: ['red'], energy: 4, power: 3, keywords: ['法盾'], playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[法盾]§828 印刷关键词(引擎统一处理)' },
    { kind: 'passive', describe: '付{2}{红色}:让我本回合内战力翻倍(UNL_030_SPEC)' },
  ],
}
