                                                                     
                                                     
                                              
                                
                                
  
                                                    
                                                   
                                                         
                                                      
                                                          
                                              
                                                                
                                                      
                                                                            
                                                       
                                                              
                            
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { CARD_CATEGORIES } from '../cardCategories'
import { isUnit, type TypeSource } from '../../src/state/cardTypes'                                     

export const SFD_029_CARD_EFFECT =
  '{{急速}}（你可以选择额外支付{{1}}和{{红色}}，让我以活跃状态进场。）\n'
  + '{{强攻}}（如果我是进攻方，则{{S}}+1。）\n'
  + '从手牌以外位置被打出的友方单位获得{{急速}}。'

                                             
export const REKSAI_DEFIDS: readonly string[] = ['SFD-029', 'SFD-029a']

   
                                
                                                                              
                                                                                                    
                                                                                               
                                                                                                
   
export function rekSaiHasteGrant(
  state: GameState, player: PlayerId, defId: string, fromZone?: string, spec?: TypeSource,
): boolean {
  if (fromZone === undefined || fromZone === 'hand') return false             
  const unitLike = (spec !== undefined && isUnit(spec)) || CARD_CATEGORIES[defId] === 'unit'                                       
  if (!unitLike) return false
                                             
  return Object.values(state.objects).some((o) => {
    if (!REKSAI_DEFIDS.includes(o.defId)) return false
    if (o.controller !== player) return false                   
    const k = state.zones[o.zone]?.kind
    return k === 'battlefield' || k === 'base'
  })
}

export const SFD_029: Card = {
  id: 'SFD-029', cardNo: 'SFD·029/221', name: '雷克塞', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: ['急速', '强攻'],
  playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '州级授予:从手牌以外位置被打出的友方单位获得[急速](rekSaiHasteGrant → deps.hasteGrantedBy)' }],
}
