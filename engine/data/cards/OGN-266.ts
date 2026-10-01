                                                                      
                                                                    
                                      
                                                        
               
                                                    
  
           
                                                                      
                                                            
                                                                  
                                                         
                                                                   
                                                           
                                                     
                                   
                                          
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { PlaySpec } from '../../src/loop/playSpec'
import { zonesByKind, type GameState } from '../../src/state/gameState'
import type { PlayerId } from '../../src/state/ids'
import { isUnit } from '../../src/state/cardTypes'                                                  
import { pumpEvent } from './activated-batch'

export const OGN_266_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n'
  + '选择一个战场，让该处的所有友方单位{{S}}+1，而敌方单位{{S}}-1，不得低于1{{S}}，直到回合结束。'

export const OGN_266_SPEC: PlaySpec = {
  defId: 'OGN-266', cardNo: 'OGN·266/298', name: '虹吸能量', kind: 'spell',
  cost: { mana: 2, pips: [['blue', 'yellow']] }, // ㊶ cardCosts 实测 2 法力 1pip 双色 ⇒ 一枚双色
  keywords: ['反应'],
  target: 'custom',
  legalTargets: (state: GameState): readonly string[] =>
    zonesByKind(state, 'battlefield').map((z) => z.id as string),
  makeResolve:
    ({ controller, target }: { controller: PlayerId; target?: string }) =>
    (state: GameState): readonly GameEvent[] => {
    if (target === undefined) return []
    const z = state.zones[target as never]
    if (!z || z.kind !== 'battlefield') return []                          
    const out: GameEvent[] = []
    for (const oid of z.contents) {
      const o = state.objects[oid]
      if (!o || !isUnit(o)) continue                                                                           
      if (o.controller === controller) {
        out.push(pumpEvent('OGN-266:ally', oid as string, 1))                   
      } else {
        out.push(pumpEvent('OGN-266:foe', oid as string, -1, 1))                          
      }
    }
    return out
  },
}

export const OGN_266: Card = {
  id: 'OGN-266', cardNo: 'OGN·266/298', name: '虹吸能量', category: 'spell',
  domains: ['blue', 'yellow'], energy: 2, keywords: ['反应'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一个战场:该处友方+1/敌方-1(下限1),至回合末(OGN_266_SPEC)' }],
}
