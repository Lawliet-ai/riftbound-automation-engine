                                                                   
                                                                   
                                                          
  
                                                
                                    
                                                                           
                      
                                                
  
                                                    
                                                                       
                                                                         
                                                                            
                                                                     
                                                                        
                                                        
  
                                     
                                                    
                                  
                                                           
                                              
                                                   
                                                          
                         
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { controlledBattlefields } from '../../src/state/battlefieldControl'
import { fieldedUnits } from './activated-batch'
import { moveDestinations, moveUnitEvents } from './enemy-move'
import { opponentsOf } from './OGN-156'

export const UNL_101_CARD_EFFECT =
  '将你控制的一名单位移动至你控制的一处战场。然后，选择一名对手。该对手将自己控制的一名单位移动至该战场。'

                         
export const UNL_101_DEST_KEY = 'rallyDest'
                            
export const UNL_101_FOE_KEY = 'rallyFoe'
                                      
export const UNL_101_FOE_UNIT_KEY = 'rallyFoeUnit'

                                                             
export function rallyMovers(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true }).map((o) => o as string).sort()
}

   
                        
                                                             
                                                                  
   
export function rallyDestinations(state: GameState, controller: PlayerId, target: string | undefined): string[] {
  if (target === undefined) return []
  const mine = new Set(controlledBattlefields(state, controller))
  return moveDestinations(state, target).filter((z) => mine.has(z)).sort()
}

   
                                        
                                                    
                                                       
                                                  
   
export function rallyFoeUnits(state: GameState, foe: string, dest: string | undefined): string[] {
  if (dest === undefined) return []
  return fieldedUnits(state, { of: foe as PlayerId, friendly: true })
    .map((o) => o as string)
    .filter((oid) => moveDestinations(state, oid).includes(dest))
    .sort()
}

                                                      
export function rallyTargetLive(state: GameState, controller: PlayerId, target: string | undefined): boolean {
  return target !== undefined && rallyMovers(state, controller).includes(target)
}

export const UNL_101_SPEC: PlaySpec = {
  defId: 'UNL-101', cardNo: 'UNL-101/219', name: '战斗号令', kind: 'spell',
  cost: { mana: 3 }, // 卡面核:3法力 **0pip**(`CARD_COSTS` 现查,不从颜色推)
  keywords: [],
  target: 'custom',
  legalTargets: (state, controller): string[] => rallyMovers(state, controller),
                                                                        
                                                              
                                                                              
                                                                
                                                                    
                                                   
                                                     
                                                                               
                                                                             
  makeConfirmChoice: ({ movedCardOid, controller, target }) => (state, chosen): ChoiceRequest | null => {
    const itemId = `play:${movedCardOid}`
                                                   
    if (!rallyTargetLive(state, controller, target)) return null
                     
    if (chosen[UNL_101_DEST_KEY] === undefined) {
      const dests = rallyDestinations(state, controller, target)
      if (dests.length === 0) return null                          
      return {
        itemId, controller, key: UNL_101_DEST_KEY,
        prompt: '战斗号令:把这名单位移动到你控制的哪一处战场?',
        candidates: dests.map((z) => ({ id: z, label: z })),
      }
    }
                           
    if (chosen[UNL_101_FOE_KEY] === undefined) {
      const foes = opponentsOf(state, controller)
      if (foes.length === 0) return null
      return {
        itemId, controller, key: UNL_101_FOE_KEY,
                                                                
                                                                       
                                                                      
                                                                         
                                                          
        isTarget: true,
        prompt: '战斗号令:选择一名对手',
        candidates: foes.map((p) => ({ id: p, label: p })),
      }
    }
    return null
  },
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen): ChoiceRequest | null => {
    const itemId = `play:${movedCardOid}`
                                                            
    if (!rallyTargetLive(state, controller, target)) return null
                                                           
    if (chosen[UNL_101_FOE_UNIT_KEY] !== undefined) return null        
    const foe = chosen[UNL_101_FOE_KEY]
    if (foe === undefined || !opponentsOf(state, controller).includes(foe)) return null               
    const cands = rallyFoeUnits(state, foe, chosen[UNL_101_DEST_KEY])
    if (cands.length === 0) return null                                 
    return {
      itemId,
      controller: foe as PlayerId, // ★★★ 作答者是【那名对手】,不是我
      key: UNL_101_FOE_UNIT_KEY,
      prompt: '战斗号令:把你自己控制的哪名单位移动到该战场?',
      candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
    }
  },
  makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
    const c = chosen ?? {}
                                                                  
    if (!rallyTargetLive(state, controller, target)) return []
    const dest = c[UNL_101_DEST_KEY]
                                                                 
                                                        
    const first = moveUnitEvents(state, target, dest)
    const foe = c[UNL_101_FOE_KEY]
                                                                           
                                                                            
                                                    
                                                 
    if (foe === undefined || !opponentsOf(state, controller).includes(foe)) return first
    const foeUnit = c[UNL_101_FOE_UNIT_KEY]
                                       
    if (foeUnit === undefined || !rallyFoeUnits(state, foe, dest).includes(foeUnit)) return first
    return [...first, ...moveUnitEvents(state, foeUnit, dest)]
  },
}

export const UNL_101: Card = {
  id: 'UNL-101', cardNo: 'UNL-101/219', name: '战斗号令', category: 'spell',
  domains: ['orange'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '移我一名单位到我控制的战场;选一名对手,由他送一名自己的单位过来(UNL_101_SPEC)' }],
}
