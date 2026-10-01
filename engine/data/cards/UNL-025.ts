                                                                         
                                                         
                                          
                                
  
                                             
                                     
                                                                                   
                                                                                   
                                                                     
                                                                        
                                                                               
  
                                                       
                                                                                 
                                                
                                                           
                                                 
                                                                 
                                                  
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { CostMod } from '../../src/game/costPipeline'
import { isRallyActive } from '../../src/keywords/rally'

export const UNL_025_CARD_EFFECT =
  '{{鼓舞>}} 你可以选择支付{{3}}和{{红色}},将我从废牌堆中打出。(如果你在本回合内已打出过其他卡牌,则发动此效果。)'

                                                   
export const UNL_025_EXTRA_PIP_COLOR = 'red'

   
                                   
                                                    
   
export function unyieldingPlaySources(state: GameState, player: PlayerId): readonly ObjId[] {
  const zone = state.zones[`discard:${player}` as ZoneId]
  return (zone?.contents ?? []).filter((oid) => {
    const o = state.objects[oid]
                                             
    return o !== undefined && o.defId === 'UNL-025' && isRallyActive(state, o)
  })
}

   
                                                       
                                                                    
                                                              
   
export function unyieldingCostMods(
  defId: string, ctx?: { readonly fromZone?: string },
): readonly CostMod[] {
  if (defId !== 'UNL-025') return []
  if (ctx?.fromZone !== 'discard') return []
  return [{
    kind: 'increase', part: 'pips', pips: 1,
    pipColors: [UNL_025_EXTRA_PIP_COLOR], // ★第267轮加的口子:不给就成了"任意域",比卡面更松
    source: 'UNL-025 不死军团(从废牌堆打出)',
  }]
}

export const UNL_025: Card = {
  id: 'UNL-025', cardNo: 'UNL-025/219', name: '不死军团', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '{鼓舞>} 可支付{3}和{红色}从废牌堆打出' }],
}
