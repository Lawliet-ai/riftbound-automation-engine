                                                                    
                                         
                           
                                                     
  
                                                
                                                                                 
                                                    
                                                         
  
                                                                         
                                                              
                                       
                                                              
                                                         
                                           
                                                        
                                               
                                                           
                                                                
                                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'
import { battlefieldUnits } from './diana-reactions'
import { spellTargetStillLegal } from './targetStillLegal'

export const OGN_203_CARD_EFFECT =
  '{{迅捷}}（可在你的回合或法术对决中打出。）\n'
  + '选择战场上的一名敌方单位，获得它的控制权并将其召回。（将其送到你的基地。此动作不被视为移动。）'

                                
export const OGN_203_KEYWORDS: readonly string[] = ['迅捷']

   
                        
                                                          
                                     
   
export function seizeTargets(state: GameState, controller: PlayerId): string[] {
  return battlefieldUnits(state).filter((oid) => state.objects[oid as ObjId]?.controller !== controller)
}

export const OGN_203_SPEC: PlaySpec = {
  defId: 'OGN-203', cardNo: 'OGN·203/298', name: '据为己有', kind: 'spell',
  cost: { mana: 8, pips: [['purple'], ['purple'], ['purple']] }, // 上游 pips=3 单色 ⇒ 三枚紫
  keywords: [...OGN_203_KEYWORDS],
  target: 'custom',
  legalTargets: (state: GameState, controller: PlayerId): string[] => seizeTargets(state, controller),
  makeResolve:
    ({ target, controller }) =>
    (state: GameState): readonly GameEvent[] => {
                                                                
      if (!spellTargetStillLegal(OGN_203_SPEC, state, controller, target)) return []
                                                          
      return [
        { kind: 'changeController', target: target as ObjId, player: controller } as GameEvent,
        { kind: 'recall', target: target as ObjId } as GameEvent,
      ]
    },
}

export const OGN_203: Card = {
  id: 'OGN-203', cardNo: 'OGN·203/298', name: '据为己有', category: 'spell',
  domains: ['purple'], energy: 8, keywords: [...OGN_203_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '夺取战场上一名敌方单位的控制权并召回到我基地(OGN_203_SPEC)' }],
}
