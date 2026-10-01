                                                                     
                                                                       
                                                        
                                       
                                                        
  
                                                                     
  
          
                                                                   
                                                
                                                      
                                            
                                                                        
                                                                                  
                                                                           
                                                              
                                                                                   
                                                          
                                                             
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { CostMod } from '../../src/game/costPipeline'
import { GEAR_MANA_FREE_MAX } from '../../src/loop/events'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { CARD_COSTS } from '../cardCosts'
import { CARD_CATEGORIES } from '../cardCategories'

export const JAYCE_GEAR_DEFIDS: readonly string[] = ['SFD-084', 'VEN-175']

export const JAYCE_GEAR_CARD_EFFECT =
  '当你打出我时，你可以选择摧毁一件友方装备。若如此做，则在本回合内，'
  + '你可以选择从手牌中打出一件法力费用不高于{{7}}的装备，无视其法力费用（仍需支付所有符能费用）。'
                                                                                                                           
                                                                               
                                                                                                                    
export const SFD_084_CARD_EFFECT = JAYCE_GEAR_CARD_EFFECT

                                                     
export function makeJayceGearTrigger(defId: string) {
  return (selfOid: ObjId, controller: PlayerId): Trigger => {
    const effect = compileEffect({
      then: [
                                                     
        { op: 'destroy', target: { ref: 'chosen', key: 'gear' }, sourcePlayer: { ref: 'controller' } },
                                           
                                                                                      
                                                    
        { op: 'custom', emit: (ctx): readonly GameEvent[] => ctx.chosen['gear'] === undefined ? [] : [
          { kind: 'gearManaFree', player: ctx.controller } as GameEvent,
        ] },
      ],
    })
    return compileTrigger({
      id: `${defId}:onPlay`, sourceDefId: defId,
      event: 'playUnit', by: 'you',
      when: [{ kind: 'subjectIsSelf' }],
      mayChoose: true, // §383.3.a「你可以选择」在效果开头 ⇒ 整条可选
      choose: {
        key: 'gear', prompt: '杰斯:摧毁一件友方装备(以此本回合可免法力费打出一件法力不高于 7 的装备)',
                                                             
        selector: { type: 'equipment', fielded: true, controller: 'you', isTarget: true },
      },
      effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
    }, selfOid, controller)
  }
}

   
                                                            
                                                     
                                                               
                                       
   
export function jayceGearCostMods(
  state: GameState, player: PlayerId, defId: string,
  ctx?: { readonly fromZone?: string },
): readonly CostMod[] {
  if ((state.gearManaFreeThisTurn?.[player as string] ?? 0) <= 0) return []
  if (CARD_CATEGORIES[defId] !== 'equipment') return []
  const printed = CARD_COSTS[defId]?.mana
  if (printed === undefined || printed > GEAR_MANA_FREE_MAX) return []                            
  if (ctx?.fromZone !== 'hand') return []                   
                                                        
                                                          
                                                       
  return [{ kind: 'zero', part: 'mana', source: '杰斯 - 推陈出新(本回合免一件装备的法力费)',
    alt: { kind: 'reduce', part: 'mana', mana: 0, source: '杰斯许可:这件不用(留给后面的装备)' } }]
}

const jayce = (id: string, cardNo: string): Card => ({
  id, cardNo, name: '杰斯', category: 'unit',
  domains: ['blue'], energy: 4, power: 4, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出我时可摧毁一件友方装备,以此本回合免一件≤7法力装备的法力费(makeJayceGearTrigger)' }],
})
export const SFD_084: Card = jayce('SFD-084', 'SFD·084/221')
export const VEN_175: Card = jayce('VEN-175', 'VEN·175')                            
