                                                                    
                                                                    
                            
                                
                                     
  
                                              
                                                    
                                                       
                                            
                                   
                                                
                                                   
                                              
                                            
                                                                  
                                                       
                                              
                                            
                                                                 
                        
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'

export const OGN_071_CARD_EFFECT =
  '让除你之外的其他玩家选择“卡牌”或“符文”。\n'
  + '每有一名玩家选择“卡牌”，你和该玩家便各抽一张牌；\n'
  + '每有一名玩家选择“符文”，你和该玩家便召出一枚休眠的符文。'

                                 
const pickKeyOf = (p: string): string => `party:${p}`

export const OGN_071_SPEC: PlaySpec = {
  defId: 'OGN-071', cardNo: 'OGN·071/298', name: '次元门狂欢', kind: 'spell',
  cost: { mana: 3 }, // ㊶ cardCosts 实测 3 法力 **0 pip**
  keywords: [],
  target: 'none',
  legalTargets: (): string[] => [],
  makeNextChoice:
    ({ movedCardOid, controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen: Readonly<Record<string, string>>) => {
                                
    for (const p of state.players.filter((x) => x !== controller)) {
      const key = pickKeyOf(p as string)
      if (chosen[key] !== undefined) continue            
      return {
        itemId: `spell:${movedCardOid}:OGN-071`,
        controller: p, // 答题人 = 该对手;「让…选择」没写「可以」⇒ **必选**,无 skip 档
        key,
        prompt: '次元门狂欢:选择“卡牌”(你和施法者各抽一张)或“符文”(你和施法者各召一枚休眠符文)',
        candidates: [
          { id: 'card', label: '卡牌' },
          { id: 'rune', label: '符文' },
        ],
      }
    }
    return null
  },
  makeResolve:
    ({ controller }: { movedCardOid: string; controller: PlayerId }) =>
    (state: GameState, chosen?: Readonly<Record<string, string>>): readonly GameEvent[] => {
    const out: GameEvent[] = []
    for (const p of state.players.filter((x) => x !== controller)) {
      const pick = chosen?.[pickKeyOf(p as string)]
      if (pick === 'card') {
                                       
        out.push({ kind: 'draw', player: controller, count: 1 } as GameEvent)
        out.push({ kind: 'draw', player: p, count: 1 } as GameEvent)
      } else if (pick === 'rune') {
                                                             
        out.push({ kind: 'summonRune', player: controller, count: 1, dormant: true } as GameEvent)
        out.push({ kind: 'summonRune', player: p, count: 1, dormant: true } as GameEvent)
      }
      // 没答到(不该发生;防御)⇒ 这名对手整个跳过
    }
    return out
  },
}

export const OGN_071: Card = {
  id: 'OGN-071', cardNo: 'OGN·071/298', name: '次元门狂欢', category: 'spell',
  domains: ['green'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '每名对手二选一:卡牌=双方各抽1;符文=双方各召1休眠符文(逐人问)' }],
}
