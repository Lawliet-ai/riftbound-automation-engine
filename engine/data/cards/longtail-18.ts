                      
  
                                   
                                       
  
                                                              
                                
              
                                                        
                                                     
                                                      
                                             
                                    

import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameObject } from '../../src/state/object'
import { isUnit } from '../../src/state/cardTypes'

export const VEN_036_CARD_EFFECT = '如果我位于战场上，则所有玩家在其召出阶段开始时只能召出一枚符文。'

                                 
const SUMMON_CAPS: Readonly<Record<string, number>> = {
  'VEN-036': 1,
}

const onBattlefield = (state: GameState, o: GameObject): boolean =>
  state.zones[o.zone]?.kind === 'battlefield'

   
                                         
                         
                                                           
   
export function summonRuneCapFor(state: GameState): number | undefined {
  let cap: number | undefined
  for (const o of Object.values(state.objects)) {
    const c = SUMMON_CAPS[o.defId]
    if (c === undefined) continue
    if (!isUnit(o) || !onBattlefield(state, o)) continue                  
    cap = cap === undefined ? c : Math.min(cap, c)
  }
  return cap
}

export const VEN_036: Card = {
  id: 'VEN-036', cardNo: 'VEN·036', name: '砂岩奇美拉', category: 'unit',
  domains: ['green'], energy: 7, power: 8, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '我在战场上时所有玩家召出阶段只能召一枚符文(summonRuneCapFor)' }],
}

             
export const LONGTAIL18_DEFIDS: readonly string[] = ['VEN-036']
export const SUMMON_CAP_DEFIDS: readonly string[] = Object.keys(SUMMON_CAPS)
