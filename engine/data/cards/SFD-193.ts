                                                                    
                                                                           
                                               
                                         
                                                                       
                                                                        
  
                                                
                                      
                                                     
                              
                                                                    
                                                              
  
                                    
                                                                       
                                                  
                               
                                                                
                                                          
                                                
                                                  
                                             
  
                                                              
                                                                 
                                                                  
                                                     
                                              
                                                          
                                     
                                                          
                                
import type { Card } from '../../src/dsl/card'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { ChoiceRequest } from '../../src/loop/chain'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import { isArmament } from '../../src/keywords/equip'
import { fieldedUnits } from './activated-batch'

export const SFD_193_CARD_EFFECT =
  '支付{{1}}，{{横置}}：将你控制的一件未贴附的武装贴附到你控制的一名单位上。\n' +
  '{{横置}}：将你控制的一件已贴附的武装贴附到你控制的一名单位上。'

                         
export const WM_UNIT_KEY = 'wmAttachTo'

   
                                      
                                       
                                               
   
export function wmArmaments(state: GameState, controller: PlayerId, attached: boolean): string[] {
  return Object.values(state.objects)
    .filter((o) => {
      if (!isArmament(o)) return false                          
      if (o.controller !== controller) return false          
      const k = state.zones[o.zone]?.kind
      if (k !== 'battlefield' && k !== 'base') return false
      const has = (o.status.attachedTo as string | undefined) !== undefined
      return has === attached                            
    })
    .map((o) => o.oid as string)
    .sort()
}

                                                         
export function wmUnits(state: GameState, controller: PlayerId): string[] {
  return fieldedUnits(state, { of: controller, friendly: true }).map((o) => o as string).sort()
}

   
                                        
                                         
                                                           
   
export function makeWeaponMasterSpec(attached: boolean): ActivatedSpec {
  const key = attached ? 'SFD-193:reattach' : 'SFD-193:equip'
  return {
    key,
    label: attached
      ? '{{横置}}:将你控制的一件已贴附的武装贴附到你控制的一名单位上'
      : '支付 1 法力并{{横置}}:将你控制的一件未贴附的武装贴附到你控制的一名单位上',
                                                   
    cost: attached ? {} : { mana: 1 },
    tapSelf: true,
    target: 'custom',
    legalTargets: (state: GameState, controller: PlayerId) => {
                                                  
      if (wmUnits(state, controller).length === 0) return []
      return wmArmaments(state, controller, attached)
    },
                                                                 
                                                                                      
    choiceTiming: 'confirm',
    makeNextChoice: ({ selfOid, controller }) => (state, chosen): ChoiceRequest | null => {
      if (chosen[WM_UNIT_KEY] !== undefined) return null
      const cands = wmUnits(state, controller)                    
      if (cands.length === 0) return null
      return {
        itemId: `act:${selfOid}:${key}`,
        controller,
        key: WM_UNIT_KEY,
        prompt: '武器大师:将这件武装贴附到你控制的哪名单位上?',
        isTarget: true, // ★1782 贴附到你控制的一名单位上
        candidates: cands.map((oid) => ({ id: oid, label: `${state.objects[oid as ObjId]?.defId ?? oid}` })),
      }
    },
    makeResolve: ({ controller, target }) => (state, chosen): readonly GameEvent[] => {
      const unit = (chosen ?? {})[WM_UNIT_KEY]
      if (target === undefined || unit === undefined) return []
                                                    
                                                    
      if (!wmArmaments(state, controller, attached).includes(target)) return []
      if (!wmUnits(state, controller).includes(unit)) return []
                                                    
                                                          
      const gear = state.objects[target as ObjId]
      if ((gear?.status.attachedTo as string | undefined) === unit) return []
                                                              
      return [{ kind: 'attach', obj: target as ObjId, to: unit as ObjId, player: controller } as GameEvent]
    },
  }
}

export const SFD_193_SPECS: readonly ActivatedSpec[] = [
  makeWeaponMasterSpec(false), // 「支付{1},{横置}:…未贴附…」
  makeWeaponMasterSpec(true), // 「{横置}:…已贴附…」
]

                                                           
export const SFD_193: Card = {
                                                                                      
  id: 'SFD-193', cardNo: 'SFD·193/221', name: '武器大师', category: 'legend',
  domains: ['green', 'orange'], energy: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '两条主动技能:付{1}+横置贴未贴附武装 / 横置重贴已贴附武装(SFD_193_SPECS)' }],
}
