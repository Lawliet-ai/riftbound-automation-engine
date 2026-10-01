                                                                         
                 
                                                             
                                             
                                  
                                                 
  
                                                     
                                       
                                                                      
                                    
                                                                      
                                                                  
                                                     
import type { PlaySpec } from '../../src/loop/playSpec'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId, ZoneId } from '../../src/state/ids'
import type { Card } from '../../src/dsl/card'

export const OGN_134_CARD_EFFECT = '召出一枚休眠的符文。如果你无法达成，则抽一张牌。'
export const OGN_138_CARD_EFFECT =
  '召出两枚休眠的符文。如果你无法以此方式召出两枚符文，则抽一张牌。'

                                         
export function runeDeckSize(state: GameState, player: string): number {
  return state.zones[`runeDeck:${player}` as ZoneId]?.contents.length ?? 0
}

   
                                        
                                                          
   
export function summonDormantOrDraw(state: GameState, player: string, want: number): readonly GameEvent[] {
  const have = runeDeckSize(state, player)
  const out: GameEvent[] = []
  if (have > 0) {
    out.push({ kind: 'summonRune', player: player as PlayerId, count: want, dormant: true } )
  }
  if (have < want) {
    out.push({ kind: 'draw', player: player as PlayerId, count: 1 } )           
  }
  return out
}

export const OGN_134_WANT = 1
export const OGN_138_WANT = 2

export const OGN_134_SPEC: PlaySpec = {
  defId: 'OGN-134', cardNo: 'OGN·134/298', name: '动员', kind: 'spell',
  cost: { mana: 2 }, // cardCosts 实测:2 法力 0 pip
  keywords: [], // 无印刷关键词 ⇒ 三处都不登(②)
  target: 'none',
  legalTargets: () => [], // 无目标法术的既有写法
  makeResolve:
    ({ controller }) =>
    (state: GameState): readonly GameEvent[] =>
      summonDormantOrDraw(state, controller as string, OGN_134_WANT),
}

export const OGN_138_SPEC: PlaySpec = {
  defId: 'OGN-138', cardNo: 'OGN·138/298', name: '万世催化石', kind: 'spell',
  cost: { mana: 4 }, // cardCosts 实测:4 法力 0 pip
  keywords: [],
  target: 'none',
  legalTargets: () => [], // 无目标法术的既有写法
  makeResolve:
    ({ controller }) =>
    (state: GameState): readonly GameEvent[] =>
      summonDormantOrDraw(state, controller as string, OGN_138_WANT),
}

export const OGN_134: Card = {
  id: 'OGN-134', cardNo: 'OGN·134/298', name: '动员', category: 'spell',
  domains: ['orange'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '召出一枚休眠符文;召不出则抽一张(OGN_134_SPEC)' }],
}

export const OGN_138: Card = {
  id: 'OGN-138', cardNo: 'OGN·138/298', name: '万世催化石', category: 'spell',
  domains: ['orange'], energy: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '召出两枚休眠符文;召不满两枚则抽一张(OGN_138_SPEC)' }],
}
