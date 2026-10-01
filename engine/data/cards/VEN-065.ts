                                                                        
                                                                        
                                         
                                                 
             
  
                                     
                                                                         
                                                                 
                                               
                                                                            
                                             
  
                                                 
                                                                               
                                                                               
                                                                              
                                                                      
                                                 
                                                    
  
                                                                        
                                                                
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { scoredHere } from './scored-here'

                                         
export const SWAIN_DEFIDS: readonly string[] = ['VEN-065', 'VEN-173']

export const VEN_065_CARD_EFFECT =
  '{{预知}}（当你打出我时，查看主牌堆顶部的一张牌。你可以选择将其回收。）\n'
  + '当我征服一处战场时，如果你在本回合内打出了一名非指示物单位、一件非指示物装备和一个法术，则你获得1分。'

                                                        
export const SWAIN_KEYWORDS: readonly string[] = ['预知']

                             
export const SWAIN_POINTS = 1

   
                                          
                                  
                                
   
export function swainTrioDone(state: GameState, player: PlayerId): boolean {
  const p = player as string
  return state.playedUnitThisTurn?.[p] === true
    && state.playedEquipmentThisTurn?.[p] === true
    && state.playedSpellThisTurn?.[p] === true
}

   
                               
                                                          
                                     
   
export function makeSwainConquerTrigger(defId: string, selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `${defId}:conquer:${selfOid}`, rawId: true, sourceDefId: defId,
    event: 'conquer',
    by: 'you',
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => scoredHere(state, selfOid, ev, ['conquer']) }],
                                        
    additionalCondition: (state: GameState): boolean => swainTrioDone(state, controller),
    effect: (): readonly GameEvent[] => [{ kind: 'gainPoint', player: controller, amount: SWAIN_POINTS } as GameEvent],
  }, selfOid, controller)
}

                                            
export const SWAIN_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(SWAIN_DEFIDS.map((id) => [id, (oid: ObjId, ctrl: PlayerId) => [makeSwainConquerTrigger(id, oid, ctrl)]]))

                         
export const SWAIN_KEYWORD_ROWS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(SWAIN_DEFIDS.map((id) => [id, SWAIN_KEYWORDS]))

const makeCard = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '斯维因', category: 'unit',
  domains: ['blue'], energy: 6, power: 6, keywords: [...SWAIN_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[预知] §436(引擎按印刷关键词统一管)' },
    { kind: 'passive', describe: '征服时若本回合打出过单位+装备+法术则得1分(makeSwainConquerTrigger)' },
  ],
})
export const VEN_065: Card = makeCard('VEN-065', 'VEN·065')
export const VEN_173: Card = makeCard('VEN-173', 'VEN·173')
export const SWAIN_CARDS: readonly Card[] = [VEN_065, VEN_173]
