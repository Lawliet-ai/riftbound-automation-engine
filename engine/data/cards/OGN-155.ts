                                                                      
                                         
                                      
                               
  
                                       
                                                       
                                                     
                                                          
                                                            
  
                
                                                                         
                                            
                                                                           
                     
                                                                      
                                                  
                                                                         
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ChoiceRequest } from '../../src/loop/chain'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { scoredHere } from './scored-here'

export const OGN_155_CARD_EFFECT =
  '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n'
  + '当我征服一处战场时，抽一张牌或召出一枚休眠的符文。'

                                                        
export const OGN_155_KEYWORDS: readonly string[] = ['法盾']

                           
export const OGN_155_ASK = 'qiyana155Pick'

   
                                     
                                     
   
export const OGN_155_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'draw', label: '抽一张牌' },
  { id: 'rune', label: '召出一枚休眠的符文' },
]

                          
export const OGN_155_DRAW = 1
export const OGN_155_RUNE = 1

   
                                  
                                                    
   
export function makeQiyanaConquerTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const id = `OGN-155:conquer:${selfOid}`
  return compileTrigger({
    id, rawId: true, sourceDefId: 'OGN-155',
    event: 'conquer',
    by: 'you',
    when: [{ kind: 'custom', test: (ev: GameEvent, state: GameState) => scoredHere(state, selfOid, ev, ['conquer']) }],
                                                      
    nextChoice: (_state: GameState, _ev, chosen): ChoiceRequest | null => {
      if (chosen[OGN_155_ASK] !== undefined) return null
      return {
        itemId: `trig:${id}`, controller, key: OGN_155_ASK,
        prompt: '奇亚娜:抽一张牌,或召出一枚休眠的符文',
        candidates: [...OGN_155_OPTIONS],
      }
    },
    effect: (_state: GameState, _ev, chosen): readonly GameEvent[] => {
      const pick = chosen?.[OGN_155_ASK]
                                              
      if (pick === 'draw') return [{ kind: 'draw', player: controller, count: OGN_155_DRAW } as GameEvent]
                                                           
      if (pick === 'rune') {
        return [{ kind: 'summonRune', player: controller, count: OGN_155_RUNE, dormant: true } as GameEvent]
      }
      return []
    },
  }, selfOid, controller)
}

export const OGN_155: Card = {
  id: 'OGN-155', cardNo: 'OGN·155/298', name: '奇亚娜', category: 'unit', // 英雄单位 → unit
  domains: ['orange'], energy: 4, power: 4, keywords: [...OGN_155_KEYWORDS],
  playModes: [{ kind: 'standard' }],
  abilities: [
    { kind: 'passive', describe: '[法盾] §809(对手选我为目标要额外付费;引擎统一管)' },
    { kind: 'passive', describe: '征服时二选一:抽一张牌 / 召出一枚休眠符文(见同名工厂)' },
  ],
}
