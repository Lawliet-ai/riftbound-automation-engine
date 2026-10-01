                                                                        
                                                              
                       
                                             
                   
  
                                                   
                                        
                                                
                                                
                                     
                                
                                                                         
                                                                              
                                                 
                                                                
                              
import type { Card } from '../../src/dsl/card'
import type { Cost } from '../../src/state/runePool'
import type { GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'

export const UNL_163_CARD_EFFECT =
  '对手若要将多名单位同时移动到我所在的战场，则必须为除第一名单位外的每名其他单位各额外支付{{A}}。'

                                                         
export const PATROL_SURCHARGE: Cost = { mana: 0, pips: [[]] }

   
                                 
                                  
                                                       
   
export function patrolTaxApplies(state: GameState, mover: PlayerId, to: string): boolean {
  if (state.zones[to as never]?.kind !== 'battlefield') return false                       
  return Object.values(state.objects).some((o) =>
    o.defId === 'UNL-163'
    && (o.zone as string) === to                          
    && o.controller !== mover)                          
}

   
                                                                        
                                                           
                                                                                                       
   
export function standardMoveSurchargeFor(state: GameState, mover: PlayerId, oids: readonly string[], to: string): Cost | undefined {
  if (oids.length < 2 || !patrolTaxApplies(state, mover, to)) return undefined
  return { mana: 0, pips: Array.from({ length: oids.length - 1 }, () => [] as string[]) }
}

export const UNL_163: Card = {
  id: 'UNL-163', cardNo: 'UNL-163/219', name: '搜魔人巡管', category: 'unit',
  domains: ['yellow'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '对手多移单位到我所在战场:第2名起每名加付{{A}}(施加费用§204.4,UNL-054 消费)' }],
}
