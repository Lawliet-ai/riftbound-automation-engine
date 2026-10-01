                                                                           
                                                                    
                                                      
                                                       
                        
  
           
                                              
                                                              
                        
                                                                         
                                                             
                               
                                                                     
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  

export const VEN_012_CARD_EFFECT =
  '让一名单位变为活跃状态，并给予其在本回合内{{强攻3}}。（如果其为进攻方，则{{S}}+3。）\n'
  + '{{流转3红色}}（你可以选择支付此牌的流转费用，以此将其从你的废牌堆中打出。然后将其放逐。）'

export const VEN_012_ASSAULT = '强攻3'

export const VEN_012_SPEC: PlaySpec = {
  defId: 'VEN-012', cardNo: 'VEN·012', name: '表里杀缭乱', kind: 'spell',
  cost: { mana: 3, pips: [['red']] }, // ㊶ cardCosts 实测 3 法力 1 红 pip
  keywords: ['流转3红色'],
  target: 'custom',
                                  
  legalTargets: (state: GameState): string[] =>
    Object.values(state.objects)
      .filter((o) => ['battlefield', 'base'].includes(state.zones[o.zone]?.kind as string)
        && isUnit(o))                                                          
      .map((o) => o.oid as string)
      .sort(),
  makeResolve:
    ({ target }: { controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
    if (target === undefined) return []
    if (state.objects[target as ObjId] === undefined) return []                      
    return [
      { kind: 'statusChange', target: target as ObjId, key: 'dormant', value: false } as GameEvent, // 「变为活跃状态」
      { kind: 'addEffect', effect: {
        id: `VEN-012:assault:${target}`, duration: 'thisTurn', fromPassive: false,
        predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
        modification: { kind: 'grantKeyword', keyword: VEN_012_ASSAULT }, // 「在本回合内{强攻3}」
      } } ,
    ]
  },
}

export const VEN_012: Card = {
  id: 'VEN-012', cardNo: 'VEN·012', name: '表里杀缭乱', category: 'spell',
  domains: ['red'], energy: 3, keywords: ['流转3红色'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '一名单位变为活跃+本回合[强攻3];[流转3红色](VEN_012_SPEC)' }],
}
