                                                                  
                                                     
                                             
                                              
  
                                    
                                                               
                                                       
                                           
                                                                           
                                           
                                                                    
                                                           
                                                 
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'

export const UNL_017_CARD_EFFECT =
  '{{回响}} — 弃置一张手牌（你可以选择支付此额外费用，以重复此法术效果。）\n'
  + '让一名单位本回合内获得{{强攻4}}。（如果它是进攻方，则{{S}}+4。）'

                                                        
export const UNL_017_ASSAULT = '强攻4'

export const UNL_017_SPEC: PlaySpec = {
  defId: 'UNL-017', cardNo: 'UNL-017/219', name: '怒吼清算', kind: 'spell',
  cost: { mana: 4 }, // ㊶ cardCosts 实测 4 法力 0 pip
  echo: { mana: 0 }, // [回响] 资源半=空费(真费用是下面那格非资源弃牌)
  echoDiscard: 1, // ★688 「回响 — 弃置一张手牌」(★636 缺口闭环首例)
  keywords: [],
  target: 'custom',
                                           
  legalTargets: (state: GameState): string[] => fieldedUnits(state).map((o) => o as string),
  makeResolve:
    ({ movedCardOid, target }: { movedCardOid: string; controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
    if (target === undefined) return []
    if (state.objects[target as ObjId] === undefined) return []                      
    return [
      { kind: 'addEffect', effect: {
                                                                    
                                                                   
        id: `UNL-017:assault:${movedCardOid}:${target}:${state.nextOid}`, duration: 'thisTurn', fromPassive: false,
        predicate: (x: { oid: ObjId }) => x.oid === (target as ObjId),
        modification: { kind: 'grantKeyword', keyword: UNL_017_ASSAULT },
      } } ,
    ]
  },
}

export const UNL_017: Card = {
  id: 'UNL-017', cardNo: 'UNL-017/219', name: '怒吼清算', category: 'spell',
  domains: ['red'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '回响—弃一张手牌(★688 echoDiscard 首例);单体本回合[强攻4](UNL_017_SPEC)' }],
}
