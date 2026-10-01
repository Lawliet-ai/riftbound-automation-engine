                                                                    
                                             
                         
  
                                                 
                                                                 
                                                                 
                                                                  
  
                        
                                            
                                              
                                                   
                                                          
                                                                  
                             
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'

                                                   
const BARRIER_IGNORE_GRANTERS: ReadonlySet<string> = new Set(['VEN-004'])

   
                                                               
                                    
                                                                  
   
export function barrierIgnoredAt(state: GameState, player: PlayerId, battlefield: string): boolean {
  return Object.values(state.objects).some(
    (o) => BARRIER_IGNORE_GRANTERS.has(o.defId)
      && o.controller === player
      && (o.zone as string) === battlefield,
  )
}

                         
export const BARRIER_IGNORE_DEFIDS: readonly string[] = [...BARRIER_IGNORE_GRANTERS]

export const VEN_004_CARD_EFFECT = '你在此处的战斗伤害分配无视{{壁垒}}。'
export const VEN_004: Card = {
  id: 'VEN-004', cardNo: 'VEN·004', name: '沙丘冲浪者', category: 'unit',
  domains: ['red'], energy: 3, power: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我在此处时,你分配战斗伤害无视[壁垒](barrierIgnoredAt)' }],
}
