                                                                        
                                                              
             
                                            
                             
                                         
                             
  
                                                          
                                    
                                                                 
                                                     
                                      
                                                                    
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { CostMod } from '../../src/game/costPipeline'
import type { PlayExtraCost } from '../../src/session/interactiveGame'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'                                                     

export const OGN_231_CARD_EFFECT =
  '当你打出我时，你可以选择摧毁任意数量的友方单位作为额外费用。每用这个方法摧毁一个友方单位，便让我的费用减少{{黄色}}。\n'
  + '{{法盾}}（对手必须支付{{A}}才能将我选作法术或技能的目标。）\n'
  + '{{游走}}（我可以向其他战场进行移动。）'

export const OGN_231_KEYWORDS: readonly string[] = ['法盾', '游走']

   
                                            
  
                                                        
                                                                      
                                                                 
                                                                                                     
                                                                       
                                                            
                                                                      
                                                                             
                                                                      
                                        
                                                  
   
export const OGN_231_EXTRA_COST: PlayExtraCost = {
  label: '摧毁任意数量的友方单位(每名给我减一枚{{黄色}})',
  available: (state, player) => fieldedUnits(state, { of: player, friendly: true }).length > 0,
  options: (state, player) => fieldedUnits(state, { of: player, friendly: true })
    .map((_, i) => ({ id: String(i + 1), label: `摧毁 ${i + 1} 名友方单位(减 ${i + 1} 枚{{黄色}})` })),
  discount: (_state, _player, choice): readonly CostMod[] => {
    const n = choice === undefined ? 0 : Number(choice)
    return Number.isInteger(n) && n > 0
      ? [{ kind: 'reduce', part: 'pips', pips: n, source: 'OGN-231 莱卓斯指挥官' }]
      : []
  },
  payEvents: (state, player, choice): readonly GameEvent[] => {
    const n = choice === undefined ? 0 : Number(choice)
    if (!Number.isInteger(n) || n <= 0) return []
                                                       
    return fieldedUnits(state, { of: player, friendly: true }).slice(0, n)
      .map((oid): GameEvent => ({ kind: 'destroy', target: oid as ObjId, sourcePlayer: player }))
  },
}

export const OGN_231: Card = {
  id: 'OGN-231', cardNo: 'OGN·231/298', name: '莱卓斯指挥官', category: 'unit',
  domains: ['yellow'], energy: 6, power: 8, keywords: [...OGN_231_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时可摧毁任意数量友方,每名减一枚黄 pip(OGN_231_EXTRA_COST)' }],
}
