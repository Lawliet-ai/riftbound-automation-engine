                                                             
  
                                                                    
                                                     
import type { Card } from '../../src/dsl/card'
import type { Trigger } from '../../src/dsl/trigger'
import type { GameEvent } from '../../src/loop/events'
import type { GameState } from '../../src/state/gameState'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameObject } from '../../src/state/object'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { fieldedUnits, pumpEvent } from './activated-batch'
import { onField } from './activated-batch2'

                                                             
                                             
                                                 
  
                                                               
                                                     
                                                      
                                               
                                                           
                                                          
                                                       
                                                                
                          
export const UNL_161_CARD_EFFECT =
  '{{预知}}（当你打出此牌时，查看主牌堆顶部的一张牌。你可以选择将其回收。）\n' +
  '{{迅捷>}} 摧毁此牌，{{横置}}：让一名单位在本回合内{{S}}+2。'

export const UNL_161_PUMP = 2

export const UNL_161_SPEC: ActivatedSpec = {
  key: 'UNL-161:pump',
  label: '{{迅捷}} 摧毁此牌并{{横置}}:让一名单位本回合战力+2',
  cost: {}, // 冒号前两截都不是资源费
  keywords: ['迅捷'], // {迅捷>} = 这条技能的时机权限(§806),不是这张牌的印刷关键词
  tapSelf: true,
  destroySelf: true,
  target: 'custom',
  legalTargets: (state): string[] => fieldedUnits(state) as string[],
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [pumpEvent('UNL-161:pump', target, UNL_161_PUMP)],
}

export const UNL_161: Card = {
  id: 'UNL-161', cardNo: 'UNL-161/219', name: '占卜贝壳', category: 'equipment',
  domains: ['yellow'], energy: 2, keywords: ['预知'], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '预知;[迅捷][摧毁此牌][横置]让一名单位本回合+2(UNL_161_SPEC)' }],
}

                                                            
                                                      
                                            
                                       
  
                                                 
                                                                   
                                                         
                                                  
                                                    
                                                                             
                       
                                                 
                                         
export const OGN_063_CARD_EFFECT =
  '当你打出此牌时，给予一名友方单位增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）\n' +
  '所有拥有增益的友方单位如未拥有{{法盾}}，则额外获得{{法盾}}。（对手必须支付{{A}}才能将其选作法术或技能的目标。）'

                                                         
export function makeSoulGuardPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({
    then: [{ op: 'grantBuff', target: { ref: 'chosen', key: 'unit' } }],
  })
  return compileTrigger({
    id: 'OGN-063:play',
    event: 'playUnit',
    by: 'any',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    choose: {
      key: 'unit', prompt: '奥义!魂佑:给予一名友方单位增益',
      selector: {
        type: 'unit', controller: 'you',
        isTarget: true, // ★1769 同上
        filter: (o: GameObject, st: GameState) => onField(st, o), // 没写位置词 ⇒ 场上(战场+基地)
      },
    },
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

export const OGN_063: Card = {
  id: 'OGN-063', cardNo: 'OGN·063/298', name: '奥义！魂佑', category: 'equipment',
  domains: ['green'], energy: 2, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时给一名友方单位增益;有增益的友方单位获得法盾(GROUP_PASSIVES)' }],
}

                     
export const GEAR_BATCH_248_DEFIDS: readonly string[] = ['UNL-161', 'OGN-063']
