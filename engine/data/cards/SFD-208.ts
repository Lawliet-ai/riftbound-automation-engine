                                                                 
                                                                   
                                                         
  
                                                                 
                                   
                                                                                       
                                                                            
                                                                       
  
                 
                                                            
                                                                      
                                                                               
                                                                        
                                                              
                                         
                                                                           
                                                 
                                   
  
                                           
                                                                
                                                                      
                                                              
                                                                 
                                           
                                                         
                                                                   
  
                                                 
                                                              
                                                                  
                                                      
                                            
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import { isArmament } from '../../src/keywords/equip'
import { fieldedUnits } from './activated-batch'                                     
import { onField } from './activated-batch2'                                                      

export const SFD_208_CARD_EFFECT =
  '如果此战场受你控制，则所有友方传奇获得“{{横置}}：将你控制的一件武装贴附到你控制的一名单位上。”'

                                                                         
export const SFD_208_GRANT_KEY = 'SFD-208:forge'

                                                           
export const SFD_208_GEAR_KEY = 'poroForgeGear'

   
                                  
                                                                         
                                                  
                                                        
                                                        
   
export function forgeArmaments(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => isArmament(o) && o.controller === controller && onField(state, o))
    .map((o) => o.oid as string)
    .sort()
}

   
                         
                                                           
  
                         
                                                                                          
                                                                      
                                                                
                                           
                                                     
                                                                      
                                                  
                                                  
   
export function forgeHosts(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true }).map((o) => o as string)
}

export const SFD_208_GRANTED_SPEC: ActivatedSpec = {
  key: SFD_208_GRANT_KEY,
  label: '{{横置}}:将你控制的一件武装贴附到你控制的一名单位上',
  cost: {}, // §204.1.b 冒号前只有 {{横置}} ⇒ **资源费为空**(不是装配费)
  tapSelf: true,
                                
                                                            
                                                        
  available: (state, controller) =>
    forgeArmaments(state, controller).length > 0 && forgeHosts(state, controller).length > 0,
  target: 'custom', // §818.1.b.1 被贴附的**单位**是目标
  legalTargets: (state: GameState, controller: PlayerId): string[] => forgeHosts(state, controller),
  makeNextChoice: ({ selfOid, controller, target }) => (state, chosen): ChoiceRequest | null => {
    if (chosen[SFD_208_GEAR_KEY] !== undefined) return null
    if (target === undefined) return null
                                                            
    if (!forgeHosts(state, controller).includes(target)) return null
    const cands = forgeArmaments(state, controller)
    if (cands.length === 0) return null                            
    return {
      itemId: `act:${selfOid}:SFD-208`,
      controller,
      key: SFD_208_GEAR_KEY,
      prompt: '魄罗熔炉:把你控制的哪件武装贴附上去?',
      isTarget: true, // ★1782 将你控制的一件武装贴附到你控制的一名单位上
      candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid} 贴附` })),
    }
  },
  makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
    const gear = (chosen ?? {})[SFD_208_GEAR_KEY]
    if (target === undefined || gear === undefined) return []
                                         
                                                      
    if (!forgeHosts(state, controller).includes(target)) return []
    if (!forgeArmaments(state, controller).includes(gear)) return []
    return [{ kind: 'attach', obj: gear as ObjId, to: target as ObjId, player: controller } as GameEvent]
  },
}

export const SFD_208: Card = {
                                                              
  id: 'SFD-208', cardNo: 'SFD·208/221', name: '魄罗熔炉', category: 'battlefield',
  domains: [], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '受你控制时,你的传奇获得「{横置}:贴附一件武装」(BF_PASSIVES + grantActivated)' }],
}
