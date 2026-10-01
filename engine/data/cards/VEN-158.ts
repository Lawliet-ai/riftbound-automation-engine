                                                                   
                                             
                                       
  
                                           
                                                              
                                              
                                                                
                                                             
  
                                                          
                                                       
                                                   
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'

                                           
const DEFLECT_WAIVED_BF: ReadonlySet<string> = new Set(['VEN-158'])

   
                                                                
                                                                                   
   
export function deflectWaivedAt(state: GameState, zoneId: string): boolean {
  const bc = state.battlefieldCards?.[zoneId]
  return bc !== undefined && DEFLECT_WAIVED_BF.has(bc.defId)
}

                           
export const DEFLECT_WAIVED_BF_DEFIDS: readonly string[] = [...DEFLECT_WAIVED_BF]

export const VEN_158_CARD_EFFECT = '玩家为将此处的物体选为目标的法术或技能支付费用时，无视{{法盾}}。'
export const VEN_158: Card = {
  id: 'VEN-158', cardNo: 'VEN·158', name: '世界之壳 亥宿', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '为此处目标付费时无视[法盾](deflectWaivedAt)' }],
}
