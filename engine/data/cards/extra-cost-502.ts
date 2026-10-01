                                                                 
                                                         
                                             
                                                          
                                               
                                
  
                                         
                                                    
                                              
                                                                      
                                                                           
  
                                        
                                                                    
                                                                          
                                                                  
                                                    
  
                                                                 
                                                                      
                                                      
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import { isUnit } from '../../src/state/cardTypes'
import { objectCardTags } from '../cardTagQuery'
import { ANIMAL_TAGS } from './animal-tags'
import { onField } from './activated-batch2'

export const UNL_166_CARD_EFFECT =
  '{{伏击}}（你可以选择将我作为{{反应}}牌，打出到有己方单位的战场。）\n' +
  '你必须摧毁一名自己控制的“鸟类”、“猫科”、“犬形”或“魄罗”属性单位，作为打出我的额外费用。' +
  '你可以选择将我打出至该单位所在的战场（即使你在该处没有其他单位）。'

   
                                  
                                                                       
                                  
   
export function huntCandidates(state: GameState, controller: PlayerId): readonly ObjId[] {
  return Object.values(state.objects)
    .filter((o) =>
      o.controller === controller && isUnit(o) && onField(state, o) &&
      objectCardTags(o).some((t) => ANIMAL_TAGS.has(t)))
    .map((o) => o.oid)
    .sort()
}

   
                          
                                                 
                                        
                                        
                                
                                        
   
export function huntDestination(state: GameState, choice: string | undefined): readonly string[] {
  if (choice === undefined) return []
  const zone = state.objects[choice as ObjId]?.zone
  if (zone === undefined) return []
  return state.zones[zone]?.kind === 'battlefield' ? [zone as string] : []
}

export const UNL_166_EXTRA_COST: PlayExtraCost = {
  label: '摧毁一名友方“鸟类”/“猫科”/“犬形”/“魄罗”单位',
  required: true, // ★「你**必须**…」⇒ 付不出就整张打不出(§204),也不给「不付」那一支
  available: (state, player) => huntCandidates(state, player).length > 0,
  options: (state, player) => huntCandidates(state, player)
    .map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
                                             
  payEvents: (_state, player, choice): readonly GameEvent[] =>
    choice === undefined ? [] : [{ kind: 'destroy', target: choice as ObjId, sourcePlayer: player } ],
                                
  destinations: (state, _player, choice) => huntDestination(state, choice),
}

export const UNL_166: Card = {
  id: 'UNL-166', cardNo: 'UNL-166/219', name: '追猎雪狼', category: 'unit',
  domains: ['yellow'], energy: 4, power: 6, keywords: ['伏击'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[伏击];必须摧毁一名友方四动物标签单位;可打出至该单位所在的战场(UNL_166_EXTRA_COST)' }],
}

export const EXTRA_COST_CARDS_502: readonly Card[] = [UNL_166]
