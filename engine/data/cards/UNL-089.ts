                                             
                                                                    
                                           
                                                         
          
                                    
                                                                       
                                                            
                                                                    
                                            
import type { Card } from '../../src/dsl/card'
import type { CostMod } from '../../src/game/costPipeline'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'

export const UNL_089_CARD_EFFECT =
  '{{预知}}（当你打出我时，查看主牌堆顶部的一张牌，你可以选择将其回收。）\n如果你在本回合消耗了不低于{{4}}的费用来打出一个法术，则你可以选择支付{{蓝色}}来将我打出。'

                                   
export const JHIN_THRESHOLD = 4

                                                   
export function jhinAltCostMods(state: GameState, player: PlayerId, defId: string): readonly CostMod[] {
  if (defId !== 'UNL-089' && defId !== 'UNL-089a') return []
  if ((state.maxSpellManaThisTurn?.[player as string] ?? 0) < JHIN_THRESHOLD) return []
  return [{
    kind: 'reduce', part: 'mana', mana: 0, source: '烬 - 原价打出',
    alt: { kind: 'replace', part: 'total', replaceWith: { pips: [['blue']] }, source: '烬 - 替代费(支付{蓝色})' },
  }]
}

export const UNL_089: Card = {
  id: 'UNL-089', cardNo: 'UNL-089/219', name: '烬', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: ['预知'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[预知];本回合单笔≥4费打出过法术则可改付{蓝色}打出(jhinAltCostMods+replace 档)' }],
}
export const UNL_089A: Card = { ...UNL_089, id: 'UNL-089a', cardNo: 'UNL-089a/219' }
