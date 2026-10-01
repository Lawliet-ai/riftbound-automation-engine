                                                                         
                                                                       
                                            
                     
  
                        
                                                                
                                                        
                                              
                                                                         
                        
  
                                    
                                                                               
                                                         
                                                  
                                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { scoredHere } from './scored-here'

                                                                      
export const KAISA_DEFIDS: readonly string[] = ['OGN-039', 'VEN-SP1']

export const OGN_039_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{红色}}，让我以活跃状态进场。）\n'
  + '当我征服一处战场时，抽一张牌。'

                                                        
export const OGN_039_KEYWORDS: readonly string[] = ['急速']

   
                    
                                                     
   
export function makeKaisaConquerTrigger(defId: string, selfOid: ObjId, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `${defId}:conquer:${selfOid}`, rawId: true, sourceDefId: defId,
    event: 'conquer',
    by: 'you',
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => scoredHere(state, selfOid, ev, ['conquer']) }],
    effect: (): readonly GameEvent[] => [{ kind: 'draw', player: controller, count: 1 } as GameEvent],
  }, selfOid, controller)
}

                                                               
export const KAISA_FACTORIES: Readonly<Record<string, (oid: ObjId, ctrl: PlayerId) => readonly Trigger[]>> =
  Object.fromEntries(KAISA_DEFIDS.map((id) => [id, (oid: ObjId, ctrl: PlayerId) => [makeKaisaConquerTrigger(id, oid, ctrl)]]))

                         
export const KAISA_KEYWORDS: Readonly<Record<string, readonly string[]>> =
  Object.fromEntries(KAISA_DEFIDS.map((id) => [id, OGN_039_KEYWORDS]))

const makeCard = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '卡莎', category: 'unit', // 英雄单位 → unit
  domains: ['red'], energy: 4, power: 4, keywords: [...OGN_039_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[急速] §805(引擎的 hasteExtraCost / entryStatusPatch 统一管)' },
    { kind: 'passive', describe: '当我征服一处战场时抽一张牌(makeKaisaConquerTrigger)' },
  ],
})
export const OGN_039: Card = makeCard('OGN-039', 'OGN·039/298')
export const VEN_SP1: Card = makeCard('VEN-SP1', 'VEN·SP1')
export const KAISA_CARDS: readonly Card[] = [OGN_039, VEN_SP1]
