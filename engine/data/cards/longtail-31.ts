                              
  
                    
                                                        
                                                        
  
                                               
                                    
                               
                                                           
                                                       
                                          
  
                                    
                                                   
                                    
                                                                        
                                                         
                                                     
                                                             
                                                                     
                                                 

import type { Card } from '../../src/dsl/card'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'
import { pumpEvent, grantKeywordEvent } from './activated-batch'

                                                              
export const VEN_193_CARD_EFFECT = '{{迅捷>}}{{横置}}：给予一名友方单位在本回合内{{壁垒}}。'

export const VEN_193_SPEC: ActivatedSpec = {
  key: 'VEN-193:grantBulwark',
  label: '{{迅捷}} {{横置}} 给予一名友方单位本回合内{{壁垒}}',
  keywords: ['迅捷'], // §806 权限轴:法术对决期间也能激活。写进 label 给人看不算数(⑧)
  cost: {},
  tapSelf: true,
  target: 'custom',
                                             
  legalTargets: (state: GameState, controller: PlayerId): string[] =>
    Object.values(state.objects)
      .filter((o) => onField(state, o) && isUnit(o) && o.controller === controller)
      .map((o) => o.oid as string)
      .sort(),
                                             
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [grantKeywordEvent('VEN-193:bulwark', target, '壁垒')],
}
export const VEN_193: Card = {
  id: 'VEN-193', cardNo: 'VEN·193', name: '暮光之眼', category: 'legend',
  domains: ['green', 'yellow'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '[迅捷][横置]给一名友方单位本回合[壁垒](VEN_193_SPEC)' }],
}

                                                                
export const OGN_277_CARD_EFFECT = '每当一名单位从此处向别处移动时，让其本回合内{{S}}+1。'

   
                                                                   
                                             
                                               
                                            
                                                                              
                                                    
                                                         
                                                  
                                                          
   
export function makeBackAlleyBarTrigger(bfZoneId: string, controller: PlayerId): Trigger {
  return compileTrigger({
    id: `OGN-277:${bfZoneId}:${controller}`, rawId: true, sourceDefId: 'OGN-277',
    event: 'unitMoved',
    by: 'any', // 谁在行动都算(效果驱动的移动可能由对手发起)
    when: [
                                                           
      { kind: 'eventPlayerIs', side: 'you' },
                                       
      { kind: 'custom', test: (ev): boolean => {
        const e = ev as { from?: string; to?: string }
        return e.from === bfZoneId && e.to !== undefined && e.to !== bfZoneId
      } },
    ],
    effect: (_state, ev): readonly GameEvent[] => {
      const unit = (ev as { unit?: ObjId }).unit
      return unit === undefined ? [] : [pumpEvent(`OGN-277:${bfZoneId}`, unit as string, 1)]
    },
  }, null, controller)
}

export const OGN_277: Card = {
  id: 'OGN-277', cardNo: 'OGN·277/298', name: '后巷酒吧', category: 'battlefield',
  domains: ['colorless'], energy: 0, power: 0, keywords: [], playModes: [],
  abilities: [{ kind: 'passive', describe: '单位从此处向别处移动时其本回合+1(makeBackAlleyBarTrigger)' }],
}

             
export const LONGTAIL31_DEFIDS: readonly string[] = ['VEN-193', 'OGN-277']
