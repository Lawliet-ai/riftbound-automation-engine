                                                                     
                                                                 
                                                                    
                                        
                                                     
                                                
  
                                                           
                                  
                                                          
                                                       
                                                          
                                                                 
                                                                    
                                                                         
                                               
                                                                     
                                                                    
                                                    
                                                      
                                                                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { topOfDeck } from '../../src/keywords/insight'
import { makeBanishPlayRelay, type BanishPlayShape } from './play-from-deck'

export const OGN_115_CARD_EFFECT =
  '每名玩家查看其主牌堆顶部的五张牌，放逐其中一张，然后回收其余的卡牌。'
  + '从下一名玩家开始，每名玩家打出这些被放逐的卡牌，无视其法力费用。（仍需支付所有符能费用。）'

                                                                      
export const OGN_115_SHAPE: BanishPlayShape = {
  defId: 'OGN-115', reduceMana: 0, accepts: 'permanent', acceptsSpells: true,
  freeMana: true, playerIsOwner: true,
}

   
                                                  
                                               
                                            
   
export function futureOrder(state: GameState, controller: PlayerId): readonly PlayerId[] {
  const i = state.players.indexOf(controller)
  return [...state.players.slice(i + 1), ...state.players.slice(0, i + 1)]
}

                                 
const pickKeyOf = (p: string): string => `future:${p}`

export const OGN_115_SPEC: PlaySpec = {
  defId: 'OGN-115', cardNo: 'OGN·115/298', name: '光明未来', kind: 'spell',
  cost: { mana: 5, pips: [['blue']] }, // ㊶ cardCosts 实测 5 法力 1 蓝 pip
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
    for (const p of futureOrder(state, controller)) {
      const key = pickKeyOf(p as string)
      if (chosen[key] !== undefined) continue            
      const top = topOfDeck(state, p, 5)
      if (top.length === 0) continue                      
      return {
        itemId: `spell:${movedCardOid}:OGN-115`,
        controller: p, // ②答题人 = 看牌的玩家;**必选**,候选无 skip 档(QA L56「强制」)
        key,
        prompt: '光明未来:查看你主牌堆顶部的五张牌,放逐其中一张(其余回收,随后半免打出)',
        candidates: top.map((card) => ({
          id: card as string, label: state.objects[card]?.defId ?? (card as string),
        })),
      }
    }
    return null
  },
  makeResolve:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    const out: GameEvent[] = []
                                                                   
    for (const p of futureOrder(state, controller)) {
      const top = topOfDeck(state, p, 5)
      const pick = chosen?.[pickKeyOf(p as string)]
      const took = pick !== undefined && top.some((c) => (c as string) === pick)
      if (!took) continue                               
                                                                        
      out.push({ kind: 'banish', target: pick as ObjId, by: movedCardOid as ObjId } as GameEvent)
                                                  
      const rest = top.filter((c) => (c as string) !== pick)
      if (rest.length > 0) out.push({ kind: 'recycle', player: p, objs: rest } as GameEvent)
    }
    return out
  },
}

                                                        
export function makeBrightFutureRelay(selfOid: ObjId, controller: PlayerId): Trigger {
  return makeBanishPlayRelay(OGN_115_SHAPE, selfOid, controller)
}

export const OGN_115: Card = {
  id: 'OGN-115', cardNo: 'OGN·115/298', name: '光明未来', category: 'spell',
  domains: ['blue'], energy: 5, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每人看自己顶5放逐一张余回收;从下家起各自半免打出(OGN_115_SHAPE.freeMana+playerIsOwner)' }],
}
