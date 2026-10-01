                                                                   
                                                                          
                                                           
  
                                                             
                                                                       
                                                                     
                                           
                                                  
                                                                
                                                                        
                              
  
                                      
                                                   
                                                    
                                                                        
                      
  
                                               
                                      
                                                          
                                                           
                                          
                                                       
                              
                                                   
                                                                  
                                                              
                                                      
  
                                                         
                                      
                                                             
                                       
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { fieldedUnits } from './activated-batch'
import { GOLD_TOKEN } from './gear-triggers'                  
import { ownerHandZone } from './enter-triggers-batch'                              

export const UNL_228_CARD_EFFECT =
  '支付{{1}}，{{横置}}：让战场上的一名友方单位返回其所属的手牌。打出一个休眠的“金币”装备指示物。'

                                
export const UNL_228_BOUNCE_KEY = 'ghostBounce'

   
                           
                                                        
                               
                                                
                                                                              
                                                            
                                                                
                                                          
                                                                             
                                                                             
                                                                     
                                   
                                                             
                                         
   
export function ghostBounceTargets(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true })
    .filter((oid) => state.zones[state.objects[oid]?.zone as ZoneId]?.kind === 'battlefield')
    .map((o) => o as string)
    .sort()
}

export const UNL_228_SPEC: ActivatedSpec = {
  key: 'UNL-228:bounce',
  label: '支付 1 法力并{{横置}}:弹回一名战场上的友方单位,并打出一个休眠金币',
  cost: { mana: 1 }, // §204.1.b 冒号前:1 点法力(**不是 pip** —— 卡面写的是 {{1}})
  tapSelf: true,
                                                     
                                        
                                                                      
                                                              
                                                                  
  choiceTiming: 'confirm',
  makeNextChoice: ({ selfOid, controller }) => (state, chosen): ChoiceRequest | null => {
    if (chosen[UNL_228_BOUNCE_KEY] !== undefined) return null
    const cands = ghostBounceTargets(state, controller)
    if (cands.length === 0) return null                             
    return {
      itemId: `act:${selfOid}:UNL-228`,
      controller,
      key: UNL_228_BOUNCE_KEY,
      prompt: '血港鬼影:让战场上的哪名友方单位返回其所属的手牌?',
      isTarget: true, // ★1782 让战场上的一名友方单位返回其所属的手牌
      candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
    }
  },
  makeResolve: ({ controller }) => (state, chosen): readonly GameEvent[] => {
    const out: GameEvent[] = []
    const pick = (chosen ?? {})[UNL_228_BOUNCE_KEY]
                                        
    if (pick !== undefined && ghostBounceTargets(state, controller).includes(pick)) {
                                                             
                                                 
                                                                   
                                                                 
                                                              
                                                          
      out.push({ kind: 'zoneChange', obj: pick as ObjId, to: ownerHandZone(state, pick) } )
    }
                                        
                                        
    out.push({
      kind: 'spawnToken', spec: GOLD_TOKEN as never,
      zone: `base:${controller}` as ZoneId, owner: controller, dormant: true,
    } )
    return out
  },
}

export const UNL_228: Card = {
                                                                            
  id: 'UNL-228', cardNo: 'UNL-228/219', name: '血港鬼影', category: 'legend',
  domains: ['red', 'purple'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '[付{1}+横置] 弹回一名战场上的友方单位并打出休眠金币(UNL_228_SPEC)' }],
}
