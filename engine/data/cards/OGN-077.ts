                                                                   
  
                                                        
                                                 
                                                  
                                              
                                 
  
                                                                    
                                                                                
                                                              
  
                                         
                                                                
                                             
                                              
                                                                      
                              
                                                         
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { ObjId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'
import { clearDamageDormantRecall } from '../../src/state/recall'
import { destroyToOwnerDiscard } from '../../src/state/mutations'

export const OGN_077_CARD_EFFECT =
  '{{待命}}（支付{{A}}正面朝下放置此牌，之后可支付{{0}}将其当作反应牌打出。）\n' +
  '如果一名友方单位被摧毁，则改为将此牌摧毁。移除该单位所受伤害，让其进入休眠状态，并将其召回。' +
  '（把该单位送回基地，此行动不算作移动。）'

   
                                                              
                            
  
                                                       
                                               
   
export function chronoShiftSave(state: GameState, victimOid: ObjId): GameState | null {
  const victim = state.objects[victimOid]
  if (!victim || !isUnit(victim)) return null                             
  const hourglass = Object.values(state.objects).find(
    (o) => o.defId === 'OGN-077' && o.controller === victim.controller && onField(state, o),
  )
  if (!hourglass) return null
                           
  const s = destroyToOwnerDiscard(state, hourglass.oid)
                                            
  return clearDamageDormantRecall(s, victimOid)
}

export const OGN_077: Card = {
  id: 'OGN-077', cardNo: 'OGN·077/298', name: '中娅沙漏', category: 'equipment',
  domains: ['green'], energy: 2, keywords: ['待命'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '待命;友方单位将被摧毁时改为摧毁此牌并把它清伤休眠召回(chronoShiftSave)' }],
}
