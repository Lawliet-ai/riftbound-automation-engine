                                                                  
  
                                                            
                                                               
                            
                                         
                                                     
                                           
  
                                                                     
                                                                                   
import type { Card } from '../../src/dsl/card'
import type { GameState } from '../../src/state/gameState'
import type { GameEvent } from '../../src/loop/events'
import type { ObjId, PlayerId } from '../../src/state/ids'
import type { Trigger } from '../../src/dsl/trigger'
import type { ActivatedSpec } from '../../src/loop/playSpec'
import { compileTrigger } from '../../src/dsl/triggerSpec'
import { compileEffect } from '../../src/dsl/effectSpec'
import { isUnit } from '../../src/state/cardTypes'
import { onField } from './activated-batch2'

                                                                
                    
                                           
  
                                                                 
                                                                                  
                                                            
                                   
export const SFD_046_CARD_EFFECT =
  '当你打出此牌时，抽一张牌。\n支付{{1}}和{{绿色}}，{{横置}}，摧毁此牌：抽一张牌。'

                                                     
export function makePoroSnackPlayTrigger(selfOid: ObjId, controller: PlayerId): Trigger {
  const effect = compileEffect({ then: [{ op: 'draw', count: 1 }] })
  return compileTrigger({
    id: 'SFD-046:play',
    event: 'playUnit',
    by: 'any',
    activeZone: ['base', 'battlefield'],
    when: [{ kind: 'subjectIsSelf' }], // 「当你打出【此牌】时」
    effect: (state, ev, chosen) => effect({ state, selfOid, controller, ev, chosen: chosen ?? {} }),
  }, selfOid, controller)
}

                                    
export const SFD_046_SPEC: ActivatedSpec = {
  key: 'SFD-046:draw',
  label: '支付 1 法力和 1 点翠意符能,{{横置}},摧毁此牌:抽一张牌',
  cost: { mana: 1, pips: [['green']] },
  tapSelf: true,
  destroySelf: true,
  target: 'none',
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'draw', player: controller, count: 1 }],
}

export const SFD_046: Card = {
  id: 'SFD-046', cardNo: 'SFD·046/221', name: '魄罗佳肴', category: 'equipment',
  domains: ['green'], energy: 1, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '打出时抽1;付{1}{绿}+横置+摧毁自身:抽1(SFD_046_SPEC)' }],
}

                                                                 
                                          
                                    
  
                                                               
                                                                    
                                                   
                                                           
                                                                 
                       
export const OGN_098_CARD_EFFECT =
  '{{横置}}：{{反应}}—{{获得}}{{1}}，用以支付法力费用。（获得费用资源的技能无法成为其他法术的反应目标。）'

export const OGN_098_SPEC: ActivatedSpec = {
  key: 'OGN-098:gain',
  label: '{{反应}} {{横置}}:获得 1 法力',
  keywords: ['反应'],
  cost: {},
  tapSelf: true,
  fastResolve: true,
  target: 'none',
  makeResolve: ({ controller }) => (): readonly GameEvent[] =>
    [{ kind: 'gainResource', player: controller, mana: 1 }],
}

export const OGN_098: Card = {
  id: 'OGN-098', cardNo: 'OGN·098/298', name: '能量通道', category: 'equipment',
  domains: ['blue'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[反应][横置]获得1点法力(OGN_098_SPEC)' }],
}

                                                                
                            
                                       
  
                                                   
                                                       
                             
                                                               
                                                   
export const OGN_124_CARD_EFFECT =
  '{{横置}}：给予一名休眠的友方单位增益。（如果该单位未拥有增益，则获得一个{{S}}+1增益。）'

                             
export function dormantFriendlyUnits(state: GameState, controller: PlayerId): string[] {
  return Object.values(state.objects)
    .filter((o) => o.controller === controller && isUnit(o) && onField(state, o) && o.status['dormant'] === true)
    .map((o) => o.oid as string)
    .sort()
}

export const OGN_124_SPEC: ActivatedSpec = {
  key: 'OGN-124:buff',
  label: '{{横置}}:给予一名休眠的友方单位增益',
  cost: {},
  tapSelf: true,
  target: 'custom',
  legalTargets: (state, controller): string[] => dormantFriendlyUnits(state, controller),
  makeResolve: ({ target }) => (): readonly GameEvent[] =>
    target === undefined ? [] : [{ kind: 'grantBuff', target: target as ObjId }],
}

export const OGN_124: Card = {
  id: 'OGN-124', cardNo: 'OGN·124/298', name: '竞技场酒吧', category: 'equipment',
  domains: ['orange'], energy: 3, keywords: [], playModes: [{ kind: 'standard' }],
  abilities: [{ kind: 'passive', describe: '[横置]给一名休眠的友方单位增益(OGN_124_SPEC)' }],
}

                     
export const GEAR_BATCH_229_DEFIDS: readonly string[] = ['SFD-046', 'OGN-098', 'OGN-124']
