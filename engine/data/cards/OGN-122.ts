                                                                     
                                             
                             
  
                                          
                                             
                                       
                                                       
                                                               
  
                                                               
                                                                 
                                                 
                                           
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId } from '../../src/state/ids'
import type { PlaySpec } from '../../src/loop/playSpec'

export const OGN_122_CARD_EFFECT = '在当前回合结束后，再进行一个回合，然后放逐此牌。'

                                         
export const OGN_122_EXTRA_TURNS = 1

export const OGN_122_SPEC: PlaySpec = {
  defId: 'OGN-122', cardNo: 'OGN·122/298', name: '时间扭曲', kind: 'spell',
  cost: { mana: 10, pips: [['blue'], ['blue'], ['blue'], ['blue']] }, // 10 法力 + 四枚蓝 pip
  keywords: [],
  target: 'none',
  legalTargets: () => [],
  makeResolve:
    ({ controller, movedCardOid }) =>
    (): readonly GameEvent[] => [
                                                  
      ...Array.from({ length: OGN_122_EXTRA_TURNS }, (): GameEvent => ({ kind: 'extraTurn', player: controller })),
                                   
      { kind: 'banish', target: movedCardOid as ObjId } as GameEvent,
    ],
}

export const OGN_122: Card = {
  id: 'OGN-122', cardNo: 'OGN·122/298', name: '时间扭曲', category: 'spell',
  domains: ['blue'], energy: 10, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '当前回合结束后再进行一个回合,然后放逐此牌(OGN_122_SPEC)' }],
}
