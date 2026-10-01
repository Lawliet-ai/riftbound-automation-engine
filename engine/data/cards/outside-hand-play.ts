                                                            
                                                               
                                               
                                            
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { battlefieldUnits } from './diana-reactions'
import { spellTargetStillLegal } from './targetStillLegal'

                                                                   
                                     
                                                     
                              
export const SFD_010_CARD_EFFECT = '如果我从你手牌以外的位置被打出，则我的费用减少{{2}}。'
export const SFD_010: Card = {
  id: 'SFD-010', cardNo: 'SFD·010/221', name: '虚空蜢', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '手牌以外打出减费2(outsideHandCostMods)' }],
}

                                                                  
                              
                                       
                      
                                                  
                                                                          
                                                     
export const SFD_164_CARD_EFFECT = '摧毁战场上的一名单位。'
export const SFD_164_SPEC: PlaySpec = {
  defId: 'SFD-164', cardNo: 'SFD·164/221', name: '流沙陷坑', kind: 'spell',
  cost: { mana: 5, pips: [['yellow']] }, // 卡面核:5法力+1黄pip(cardCosts.ts)
  keywords: ['迅捷'],
  target: 'custom',
  legalTargets: (state: GameState): string[] => battlefieldUnits(state) as string[],
  makeResolve: ({ target, controller }: { target?: string; controller: PlayerId }) =>
    (state: GameState): readonly GameEvent[] =>
                                                                
      spellTargetStillLegal(SFD_164_SPEC, state, controller, target)
        ? [{ kind: 'destroy', target: target as ObjId }]
        : [],
}
export const SFD_164: Card = {
  id: 'SFD-164', cardNo: 'SFD·164/221', name: '流沙陷坑', category: 'spell',
  domains: ['yellow'], energy: 5, keywords: ['迅捷'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '摧毁战场上的一名单位(SFD_164_SPEC)' }],
}

export const OUTSIDE_HAND_PLAY_DEFIDS: readonly string[] = ['SFD-010', 'SFD-164']
