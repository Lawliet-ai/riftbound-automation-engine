                                                                        
                                                         
                                           
                                              
                                       
  
                                                                  
                                                        
                                                      
  
                                                                      
                                                                  
                                                                     
                                  
                                                        
                                                               
                                            
                                              
                                                        
                                                         
                                                                               
                                          
                                                 
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId, ZoneId } from '../../src/state/ids'
import type { GameEvent } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'

export const VEN_104_CARD_EFFECT =
  '{{强化2紫色}}（支付{{2}}和{{紫色}}：强化我。仅在未强化时可用。）\n' +
  '当我变为{{已强化}}时，你可以选择从你的废牌堆中选择一名法力费用不高于{{3}}且符能费用不高于{{A}}的单位。将其打出到你的基地，无视其费用。'

                                   
export const VEN_104_MAX_MANA = 3
                                                               
export const VEN_104_MAX_PIPS = 1
const VEN_104_PICK = 'matriarchPick'

   
                                        
                                                              
   
export function matriarchCandidates(
  state: GameState,
  controller: PlayerId,
  costOf: (defId: string) => { readonly mana?: number; readonly pips?: readonly unknown[] },
): readonly ObjId[] {
  const zone = state.zones[`discard:${controller}` as ZoneId]
  return (zone?.contents ?? []).filter((oid) => {
    const o = state.objects[oid]
    if (!o || !isUnit(o)) return false
    const c = costOf(o.defId)
    return (c.mana ?? 0) <= VEN_104_MAX_MANA && (c.pips?.length ?? 0) <= VEN_104_MAX_PIPS
  })
}

   
                                
                                                  
                                                                             
                                                                       
                                                      
                                                     
                                                        
                                                         
                                            
                    
   
export const VEN_104_KEYWORDS: readonly string[] = ['强化2紫色']

                                                                                
export function makeMatriarchEmpoweredTrigger(
  selfOid: ObjId,
  controller: PlayerId,
  costOf: (defId: string) => { readonly mana?: number; readonly pips?: readonly unknown[] },
): Trigger {
  return compileTrigger({
    id: `VEN-104-recur:${selfOid}`, rawId: true, sourceDefId: 'VEN-104',
    event: 'empower',
    by: 'any', // §441.2.a 被【外部效果】强化也算"变为已强化"
    when: [{ kind: 'subjectIsSelf' }], // 强化的对象必须是我
                                                         
                                                       
                                              
    mayChoose: true,
    nextChoice: (state: GameState, _ev, chosen) => {
      if (chosen[VEN_104_PICK] !== undefined) return null
      const cands = matriarchCandidates(state, controller, costOf)
      if (cands.length === 0) return null                        
      return {
        itemId: `trig:VEN-104-recur:${selfOid}`,
        controller,
        key: VEN_104_PICK,
        prompt: `披尾女族长:从废牌堆打出一名法力≤${VEN_104_MAX_MANA}、符能≤${VEN_104_MAX_PIPS} 点任意符能的单位到你的基地`,
        isTarget: true, // ★1782 从你的废牌堆中选择一名…单位
        candidates: [
          ...cands.map((oid) => ({ id: oid as string, label: `${state.objects[oid]?.defId ?? oid}` })),
        ],
      }
    },
    effect: (state: GameState, _ev, chosen): readonly GameEvent[] => {
      const picked = chosen?.[VEN_104_PICK]
                               
                                                         
                                                                       
      if (picked === undefined) return []
      if (!matriarchCandidates(state, controller, costOf).includes(picked as ObjId)) return []
                                                                 
                                         
                                                                                     
                                        
                                                          
                                                 
                                            
                                                  
      return [{
        kind: 'playFree', obj: picked as ObjId, player: controller,
        to: `base:${controller}` as ZoneId,
      } as GameEvent]
    },
  }, selfOid, controller)
}

export const VEN_104: Card = {
  id: 'VEN-104', cardNo: 'VEN·104', name: '披尾女族长', category: 'unit',
  domains: ['purple'], energy: 4, power: 4, keywords: [...VEN_104_KEYWORDS], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[付{2}{紫}]强化我;变为已强化时可从废牌堆无视费用打出一名法力≤3且符能≤{A}的单位到基地' }],
}
