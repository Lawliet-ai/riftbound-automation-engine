                                                                      
                                             
                                                           
  
                                                
                                                  
                                                  
                      
                                                  
                                                  
                                            
  
                                     
                                              
                                                                 
                                             
                                                        
                         
  
                       
                                                            
                                                             
                                            
                                              
                                                                        
  
                                                           
                                                             
                                                   
                                                   
                                                    
                                   
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { PlaySpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { effectiveMight } from '../../src/state/might'
import { armamentsOn, isGeared } from '../../src/keywords/equip'
import { fieldedUnits } from './activated-batch'
import { enemyUnitsOnField } from './enemy-move'

export const SFD_107_CARD_EFFECT =
  '选择一名配装的友方单位，并对一名敌方单位造成等同于该友方单位战力的伤害。然后，卸除该友方单位的一件武装。'

                         
export const SFD_107_FOE_KEY = 'knockdownFoe'
                             
export const SFD_107_GEAR_KEY = 'knockdownGear'

   
                                   
                                                           
                                              
   
export function knockdownMovers(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true })
    .filter((oid) => isGeared(state, oid))
    .map((o) => o as string)
    .sort()
}

                                             
export function knockdownGears(state: GameState, target: string | undefined): string[] {
  if (target === undefined) return []
  return armamentsOn(state, target as ObjId).map((o) => o.oid as string).sort()
}

   
                                                 
                                                     
   
export function knockdownTargetLive(state: GameState, controller: PlayerId, target: string | undefined): boolean {
  return target !== undefined && knockdownMovers(state, controller).includes(target)
}

export const SFD_107_SPEC: PlaySpec = {
  defId: 'SFD-107', cardNo: 'SFD·107/221', name: '击倒', kind: 'spell',
  cost: { mana: 3, pips: [['orange']] }, // 卡面核:3法力 + **1 枚橙 pip**(`CARD_COSTS` 现查)
  keywords: [],
  target: 'custom',
                                                                     
                                                          
                                                         
                                                                              
  choiceTiming: 'confirm',
  legalTargets: (state, controller): string[] => knockdownMovers(state, controller),
  makeNextChoice: ({ movedCardOid, controller, target }) => (state, chosen): ChoiceRequest | null => {
    const itemId = `play:${movedCardOid}`
                                                    
    if (!knockdownTargetLive(state, controller, target)) return null
                                                          
                                                            
                                               
                                                    
                                              
                                            
                                                                   
                                                                     
                                                                         
                                                                  
    if (chosen[SFD_107_FOE_KEY] === undefined) {
      const foes = enemyUnitsOnField(state, controller)
      return {
        itemId, controller, key: SFD_107_FOE_KEY,
        prompt: '击倒:对哪名敌方单位造成伤害?',
        candidates: foes.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
                                                                      
                                                                     
                                                                      
                                                                
                                                                         
                                                                         
        isTarget: true,
      }
    }
                             
    if (chosen[SFD_107_GEAR_KEY] === undefined) {
      const gears = knockdownGears(state, target)
      if (gears.length > 0) {
        return {
          itemId, controller, key: SFD_107_GEAR_KEY,
          prompt: '击倒:卸除它身上的哪一件武装?',
          candidates: gears.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
                                                                  
                                                                
                                                                        
          isTarget: true,
        }
      }
      // 目标合法(=配装)就必然有武装,走到这里只可能是被别的效果清空了 ⇒ 跳过
    }
    return null
  },
  makeResolve: ({ movedCardOid, controller, target }) => (state, chosen): readonly GameEvent[] => {
    const c = chosen ?? {}
                                                  
                                                
    if (!knockdownTargetLive(state, controller, target)) return []
    const out: GameEvent[] = []
                                                   
                                                                    
    const amount = effectiveMight(state.objects[target as ObjId]!).reference
    const foe = c[SFD_107_FOE_KEY]
                                                              
    if (foe !== undefined && enemyUnitsOnField(state, controller).includes(foe)) {
      out.push({
        kind: 'damage', target: foe as ObjId, amount,
                                                           
        source: movedCardOid as ObjId, sourcePlayer: controller,
      } )
    }
    const gear = c[SFD_107_GEAR_KEY]
                                         
    if (gear !== undefined && knockdownGears(state, target).includes(gear)) {
      out.push({ kind: 'detach', obj: gear as ObjId } as GameEvent)
    }
    return out
  },
}

export const SFD_107: Card = {
  id: 'SFD-107', cardNo: 'SFD·107/221', name: '击倒', category: 'spell',
  domains: ['orange'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '选一名配装友方,以其战力打一名敌方,然后卸除它一件武装(SFD_107_SPEC)' }],
}
