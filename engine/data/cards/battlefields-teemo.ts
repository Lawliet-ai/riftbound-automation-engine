                                                             
                                                                
                                                                             
                                                                 
                                                                                  
                                                                                    
                                                                                    
                                                 
                                              
                                                         
                                                                    

import type { GameState } from '../../src/state/gameState'
import type { Trigger } from '../../src/dsl/trigger'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnitDefId } from '../cardKinds'
import { fieldedUnits, grantKeywordEvent } from './activated-batch'                                               
import { isUnit } from '../../src/state/cardTypes'                                         
import { controlMap } from '../../src/state/battlefieldControl'                               

   
                                                                   
                                                                         
                                                   
   
                                                                   
const NO_SOURCE = null

export const OGN_278_CARD_EFFECT = '你可以选择在此处额外布置一张{{待命}}卡牌。'
export const OGN_279_CARD_EFFECT = '当你防守此处时，选择一名单位，使其在本次战斗期间获得{{坚守2}}。（如果它是防守方，则{{S}}+2。）'
export const UNL_209_CARD_EFFECT = '在你的开始阶段开始时，你可以选择摧毁一名此处由你控制的单位，以此抽一张牌。（此行动在得分前进行。）'

   
                               
  
                                                               
                                                                   
                                          
                                                                    
                                                             
                                                     
                                                           
                              
  
                                                   
                                                                                         
                                                                                  
                                                             
                                                                    
                                                               
                                                    
                                       
                                                                 
                                                                        
                                                            
                                                 
   
function ownUnitsAtBattlefield(state: GameState, bfZoneId: string, controller: PlayerId): string[] {
  const z = state.zones[bfZoneId]
  if (!z) return []
  return z.contents.filter((oid) => {
    const o = state.objects[oid]
                                                         
                                                                        
                                                    
    return !!o && isUnitDefId(o.defId) && isUnit(o) && o.controller === controller
  })
}

                                             
export function makeFortifiedPositionTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                          
    guard: (ctx) => !!ctx.chosen['unit'],
                                                           
                                                                                                    
                                                    
                                         
                                                   
                                                     
                                                              
                                                
                                                                             
                                                                                                    
                                                    
                                                                           
                                                                                
                                         
                                                      
    then: [{ op: 'custom', emit: (ctx) => {
      const target = ctx.chosen['unit']
      if (!target) return []
                                                                            
                                           
      if (!fieldedUnits(ctx.state).includes(target as ObjId)) return []
      return [grantKeywordEvent(`OGN-279-deflect:${bfZoneId}`, target, '坚守2', 'thisCombat')]
    } }],
  })
  return compileTrigger({
    id: `OGN-279:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'OGN-279',
    event: 'defend',
    by: 'any', // 玩家级信号自带 player,由判据自己判归属
                                                                  
    when: [
      { kind: 'eventAtBattlefield', zone: bfZoneId },
      { kind: 'eventPlayerIs', side: 'you' },
                                                                     
                                            
      { kind: 'custom', test: (ev) => ev.kind === 'defend' && ev.unit === undefined },
    ],
    nextChoice: (state, _ev, chosen) => {
      if (chosen['unit'] !== undefined) return null
                                                                         
                                                    
                                                              
                                                         
                                                                          
                                                                       
                                                
                                                                   
                                            
                                                                   
                                                      
                                                           
                                                                                      
                                                       
                                               
      const cands = fieldedUnits(state).map((oid) => ({ id: oid as string, label: `{{坚守2}} → ${state.objects[oid]?.defId ?? oid}` }))
      if (cands.length === 0) return null
      return { itemId: `trig:OGN-279:${bfZoneId}:${controller}`, controller, key: 'unit', prompt: '强化阵地:选择一名单位获得{{坚守2}}(防守时战力+2)', candidates: cands,
        isTarget: true, // ★1782 选择一名单位,使其…获得坚守2
        }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

                                                                
export function makeDuskRoseTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  const effect = compileEffect({
                                                      
    guard: (ctx) => !!ctx.chosen['sac'] && ctx.chosen['sac'] !== 'skip',
    then: [
                                                      
      { op: 'destroy', target: { ref: 'chosen', key: 'sac' } },
      { op: 'draw', count: 1 },
    ],
  })
  return compileTrigger({
    id: `UNL-209:${bfZoneId}:${controller}`, rawId: true,
    sourceDefId: 'UNL-209',
    event: 'startPhase',
    by: 'you',
    when: [{ kind: 'eventPlayerIs', side: 'you' }],
                                                              
                                                      
                                                      
                                                      
                                                                      
                                                              
                                                    
                                                                  
                                                               
                                      
                                                          
                                                    
    additionalCondition: (state) => controlMap(state)[bfZoneId] === controller
      && ownUnitsAtBattlefield(state, bfZoneId, controller).length > 0,
    nextChoice: (state, _ev, chosen) => {
      if (chosen['sac'] !== undefined) return null
      if (controlMap(state)[bfZoneId] !== controller) return null                  

      const cands = ownUnitsAtBattlefield(state, bfZoneId, controller).map((oid) => ({ id: oid, label: `摧毁 ${state.objects[oid]?.defId ?? oid} → 抽1` }))
      if (cands.length === 0) return null
      cands.push({ id: 'skip', label: '不摧毁(可选)' })
      return { itemId: `trig:UNL-209:${bfZoneId}:${controller}`, controller, key: 'sac', prompt: '暮色玫瑰实验室:可摧毁此处一名己方单位,以此抽一张牌', candidates: cands }
    },
    effect: (state, ev, chosen) => effect({ state, selfOid: NO_SOURCE, controller, ev, chosen: chosen ?? {} }),
  }, NO_SOURCE, controller)
}

                                    
export const BF_TRIGGER_FACTORIES: Readonly<Record<string, (bfZoneId: string, player: PlayerId) => readonly Trigger[]>> = {
  'OGN-279': (bf, p) => [makeFortifiedPositionTrigger(bf, p)],
  'UNL-209': (bf, p) => [makeDuskRoseTrigger(bf, p)],
  // OGN-278 班德尔树为静态容量效果(setup 应用),无触发
}

                   
export const BF_NAMES: Readonly<Record<string, string>> = {
  'OGN-278': '班德尔树', 'OGN-279': '强化阵地', 'UNL-209': '暮色玫瑰实验室',
}
