                                                                   
                                                         
                                               
                                              
                                                        
                           
  
                                  
                                                     
                      
                                                   
                                                          
                                                        
  
                                                                                
                                                              
                                                            
                                                 
                                                                    
                     
                                                                                 
                                                                      
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ChainItem } from '../../src/loop/chain'
import type { GameObject } from '../../src/state/object'
import { targetsOf } from '../../src/loop/chainTargets'
import { isEmpowered } from '../../src/keywords/empower'
import { variantSiblings } from '../variantAlias'
import { pumpEvent } from './activated-batch'

export const VEN_181_CARD_EFFECT =
  '{{强化橙色橙色}}\n'
  + '{{已强化>}} 如果一个将我选作目标的法术或技能将眩晕我、或给予我-{{S}}、或把我送回手牌，则改为给予我在本回合内{{S}}+3。'

export const VEN_181_BOOST = 3

                            
export const VEN_181_DEFIDS: readonly string[] = variantSiblings('VEN-181')

export function isGangplank(defId: string): boolean {
  return VEN_181_DEFIDS.includes(defId)
}

                                                      
const boost = (oid: string): GameEvent => pumpEvent('VEN-181:pump', oid, VEN_181_BOOST)

   
                                                         
                                                     
                                    
   
export function gangplankRewrites(state: GameState, item: ChainItem, events: readonly GameEvent[]): readonly GameEvent[] {
  const planks = Object.values(state.objects).filter((o): o is GameObject =>
    isGangplank(o.defId) && isEmpowered(o))
  if (planks.length === 0) return events
  const targeted = new Set(targetsOf(item))
  const mine = planks.filter((p) => targeted.has(p.oid as string))
  if (mine.length === 0) return events                            
  return events.map((ev) => {
    for (const p of mine) {
                                                        
      if (ev.kind === 'stun' && (ev.target as string) === (p.oid as string)) {
        if (p.status.stunned === true) return ev
        return boost(p.oid as string)
      }
                                                                  
      if (ev.kind === 'addEffect') {
        const m = ev.effect.modification
        if (m.kind === 'addMight' && m.delta < 0 && ev.effect.predicate(p, state)) {
          return boost(p.oid as string)
        }
      }
                  
      if (ev.kind === 'zoneChange' && (ev.obj as string) === (p.oid as string)
        && (ev.to as string).startsWith('hand:')) {
        return boost(p.oid as string)
      }
    }
    return ev
  })
}

                                                                   
export const VEN_181: Card = {
  id: 'VEN-181', cardNo: 'VEN·181', name: '普朗克', category: 'unit', // 英雄单位 → unit
  domains: ['orange'], energy: 6, power: 6, keywords: ['强化橙色橙色'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[强化橙色橙色]走§827工厂;已强化:选我为目标的法术/技能的眩晕/-S/回手改为本回合+3(gangplankRewrites)' }],
}
