                                                                     
                           
                                                          
                                    
                     
  
                                                 
                                               
                                                                                   
                                                         
  
                                                        
                                                                     
                                                          
                                                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import { effectiveMight } from '../../src/state/might'
import { experienceOf } from '../../src/keywords/level'
import { seizeTargets } from './OGN-203'

export const UNL_140_CARD_EFFECT =
  '你可以选择消耗5经验，作为打出此牌的额外费用。\n' +
  '选择战场上一名不高于3{{S}}的敌方单位。如果你支付了该额外费用，则改为选择战场上的任意一名敌方单位。' +
  '你获得其控制权、将其变为休眠状态、并将其召回。'

                              
export const UNL_140_MIGHT_CAP = 3
                    
export const UNL_140_XP = 5

export const UNL_140_EXTRA_COST: PlayExtraCost = {
  label: '消耗5经验(改为可选战场上任意一名敌方单位)',
                                            
  available: (state, player) => experienceOf(state, player) >= UNL_140_XP,
  payEvents: (_state, player): readonly GameEvent[] =>
    [{ kind: 'spend', player, cost: {}, experience: UNL_140_XP } ],
}

   
                 
                               
                                 
                                                           
   
export function conscriptTargets(state: GameState, controller: PlayerId, bonus = false): string[] {
  const all = seizeTargets(state, controller)                     
  if (bonus) return all
  return all.filter((oid) => {
    const o = state.objects[oid as ObjId]
    return o !== undefined && effectiveMight(o).reference <= UNL_140_MIGHT_CAP
  })
}

export const UNL_140_SPEC: PlaySpec = {
  defId: 'UNL-140', cardNo: 'UNL-140/219', name: '强制征召', kind: 'spell',
  cost: { mana: 5, pips: [['purple'], ['purple']] }, // cardCosts 实测:5 法力 + 2 紫 pip
  keywords: [],
  target: 'custom',
                                               
  legalTargets: (state: GameState, controller: PlayerId, _selfOid?: string, bonus?: boolean): string[] =>
    conscriptTargets(state, controller, bonus === true),
  makeResolve: ({ target, controller }) => (state: GameState): readonly GameEvent[] => {
                               
    if (target === undefined || state.objects[target as ObjId] === undefined) return []
                                                               
    return [
      { kind: 'changeController', target: target as ObjId, player: controller } as GameEvent,
      { kind: 'statusChange', target: target as ObjId, key: 'dormant', value: true } ,
      { kind: 'recall', target: target as ObjId } as GameEvent,
    ]
  },
}

export const UNL_140: Card = {
  id: 'UNL-140', cardNo: 'UNL-140/219', name: '强制征召', category: 'spell',
  domains: ['purple'], energy: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '夺控+休眠+召回一名敌方单位;付5经验则不限战力(UNL_140_SPEC)' }],
}
