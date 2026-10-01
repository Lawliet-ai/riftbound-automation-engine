                                                             
  
                                                                
                                                             
                                                         
                  
                                                               
                                                  
                                                            
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'

                                                              
                                         
                                                   
  
                       
                                                                       
                                                                          
                                                      
                                                       
export const SFD_104_CARD_EFFECT =
  '{{瞬息}}（在其控制者的下个回合开始阶段，结算得分之前将其摧毁。）\n' +
  '友方单位获得{{法盾}}（对手必须支付{{A}}才能将其选作法术或技能的目标。）'

export const SFD_104: Card = {
  id: 'SFD-104', cardNo: 'SFD·104/221', name: '禁魔石丰碑', category: 'equipment',
  domains: ['orange'], energy: 2, keywords: ['瞬息'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '瞬息;我在场时友方单位获得法盾(GROUP_PASSIVES)' }],
}

                                                              
                                       
                                           
                         
  
                                                                     
                                                             
                                                             
                                                                
export const UNL_085_CARD_EFFECT =
  '{{反应}}（可在任意时机打出，甚至先于其他法术和技能的结算。）\n' +
  '{{瞬息}}（在其控制者的开始阶段开始时，结算得分之前将其摧毁。）\n' +
  '当一名对手得分时，抽一张牌。'

export function makeGutterMapTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 1 }] })
  return compileTrigger({
    id: 'UNL-085:oppScored',
    event: 'gainPoint',
    by: 'any', // 见文件头:得分事件的"谁"要读 ev.player,不能靠 by
    when: [{
      kind: 'custom',
      test: (ev: GameEvent) => ev.kind === 'gainPoint' && ev.player !== controller,
    }],
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const UNL_085: Card = {
  id: 'UNL-085', cardNo: 'UNL-085/219', name: '地沟区地图', category: 'equipment',
  domains: ['blue'], energy: 2, keywords: ['反应', '瞬息'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '反应+瞬息;对手得分时抽一张牌(makeGutterMapTrigger)' }],
}

                     
export const GEAR_BATCH_245_DEFIDS: readonly string[] = ['SFD-104', 'UNL-085']
